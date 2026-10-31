// The capture module's own unit test: what `observe()` stores, and why three values are not two.
//
// `observe()` is the seam where a mapper's declaration becomes a stored value every later reader
// trusts (`denials`, `undeclaredDenials`, `observedFacts`, `gradeFromEvidence`). It has been
// exercised only indirectly, through FLOW-GRD-03, which is how a one-line erasure survived four
// landed tasks: a mapper that declared `required_read: false` had it overwritten with `null`, and an
// optional denial in a real stream then graded `could-not-run / requiredness-undeclared`.
//
// What is real here: the archived stdout bytes of a real guarded `claude -p`
// (`test/harness/smoke/fixtures/denied-write/`, exit 0, one `Write` denial on a path under its own
// work dir and one target-less `Bash` denial), the real `createCapture`, the real `observe`, the real
// `finish` and `persist`, and the real harness mapper `mapCapturedLine`. The only thing varied
// between cases is the declaration under test - which is the axis this file exists to pin. No
// observation is hand-written and no capture method is replaced.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { mapCapturedLine } from "../adapters/claude-code.mjs";
import { createCapture } from "./capture.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const FIXTURE_DIR = join(ROOT, "test/harness/smoke/fixtures/denied-write");
const FIXTURE_RECORD = JSON.parse(readFileSync(join(FIXTURE_DIR, "claude-code-denied-write.capture.json"), "utf8"));
const FIXTURE_BYTES = readFileSync(join(FIXTURE_DIR, "claude-code-denied-write.stdout.bin"));

/** The invocation root the archived run really worked in: `<cwd>/work/keep.txt` is under it. */
const ENTRY = { cwd: FIXTURE_RECORD.cwd };
/** The real target the archived run was denied on, read from the archive rather than written here. */
const ARCHIVED_DENIALS = (FIXTURE_RECORD.observations ?? []).filter((observation) => observation.kind === "permission_denied");
const WRITE_TARGET = ARCHIVED_DENIALS.find((observation) => observation.target != null)?.target ?? null;

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** The one denial in this stream for an operation (`Bash` carries no target, `Write` carries one). */
function denial(record, operation) {
  const found = (record.observations ?? []).filter(
    (observation) => observation.kind === "permission_denied" && observation.operation === operation,
  );
  assert.equal(found.length, 1, `expected exactly one ${operation} denial in the archived stream, got ${found.length}`);
  return found[0];
}

/** T6's production mapper over the archived line: it declares requiredness per denial. */
function declaredMapper(json, line) {
  return mapCapturedLine({ json, text: line.text, entry: ENTRY });
}

/** The same observations with no requiredness declared anywhere: the silent mapper. */
function silentMapper(json, line) {
  return declaredMapper(json, line).map(({ required_read: _dropped, ...rest }) => rest);
}

/**
 * One replay of the archived bytes through the real capture. `options` is passed to `observe()`
 * verbatim; `undefined` calls it the way T6's adapter calls it in the tree, with no options at all.
 */
function replay({ dir, invocation_id, mapper = silentMapper, options }) {
  const capture = createCapture({
    harness: FIXTURE_RECORD.harness ?? "claude-code",
    check_id: FIXTURE_RECORD.check_id ?? "verify",
    cwd: ENTRY.cwd,
    timeout_ms: FIXTURE_RECORD.timeout_ms ?? null,
    argv: FIXTURE_RECORD.argv ?? [],
    invocation_id,
  });
  capture.append(FIXTURE_BYTES);
  const observations = options === undefined ? capture.observe(mapper) : capture.observe(mapper, options);
  capture.finish({ exit_code: 0, signal: null, timed_out: false, spawn_error: null });
  return { record: capture.persist(dir), observations };
}

