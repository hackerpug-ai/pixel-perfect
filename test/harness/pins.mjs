// Pinned-version authority for the harness eval: test/harness/pins.json.
//
// Loads the manifest bytes, recomputes pins_sha256 from those exact bytes, builds the twelve-cell
// matrix, freezes each newest-version lookup once per run, and reconciles against package.json
// (read-only, never a grading authority). Nothing here can produce a `pass`: a verdict needs a real
// adapter grade.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const HARNESSES = ["claude-code", "codex", "grok", "opencode", "pi", "cursor"];
export const TRACKS = ["pinned", "newest"];
export const CHECKS = ["command_list", "status", "verify", "question_before_expensive_work"];
export const PINS_SCHEMA = "harness-pins/v1";
export const PINS_PATH = join(HERE, "pins.json");
export const REPO_ROOT = join(HERE, "..", "..");

// A range, a wildcard, or the `latest` alias is not an exact version.
const NOT_EXACT = /[\s^~<>*|]|latest/i;
// The credential names that exist in the harness-smoke environment, plus Cursor's own absent name.
const SECRET_NAME = /^(SMOKE_[A-Z0-9_]+|CURSOR_API_KEY)$/;

export class PinsError extends Error {
  constructor(reason, detail = {}) {
    super(`${reason}: ${JSON.stringify(detail)}`);
    this.name = "PinsError";
    this.reason = reason;
    this.detail = detail;
  }
}

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** The manifest, its exact bytes, and pins_sha256 computed from those bytes. */
export function loadPins({ path = PINS_PATH } = {}) {
  let bytes;
  try {
    bytes = readFileSync(path);
  } catch (cause) {
    throw new PinsError("manifest-missing", { path, cause: cause.code ?? String(cause) });
  }
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new PinsError("manifest-invalid-json", { path });
  }
  assertPinsManifest(manifest);
  return { path, bytes, manifest, pins_sha256: sha256Hex(bytes) };
}

export function assertPinsManifest(manifest) {
  if (manifest?.schema !== PINS_SCHEMA) throw new PinsError("manifest-schema-unknown", { schema: manifest?.schema });

  const names = Object.keys(manifest.harnesses ?? {});
  for (const harness of HARNESSES) {
    if (!names.includes(harness)) throw new PinsError("harness-missing", { harness });
  }
  for (const harness of names) {
    if (!HARNESSES.includes(harness)) throw new PinsError("harness-unknown", { harness });
  }

  for (const harness of HARNESSES) {
    const pin = manifest.harnesses[harness];
    const version = pin.pinned_cli_version;
    if (typeof version !== "string" || version.length === 0) throw new PinsError("version-missing", { harness });
    if (NOT_EXACT.test(version)) throw new PinsError("version-not-exact", { harness, value: version });
    for (const field of ["provider", "model", "model_kind", "credential_env", "binding_env", "newest_lookup"]) {
      if (typeof pin[field] !== "string" || pin[field].length === 0) {
        throw new PinsError("pin-field-missing", { harness, field });
      }
    }
    // Never invent a provider variable as the secret name: the secret is the harness-smoke name.
    if (!SECRET_NAME.test(pin.credential_env)) {
      throw new PinsError("credential-env-not-a-secret-name", { harness, credential_env: pin.credential_env });
    }
  }

  if (typeof manifest.fixer_cli_version !== "string" || NOT_EXACT.test(manifest.fixer_cli_version)) {
    throw new PinsError("fixer-version-invalid", { value: manifest.fixer_cli_version });
  }
  if (!Array.isArray(manifest.tracks) || manifest.tracks.join(",") !== TRACKS.join(",")) {
    throw new PinsError("tracks-invalid", { tracks: manifest.tracks });
  }
  if (!Array.isArray(manifest.checks) || manifest.checks.join(",") !== CHECKS.join(",")) {
    throw new PinsError("checks-invalid", { checks: manifest.checks });
  }
  if (!["unqualified", "qualified"].includes(manifest.qualification?.status)) {
    throw new PinsError("qualification-status-invalid", { status: manifest.qualification?.status });
  }

  const exceptions = manifest.exceptions ?? [];
  if (!Array.isArray(exceptions)) throw new PinsError("exceptions-invalid", {});
  for (const exception of exceptions) {
    for (const field of ["harness", "package_name", "reason"]) {
      if (typeof exception[field] !== "string" || exception[field].length === 0) {
        throw new PinsError("exception-incomplete", { field, exception });
      }
    }
    if (!HARNESSES.includes(exception.harness)) throw new PinsError("exception-unknown-harness", { exception });
  }

  return manifest;
}

/**
 * The twelve cells, built from pins and real observations. Grades are not produced here: every cell
 * is could-not-run with the reason the observation supports, so no cell can read pass without an
 * adapter that actually ran.
 */
export function cellsFromPins(manifest, { observed = {}, credentialEnv = {}, resolvedNewest = {}, installMode = "checkout" } = {}) {
  const cells = [];
  for (const harness of HARNESSES) {
    const pin = manifest.harnesses[harness];
    const seen = observed[harness] ?? null;
    const hasCredential = Boolean(credentialEnv[pin.credential_env]);
    for (const track of TRACKS) {
      const requested = track === "pinned" ? pin.pinned_cli_version : (resolvedNewest[harness] ?? null);
      let reason = "grade-not-performed";
      if (!hasCredential) reason = "missing-api-key";
      else if (seen === null) reason = "cli-not-installed";
      else if (requested === null) reason = "newest-version-not-resolved";
      else if (requested !== seen) reason = "installation-identity-mismatch";

      cells.push({
        harness,
        track,
        installation: {
          requested_cli_version: requested,
          resolved_cli_version: requested,
          observed_cli_version: seen,
          install_mode: installMode,
          plugin_revision: null,
          expected_plugin_manifest_sha256: null,
          observed_plugin_manifest_sha256: null,
          loaded_plugin_root: null,
          plugin_load_evidence: null,
        },
        verdict: "could-not-run",
        reason,
        invocation_id: null,
        check_id: null,
        process_exit_code: null,
        source: "pins-matrix",
        denied_tool_call: null,
        evidence_paths: [],
        report_paths: [],
        observed_verify_outcome: null,
        checks: CHECKS.map((check) => ({ check_id: check, verdict: "could-not-run", reason, source: "pins-matrix" })),
      });
    }
  }
  return cells;
}

