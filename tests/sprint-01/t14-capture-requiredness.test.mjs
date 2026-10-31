// T14 - a declared requiredness survives capture, and silence still fails closed.
//
// One defect, two obligations, and the second exists so the first cannot be bought with permission:
//
//   AC-1  `CaptureSession.observe()` stored a mapper's `required_read: false` as `null`, because it
//         honoured only `=== true`. A target-less denial the mapper deliberately declared optional
//         therefore arrived at `undeclaredDenials()` as undeclared, and `gradeFromEvidence` turned
//         the hole into `could-not-run / requiredness-undeclared` - the verdict both claude-code
//         cells carried in hosted run 41139161972.
//   AC-2  An undeclared denial must stay `null` and stay a refusal. A fix that infers `false` from
//         silence, or from an empty `required_read_paths` list, reads permission where nobody
//         granted one.
//
// What is real in this file: the archived stdout bytes of one guarded `claude -p` under
// `--permission-mode dontAsk` that exited 0 and attempted two denials (a `Write` on `<cwd>/work/keep.txt`
// and a `Bash` command whose `tool_input` holds no file path), `createCapture`/`append`/`observe`/
// `finish`/`persist`, the harness mapper `mapCapturedLine` and its `isRequiredPath`, and the
// production grader `gradeFromEvidence`. The only input changed is the mapper's own declaration in
// AC-2 - the axis under test, removed by deleting a key rather than by inventing an observation.
// No capture method, no grader and no byte is replaced.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { mapCapturedLine } from "../../test/harness/adapters/claude-code.mjs";
import { createCapture, denials, observedFacts, undeclaredDenials } from "../../test/harness/runtime/capture.mjs";
import { gradeFromEvidence } from "../../test/harness/runtime/grade-writer.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const FIXTURE_DIR = join(ROOT, "test/harness/smoke/fixtures/denied-write");
const FIXTURE_RECORD = JSON.parse(readFileSync(join(FIXTURE_DIR, "claude-code-denied-write.capture.json"), "utf8"));
const FIXTURE_BYTES = readFileSync(join(FIXTURE_DIR, "claude-code-denied-write.stdout.bin"));

/** The invocation root the archived run really worked in: the denied write is under it. */
const ENTRY = { cwd: FIXTURE_RECORD.cwd };
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const installation = () => ({
  requested_cli_version: "2.1.291",
  resolved_cli_version: "2.1.291",
  observed_cli_version: null,
  install_mode: "checkout",
  plugin_revision: null,
  expected_plugin_manifest_sha256: null,
  observed_plugin_manifest_sha256: null,
  loaded_plugin_root: null,
  plugin_load_evidence: null,
});

/** T6's production mapper, declaring requiredness per denial from the target and the invocation root. */
function declaredMapper(json, line) {
  return mapCapturedLine({ json, text: line.text, entry: ENTRY });
}

/** `seed/declaration-stripped-capture`: the same mapper with the `required_read` key removed. */
function strippedMapper(json, line) {
  return declaredMapper(json, line).map(({ required_read: _dropped, ...rest }) => rest);
}

/** One denial of a given operation, asserted to exist exactly once in the archived stream. */
function denial(record, operation) {
  const found = (record.observations ?? []).filter(
    (observation) => observation.kind === "permission_denied" && observation.operation === operation,
  );
  assert.equal(found.length, 1, `expected exactly one ${operation} denial in the archived stream, got ${found.length}`);
  return found[0];
}

/**
 * Replays the archived bytes through the real capture and persist, and grades what landed.
 * `required_read_paths` is handed to `observe()` verbatim, which is the caller's half of the contract.
 */
function replay({ dir, invocation_id, mapper, required_read_paths = null }) {
  const capture = createCapture({
    harness: FIXTURE_RECORD.harness ?? "claude-code",
    check_id: "verify",
    cwd: ENTRY.cwd,
    timeout_ms: FIXTURE_RECORD.timeout_ms ?? null,
    argv: FIXTURE_RECORD.argv ?? [],
    invocation_id,
  });
  capture.append(FIXTURE_BYTES);
  capture.observe(mapper, { required_read_paths });
  capture.finish({ exit_code: 0, signal: null, timed_out: false, spawn_error: null });
  const record = capture.persist(dir);
  const grade = (required_facts = []) =>
    gradeFromEvidence({
      record,
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: record.evidence_paths,
      report_paths: [],
      required_facts,
    });
  return { record, grade };
}

