// PermissionStance: the permission decision, recorded before the first model call.
//
// The approved stance is `--permission-mode dontAsk` plus `--add-dir` of the plugin root (owner
// decision, 2026-10-28). Approval is an allow-list, not a deny-list: a mode that is not in
// APPROVED_MODES can never be recorded or asserted, so there is no code path here that can emit a
// rejected mode — not even a fixture. A stance that was never recorded blocks the run.
export const STANCE_SCHEMA = "permission-stance/v1";
export const APPROVED_MODES = ["dontAsk"];

export class StanceError extends Error {
  constructor(reason, detail = {}) {
    super(`${reason}: ${JSON.stringify(detail)}`);
    this.name = "StanceError";
    this.reason = reason;
    this.detail = detail;
  }
}

/** The only argv shape an approved stance has. Compare against this, never against a blacklist. */
function approvedArgv(mode, addDir) {
  return ["--permission-mode", mode, "--add-dir", addDir];
}

/**
 * Records a stance. Recording is not approval, so this refuses a mode outside APPROVED_MODES
 * instead of writing it down and hoping a later check catches it.
 */
export function recordStance({ harness, plugin_root, mode = "dontAsk", recorded_at = new Date().toISOString() }) {
  if (typeof harness !== "string" || harness.length === 0) throw new StanceError("stance-harness-missing", { harness });
  if (typeof plugin_root !== "string" || plugin_root.length === 0) throw new StanceError("stance-add-dir-missing", { plugin_root });
  if (!APPROVED_MODES.includes(mode)) throw new StanceError("stance-mode-not-approved", { mode, approved: APPROVED_MODES });
  return {
    schema: STANCE_SCHEMA,
    harness,
    mode,
    add_dir: plugin_root,
    argv: approvedArgv(mode, plugin_root),
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
  const expected = approvedArgv(stance.mode, stance.add_dir);
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
