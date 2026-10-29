// Case loader: binds a case-declared relative report path to a fresh invocation
// directory, and refuses every escape before anything is written.
//
// The case manifest is the only place a report path is decided. There is no glob,
// discovery, timestamp, or any-new-file fallback here — `bindReportPath` returns
// exactly one absolute path or throws `CasePathRefused` (`invalid-case-path`).

import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const KIT_ROOT = HERE;
export const PROJECT_DIR = path.join(HERE, "project");
export const OVERLAYS_DIR = path.join(HERE, "overlays");
export const CASES_DIR = path.resolve(HERE, "../cases");
export const INDEX = JSON.parse(readFileSync(path.join(CASES_DIR, "index.json"), "utf8"));

/** A declared path that would leave the invocation directory, or a report body
 *  that does not belong to the invocation that produced it. Never a pass. */
export class CasePathRefused extends Error {
  constructor(rel, why) {
    super(`invalid-case-path: refused ${JSON.stringify(rel)}: ${why}`);
    this.name = "CasePathRefused";
    this.code = "invalid-case-path";
    this.rel = rel;
    this.why = why;
  }
}

export class CaseInvalid extends Error {
  constructor(caseId, why) {
    super(`invalid-case: ${caseId}: ${why}`);
    this.name = "CaseInvalid";
    this.code = "invalid-case";
    this.caseId = caseId;
  }
}

const SEGMENTS = (rel) => String(rel).split(/[\\/]+/).filter((s) => s.length > 0);

/**
 * Refuse anything that could resolve outside `invocationDir`. Pure: reads no
 * report, writes nothing, creates nothing.
 */
export function assertConfined(rel, invocationDir) {
  if (typeof rel !== "string" || rel.length === 0) throw new CasePathRefused(rel, "empty or non-string path");
  if (path.isAbsolute(rel) || /^[A-Za-z]:[\\/]/.test(rel)) throw new CasePathRefused(rel, "absolute path");
  const segments = SEGMENTS(rel);
  if (segments.includes("..")) throw new CasePathRefused(rel, "contains a .. segment");
  if (segments.length === 0) throw new CasePathRefused(rel, "no path segments");

  const root = path.resolve(invocationDir);
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep)) throw new CasePathRefused(rel, "resolves outside the invocation directory");

  // Every existing component from the invocation root to the leaf must be a real
  // directory (or file, for the leaf) — never a symlink.
  let cursor = root;
  for (let i = 0; i < segments.length; i++) {
    cursor = path.join(cursor, segments[i]);
    let st;
    try {
      st = lstatSync(cursor);
    } catch (err) {
      if (err.code === "ENOENT") break; // not created yet: nothing to follow
      throw new CasePathRefused(rel, `unreadable component ${segments.slice(0, i + 1).join("/")}: ${err.code}`);
    }
    if (st.isSymbolicLink()) throw new CasePathRefused(rel, `symlinked component ${segments.slice(0, i + 1).join("/")}`);
  }
  return abs;
}

/** The one path this case's report can live at. Exactly one; no discovery. */
export function bindReportPath(caseManifest, invocationDir) {
  const rel = caseManifest?.report_relative_path;
  if (rel === undefined || rel === null) throw new CaseInvalid(caseManifest?.case_id, "no report_relative_path declared");
  const abs = assertConfined(rel, invocationDir);
  const root = path.resolve(invocationDir);
  if (!rel.startsWith(INDEX.reportable_path_prefix)) {
    throw new CasePathRefused(rel, `declared report path must live under ${INDEX.reportable_path_prefix}`);
  }
  for (const other of INDEX.cases) {
    if (other === caseManifest.case_id) continue;
    const sibling = loadCase(other);
    if (sibling.report_relative_path === rel) throw new CaseInvalid(caseManifest.case_id, `shares a report path with ${other}`);
  }
  if (!abs.startsWith(root + path.sep)) throw new CasePathRefused(rel, "resolves outside the invocation directory");
  return abs;
}

export function loadCase(caseId) {
  const file = path.join(CASES_DIR, `${caseId}.json`);
  if (!existsSync(file)) throw new CaseInvalid(caseId, `no manifest at ${file}`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new CaseInvalid(caseId, `unparseable manifest: ${err.message}`);
  }
  if (manifest.schema !== "harness-case/v1") throw new CaseInvalid(caseId, `schema must be harness-case/v1`);
  if (manifest.case_id !== caseId) throw new CaseInvalid(caseId, `case_id ${manifest.case_id} does not match its filename`);
  return manifest;
}

/** A fresh directory per invocation, plus the identity stamped into its report. */
export function freshInvocationDir(caseId) {
  const dir = mkdtempSync(path.join(tmpdir(), `pp-kit-${caseId}-`));
  return { dir, invocationId: `inv-${caseId}-${randomUUID()}` };
}