function sandbox(t, label) {
  const dir = mkdtempSync(join(tmpdir(), `pp-${label}-`));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// ---------------------------------------------------------------------------
// TC-1 - the precedence: a declared boolean wins, the paths list decides only for a silent mapper
// ---------------------------------------------------------------------------

test("observe-three-valued-contract", (t) => {
  const dir = sandbox(t, "capture-observe-tc1");

  // The input is the real archive, re-hashed here: a fixture edited to carry a declaration the run
  // never made would be refused before any assertion ran.
  assert.ok(FIXTURE_BYTES.length > 100_000, `the archived stream is the real one, got ${FIXTURE_BYTES.length} bytes`);
  assert.equal(sha256(FIXTURE_BYTES), FIXTURE_RECORD.stdout.sha256, "the archived bytes hash to the hash the record cites");
  assert.ok(WRITE_TARGET, "the archive carries a denial with a resolved target");

  // Rank 1: T6's mapper declares the Write denial required and the target-less Bash denial optional.
  // Both declarations are stored unchanged; neither is overwritten by the absence of a paths list.
  const declared = replay({
    dir: join(dir, "declared"),
    invocation_id: "capture-observe-declared",
    mapper: declaredMapper,
    options: { required_read_paths: null },
  });
  assert.ok(declared.observations.length > 0, "the mapper produced observations from the archived bytes");
  assert.equal(denial(declared.record, "Bash").required_read, false, "a mapper-declared false is stored as false");
  assert.equal(denial(declared.record, "Write").required_read, true, "a mapper-declared true is stored as true");

  // Rank 1 again, against a caller list that names neither denial target: a declaration outranks the
  // list, so the required Write denial is not demoted and the optional Bash denial is not withdrawn.
  const listed = replay({
    dir: join(dir, "listed"),
    invocation_id: "capture-observe-listed",
    mapper: declaredMapper,
    options: { required_read_paths: ["/x"] },
  });
  assert.equal(denial(listed.record, "Bash").required_read, false, "the declared false survives a paths list");
  assert.equal(denial(listed.record, "Write").required_read, true, "a paths list that omits the target does not demote a declared true");

  // Rank 3: a mapper that declared nothing, beside a caller list that names another target, stays
  // undeclared - the target-less denial has no path to decide either way.
  const silent = replay({
    dir: join(dir, "silent"),
    invocation_id: "capture-observe-silent",
    mapper: silentMapper,
    options: { required_read_paths: ["/x"] },
  });
  assert.ok(silent.observations.length > 0, "the silent mapper produced observations from the same bytes");
  assert.equal(denial(silent.record, "Bash").required_read, null, "an undeclared denial beside a list naming another target stays null");
});

// ---------------------------------------------------------------------------
// TC-2 - the fallback FLOW-GRD-03 depends on: the caller's list decides a silent mapper
// ---------------------------------------------------------------------------

test("observe-undeclared-stays-null", (t) => {
  const dir = sandbox(t, "capture-observe-tc2");

  // No options at all behaves exactly like `{ required_read_paths: null }`: nothing is decided.
  const bare = replay({ dir: join(dir, "bare"), invocation_id: "capture-observe-bare", mapper: silentMapper, options: undefined });
  assert.equal(denial(bare.record, "Write").required_read, null, "with no declaration and no list the denial stays undeclared");

  // The caller names the denied target: the silent mapper is decided as required.
  const named = replay({
    dir: join(dir, "named"),
    invocation_id: "capture-observe-named",
    mapper: silentMapper,
    options: { required_read_paths: [WRITE_TARGET] },
  });
  assert.equal(denial(named.record, "Write").required_read, true, "a list naming the target decides a silent mapper");

  // The caller names a different target: the same silence reads optional, never undeclared.
  const omitted = replay({
    dir: join(dir, "omitted"),
    invocation_id: "capture-observe-omitted",
    mapper: silentMapper,
    options: { required_read_paths: ["/somewhere/else"] },
  });
  assert.equal(denial(omitted.record, "Write").required_read, false, "a list that omits the target decides a silent mapper as optional");
});
