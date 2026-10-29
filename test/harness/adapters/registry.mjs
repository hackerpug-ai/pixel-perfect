// The adapter registry: which harnesses have a real adapter in this sprint, and what an absent
// one honestly answers.
//
// Sprint 01 implements exactly one adapter — claude-code, the one harness graded live. The other
// five are NOT dropped: an absent adapter is present-as-`could-not-run` with a named reason, so the
// twelve-cell matrix never loses a cell and no reader can mistake silence for a pass.
import { HARNESSES } from "../pins.mjs";
import * as claudeCode from "./claude-code.mjs";

export const REGISTRY_SCHEMA = "harness-adapter-registry/v1";

/** Harnesses with an implementation in this tree. Everything else answers `adapter-absent`. */
export const REGISTERED = ["claude-code"];

const ABSENT_REASON = "adapter-absent";
const OWNERS = {
  codex: "T10",
  grok: "T10",
  opencode: "T10",
  pi: "T10",
  cursor: "T10",
};

const IMPLEMENTATIONS = { "claude-code": claudeCode };

/**
 * The adapter for a harness, or the honest absence of one. An unknown harness is an error — a typo
 * must not read as "no adapter" — while a known harness without an implementation is a
 * `could-not-run` entry, never a null and never a pass.
 */
export function adapterFor(harness) {
  if (!HARNESSES.includes(harness)) {
    throw new Error(`unknown harness ${JSON.stringify(harness)}: pins.json declares ${HARNESSES.join(", ")}`);
  }
  const adapter = IMPLEMENTATIONS[harness] ?? null;
  if (!adapter) {
    return {
      schema: REGISTRY_SCHEMA,
      harness,
      available: false,
      verdict: "could-not-run",
      reason: ABSENT_REASON,
      owner: OWNERS[harness] ?? null,
      detail: `${harness} has no adapter in this tree yet; its cell stays could-not-run ${ABSENT_REASON}`,
    };
  }
  return { schema: REGISTRY_SCHEMA, harness, available: true, verdict: null, reason: null, adapter };
}

/** All six entries, in pins order, so a twelve-cell writer can walk the matrix directly. */
export function describeRegistry() {
  return HARNESSES.map((harness) => {
    const entry = adapterFor(harness);
    if (!entry.available) return entry;
    return { ...entry, install_modes: ["checkout", "published"], checks: claudeCode.CHECKS };
  });
}
