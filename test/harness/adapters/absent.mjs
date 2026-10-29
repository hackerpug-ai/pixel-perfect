// Adapter absence, recorded as a verdict instead of an omission.
//
// An absent adapter is not a passing harness and it is not a missing cell: it is a real cell whose
// verdict is could-not-run and whose reason names, per harness, why nothing was graded. A single
// shared "adapter-absent" string would make four different pieces of pending work look like one
// fact, so each harness carries its own name here and the reason is derived from it.
//
// This module is data plus one accessor. It holds no credential name, no credential value and no
// cell shape — an absent adapter produces no invocation at all, so it can never read as a pass.
export const ADAPTER_ABSENT_PREFIX = "adapter-not-implemented";

/**
 * The four harnesses sprint 01 does not build an adapter for. They must still appear in all twelve
 * cells; naming them here is what makes "we did not grade codex" auditable per harness.
 */
export const ADAPTER_PENDING = Object.freeze(["codex", "grok", "opencode", "pi"]);

/**
 * Every harness that can have no adapter loaded, with the reason its cells read. `claude-code` and
 * `cursor` are included because a run can also fail to register their adapters; the reason says
 * "not loaded" for those (the adapter exists in the plan) and "not implemented" for the four above.
 */
export const ABSENT_ADAPTERS = Object.freeze({
  "claude-code": Object.freeze({
    reason: "claude-code-adapter-not-loaded",
    description: "the run registered no adapter for claude-code, so no invocation was attempted",
  }),
  codex: Object.freeze({
    reason: `codex-${ADAPTER_ABSENT_PREFIX}`,
    description: "sprint 01 ships no codex adapter; the codex cells are present-as-could-not-run until sprint 02 builds it",
  }),
  grok: Object.freeze({
    reason: `grok-${ADAPTER_ABSENT_PREFIX}`,
    description: "sprint 01 ships no grok adapter; the grok cells are present-as-could-not-run until sprint 02 builds it",
  }),
  opencode: Object.freeze({
    reason: `opencode-${ADAPTER_ABSENT_PREFIX}`,
    description: "sprint 01 ships no opencode adapter; the opencode cells are present-as-could-not-run until sprint 02 builds it",
  }),
  pi: Object.freeze({
    reason: `pi-${ADAPTER_ABSENT_PREFIX}`,
    description: "sprint 01 ships no pi adapter; the pi cells are present-as-could-not-run until sprint 02 builds it",
  }),
  cursor: Object.freeze({
    reason: `cursor-${ADAPTER_ABSENT_PREFIX}`,
    description:
      "no cursor adapter exists; this reason is reached only when a Cursor key is actually present, because the invocation-guard's absent-credential refusal is decided first and names that reason itself",
  }),
});

/** harness → its named absent reason. Derived, so a reason is never spelled twice. */
export const ABSENT_REASONS = Object.freeze(
  Object.fromEntries(Object.entries(ABSENT_ADAPTERS).map(([harness, entry]) => [harness, entry.reason])),
);

/**
 * The named reason a harness's cells carry when no adapter is loaded. An unknown harness throws
 * rather than inventing a reason, so a seventh harness cannot silently appear in the matrix.
 */
export function absentReason(harness) {
  const entry = ABSENT_ADAPTERS[harness];
  if (!entry) throw new Error(`no absent reason for harness ${String(harness)}: known harnesses are ${Object.keys(ABSENT_ADAPTERS).join(", ")}`);
  return entry.reason;
}
