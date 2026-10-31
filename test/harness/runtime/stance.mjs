// PermissionStance: the permission decision, recorded before the first model call.
//
// The approved stance is `--permission-mode dontAsk` plus `--add-dir` of the plugin root (owner
// decision, 2026-10-28). Approval is an allow-list, not a deny-list: a mode that is not in
// APPROVED_MODES can never be recorded or asserted, so there is no code path here that can emit a
// rejected mode — not even a fixture. A stance that was never recorded blocks the run.
//
// The stance also carries the one write it may admit. `dontAsk` denies every tool call no rule
// allows, which is right for a graded invocation with one exception: a `verify` case is graded on a
// report file the invocation itself must write, at the path its case manifest declares. A denial
// there is not evidence about the product, it is evidence about the policy, so the path is
// allow-listed — exactly one file, relative to the invocation's own working directory, derived by
// the caller from the case manifest and never from a literal here. Every other write, and every
// other denial including Bash, stays denied and grades exactly as it does today.
export const STANCE_SCHEMA = "permission-stance/v1";
export const APPROVED_MODES = ["dontAsk"];

/**
 * The tool family a write allow-list entry is written against.
 *
 * `Write(path)` is NOT the form: `Edit(path)` covers both the Edit and the Write tool call, and the
 * CLI refuses to match `Write(path)` against a file write. Verified on the pinned CLI (2.1.291) and
 * on 2.1.316, headless with a dead `ANTHROPIC_BASE_URL` so no model call is made; the pinned CLI
 * prints on stderr:
 *
 *   Permission allow rule (--allowed-tools): Write(reports/a.json) is not matched by file permission
 *   checks — only Edit(path) rules are. Use Edit(reports/a.json) instead (Edit rules cover all
 *   file-editing tools).
 *
 * The same probe with `Edit(reports/a.json)` prints no such line. A rule that silently matched
 * nothing would deny the write the prompt asks for and read as a product failure, so the stance
 * emits only the form that really matches.
 */
export const WRITE_ALLOW_TOOL = "Edit";

const RULE = /^Edit\((.+)\)$/;

export class StanceError extends Error {
  constructor(reason, detail = {}) {
    super(`${reason}: ${JSON.stringify(detail)}`);
    this.name = "StanceError";
    this.reason = reason;
    this.detail = detail;
  }
}

/**
 * One path a stance may admit. A single file, relative to the invocation's own directory: an
 * absolute path would outlive the run, a glob or a trailing slash would admit more than the one
 * file the case declares, and `..` would leave the directory entirely. Three forms widen the rule
 * without any of those markers and are refused too: `.` (the whole working directory), a leaf with
 * no extension (a directory named like a file — `reports` reads as one rule and admits every file
 * under it), and a comma (the CLI splits `--allowedTools` on commas, so one path would arrive as two
 * rules, the second of them declared by nobody).
 */
function assertWritePath(path) {
  if (typeof path !== "string" || path.length === 0) throw new StanceError("write-allow-path-missing", { path });
  if (path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path)) throw new StanceError("write-allow-path-absolute", { path });
  if (path.includes("..")) throw new StanceError("write-allow-path-escapes", { path });
  if (/[*?[\]{}]/.test(path)) throw new StanceError("write-allow-path-not-exact", { path });
  if (path.endsWith("/")) throw new StanceError("write-allow-path-not-a-file", { path });
  if (path.includes("\\")) throw new StanceError("write-allow-path-separator", { path });
  if (path === ".") throw new StanceError("write-allow-path-is-working-dir", { path });
  if (path.includes(",")) throw new StanceError("write-allow-path-splits-rules", { path });
  if (path.split("/").pop()?.includes(".") !== true) throw new StanceError("write-allow-path-no-extension", { path });
  return path;
}

/** The one rule form a write allow-list entry takes: `Edit(<path>)`, verifiably path-scoped. */
export function writeAllowRule(path) {
  return `${WRITE_ALLOW_TOOL}(${assertWritePath(path)})`;
}

