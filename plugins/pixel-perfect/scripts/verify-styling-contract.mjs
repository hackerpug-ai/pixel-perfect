#!/usr/bin/env node
// verify-styling-contract.mjs — deterministic contract gate (styling and component).
//
// Reads a contract (.md with frontmatter + a ```json checks block under "## Checks"),
// runs its forbiddenPatterns / mustInclude detections against a source tree, and
// reports violations. Zero runtime dependencies: globs are matched by a vendored
// minimatch-subset and the checks block is JSON.parse'd.
//
// Two invocation modes:
//
//   Positional — the contract and the scan root are named directly:
//     node verify-styling-contract.mjs <contract.md> <source-root> [--allow GLOB]... [--json]
//
//   Manifest — the contract, the scan root and the component coverage come from
//   <project-root>/design/manifest.json:
//     node verify-styling-contract.mjs --manifest <project-root> --platform <id>
//         --kind styling|component [--layer atoms|molecules|organisms|screens]
//         [--files <path>...] [--json]
//
//   Manifest mode scans platforms[id].root (default "."). Every component file the
//   manifest records for the scope must lie under that root and be in scope of at
//   least one check of the contract, or the run fails with exit 3. Overrides in
//   tools.{style,component}_contract_overrides are exemptions; an exempted file counts
//   as covered.
//
// Exit codes:
//   0 = clean (or no contract in force, or enforcement off)
//   1 = violations found (enforcement hard-fail; warn reports them and exits 0)
//   2 = usage, configuration or contract error, including a missing scan root or a
//       recorded component file that does not exist
//   3 = scope failure: a recorded component file is outside every check's scope, or
//       (manifest records no component files) the checks matched zero files — the
//       vacuous-scan guard, which exists so a wrong root can never pass silently

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest, resolvePlatform } from "./verify-catalog.mjs";

// ---------------------------------------------------------------------------
// Vendored glob matcher (minimatch subset: **, *, ?, [..], [!..], {a,b} braces)
// ---------------------------------------------------------------------------