/** Copy the kit project into `invocationDir` and apply the case overlay. Never runs in place. */
export function materialize(caseManifest, invocationDir) {
  const { dir } = invocationDir;
  cpSync(PROJECT_DIR, dir, { recursive: true });
  if (caseManifest.overlay) {
    const overlayDir = path.join(OVERLAYS_DIR, caseManifest.overlay.replace(/^overlays\//, ""));
    if (!existsSync(overlayDir)) throw new CaseInvalid(caseManifest.case_id, `no overlay at ${overlayDir}`);
    cpSync(overlayDir, dir, { recursive: true });
  }
  return dir;
}

/** Apply a status case's declared single-fact mutation to its materialized manifest. */
export function applyFactsMutation(caseManifest, invocationDir) {
  const mutation = caseManifest.facts_mutation;
  if (!mutation) return null;
  const file = path.join(invocationDir.dir, "design/manifest.json");
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  const keys = mutation.path.split(".");
  let cursor = manifest;
  for (const key of keys.slice(0, -1)) cursor = cursor[key];
  const leaf = keys[keys.length - 1];
  if (!(leaf in cursor)) throw new CaseInvalid(caseManifest.case_id, `mutation path ${mutation.path} does not exist`);
  const before = cursor[leaf];
  cursor[leaf] = mutation.value;
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { path: mutation.path, before, after: mutation.value };
}

/** Every entry under `dir`, recursively, as invocation-relative paths. */
export function listDir(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (current) => {
    for (const name of readdirSync(current).sort()) {
      const full = path.join(current, name);
      out.push(path.relative(dir, full).split(path.sep).join("/"));
      if (lstatSync(full).isDirectory() && !lstatSync(full).isSymbolicLink()) walk(full);
    }
  };
  walk(dir);
  return out;
}

export function sha256File(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Hashes of the protected set, so a before/after comparison is data, not prose. */
export function protectedSnapshot(projectRoot) {
  const snapshot = {};
  for (const rel of INDEX.fixture.protected) {
    const full = path.join(projectRoot, rel);
    if (!existsSync(full)) throw new CaseInvalid("fixture", `declared protected path ${rel} is missing`);
    if (lstatSync(full).isDirectory()) {
      for (const inner of listDir(full)) {
        const innerAbs = path.join(full, inner);
        if (!lstatSync(innerAbs).isFile()) continue;
        snapshot[`${rel}/${inner}`] = sha256File(innerAbs);
      }
    } else {
      snapshot[rel] = sha256File(full);
    }
  }
  return snapshot;
}

/** The only writer. Takes a path that already came out of `bindReportPath`. */
export function writeObservedReport(boundPath, report) {
  mkdirSync(path.dirname(boundPath), { recursive: true });
  writeFileSync(boundPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return boundPath;
}

/**
 * Enforce that each report belongs to the invocation that produced it and that a
 * clean control is actually clean. Returns every failure; empty means pass.
 * Each side is `{caseManifest, invocation, report, sha256}`.
 */
export function validatePair({ planted, clean }) {
  const failures = [];
  const push = (code, detail) => failures.push({ code, detail });

  for (const [slot, side] of [["planted", planted], ["clean", clean]]) {
    if (!side || !side.report) push("report-missing", `${slot} report absent after an otherwise evaluable run`);
  }
  if (failures.length) return { ok: false, failures };

  for (const [slot, side] of [["planted", planted], ["clean", clean]]) {
    if (side.report.invocation_id !== side.invocation.invocationId) {
      push("invocation-binding-mismatch", `${slot} report carries invocation_id ${side.report.invocation_id}, invocation is ${side.invocation.invocationId}`);
    }
    if (side.report.case_id !== side.caseManifest.case_id) {
      push("case-binding-mismatch", `${slot} report carries case_id ${side.report.case_id}, slot is ${side.caseManifest.case_id}`);
    }
  }

  if (planted.report.invocation_id === clean.report.invocation_id) {
    push("invocation-binding-mismatch", "planted and clean reports share one invocation_id");
  }
  if (planted.sha256 && planted.sha256 === clean.sha256) {
    push("invocation-binding-mismatch", "planted and clean report bodies are byte-identical");
  }

  if (planted.report.observed_verify_outcome !== "defect-detected") {
    push("planted-not-detected", `planted outcome was ${planted.report.observed_verify_outcome}`);
  }
  if (!planted.report.observed_defect_key) {
    push("planted-not-detected", "planted report cites no observed_defect_key");
  }
  if (clean.report.clean_project_failed === true) {
    push("clean-false-positive", "clean control reported clean_project_failed=true");
  }
  if (clean.report.observed_verify_outcome !== "clean") {
    push("clean-not-clean", `clean outcome was ${clean.report.observed_verify_outcome}`);
  }
  return { ok: failures.length === 0, failures };
}
