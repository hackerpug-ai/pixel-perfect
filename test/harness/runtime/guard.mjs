// invocation-guard: the one refusal path every model call goes through.
//
// It refuses before spawning when the harness binding is absent from the child environment, and it
// refuses when no approved PermissionStance was recorded for that harness. A refusal carries zero
// model requests because no process was started — the caller cannot observe a request that never
// happened.
//
// It also owns the launch rules that make a missing key and a hang indistinguishable from success:
// stdin is closed, a timeout wraps the process, and the child receives its own binding and nothing
// else. Names come from test/harness/pins.json; no secret VALUE is read, compared or recorded here.
import { randomUUID } from "node:crypto";

import { loadPins } from "../pins.mjs";
import { spawnCaptured } from "./capture.mjs";
import { assertStance } from "./stance.mjs";

export const REFUSAL_REASONS = Object.freeze({
  MISSING_KEY: "missing-api-key",
  STANCE: "stance-unrecorded",
});

// Permitted fallback credential stores, per harness. There are none: the PRD's rule is that an
// isolated HOME has no login cache and no alternate provider secret, so absence of the binding is
// absence. The list is data here so a future sanctioned fallback is a visible change, not a code path.
export const CREDENTIAL_FALLBACKS = Object.freeze({});

const SECRET_NAME = /^(SMOKE_[A-Z0-9_]+|ANTHROPIC_API_KEY|CODEX_API_KEY|XAI_API_KEY|GEMINI_API_KEY|CURSOR_API_KEY)$/;

function pinFor(harness, manifest) {
  const pins = manifest ?? loadPins().manifest;
  const pin = pins?.harnesses?.[harness];
  if (!pin) throw new Error(`unknown harness ${harness}: pins.json declares ${Object.keys(pins?.harnesses ?? {}).join(", ")}`);
  return pin;
}

/** A saved session id is namespaced by harness, so two adapters can never resume each other's state. */
export function sessionId(harness) {
  return `${harness}:${randomUUID()}`;
}

/**
 * Resolves the credential binding for a harness by presence only. The value is never returned,
 * compared or logged — `checks` carries names and booleans, which is everything a refusal needs.
 */
export function resolveCredential({ harness, env = process.env, manifest = null }) {
  const pin = pinFor(harness, manifest);
  const names = [pin.binding_env, ...(CREDENTIAL_FALLBACKS[harness] ?? [])];
  const checks = names.map((name) => ({ name, present: typeof env?.[name] === "string" && env[name].length > 0 }));
  const found = checks.find((check) => check.present) ?? null;
  return {
    harness,
    binding_env: pin.binding_env,
    credential_env: pin.credential_env,
    checked: names,
    checks,
    present: found !== null,
    present_name: found?.name ?? null,
  };
}

/**
 * Decides whether an invocation may run. Every check is evaluated and recorded, so the record shows
 * what was refused and why; the first failing check is the refusal reason.
 */
export function guardInvocation({ harness, stance, env = process.env, check_id = null, manifest = null }) {
  const credential = resolveCredential({ harness, env, manifest });

  let stanceCheck;
  try {
    assertStance(stance, harness);
    stanceCheck = { name: "stance", ok: true, mode: stance.mode, add_dir: stance.add_dir };
  } catch (error) {
    stanceCheck = { name: "stance", ok: false, reason: error.reason ?? REFUSAL_REASONS.STANCE };
  }

  const checks = [
    { name: "credential", ok: credential.present, reason: credential.present ? null : REFUSAL_REASONS.MISSING_KEY },
    stanceCheck,
  ];
  const failed = checks.find((check) => !check.ok) ?? null;

  return {
    harness,
    check_id,
    decided_at: new Date().toISOString(),
    allowed: failed === null,
    refusal: failed
      ? {
          verdict: "could-not-run",
          reason: failed.reason,
          check: failed.name,
          decided_before: "model-request",
          model_requests: 0,
        }
      : null,
    credential,
    stance: stanceCheck.ok ? { mode: stance.mode, add_dir: stance.add_dir, argv: stance.argv } : null,
    checks,
    session_id: sessionId(harness),
  };
}

/**
 * The child's environment: its own binding, and no other credential name. Everything else in the
 * parent env passes through so the CLI still has a PATH; only secrets are narrowed.
 */
export function childEnvFor({ env = process.env, credential }) {
  const childEnv = { ...env };
  for (const name of Object.keys(childEnv)) {
    if (SECRET_NAME.test(name) && name !== credential.binding_env) delete childEnv[name];
  }
  return childEnv;
}

/**
 * Guard, then run. A refused invocation spawns nothing and records zero model requests; a permitted
 * one records exactly the request it makes, sends only the binding to the child, closes stdin and
 * wraps the process in a timeout that becomes `termination_kind: timeout` rather than a throw.
 */
export async function runGuarded({ harness, stance, env = process.env, capture, command, args = [], cwd, timeout_ms = 60_000, manifest = null }) {
  const check_id = capture?.identity?.check_id ?? null;
  const decision = guardInvocation({ harness, stance, env, check_id, manifest });
  capture.recordDecision(decision);
  if (!decision.allowed) return { decision, status: null };

  capture.beginRequest({ command, argv: args, session_id: decision.session_id });
  const status = await spawnCaptured({
    command,
    args,
    cwd,
    env: childEnvFor({ env, credential: decision.credential }),
    capture,
    timeout_ms,
  });
  capture.finish(status);
  return { decision, status };
}