function sandbox(t, label) {
  const dir = mkdtempSync(join(tmpdir(), `pp-${label}-`));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// ---------------------------------------------------------------------------
// AC-1 - a declared required_read: false survives capture and is not graded as undeclared
// ---------------------------------------------------------------------------

test("declared-optional-survives-capture", (t) => {
  const dir = sandbox(t, "t14-ac1");

  // The input is the real archive, re-hashed: a fixture edited to carry a declaration the run never
  // made is refused here, before any claim about the layer is read.
  assert.equal(sha256(FIXTURE_BYTES), FIXTURE_RECORD.stdout.sha256, "the archived bytes hash to the hash the record cites");

  const { record, grade } = replay({
    dir: join(dir, "declared"),
    invocation_id: "t14-declared-optional",
    mapper: declaredMapper,
    required_read_paths: null,
  });

  // The real run exited 0 beside two denials: the exit code is not what decides anything here.
  assert.equal(record.process_status.exit_code, 0, "the archived guarded invocation exited 0");

  // Both declarations are stored as declared - the required one and the optional one.
  assert.equal(denial(record, "Write").required_read, true, "the required Write denial is stored as true");
  assert.equal(denial(record, "Bash").required_read, false, "the optional target-less Bash denial is stored as false, not null");
  assert.ok(denial(record, "Write").target.endsWith("keep.txt"), `the required denial names its target: ${String(denial(record, "Write").target)}`);

  // The derived views follow: nothing undeclared, and exactly the required denial counted.
  assert.equal(undeclaredDenials(record).length, 0, "no denial is undeclared when the mapper declared every one");
  assert.equal(denials(record).length, 1, "exactly the required Write denial counts");

  // The graded cell: a failure from a denial, beside a raw exit code of 0.
  const cell = grade();
  assert.equal(cell.verdict, "fail", "a required write was denied, so the cell fails");
  assert.equal(cell.reason, "denied_tool_call");
  assert.equal(cell.process_exit_code, 0, "the raw exit code stays the raw exit code beside the verdict");
  assert.equal(
    (cell.block_reasons ?? []).some((entry) => entry.reason === "requiredness-undeclared"),
    false,
    `a declared optional denial must not refuse the cell: ${JSON.stringify(cell.block_reasons)}`,
  );
  assert.equal(cell.denied_tool_call?.target, denial(record, "Write").target, "the cell cites the required denial");

  // The same two declarations hold when the caller passes a list that names no denial target: the
  // mapper's declaration outranks the caller's fallback, in both directions.
  const listed = replay({
    dir: join(dir, "listed"),
    invocation_id: "t14-declared-optional-listed",
    mapper: declaredMapper,
    required_read_paths: ["/nonexistent/required.txt"],
  });
  assert.equal(denial(listed.record, "Write").required_read, true, "a list omitting the target does not demote a declared true");
  assert.equal(denial(listed.record, "Bash").required_read, false, "a list names nothing for a target-less denial, so the declaration stands");
  assert.equal(undeclaredDenials(listed.record).length, 0, "still nothing undeclared");
  assert.equal(denials(listed.record).length, 1, "the required denial still counts beside the caller's list");
});

// ---------------------------------------------------------------------------
// AC-2 - an undeclared denial still reads null and still fails closed
// ---------------------------------------------------------------------------

test("undeclared-denial-still-closed", (t) => {
  const dir = sandbox(t, "t14-ac2");

  // seed/declaration-stripped-capture: nobody declared the target-less Bash denial.
  const stripped = replay({
    dir: join(dir, "stripped"),
    invocation_id: "t14-declaration-stripped",
    mapper: strippedMapper,
    required_read_paths: null,
  });
  assert.equal(denial(stripped.record, "Bash").required_read, null, "silence is stored as undeclared, not as optional");
  assert.equal(denial(stripped.record, "Write").required_read, null, "the stripped mapper declared nothing at all");
  assert.equal(undeclaredDenials(stripped.record).length, 2, "both denials are undeclared when the mapper declared neither");
  assert.equal(denials(stripped.record).length, 0, "nothing counts as a required denial");

  const strippedCell = stripped.grade();
  assert.equal(strippedCell.verdict, "could-not-run", "an undeclared denial is a refusal, never a pass");
  assert.equal(strippedCell.reason, "requiredness-undeclared");
  assert.ok((strippedCell.block_reasons ?? []).length > 0, "the refusal is a named block, not an empty verdict");

  // seed/empty-path-declaration: a caller list that names nothing, beside the same silence. An empty
  // list is not a declaration that a denial is optional - a null target has no path to match.
  const emptyList = replay({
    dir: join(dir, "empty-list"),
    invocation_id: "t14-empty-path-declaration",
    mapper: strippedMapper,
    required_read_paths: [],
  });
  assert.equal(denial(emptyList.record, "Bash").required_read, null, "an empty paths list does not infer false for a target-less denial");
  // A list decides a denial whose target it omits - that is the documented fallback, not an inference
  // from silence - but it can never decide the target-less one, which is what stays undeclared here.
  assert.equal(denial(emptyList.record, "Write").required_read, false, "the empty list decides the denial that has a target it does not name");
  assert.equal(undeclaredDenials(emptyList.record).length, 1, "only the target-less denial is undeclared under an empty list");
  const emptyListCell = emptyList.grade();
  assert.equal(emptyListCell.verdict, "could-not-run", "an empty list does not turn silence into permission");
  assert.equal(emptyListCell.reason, "requiredness-undeclared");

  // The declared Write denial in the same stream still counts when only the optional denial's
  // declaration is removed: the guard is about silence, not about dropping the whole mapper.
  const partial = (json, line) =>
    declaredMapper(json, line).map((observation) =>
      observation.kind === "permission_denied" && observation.target == null
        ? Object.fromEntries(Object.entries(observation).filter(([key]) => key !== "required_read"))
        : observation,
    );
  const partialReplay = replay({
    dir: join(dir, "partial"),
    invocation_id: "t14-declaration-partial",
    mapper: partial,
    required_read_paths: null,
  });
  assert.equal(denial(partialReplay.record, "Bash").required_read, null, "the stripped denial is undeclared");
  assert.equal(denial(partialReplay.record, "Write").required_read, true, "the declared denial beside it is untouched");
  assert.equal(undeclaredDenials(partialReplay.record).length, 1, "exactly the stripped denial is undeclared");
  assert.equal(denials(partialReplay.record).length, 1, "the required Write denial still counts");
  const partialCell = partialReplay.grade();
  assert.equal(partialCell.verdict, "could-not-run", "one undeclared denial refuses the cell");
  assert.equal(partialCell.reason, "requiredness-undeclared");
});

// ---------------------------------------------------------------------------
// TC-3 - a preserved false invents no required fact and does not weaken the required denial beside it
// ---------------------------------------------------------------------------

test("optional-denial-is-not-a-fact", (t) => {
  const dir = sandbox(t, "t14-tc3");
  const { record, grade } = replay({
    dir: join(dir, "facts"),
    invocation_id: "t14-observed-facts",
    mapper: declaredMapper,
    required_read_paths: null,
  });

  // The fact map holds the two facts the run really observed, in stream order, and nothing for the
  // optional denial: an optional read is not a required fact however it is spelled.
  const facts = observedFacts(record);
  assert.equal(facts.size, 2, `the fact map holds exactly the two observed facts, got ${JSON.stringify([...facts.keys()])}`);
  assert.deepEqual([...facts.keys()], ["plugin-loaded", "result-event"]);
  assert.equal(
    [...facts.values()].some((observation) => observation.kind === "permission_denied"),
    false,
    "the optional denial did not become a required fact",
  );

  // Graded with both facts satisfied the cell still fails on the required write: the declaration
  // beside it was not softened by preserving the optional one.
  const satisfied = grade([
    { fact_id: "plugin-loaded" },
    { fact_id: "result-event" },
  ]);
  assert.equal(satisfied.verdict, "fail", "a required write was denied, so the cell fails even with every fact observed");
  assert.equal(satisfied.reason, "denied_tool_call");

  // And with no facts declared at all the same record is the same failure, from the same denial.
  const undeclaredFacts = grade();
  assert.equal(undeclaredFacts.verdict, "fail");
  assert.equal(undeclaredFacts.reason, "denied_tool_call");
  assert.equal(undeclaredFacts.denied_tool_call?.operation, "Write", "the failure names the operation that was required");
});
