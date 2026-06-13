#!/usr/bin/env node
// verify-styling-contract.mjs — deterministic styling-contract gate.
//
// Reads a styling contract (.md with YAML frontmatter + a ```json checks block),
// runs its forbiddenPatterns / mustInclude detections against a source tree, and
// exits non-zero with a structured report when any violation is found.
//
// Zero runtime dependencies: globs are matched by a vendored minimatch-subset and
// the checks block is JSON.parse'd, so this runs inside any user project.
//
// Usage:
//   node verify-styling-contract.mjs <contract.md> <source-root> [--allow GLOB]... [--json]
//
//   <contract.md>   path to a styling contract (docs/styling-contracts/*.md or
//                   a researched design/research/styling/*.md).
//   <source-root>   project source root to scan (usually the repo root or src/).
//   --allow GLOB    extra exclude glob (repeatable). BUILD passes one per manifest
//                   override (tools.style_contract_overrides) so legitimately-exempted
//                   files are not flagged.
//   --json          emit only the JSON report on stdout (suppress the human summary).
//
// Exit codes: 0 = clean (no violations); 1 = violations found; 2 = usage/parse error.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

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

  // the checks block — the only ```json fence in the file
  const jsonMatch = md.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) throw new Error(`No \`\`\`json checks block found in ${path}`);
  let checks;
  try { checks = JSON.parse(jsonMatch[1]); } catch (e) { throw new Error(`Checks block in ${path} is not valid JSON: ${e.message}`); }
  if (!Array.isArray(checks.forbiddenPatterns)) checks.forbiddenPatterns = [];
  if (!Array.isArray(checks.mustInclude)) checks.mustInclude = [];

  // compile + validate every regex up front (fail fast on a bad contract)
  for (const list of [checks.forbiddenPatterns, checks.mustInclude]) {
    for (const c of list) {
      if (!c.id) throw new Error(`A check in ${path} is missing 'id'`);
      if (!Array.isArray(c.glob) || c.glob.length === 0) throw new Error(`Check '${c.id}' in ${path} is missing 'glob'`);
      if (!c.regex) throw new Error(`Check '${c.id}' in ${path} is missing 'regex'`);
      try { c._re = new RegExp(c.regex); } catch (e) { throw new Error(`Check '${c.id}' in ${path} has invalid regex '${c.regex}': ${e.message}`); }
      if (!c.mode) c.mode = "content";
      c._include = makeMatcher(c.glob);
      c._exclude = Array.isArray(c.exclude) && c.exclude.length ? makeMatcher(c.exclude) : null;
    }
  }
  return { id: fm.id || "(unknown)", name: fm.name || "(unnamed)", checks };
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

function detect(contractPath, sourceRoot, allowGlobs) {
  const { id, name, checks } = parseContract(contractPath);
  const allFiles = walk(sourceRoot).map((f) => relative(sourceRoot, f));
  const allow = allowGlobs.length ? makeMatcher(allowGlobs) : null;

  const violations = [];

  function inScope(file, c) {
    if (!c._include(file)) return false;
    if (c._exclude && c._exclude(file)) return false;
    if (allow && allow(file)) return false;
    return true;
  }

  for (const c of checks.forbiddenPatterns) {
    if (c.mode === "exists") {
      for (const file of allFiles) {
        if (inScope(file, c)) {
          violations.push({ type: "forbidden", checkId: c.id, file, rationale: c.rationale || "" });
        }
      }
      continue;
    }
    // content mode: scan lines
    for (const file of allFiles) {
      if (!inScope(file, c)) continue;
      let content;
      try { content = readFileSync(join(sourceRoot, file), "utf8"); } catch { continue; }
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (c._re.test(lines[i])) {
          violations.push({ type: "forbidden", checkId: c.id, file, line: i + 1, sample: lines[i].trim().slice(0, 160), rationale: c.rationale || "" });
          break; // one hit per file is enough
        }
      }
    }
  }

  for (const c of checks.mustInclude) {
    for (const file of allFiles) {
      if (!inScope(file, c)) continue;
      let content;
      try { content = readFileSync(join(sourceRoot, file), "utf8"); } catch { continue; }
      const has = content.split("\n").some((l) => c._re.test(l));
      if (!has) {
        violations.push({ type: "mustInclude", checkId: c.id, file, description: c.description || "" });
      }
    }
  }

  return {
    contract: { id, name },
    sourceRoot,
    summary: {
      total: violations.length,
      forbidden: violations.filter((v) => v.type === "forbidden").length,
      mustInclude: violations.filter((v) => v.type === "mustInclude").length,
    },
    violations,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  process.stderr.write(
    "Usage: verify-styling-contract.mjs <contract.md> <source-root> [--allow GLOB]... [--json]\n"
  );
}

function main(argv) {
  const positional = [];
  const allowGlobs = [];
  let jsonOnly = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--allow") { allowGlobs.push(argv[++i]); }
    else if (a === "--json") { jsonOnly = true; }
    else if (a === "-h" || a === "--help") { usage(); return 0; }
    else positional.push(a);
  }
  if (positional.length < 2) { usage(); return 2; }
  const [contractPath, sourceRoot] = positional;

  let report;
  try { report = detect(contractPath, sourceRoot, allowGlobs); }
  catch (e) { process.stderr.write(`CONTRACT ERROR: ${e.message}\n`); return 2; }

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");

  if (!jsonOnly) {
    if (report.violations.length === 0) {
      process.stderr.write(`✓ ${report.contract.id}: styling contract satisfied (${report.summary.total} violations).\n`);
    } else {
      process.stderr.write(`✗ ${report.contract.id}: ${report.violations.length} violation(s) — layer blocked.\n`);
      for (const v of report.violations) {
        const where = v.line ? `${v.file}:${v.line}` : v.file;
        const detail = v.type === "forbidden" ? `forbidden '${v.checkId}'` : `missing '${v.checkId}'`;
        const why = v.rationale || v.description || "";
        const sample = v.sample ? `  | ${v.sample}` : "";
        process.stderr.write(`  ${where} — ${detail}. ${why}\n${sample}\n`);
      }
    }
  }
  return report.violations.length === 0 ? 0 : 1;
}

// Export internals for testing; run main() only when invoked directly.
export { braceExpand, globToRegex, makeMatcher, parseContract, detect };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) process.exit(main(process.argv.slice(2)));
