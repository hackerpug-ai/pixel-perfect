// controls@v1 — the four negative controls the sprint's gate names, and their qualification.
//
// A grader that has only seen correct input is unproven. These four are the evidence that the
// framework REFUSES, and each is qualified so that it proves discrimination rather than mere
// failure: every row is written beside a paired observation that had to come out the other way,
// and `discriminates` is COMPUTED from that pair's outcome against the control's — never copied
// from a caller's boolean — because a guard that always refuses, a checker that always passes and a
// scanner that always finds nothing all produce the expected verdict for free.
//
// Two halves, never one:
//   local  — the mechanism, observed in this process from real bytes, a real child, a real guard.
//   hosted — the same row inside `.controls[]` of a dispatched harness-eval result artifact.
// A row is `qualified` only when both hold. The hosted half is T11's qualification and cannot be
// produced on a machine-local replay, so it is carried as `not-executed` with its owner named,
// never simulated into place.
//
// The fail-closed rule is the point of this module: a control the run could not observe is
// `could-not-run` / `control-unobservable`. There is no default pass and no default fail.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const CONTROLS_FORMAT = "controls@v1";
export const CONTROL_VERDICTS = Object.freeze(["pass", "fail", "could-not-run"]);
export const UNOBSERVABLE_REASON = "control-unobservable";

/**
 * The four control ids, their exact verdict/reason pairs, what each proves, the paired observation
 * that makes it discrimination rather than failure, and the half that needs a hosted run.
 */
export const CONTROLS = Object.freeze([
  Object.freeze({
    control_id: "missing-key",
    expect: { verdict: "could-not-run", reason: "missing-api-key" },
    proves: "a credential removed from the child environment refuses before any model request",
    pair: "the same guard, on the same code path, with the binding present: it must proceed",
    hosted: {
      awaiting: "the keyless control step's row from a dispatched run, beside that run's authenticated claude-code pass rows",
      owner: "harness-eval controls job (T8 recorder contract) on a dispatched run; T11 owns the qualification rule",
    },
  }),
  Object.freeze({
    control_id: "stale-cache",
    expect: { verdict: "could-not-run", reason: "installation-identity-mismatch" },
    proves: "a stale cached payload is refused as unattributable instead of graded as a candidate failure",
    pair: "the same identity rule on a matching digest: it must approve",
    hosted: {
      awaiting: "the installed payload's expected and observed digests as the runner measured them",
      owner: "harness-eval smoke job (T5 adapter identity, T8 controls job) on a dispatched run",
    },
  }),
  Object.freeze({
    control_id: "exit0-denied-read",
    expect: { verdict: "fail", reason: "denied_tool_call" },
    proves: "a denied required read is a failure even when the process exited 0 — a clean exit is not a pass",
    pair: "the same stream without the denial: it must not be fail/denied_tool_call",
    hosted: {
      awaiting: "the raw exit-0 denial capture recorded by the runner (test/harness/fixtures/streams/exit0-denied-read)",
      owner: "a dispatched run's verify invocation (capture archive is T5/T6 write scope), qualified here",
    },
  }),
  Object.freeze({
    control_id: "hidden-image-judge",
    expect: { verdict: "pass", reason: "no-image-judge-in-child-tree" },
    proves: "no screenshot judging occurred anywhere in the verify child tree",
    pair: "a planted image judge in an otherwise identical child tree: the scan must catch it",
    hosted: {
      awaiting: "the verify child tree as the runner produced it (tree manifests, request log, captured bytes)",
      owner: "harness-eval verify job on a dispatched run; T11 owns the scanner and this qualification",
    },
  }),
]);

const BY_ID = new Map(CONTROLS.map((definition) => [definition.control_id, definition]));

/** The definition for a control id, or a refusal — an unknown id is never silently recorded. */
export function controlDefinition(control_id) {
  const definition = BY_ID.get(control_id);
  if (!definition) throw new Error(`unknown control ${control_id}: definitions are ${[...BY_ID.keys()].join(", ")}`);
  return definition;
}

export const CONTROL_IDS = Object.freeze(CONTROLS.map((definition) => definition.control_id));

function hostHalf(hosted) {
  if (hosted && hosted.status === "observed") return { status: "observed", ...hosted };
  return {
    status: "not-executed",
    awaiting: hosted?.awaiting ?? null,
    owner: hosted?.owner ?? null,
    why: hosted?.why ?? "a hosted harness-eval run is not reachable from a machine-local tree",
  };
}

/**
 * One control row. `observed` is `{ verdict, reason, evidence }` from a real observation, or null
 * when the run could not observe the control — which is `could-not-run` / control-unobservable and
 * never anything else. A row whose observation disagrees with the definition keeps what was
 * observed (so the disagreement is visible) and is not matched.
 */