/** Refuses a rule that did not come from `writeAllowRule` — a recorded stance is re-checked, not trusted. */
function assertWriteRule(rule) {
  const match = typeof rule === "string" ? rule.match(RULE) : null;
  if (!match) throw new StanceError("write-allow-rule-not-approved", { rule: rule ?? null, expected: `${WRITE_ALLOW_TOOL}(<path>)` });
  assertWritePath(match[1]);
  return rule;
}

function normalizeWrites(writes) {
  if (writes === undefined || writes === null) return [];
  if (!Array.isArray(writes)) throw new StanceError("write-allow-not-a-list", { writes });
  return [...new Set(writes.map((path) => writeAllowRule(path)))].sort();
}

/**
 * The only argv shape an approved stance has: the mode, the added directory, and — only when the
 * caller declared a write — the one allow-list entry for it. Compare against this, never against a
 * blacklist. An invocation with no declared write gets the four flags it always got.
 */
export function stanceArgv({ mode = APPROVED_MODES[0], add_dir = null, allowed_writes = [] } = {}) {
  const argv = ["--permission-mode", mode, "--add-dir", add_dir];
  if (allowed_writes.length > 0) argv.push("--allowedTools", allowed_writes.join(","));
  return argv;
}

/**
 * Records a stance. Recording is not approval, so this refuses a mode outside APPROVED_MODES
 * instead of writing it down and hoping a later check catches it, and it refuses a write that is
 * not one exact file so an allow-list can never be widened by a caller that meant well.
 */
export function recordStance({ harness, plugin_root, mode = "dontAsk", writes = [], recorded_at = new Date().toISOString() }) {
  if (typeof harness !== "string" || harness.length === 0) throw new StanceError("stance-harness-missing", { harness });
  if (typeof plugin_root !== "string" || plugin_root.length === 0) throw new StanceError("stance-add-dir-missing", { plugin_root });
  if (!APPROVED_MODES.includes(mode)) throw new StanceError("stance-mode-not-approved", { mode, approved: APPROVED_MODES });
  const allowed_writes = normalizeWrites(writes);
  return {
    schema: STANCE_SCHEMA,
    harness,
    mode,
    add_dir: plugin_root,
    allowed_writes,
    argv: stanceArgv({ mode, add_dir: plugin_root, allowed_writes }),
    recorded_before: "first-model-call",
    recorded_at,
  };
}

/** Refuses anything that is not the approved stance for this harness. */
export function assertStance(stance, harness = null) {
  if (!stance || typeof stance !== "object") throw new StanceError("stance-unrecorded", { harness });
  if (stance.schema !== STANCE_SCHEMA) throw new StanceError("stance-schema-unknown", { schema: stance.schema ?? null });
  if (harness !== null && stance.harness !== harness) {
    throw new StanceError("stance-harness-mismatch", { stance: stance.harness, harness });
  }
  if (!APPROVED_MODES.includes(stance.mode)) throw new StanceError("stance-mode-not-approved", { mode: stance.mode ?? null });
  if (typeof stance.add_dir !== "string" || stance.add_dir.length === 0) {
    throw new StanceError("stance-add-dir-missing", { add_dir: stance.add_dir ?? null });
  }
  // A recorded rule is re-validated, not trusted: a stance file that hand-wrote a wider rule is
  // refused here rather than reaching a child process.
  const allowed_writes = Array.isArray(stance.allowed_writes) ? stance.allowed_writes.map(assertWriteRule) : [];
  const expected = stanceArgv({ mode: stance.mode, add_dir: stance.add_dir, allowed_writes });
  if (JSON.stringify(stance.argv) !== JSON.stringify(expected)) {
    throw new StanceError("stance-argv-not-approved", { argv: stance.argv ?? null, expected });
  }
  return true;
}

export function serializeStance(stance) {
  assertStance(stance);
  return JSON.stringify(stance);
}

export function parseStance(text, harness = null) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new StanceError("stance-invalid-json", {});
  }
  assertStance(parsed, harness);
  return parsed;
}