function braceExpand(pattern) {
  const start = pattern.indexOf("{");
  if (start === -1) return [pattern];
  let depth = 0, end = -1;
  for (let i = start; i < pattern.length; i++) {
    if (pattern[i] === "{") depth++;
    else if (pattern[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return [pattern]; // unbalanced — treat literally
  const head = pattern.slice(0, start);
  const body = pattern.slice(start + 1, end);
  const tail = pattern.slice(end + 1);
  const opts = body.split(",");
  const out = [];
  for (const opt of opts) for (const expanded of braceExpand(tail)) out.push(head + opt + expanded);
  return out;
}

const escapeRe = (s) => s.replace(/[.+()$^|\\]/g, "\\$&");

// Single-pass glob -> regex. `**` is handled as a globstar: `**/` becomes
// "(?:.*/)?" (zero or more directories) and a bare `**` becomes ".*". `*` does
// not cross "/", `?` matches one non-slash, [..]/[!..] are char classes. Braces
// are expanded by the caller (makeMatcher) before this runs.
function globToRegex(pattern) {
  let r = "^";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === "*" && pattern[i + 1] === "*") {
      i += 2;
      if (pattern[i] === "/") { i++; r += "(?:.*/)?"; } // **/  -> zero+ dirs
      else { r += ".*"; }                                 // bare **
    } else if (c === "*") { r += "[^/]*"; i++; }
    else if (c === "?") { r += "[^/]"; i++; }
    else if (c === "[") {
      const j = pattern.indexOf("]", i + 1);
      if (j === -1) { r += "\\["; i++; }
      else {
        let cls = pattern.slice(i + 1, j);
        if (cls.startsWith("!")) cls = "^" + cls.slice(1);
        r += "[" + cls + "]"; i = j + 1;
      }
    } else if (c === "/") { r += "/"; i++; }
    else { r += escapeRe(c); i++; }
  }
  return new RegExp(r + "$");
}

function makeMatcher(patterns) {
  const expanded = [];
  for (const p of patterns) for (const e of braceExpand(p)) expanded.push(globToRegex(e));
  return (path) => expanded.some((re) => re.test(path));
}

// ---------------------------------------------------------------------------
// Errors and filesystem helpers
// ---------------------------------------------------------------------------

// A configuration or contract problem. The CLI maps it to exit 2. A caller of
// runManifestGate catches it and reads exitCode.
export class GateError extends Error {
  constructor(message) {
    super(message);
    this.name = "GateError";
    this.exitCode = 2;
  }
}

function isDirectory(path) {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

function isFile(path) {
  try { return statSync(path).isFile(); } catch { return false; }
}

function assertDirectory(dir, label) {
  if (!isDirectory(dir)) throw new GateError(`${label} not found or not a directory: ${dir}`);
}

function readText(root, file) {
  try {
    return readFileSync(join(root, file), "utf8");
  } catch (e) {
    throw new GateError(`cannot read ${join(root, file)}: ${e.message}`);
  }
}

// Path of a file inside the scan root, relative to it, or null when the file lies
// outside the scan root. `file` is relative to projectRoot, or absolute.
function scanRelative(projectRoot, scanRoot, file) {
  const rel = relative(scanRoot, resolve(projectRoot, file));
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null;
  return rel;
}

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage", ".cache"]);

function walk(root, acc = []) {
  let entries;
  try { entries = readdirSync(root); } catch { return acc; }
  for (const name of entries) {
    if (name.startsWith(".design") ) continue; // never scan design artifacts
    const full = join(root, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

// ---------------------------------------------------------------------------
// Contract parsing
// ---------------------------------------------------------------------------

function parseContract(path) {
  const md = readFileSync(path, "utf8");

  // frontmatter (first fenced --- block) — read only scalar fields the gate needs
  const fm = {};
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    for (const line of fmMatch[1].split("\n")) {
      const m = line.match(/^([A-Za-z]+):\s*(.+?)\s*$/);
      if (m && !m[2].startsWith("[")) fm[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }

  // the checks block — the ```json fence directly under the "## Checks" heading.
  // Anchoring to the heading (not "first json fence in the file") keeps parsing
  // correct even if a contract body contains an unrelated ```json code example.
  const checksHeading = md.indexOf("## Checks");
  if (checksHeading === -1) throw new Error(`${path} has no '## Checks' section`);
  const jsonMatch = md.slice(checksHeading).match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) throw new Error(`No \`\`\`json checks block found under '## Checks' in ${path}`);
  const raw = jsonMatch[1].trim();
  if (!raw) throw new Error(`Checks block under '## Checks' in ${path} is empty`);
  let checks;
  try { checks = JSON.parse(raw); } catch (e) { throw new Error(`Checks block in ${path} is not valid JSON: ${e.message}`); }
  if (!Array.isArray(checks.forbiddenPatterns)) checks.forbiddenPatterns = [];
  if (!Array.isArray(checks.mustInclude)) checks.mustInclude = [];
  // A contract with no checks enforces nothing — reject it rather than silently pass.
  if (checks.forbiddenPatterns.length === 0 && checks.mustInclude.length === 0) {
    throw new Error(`${path}: checks block defines no forbiddenPatterns and no mustInclude — it would enforce nothing`);
  }

  // compile + validate every regex up front (fail fast on a bad contract)
  for (const list of [checks.forbiddenPatterns, checks.mustInclude]) {
    for (const c of list) {
      if (!c.id) throw new Error(`A check in ${path} is missing 'id'`);
      if (!Array.isArray(c.glob) || c.glob.length === 0) throw new Error(`Check '${c.id}' in ${path} is missing 'glob'`);
      if (!c.mode) c.mode = "content";
      // `exists` checks match on the glob alone; every other mode needs a regex.
      if (!c.regex && c.mode !== "exists") throw new Error(`Check '${c.id}' in ${path} is missing 'regex'`);
      if (c.regex) {
        try { c._re = new RegExp(c.regex); } catch (e) { throw new Error(`Check '${c.id}' in ${path} has invalid regex '${c.regex}': ${e.message}`); }
      }
      c._include = makeMatcher(c.glob);
      c._exclude = Array.isArray(c.exclude) && c.exclude.length ? makeMatcher(c.exclude) : null;
    }
  }
  return { id: fm.id || "(unknown)", name: fm.name || "(unnamed)", checks };
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

// A file is in a check's scope when the check's glob matches it and its own exclude does not.
// `alt` is the same file's path from the project root, given when the scan root is a folder
// inside the project. A shipped contract names paths from the app root ("src/**"); a contract
// authored in a monorepo names them from the repo root ("apps/site/src/**"). A glob or an
// exclude may match either form.
function inCheckScope(check, file, alt = null) {
  const hits = (matcher) => matcher(file) || (alt !== null && matcher(alt));
  if (!hits(check._include)) return false;
  return !(check._exclude && hits(check._exclude));
}

// True when the check's glob reaches the file, whether or not its exclude then removes it.
function reachedByCheck(check, file, alt = null) {
  return check._include(file) || (alt !== null && check._include(alt));
}

const VACUOUS_WARNING = (scanned, root) =>
  `The contract's globs matched 0 of ${scanned} file(s) under "${root}". ` +
  `A vacuous pass — likely the wrong source-root. Pass the PROJECT ROOT (the dir containing src/), not src/.`;

// Runs every check over allFiles. `exempt(file)` is true for files an override excludes;
// they are never scoped and never evaluated. `altOf(file)` gives the file's project-root
// path when that differs from its scan-root path (see inCheckScope).
function runChecks(parsed, sourceRoot, allFiles, exempt, altOf = () => null) {
  const { forbiddenPatterns, mustInclude } = parsed.checks;
  const violations = [];
  const scoped = new Set(); // files that at least one check evaluated
  const counts = new Map(); // check object -> files it scoped

  const visit = (c, file) => {
    counts.set(c, counts.get(c) + 1);
    scoped.add(file);
  };

  for (const c of forbiddenPatterns) {
    counts.set(c, 0);
    for (const file of allFiles) {
      if (exempt(file) || !inCheckScope(c, file, altOf(file))) continue;
      visit(c, file);
      const forbidden = { type: "forbidden", checkId: c.id, file, rationale: c.rationale || "" };
      if (c.mode === "exists") { violations.push(forbidden); continue; }
      const content = readText(sourceRoot, file);
      // Whole-file mode: the regex is tested against the entire file content, so it can
      // span newlines. Required for a multi-line import list, which a formatter produces
      // once the specifiers exceed the print width. Reported without a line number.
      if (c.mode === "file") {
        if (c._re.test(content)) violations.push(forbidden);
        continue;
      }
      // content mode: first matching line per file
      const lines = content.split("\n");
      const hit = lines.findIndex((line) => c._re.test(line));
      if (hit !== -1) {
        violations.push({ ...forbidden, line: hit + 1, sample: lines[hit].trim().slice(0, 160) });
      }
    }
  }

  for (const c of mustInclude) {
    counts.set(c, 0);
    for (const file of allFiles) {
      if (exempt(file) || !inCheckScope(c, file, altOf(file))) continue;
      visit(c, file);
      const content = readText(sourceRoot, file);
      if (!content.split("\n").some((line) => c._re.test(line))) {
        violations.push({ type: "mustInclude", checkId: c.id, file, description: c.description || "" });
      }
    }
  }

  const checks = [
    ...forbiddenPatterns.map((c) => ({ c, kind: "forbidden" })),
    ...mustInclude.map((c) => ({ c, kind: "mustInclude" })),
  ].map(({ c, kind }) => ({
    id: c.id,
    kind,
    mode: c.mode,
    scoped: counts.get(c),
    vacuous: counts.get(c) === 0,
  }));

  return { violations, scoped, checks };
}

const countType = (violations, type) => violations.filter((v) => v.type === type).length;

// Positional mode: contract and scan root named directly. `allowGlobs` are exemptions.
export function detect(contractPath, sourceRoot, allowGlobs = []) {
  const parsed = parseContract(contractPath);
  assertDirectory(sourceRoot, "source root");
  const allFiles = walk(sourceRoot).map((f) => relative(sourceRoot, f));
  const exempt = allowGlobs.length ? makeMatcher(allowGlobs) : () => false;
  const { violations, scoped, checks } = runChecks(parsed, sourceRoot, allFiles, exempt);

  // Vacuous-scan guard: a contract that matched zero files usually means the
  // wrong source-root was passed (e.g. `src/` instead of the project root, so
  // globs like `src/components/**` match nothing). That silently passes — surface it.
  const warnings = [];
  if (checks.length > 0 && scoped.size === 0) warnings.push(VACUOUS_WARNING(allFiles.length, sourceRoot));

  return {
    contract: { id: parsed.id, name: parsed.name },
    sourceRoot,
    summary: {
      total: violations.length,
      forbidden: countType(violations, "forbidden"),
      mustInclude: countType(violations, "mustInclude"),
      filesScanned: allFiles.length,
      filesInScope: scoped.size,
      hasChecks: checks.length,
    },
    checks,
    warnings,
    violations,
  };
}

// ---------------------------------------------------------------------------
// Manifest mode
// ---------------------------------------------------------------------------

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LAYERS = ["atoms", "molecules", "organisms", "screens"];
const ENFORCEMENT = ["hard-fail", "warn", "off"];
const CONTRACT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const GLOB_CHARS = /[*?[\]{}]/;
const QUALIFIED_KEY = /^(atoms|molecules|organisms|screens)\/(.+)$/;

// Per kind: the manifest field prefix and where each contract source lives.
// builtin contracts ship in the plugin. researched ones are cached per project. A manual one
// is authored in the project at docs/{builtinDir}/{id}.md; the plugin's folder is the fallback.
const KINDS = {
  styling: {
    prefix: "style_contract",
    builtinDir: "styling-contracts",
    researchedDir: "design/research/styling",
  },
  component: {
    prefix: "component_contract",
    builtinDir: "component-contracts",
    researchedDir: "design/research/libraries",
  },
};

const itemLabel = (e) => `${e.layer}/${e.name ?? "(unnamed)"}`;

// Resolves the contract for a kind from the platform's tools block.
// - source "none" (the literal string) is the only way to have no contract in force.
// - source absent is always an error, whatever else is recorded.
// enforcement is validated whenever it is present, even when no contract is in force.
export function resolveContract(platformId, projectRoot, kind, tools) {
  const { prefix, builtinDir, researchedDir } = KINDS[kind];
  const rawEnforcement = tools[`${prefix}_enforcement`];
  if (rawEnforcement !== undefined && !ENFORCEMENT.includes(rawEnforcement)) {
    throw new GateError(`tools.${prefix}_enforcement must be hard-fail, warn or off (got ${JSON.stringify(rawEnforcement)})`);
  }
  const enforcement = rawEnforcement ?? "hard-fail";
  const id = tools[prefix] ?? null;
  const source = tools[`${prefix}_source`] ?? null;
  if (source === null) {
    throw new GateError(
      `no ${kind} contract source is recorded for platform ${platformId}; record one or set tools.${prefix}_source to "none"`
    );
  }
  if (source === "none") return { id, source, enforcement, inForce: false, path: null };
  if (!["builtin", "researched", "manual"].includes(source)) {
    throw new GateError(`tools.${prefix}_source must be builtin, researched, manual or none (got ${JSON.stringify(source)})`);
  }
  if (typeof id !== "string" || !CONTRACT_ID.test(id)) {
    throw new GateError(`tools.${prefix} must name a contract id (got ${JSON.stringify(id)})`);
  }
  const shipped = join(PLUGIN_ROOT, "docs", builtinDir, `${id}.md`);
  const authored = join(projectRoot, "docs", builtinDir, `${id}.md`);
  let path = shipped;
  if (source === "researched") path = join(projectRoot, researchedDir, `${id}.md`);
  else if (source === "manual") path = isFile(authored) || !isFile(shipped) ? authored : shipped;
  return { id, source, enforcement, inForce: true, path };
}

// Every item the platform records, across all four layers.
function platformEntries(platformCfg) {
  const entries = [];
  for (const layer of LAYERS) {
    const list = Array.isArray(platformCfg[layer]) ? platformCfg[layer] : [];
    for (const entry of list) {
      entries.push({
        layer,
        name: typeof entry?.name === "string" ? entry.name : null,
        status: typeof entry?.status === "string" ? entry.status : null,
        file: typeof entry?.file === "string" && entry.file.length > 0 ? entry.file : null,
      });
    }
  }
  return entries;
}

// An item is not built yet only when its status is "pending" AND its recorded file is
// absent on disk. Every other item is built and must record a file.
function isPendingItem(e, root) {
  return e.status === "pending" && (e.file === null || !isFile(resolve(root, e.file)));
}

// Turns tools.*_contract_overrides into exemptions. Every value must be a non-empty reason.
// A key of exactly "<layer>/<Name>" names one item. Any other key with "/" or a glob character
// is a glob, used as written relative to the scan root. Any other key is a name: it must match
// exactly one item.
function resolveOverrides(raw, entries, root, scanRoot, prefix) {
  if (raw === undefined || raw === null) return [];
  const where = `tools.${prefix}_overrides`;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new GateError(`${where} must be an object of {componentName: reason}`);
  }
  const byItem = (key, reason, item) => {
    if (item.file === null) throw new GateError(`${where} key "${key}" names ${itemLabel(item)}, which records no file`);
    const rel = scanRelative(root, scanRoot, item.file);
    if (rel === null) throw new GateError(`${where} key "${key}" resolves to ${item.file}, which is outside the scan root`);
    return { key, form: "name", pattern: null, reason, match: (file) => file === rel };
  };
  return Object.keys(raw).map((key) => {
    const reason = raw[key];
    if (typeof reason !== "string" || reason.trim() === "") {
      throw new GateError(`${where} key "${key}" needs a non-empty string reason`);
    }
    const qualified = key.match(QUALIFIED_KEY);
    const qualifiedItem = qualified && entries.find((e) => e.layer === qualified[1] && e.name === qualified[2]);
    if (qualifiedItem) return byItem(key, reason, qualifiedItem);
    if (key.includes("/") || GLOB_CHARS.test(key)) {
      return { key, form: "glob", pattern: key, reason, match: makeMatcher([key]) };
    }
    const named = entries.filter((e) => e.name === key);
    if (named.length === 0) {
      throw new GateError(`${where} key "${key}" names no component in this platform's atoms, molecules, organisms or screens`);
    }
    if (named.length > 1) {
      throw new GateError(`override "${key}" matches ${named.map(itemLabel).join(" and ")}; use the form layer/Name`);
    }
    return byItem(key, reason, named[0]);
  });
}

const COVERAGE_REASON = {
  "outside-root": "outside the scan root",
  "not-scanned": "not scanned: the path lies in a directory the scanner skips (node_modules, dist, build, .next, .turbo, coverage, .cache) or in a .design* path",
  "case-mismatch": "recorded path differs from the file on disk only by letter case",
  "out-of-scope": "no check's glob matches it",
};

// Runs the gate for one contract kind on one platform of a project manifest.
// Returns the result object (exitCode included). Throws GateError (exitCode 2) for
// configuration and contract problems.
export function runManifestGate({ projectRoot, platform, kind, layer = null, files = null }) {
  if (!Object.hasOwn(KINDS, kind)) throw new GateError(`--kind must be styling or component (got ${JSON.stringify(kind)})`);
  if (layer !== null && !LAYERS.includes(layer)) throw new GateError(`--layer must be one of ${LAYERS.join(", ")} (got "${layer}")`);
  if (layer !== null && files !== null) throw new GateError("--layer and --files cannot be combined: --files names its own coverage set");
  if (typeof platform !== "string" || platform === "") throw new GateError("a platform id is required (--platform)");
  if (typeof projectRoot !== "string" || projectRoot === "") throw new GateError("a project root is required (--manifest)");

  const root = resolve(projectRoot);
  const { prefix } = KINDS[kind];

  let resolved;
  let manifest;
  try {
    manifest = loadManifest(root);
    resolved = resolvePlatform(manifest, platform);
  } catch (e) {
    throw new GateError(e.message);
  }
  const platformId = resolved.id;
  const cfg = resolved.config;
  if (!cfg.tools || typeof cfg.tools !== "object" || Array.isArray(cfg.tools)) {
    throw new GateError(`platform ${platformId} has no tools object in design/manifest.json; the contract sources cannot be read`);
  }
  const tools = cfg.tools;
  const contract = resolveContract(platformId, root, kind, tools);
  const base = {
    mode: "manifest",
    kind,
    platform: platformId,
    projectRoot: root,
    inForce: contract.inForce,
    enforcement: contract.enforcement,
  };
  const notRun = (note) => ({
    ...base,
    exitCode: 0,
    scanned: false,
    note,
    contract: { id: contract.id, name: null, source: contract.source, path: contract.path },
    scanRoot: null,
    scanRootRel: null,
    summary: null,
    checks: [],
    overrides: [],
    coverage: null,
    unrecordedInScope: [],
    vacuousChecks: [],
    warnings: [],
    message: null,
    violations: [],
  });

  if (!contract.inForce) return notRun(`source is "none" for ${kind} on platform ${platformId}: no contract in force`);

  // Root and contract are validated even when enforcement is off, so a broken configuration
  // is exit 2 and never hidden behind a skipped gate.
  const scanRelRoot = cfg.root ?? ".";
  if (typeof scanRelRoot !== "string") throw new GateError(`platforms.${platformId}.root must be a path string`);
  const scanRoot = resolve(root, scanRelRoot);
  if (!isDirectory(scanRoot)) {
    throw new GateError(`scan root not found: ${scanRoot} (platforms.${platformId}.root is "${scanRelRoot}")`);
  }
  if (!existsSync(contract.path)) throw new GateError(`${kind} contract not found: ${contract.path}`);
  let parsed;
  try {
    parsed = parseContract(contract.path);
  } catch (e) {
    throw new GateError(e.message);
  }
  if (contract.enforcement === "off") {
    return notRun(`enforcement is "off" for ${kind} on platform ${platformId}: the gate did not scan`);
  }
  const checks = [...parsed.checks.forbiddenPatterns, ...parsed.checks.mustInclude];

  const entries = platformEntries(cfg);
  const scopeEntries = entries.filter((e) => layer === null || e.layer === layer);
  const layerEmpty = layer !== null && scopeEntries.length === 0;
  const overrides = resolveOverrides(tools[`${prefix}_overrides`], entries, root, scanRoot, prefix);

  // Coverage set: exactly --files when given. Otherwise the built items of the scope.
  const scopeLabel = files !== null ? "--files" : (layer ?? "all layers");
  const pending = [];
  const built = [];
  if (files === null) {
    for (const e of scopeEntries) {
      if (isPendingItem(e, root)) {
        pending.push({ file: e.file, layer: e.layer, name: e.name, status: "pending" });
      } else if (e.file === null) {
        throw new GateError(
          `manifest item "${e.name ?? "(unnamed)"}" (${e.layer}, status ${e.status === null ? "absent" : `"${e.status}"`}) ` +
          `records no file; record its file, or set its status to "pending" until it is built`
        );
      } else {
        built.push({ file: e.file, layer: e.layer, name: e.name });
      }
    }
  }
  const targets = files !== null
    ? files.map((f) => ({ file: relative(root, resolve(root, f)), layer: null, name: null }))
    : built;

  const missing = targets.filter((t) => !isFile(resolve(root, t.file))).map((t) => t.file);
  if (missing.length > 0) {
    throw new GateError(`${missing.length} component file(s) are missing or not regular files: ${missing.join(", ")}`);
  }

  const allFiles = walk(scanRoot).map((f) => relative(scanRoot, f));
  const walked = new Set(allFiles);
  const walkedByLowerCase = new Map(allFiles.map((f) => [f.toLowerCase(), f]));
  const exempt = (file) => overrides.some((o) => o.match(file));
  // The file's path from the project root, when the scan root is a folder inside the project.
  const altOf = scanRoot === root ? () => null : (file) => relative(root, join(scanRoot, file));

  const coverage = targets.map((t) => {
    const scanFile = scanRelative(root, scanRoot, t.file);
    let status;
    if (scanFile === null) status = "outside-root";
    else if (!walked.has(scanFile)) status = walkedByLowerCase.has(scanFile.toLowerCase()) ? "case-mismatch" : "not-scanned";
    else if (exempt(scanFile)) status = "exempted";
    else if (checks.some((c) => inCheckScope(c, scanFile, altOf(scanFile)))) status = "in-scope";
    // The scan reached the file, and the contract's own exclude list leaves it out (a
    // vendored primitive folder, say). That is the contract's decision, not a scan that
    // missed the file, so it is not a coverage failure. It is reported by name.
    else if (checks.some((c) => reachedByCheck(c, scanFile, altOf(scanFile)))) status = "contract-excluded";
    else status = "out-of-scope";
    return { file: t.file, layer: t.layer, name: t.name, scanFile, status };
  });
  const isCovered = (c) => c.status === "in-scope" || c.status === "exempted" || c.status === "contract-excluded";
  const covered = coverage.filter(isCovered);
  const failures = coverage.filter((c) => !isCovered(c)).map((c) => ({
    file: c.file,
    status: c.status,
    reason: COVERAGE_REASON[c.status],
  }));
  const coverageMessage = failures.length === 0
    ? null
    : `${failures.length} component files are outside every check's scope: ${failures.map((f) => f.file).join(", ")}`;
  const allExempt = coverage.length > 0 && coverage.every((c) => c.status === "exempted");

  const { violations: allViolations, scoped, checks: checkReport } = runChecks(parsed, scanRoot, allFiles, exempt, altOf);
  const scopedFiles = files !== null ? new Set(coverage.map((c) => c.scanFile).filter((f) => f !== null)) : null;
  const violations = scopedFiles === null ? allViolations : allViolations.filter((v) => scopedFiles.has(v.file));

  // Files a check would scope but no manifest item records. Not a failure: reported so a
  // reader can see what the manifest does not account for.
  const recorded = new Set(entries.map((e) => (e.file === null ? null : scanRelative(root, scanRoot, e.file))).filter((f) => f !== null));
  const unrecordedInScope = allFiles
    .filter((f) => !recorded.has(f) && checks.some((c) => inCheckScope(c, f, altOf(f))))
    .map((f) => relative(root, join(scanRoot, f)));
  const vacuousChecks = checkReport.filter((c) => c.vacuous).map((c) => c.id);

  const warnings = [];
  const coverageApplied = targets.length > 0;
  let vacuous = false;
  if (!coverageApplied) {
    warnings.push(`no built component files are recorded for ${scopeLabel}: applying the global vacuous-scan guard only`);
    if (checks.length > 0 && scoped.size === 0) {
      vacuous = true;
      warnings.push(VACUOUS_WARNING(allFiles.length, scanRoot));
    }
  }

  const messages = [];
  if (layerEmpty) messages.push(`layer ${layer} has no recorded items`);
  if (allExempt) messages.push("overrides exempt every recorded component file");
  if (coverageMessage !== null) messages.push(coverageMessage);

  let exitCode = 0;
  if (messages.length > 0 || vacuous) exitCode = 3;
  else if (violations.length > 0 && contract.enforcement === "hard-fail") exitCode = 1;

  return {
    ...base,
    exitCode,
    scanned: true,
    note: null,
    contract: { id: contract.id, name: parsed.name, source: contract.source, path: contract.path },
    scanRoot,
    scanRootRel: relative(root, scanRoot) || ".",
    summary: {
      total: violations.length,
      forbidden: countType(violations, "forbidden"),
      mustInclude: countType(violations, "mustInclude"),
      filesScanned: allFiles.length,
      filesInScope: scoped.size,
      hasChecks: checks.length,
    },
    checks: checkReport,
    overrides: overrides.map((o) => ({
      key: o.key,
      form: o.form,
      reason: o.reason,
      pattern: o.form === "glob" ? o.pattern : null,
      files: allFiles.filter((f) => o.match(f)),
    })),
    coverage: {
      applied: coverageApplied,
      scope: scopeLabel,
      reason: coverageApplied ? null : `the manifest records no built component files for ${scopeLabel}`,
      required: targets.length,
      covered: covered.length,
      files: coverage,
      failures,
      pending,
    },
    unrecordedInScope,
    vacuousChecks,
    warnings,
    message: messages.length > 0 ? messages.join("; ") : null,
    violations,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "UsageError";
  }
}

function usage() {
  process.stderr.write(
    "Usage:\n" +
    "  verify-styling-contract.mjs <contract.md> <source-root> [--allow GLOB]... [--json]\n" +
    "  verify-styling-contract.mjs --manifest <project-root> --platform <id> --kind styling|component\n" +
    "      [--layer atoms|molecules|organisms|screens] [--files <path>...] [--json]\n"
  );
}

function parseArgs(argv) {
  const args = {
    positional: [], allow: [], json: false, help: false,
    manifest: null, platform: null, kind: null, layer: null, files: null,
  };
  const manifestOnly = [];
  const takeValue = (i, flag) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new UsageError(`${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--json": args.json = true; break;
      case "-h": case "--help": args.help = true; break;
      case "--allow": args.allow.push(takeValue(i, a)); i++; break;
      case "--manifest": args.manifest = takeValue(i, a); i++; break;
      case "--platform": args.platform = takeValue(i, a); manifestOnly.push(a); i++; break;
      case "--kind": args.kind = takeValue(i, a); manifestOnly.push(a); i++; break;
      case "--layer": args.layer = takeValue(i, a); manifestOnly.push(a); i++; break;
      case "--files": {
        args.files = args.files ?? [];
        while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) args.files.push(argv[++i]);
        if (args.files.length === 0) throw new UsageError("--files needs at least one path");
        manifestOnly.push(a);
        break;
      }
      default:
        if (a.startsWith("--")) throw new UsageError(`unknown flag ${a}`);
        args.positional.push(a);
    }
  }
  if (args.manifest !== null) {
    if (args.positional.length > 0 || args.allow.length > 0) {
      throw new UsageError("--manifest takes no positional paths or --allow: overrides come from the manifest");
    }
    if (args.platform === null || args.kind === null) throw new UsageError("--manifest needs --platform and --kind");
  } else if (manifestOnly.length > 0) {
    throw new UsageError(`${manifestOnly.join(", ")} requires --manifest`);
  }
  return args;
}

function formatViolation(v) {
  const where = v.line ? `${v.file}:${v.line}` : v.file;
  const detail = v.type === "forbidden" ? `forbidden '${v.checkId}'` : `missing '${v.checkId}'`;
  const why = v.rationale || v.description || "";
  const sample = v.sample ? `  | ${v.sample}` : "";
  return `  ${where} — ${detail}. ${why}\n${sample}\n`;
}

function runPositional(args) {
  if (args.positional.length < 2) { usage(); return 2; }
  const [contractPath, sourceRoot] = args.positional;

  let report;
  try { report = detect(contractPath, sourceRoot, args.allow); }
  catch (e) { process.stderr.write(`CONTRACT ERROR: ${e.message}\n`); return 2; }

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");

  if (!args.json) {
    const s = report.summary;
    process.stderr.write(
      `verify-styling-contract: scan root ${sourceRoot} — ${s.filesScanned} files walked, ${s.filesInScope} in scope\n`
    );
    if (report.violations.length === 0) {
      process.stderr.write(`✓ ${report.contract.id}: styling contract satisfied (${s.total} violations).\n`);
    } else {
      process.stderr.write(`✗ ${report.contract.id}: ${report.violations.length} violation(s) — layer blocked.\n`);
      for (const v of report.violations) process.stderr.write(formatViolation(v));
    }
    for (const w of report.warnings) process.stderr.write(`⚠ ${report.contract.id}: ${w}\n`);
  }
  // A vacuous scan (checks present, zero files matched) is treated as a hard
  // failure, not a silent pass — it almost always means the wrong source-root,
  // and silently "passing" would defeat the gate.
  const vacuous = report.warnings.length > 0;
  return vacuous ? 3 : (report.violations.length === 0 ? 0 : 1);
}

function writeManifestText(r) {
  const id = r.contract.id ?? "(none)";
  if (!r.scanned) {
    process.stderr.write(`GATE DID NOT RUN: ${r.note}\n`);
    return;
  }
  const c = r.coverage;
  const pendingNames = c.pending.map((p) => `${p.layer}/${p.name ?? p.file}`);
  const pendingText = pendingNames.length > 0 && pendingNames.length <= 5
    ? `${c.pending.length} pending (${pendingNames.join(", ")})`
    : `${c.pending.length} pending`;
  const coverageText = c.applied
    ? `${c.covered} of ${c.required} built component file(s) covered`
    : "no built component files (global guard)";
  const s = r.summary;
  const u = r.unrecordedInScope;
  const excluded = c.files.filter((file) => file.status === "contract-excluded").map((file) => file.file);
  process.stderr.write(
    `verify-styling-contract: scan root ${r.scanRootRel} — ${s.filesScanned} files walked, ${s.filesInScope} in scope, ` +
    `${coverageText}, ${pendingText}, ${u.length} unrecorded in scope\n`
  );
  if (excluded.length > 0) {
    process.stderr.write(`  NOT CHECKED, excluded by the contract's own exclude list (${excluded.length}): ${excluded.join(", ")}\n`);
  }
  if (u.length > 0) {
    const more = u.length > 5 ? `, and ${u.length - 5} more` : "";
    process.stderr.write(`  unrecorded in scope: ${u.slice(0, 5).join(", ")}${more}\n`);
  }
  const shown = (f) => (r.scanRootRel === "." ? f : `${r.scanRootRel}/${f}`);
  for (const o of r.overrides) {
    const exempted = o.files.length > 0
      ? `exempts ${o.files.length} file(s): ${o.files.map(shown).join(", ")}`
      : "exempts 0 file(s) — nothing matched";
    process.stderr.write(`override ${o.key} (${o.form}): "${o.reason}" ${exempted}\n`);
  }
  if (r.violations.length === 0) {
    process.stderr.write(`✓ ${id}: ${r.kind} contract satisfied (0 violations).\n`);
  } else {
    const effect = r.enforcement === "warn" ? "reported only (enforcement warn)" : "layer blocked";
    process.stderr.write(`✗ ${id}: ${r.violations.length} violation(s) — ${effect}.\n`);
    for (const v of r.violations) process.stderr.write(formatViolation(v));
  }
  if (r.message !== null) {
    process.stderr.write(`✗ ${r.message}\n`);
    for (const f of c.failures) process.stderr.write(`  ${f.file} — ${f.reason}\n`);
  }
  if (r.vacuousChecks.length > 0) {
    process.stderr.write(`note: ${r.vacuousChecks.length} check(s) scoped 0 files: ${r.vacuousChecks.join(", ")}\n`);
  }
  for (const w of r.warnings) process.stderr.write(`⚠ ${id}: ${w}\n`);
}

function runManifest(args) {
  let result;
  try {
    result = runManifestGate({
      projectRoot: args.manifest,
      platform: args.platform,
      kind: args.kind,
      layer: args.layer,
      files: args.files,
    });
  } catch (e) {
    process.stderr.write(`CONFIG ERROR: ${e.message}\n`);
    return 2;
  }
  // JSON only with --json; the text report is the default output.
  if (args.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else writeManifestText(result);
  return result.exitCode;
}

function main(argv) {
  let args;
  try { args = parseArgs(argv); }
  catch (e) {
    if (e instanceof UsageError) {
      process.stderr.write(`USAGE ERROR: ${e.message}\n`);
      usage();
      return 2;
    }
    throw e;
  }
  if (args.help) { usage(); return 0; }
  return args.manifest === null ? runPositional(args) : runManifest(args);
}

export { braceExpand, globToRegex, makeMatcher, parseContract };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) process.exit(main(process.argv.slice(2)));