/**
 * The result record's identity envelope: run identity, pins digest and the twelve cells. The caller
 * supplies the cells; this module never invents a grade.
 */
export function identityEnvelope({
  cells,
  pinsSha256,
  candidateSha = null,
  event = "workflow_dispatch",
  installMode = "checkout",
  now = new Date().toISOString(),
  repositoryFullName = "hackerpug-ai/pixel-perfect",
}) {
  const versions = {};
  for (const cell of cells) {
    versions[`${cell.harness}/${cell.track}`] = {
      requested: cell.installation.requested_cli_version,
      resolved: cell.installation.resolved_cli_version,
    };
  }
  return {
    schema: "harness-eval-result/v1",
    repository_id: null,
    repository_full_name: repositoryFullName,
    workflow_id: null,
    workflow_path: ".github/workflows/harness-eval.yml",
    workflow_source_sha: candidateSha,
    source_branch: "main",
    run_id: null,
    run_number: null,
    run_attempt: null,
    event,
    head_sha: candidateSha,
    candidate_sha: installMode === "published" ? null : candidateSha,
    install_mode: installMode,
    plugin_requested_ref: null,
    plugin_revision: null,
    expected_plugin_manifest_sha256: null,
    pins_sha256: pinsSha256,
    resolution_completed_at: now,
    versions,
    evaluation_started_at: null,
    evaluation_completed_at: null,
    cells,
    controls: [],
    later_checks: [],
    drift: null,
    release: null,
    fix: null,
  };
}

function defaultExec(command) {
  return execFileSync("bash", ["-c", command], {
    encoding: "utf8",
    timeout: 60_000,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

/** Extract the exact newest version from that harness's documented lookup output. */
export function parseLookupVersion(harness, output) {
  if (harness === "cursor") {
    const token = String(output).match(/downloads[.]cursor[.]com\/lab\/([0-9A-Za-z.-]+)/);
    return token ? token[1] : null;
  }
  const version = String(output).match(/(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/);
  return version ? version[1] : null;
}

/**
 * Newest-version lookups, frozen once per run: a second resolve of the same harness is served from
 * the first result, so pinned and newest cannot disagree inside one run. A failed lookup is null
 * (the newest track is then could-not-run), never a default.
 */
export function createVersionResolver({ manifest, exec = defaultExec } = {}) {
  const frozen = new Map();
  const ran = [];
  return {
    resolve(harness) {
      if (frozen.has(harness)) return frozen.get(harness);
      const pin = manifest?.harnesses?.[harness];
      if (!pin) throw new PinsError("harness-unknown", { harness });
      ran.push(pin.newest_lookup);
      let version = null;
      try {
        version = parseLookupVersion(harness, exec(pin.newest_lookup) ?? "");
      } catch {
        version = null;
      }
      frozen.set(harness, version);
      return version;
    },
    snapshot() {
      return Object.fromEntries(frozen);
    },
    commands() {
      return [...ran];
    },
  };
}

/**
 * pins.json vs package.json, read-only. A disagreement for the same harness is a failure unless
 * pins.json names it in exceptions[]; a named exception still reports both exact values.
 */
export function reconcilePackageJson({ manifest, packageJsonPath = join(REPO_ROOT, "package.json") }) {
  let packageJson;
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  } catch (cause) {
    throw new PinsError("package-json-unreadable", { packageJsonPath, cause: cause.code ?? String(cause) });
  }

  const declared = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) };
  const exceptions = new Map((manifest.exceptions ?? []).map((exception) => [exception.harness, exception]));
  const comparisons = [];
  const unnamedDisagreements = [];
  const unusedExceptions = [];

  for (const harness of HARNESSES) {
    const pin = manifest.harnesses[harness];
    const packageName = pin.package_name ?? null;
    if (!packageName || !(packageName in declared)) continue; // this harness is not pinned in package.json
    const pinsValue = pin.pinned_cli_version;
    const packageJsonValue = declared[packageName];
    const exception = exceptions.get(harness) ?? null;
    const agrees = pinsValue === packageJsonValue;
    if (exception) exceptions.delete(harness);
    comparisons.push({
      harness,
      package_name: packageName,
      pins_value: pinsValue,
      package_json_value: packageJsonValue,
      agrees,
      exception: agrees ? null : exception,
    });
    if (!agrees && !exception) unnamedDisagreements.push({ harness, pins_value: pinsValue, package_json_value: packageJsonValue });
    if (agrees && exception) unusedExceptions.push({ harness, exception, reason: "no-disagreement" });
  }

  for (const [harness, exception] of exceptions) unusedExceptions.push({ harness, exception, reason: "harness-not-in-package-json" });

  return { packageJsonPath, comparisons, unnamedDisagreements, unusedExceptions, agrees: unnamedDisagreements.length === 0 };
}

export function assertReconciled(report) {
  if (report.unnamedDisagreements.length > 0) {
    throw new PinsError("pins-package-disagreement", { disagreements: report.unnamedDisagreements });
  }
  if (report.unusedExceptions.length > 0) {
    throw new PinsError("exception-without-disagreement", { unused: report.unusedExceptions });
  }
  return report;
}