export function recordControl({ control_id, observed = null, pair = null, hosted = null }) {
  const definition = controlDefinition(control_id);
  const row = {
    control_id,
    verdict: null,
    reason: null,
    expect: { ...definition.expect },
    matched: false,
    discriminates: false,
    pair: null,
    pair_claimed_discrimination: null,
    local: null,
    hosted: hostHalf(hosted ?? definition.hosted),
    qualified: false,
  };

  if (observed == null) {
    row.verdict = "could-not-run";
    row.reason = UNOBSERVABLE_REASON;
    row.local = { status: "unobservable" };
  } else {
    row.verdict = observed.verdict;
    row.reason = observed.reason ?? null;
    row.local = { status: "observed", ...(observed.evidence ?? {}) };
    row.matched = row.verdict === definition.expect.verdict && row.reason === definition.expect.reason;
  }

  if (pair) {
    row.pair = { pair_id: pair.control_id ?? null, verdict: pair.verdict ?? null, reason: pair.reason ?? null, ...(pair.evidence ?? {}) };
    // COMPUTED, never copied from the caller. A pair whose outcome came out the same way as the
    // control's proves failure, not discrimination — a guard that refuses unconditionally produces
    // both halves for free, and it would still claim `discriminates: true`.
    row.discriminates = pair.verdict != null && !(pair.verdict === row.verdict && (pair.reason ?? null) === (row.reason ?? null));
    row.pair_claimed_discrimination = pair.discriminates === true;
  }
  row.qualified = row.matched && row.discriminates && row.hosted.status === "observed";
  row.qualified_why = row.qualified
    ? null
    : !row.matched
      ? `observable read ${String(row.verdict)}/${String(row.reason)}, expected ${definition.expect.verdict}/${definition.expect.reason}`
      : !row.discriminates
        ? "no paired observation came out the other way, so the control proves failure, not discrimination"
        : "the hosted half is not executed";
  return row;
}

/**
 * The four rows, in definition order. `observations` is keyed by control id; a missing key is an
 * unobservable control, not an omission.
 */
export function qualifyControls({ observations = {}, pairs = {}, hosted = {} } = {}) {
  const rows = CONTROLS.map((definition) =>
    recordControl({
      control_id: definition.control_id,
      observed: observations[definition.control_id] ?? null,
      pair: pairs[definition.control_id] ?? null,
      hosted: hosted[definition.control_id] ?? definition.hosted,
    }),
  );
  const failures = rows
    .filter((row) => !(row.matched && row.discriminates))
    .map((row) => `${row.control_id}: ${row.qualified_why}`);
  return {
    rows,
    local_ok: rows.every((row) => row.matched && row.discriminates),
    failures,
    unqualified: rows.filter((row) => !row.qualified).map((row) => row.control_id),
    fully_qualified: rows.every((row) => row.qualified),
  };
}

/** The gate's own projection: `control_id verdict reason`, one row per line. */
export function controlRowsLine(rows) {
  return rows.map((row) => `${row.control_id} ${row.verdict} ${row.reason}`).join("\n");
}

/** Exactly the four controls, schema-valid verdicts, and no hosted claim without a hosted observation. */
export function assertControlRows(rows) {
  const ids = rows.map((row) => row.control_id).sort();
  if (JSON.stringify(ids) !== JSON.stringify([...CONTROL_IDS].sort())) {
    throw new Error(`controls are ${ids.join(",")}, expected exactly ${[...CONTROL_IDS].sort().join(",")}`);
  }
  for (const row of rows) {
    controlDefinition(row.control_id);
    if (!CONTROL_VERDICTS.includes(row.verdict)) throw new Error(`${row.control_id}: verdict ${row.verdict} is not one of ${CONTROL_VERDICTS.join("/")}`);
    if (typeof row.reason !== "string" || row.reason.length === 0) throw new Error(`${row.control_id}: a control must state a reason`);
    if (row.qualified && row.hosted?.status !== "observed") throw new Error(`${row.control_id}: claims a hosted qualification with no hosted observation`);
  }
  return rows;
}

/**
 * Writes the recorder's `controls.json` — the array shape T8 collects into `.controls[]` — and reads
 * it back, because a row that only exists in memory is not a receipt.
 */
export function writeControls({ file, rows }) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  const readBack = JSON.parse(readFileSync(file, "utf8"));
  const mismatches = [];
  if (!Array.isArray(readBack)) mismatches.push("controls.json is not a JSON array");
  else {
    if (readBack.length !== rows.length) mismatches.push(`${readBack.length} rows read back, ${rows.length} written`);
    rows.forEach((row, index) => {
      const back = readBack[index] ?? {};
      for (const key of ["control_id", "verdict", "reason", "qualified"]) {
        if (JSON.stringify(back[key]) !== JSON.stringify(row[key])) mismatches.push(`row ${index} ${key}: ${JSON.stringify(back[key])} != ${JSON.stringify(row[key])}`);
      }
    });
  }
  return { ok: mismatches.length === 0 && existsSync(file), path: file, rows: readBack, mismatches };
}
