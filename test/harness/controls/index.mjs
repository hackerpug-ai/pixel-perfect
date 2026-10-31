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
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
 * The hosted half, read from the runner that is executing this code. `GITHUB_ACTIONS=true` is set by
 * the Actions runner and by nothing else; the run id and attempt must be positive integers so they
 * compare with the artifact's own numeric fields, and an event name must be present. Anything short
 * of all four is no identity at all, so a machine-local replay gets `null` and can never claim the
 * hosted half — a constant would make every artifact self-certifying.
 */
export function hostedHalfFromEnv(env = process.env) {
  const source = env ?? {};
  if (source.GITHUB_ACTIONS !== "true") return null;
  const positive = (value) => (typeof value === "string" && /^[0-9]+$/.test(value) ? Number(value) : null);
  const runId = positive(source.GITHUB_RUN_ID);
  const runAttempt = positive(source.GITHUB_RUN_ATTEMPT);
  const event = typeof source.GITHUB_EVENT_NAME === "string" ? source.GITHUB_EVENT_NAME.trim() : "";
  if (runId === null || runId <= 0) return null;
  if (runAttempt === null || runAttempt <= 0) return null;
  if (event === "") return null;
  return { status: "observed", run_id: runId, run_attempt: runAttempt, event, workflow: "harness-eval" };
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
 *
 * Each row's hosted half resolves in one order: an explicit `hosted[id]` argument, then the hosted
 * record the producer stamped onto that control's OBSERVATION, then the definition's `awaiting`
 * record (which is not an execution). The observation carries it so the producer's call text stays
 * `qualifyControls({ observations, pairs })` — one call, one implementation, one fail-closed rule.
 */
export function qualifyControls({ observations = {}, pairs = {}, hosted = {} } = {}) {
  const rows = CONTROLS.map((definition) =>
    recordControl({
      control_id: definition.control_id,
      observed: observations[definition.control_id] ?? null,
      pair: pairs[definition.control_id] ?? null,
      hosted:
        hosted[definition.control_id] ??
        observations[definition.control_id]?.hosted ??
        definition.hosted,
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

/**
 * The gate that READS THE PAIRS. `assertControlRows` accepts four schema-valid rows whatever they
 * say, which is how a run that observed nothing republished as green (recorded run 41139161972:
 * four rows, three of them `could-not-run` / `control-unobservable`, every one `not-executed`).
 *
 * This compares each row with its OWN `expect` pair, requires the row to be qualified and to carry a
 * hosted half read from a runner's identity, and — when the artifact's own run id is known — requires
 * that half to belong to that run. A claim stamped from a constant would be self-certifying, so the
 * run id is compared, not merely present.
 *
 * `assertControlRows` runs first: a three-row, five-row or duplicated array is refused there rather
 * than reported as a mismatch list. One implementation serves both the producer (in-run) and the
 * documented command (`--gate`, over a downloaded artifact).
 */
export function controlVerdictGate(rows, { runId = null } = {}) {
  assertControlRows(rows);
  const expected = Object.fromEntries(CONTROLS.map((definition) => [definition.control_id, { ...definition.expect }]));
  const mismatches = [];
  const seen = new Set();
  const projection = [];
  for (const row of rows) {
    const id = row?.control_id;
    if (seen.has(id)) {
      mismatches.push(`${id}: appears twice in the controls array`);
      continue;
    }
    seen.add(id);
    const definition = BY_ID.get(id);
    if (!definition) {
      mismatches.push(`${id}: unknown control id, expected one of ${CONTROL_IDS.join(", ")}`);
      continue;
    }
    projection.push({ control_id: id, verdict: row.verdict, reason: row.reason });
    if (!(row.verdict === definition.expect.verdict && row.reason === definition.expect.reason)) {
      mismatches.push(
        `${id}: expected ${definition.expect.verdict}/${definition.expect.reason}, observed ${String(row.verdict)}/${String(row.reason)}`,
      );
    }
    if (row.qualified !== true) mismatches.push(`${id}: qualified is ${JSON.stringify(row.qualified)}, expected true`);
    const status = row.hosted?.status ?? null;
    if (status !== "observed") mismatches.push(`${id}: hosted.status is ${String(status)}, expected observed`);
    if (runId !== null && row.hosted?.run_id !== runId) {
      mismatches.push(`${id}: hosted.run_id is ${String(row.hosted?.run_id)}, expected ${String(runId)}`);
    }
  }
  for (const definition of CONTROLS) {
    if (!seen.has(definition.control_id)) mismatches.push(`${definition.control_id}: missing from the controls array`);
  }
  return { ok: mismatches.length === 0, expected, rows: projection, mismatches };
}

// ---------------------------------------------------------------------------
// CLI — the documented gate command, over a downloaded artifact
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const [verb, file] = process.argv.slice(2);
  if (verb !== "--gate" || !file) {
    process.stderr.write("usage: controls/index.mjs --gate <harness-eval-result.json>\n");
    process.exitCode = 2;
  } else {
    let printed;
    try {
      const artifact = JSON.parse(readFileSync(file, "utf8"));
      const rows = Array.isArray(artifact?.controls) ? artifact.controls : [];
      const gate = controlVerdictGate(rows, { runId: Number.isInteger(artifact?.run_id) ? artifact.run_id : null });
      printed = { ok: gate.ok, run_id: artifact?.run_id ?? null, mismatches: gate.mismatches, rows: gate.rows };
      process.exitCode = gate.ok ? 0 : 1;
    } catch (error) {
      // A refused shape (three rows, five rows, a duplicated id) is a refusal, not a crash: the
      // command still prints a verdict and still exits non-zero.
      printed = { ok: false, run_id: null, mismatches: [String(error?.message ?? error)], rows: [] };
      process.exitCode = 1;
    }
    process.stdout.write(`${JSON.stringify(printed)}\n`);
  }
}
