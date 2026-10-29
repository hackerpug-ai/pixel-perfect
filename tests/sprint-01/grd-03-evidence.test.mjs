// FLOW-GRD-03-FILES-AND-STREAM: a grade comes from captured files and bytes, never from an exit code.
//
// What is real in this module: a spawned child process whose stdin is closed and whose stdout is read
// through a real pipe; a real EACCES produced by the OS when that child opens a file this test chmods
// to 000; real byte offsets measured on the bytes that arrived; a real grade directory written through
// temp file -> fsync -> rename and read back from disk. The child exits 0 while its required read was
// denied, so the exit-code trap is the real one, not a claim about one.
//
// What this module does NOT do: fabricate a harness event. Mapping harness bytes to CanonicalEvent is
// T6's job, and the first-party deny-under-default-mode capture is T5/T11's. That capture is used here
// the moment it exists under test/harness/fixtures/streams/; until then the artifact says so.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCapture, denials, spawnCaptured } from "../../test/harness/runtime/capture.mjs";
import { gradeFromEvidence, readGrade, verifyReadBack, writeGrade } from "../../test/harness/runtime/grade-writer.mjs";
import { exitCodeVerdict } from "../../test/harness/lib/verdict.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPORT_DIR = join(ROOT, ".tmp", "sprint-01-verification");
const ARTIFACT = join(REPORT_DIR, "grd-03-evidence.json");
// The real capture T5/T11 records on a hosted run; absent until then.
const ARCHIVED_CAPTURE_DIR = join(ROOT, "test/harness/fixtures/streams");
const LIVE_ARTIFACT =
  process.env.HARNESS_EVAL_RESULT ?? join(ROOT, ".tmp", "sprint-01-artifacts", "he1", "harness-eval-result.json");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

// The child performs real reads and prints what the OS actually said, then exits 0.
const READER = `
const { readFileSync } = require("node:fs");
for (const target of JSON.parse(process.argv[1])) {
  const record = { type: "read_attempt", path: target.path };
  try {
    record.bytes = readFileSync(target.path).length;
    record.ok = true;
  } catch (error) {
    record.ok = false;
    record.code = error.code;
    record.syscall = error.syscall;
    record.errno = error.errno;
  }
  process.stdout.write(JSON.stringify(record) + "\\n");
}
process.exitCode = 0;
`;

const STDIN_PROBE = `
let bytes = 0;
process.stdin.on("data", (chunk) => { bytes += chunk.length; });
process.stdin.on("end", () => { process.stdout.write(JSON.stringify({ type: "stdin", bytes, eof: true }) + "\\n"); });
`;

// Reports the required read as done, then dies of an unexplained signal: real bytes, no exit status.
const KILLED_AFTER_READ = `
const { writeSync } = require("node:fs");
writeSync(1, JSON.stringify({ type: "read_attempt", ok: true, path: process.argv[1] }) + "\\n");
process.kill(process.pid, "SIGKILL");
`;

function seedProject() {
  const dir = mkdtempSync(join(tmpdir(), "pp-grd-03-"));
  mkdirSync(join(dir, "design"), { recursive: true });
  mkdirSync(join(dir, "workflows"), { recursive: true });
  writeFileSync(join(dir, "design/manifest.json"), '{"platforms":{"web-desktop":{"phase":"build"}}}\n', "utf8");
  // A required read the OS will refuse: the mode is the denial, not a written-out error.
  writeFileSync(join(dir, "workflows/RUNTIME-CONTRACT.md"), "runtime contract\n", "utf8");
  chmodSync(join(dir, "workflows/RUNTIME-CONTRACT.md"), 0o000);
  writeFileSync(join(dir, "workflows/status.md"), "status doc\n", "utf8");
  return dir;
}

function discard(dir) {
  try {
    chmodSync(join(dir, "workflows/RUNTIME-CONTRACT.md"), 0o600);
  } catch {
    // already readable or gone
  }
  rmSync(dir, { recursive: true, force: true });
}

/** One real invocation of the reader child, captured by byte offset. */
async function captureReader({ dir, timeout_ms = 20_000 }) {
  const requiredPath = join(dir, "workflows/RUNTIME-CONTRACT.md");
  const targets = [
    { path: requiredPath },
    { path: join(dir, "workflows/status.md") },
    { path: join(dir, "workflows/absent.md") },
  ];
  const capture = createCapture({
    harness: "claude-code",
    check_id: "verify",
    cwd: dir,
    timeout_ms,
    stream_source: "live-subprocess",
  });
  capture.snapshotFixtures("before");
  const status = await spawnCaptured({
    command: process.execPath,
    args: ["-e", READER, JSON.stringify(targets)],
    cwd: dir,
    capture,
    timeout_ms,
  });
  capture.snapshotFixtures("after");
  capture.finish(status);
  return { capture, requiredPath };
}

// The mapping the adapter/grader supplies. It classifies by the errno the child really got; WHICH
// target was required is the case's declaration, passed to observe(), never the harness's claim.
function readAttemptMapper() {
  return (line) => {
    if (line.type !== "read_attempt" || line.ok === true) return [];
    if (line.code !== "EACCES") return [{ kind: "optional_read_failed", operation: "read", target: line.path }];
    return [{ kind: "permission_denied", operation: "read", target: line.path, raw_event: line }];
  };
}

// A mapper for a cell that really succeeded: a completed read is the fact the case claims.
function passMapper() {
  return (line) => {
    if (line.type !== "read_attempt" || line.ok !== true) return [];
    return [{ kind: "required_read_ok", operation: "read", target: line.path, fact_id: "required_read_ok" }];
  };
}

function installation() {
  return {
    requested_cli_version: "2.1.291",
    resolved_cli_version: "2.1.291",
    observed_cli_version: null,
    install_mode: "checkout",
    plugin_revision: null,
    expected_plugin_manifest_sha256: null,
    observed_plugin_manifest_sha256: null,
    loaded_plugin_root: null,
    plugin_load_evidence: null,
  };
}

test("FLOW-GRD-03-FILES-AND-STREAM", async (t) => {
  const projectDir = seedProject();
  const gradeDir = mkdtempSync(join(tmpdir(), "pp-grades-"));
  const evidenceDir = mkdtempSync(join(tmpdir(), "pp-evidence-"));
  const artifact = {
    flow: "FLOW-GRD-03-FILES-AND-STREAM",
    uc_ref: "UC-GRD-03",
    generated_at: new Date().toISOString(),
    candidate_sha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
    provenance: {
      stream_source: "live-subprocess",
      denial_source: "real EACCES from the child's own open() of the required path",
      harness_event_mapping: "T6 (not used here: no harness event is fabricated)",
      archived_capture: null,
      live_artifact: null,
    },
    controls: [],
    assertions: [],
    awaiting: [],
    failures: [],
  };

  try {
    // ---- a required read is denied and the process exits 0 --------------------------------
    const { capture, requiredPath } = await captureReader({ dir: projectDir });
    capture.observe(readAttemptMapper(), { required_read_paths: [requiredPath] });
    const record = capture.persist(evidenceDir);
    const denied = denials(record);

    assert.equal(record.process_status.exit_code, 0, "the child must exit 0 for this flow to mean anything");
    assert.equal(record.termination_kind, "native");
    assert.equal(record.prefix_complete, true);
    assert.equal(denied.length, 1, "exactly the required denial is in the stream");
    assert.equal(denied[0].target, requiredPath);
    assert.equal(denied[0].raw_event.code, "EACCES", "the denial is the OS's errno, not a synthesized event");

    // The before/after fixture manifests are recorded, not decorative: they are what makes a
    // mutable-project case trustworthy, so they must really hash the fixtures.
    assert.ok(Object.keys(record.fixture_manifests.before).length >= 2, "the before manifest hashes the fixtures");
    assert.deepEqual(Object.keys(record.fixture_manifests.after), Object.keys(record.fixture_manifests.before));
    assert.deepEqual(record.fixture_manifests.changed, [], "nothing changed between the two snapshots");

    // The citation resolves to bytes that really are in the capture, at the cited offset.
    const stdoutBytes = readFileSync(record.evidence_paths.find((path) => path.endsWith("stdout.bin")));
    const cited = stdoutBytes.subarray(denied[0].stream_offset, denied[0].stream_end_offset);
    assert.equal(sha256(cited), denied[0].raw_sha256, "the cited span hashes to the citation");
    assert.equal(JSON.parse(cited.toString("utf8")).code, "EACCES");
    assert.equal(stdoutBytes.length, record.stdout.byte_length);

    // ---- the grade: fail from bytes, beside the raw 0 -------------------------------------
    const cell = gradeFromEvidence({
      record,
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: record.evidence_paths,
      report_paths: [],
      required_facts: [],
    });
    assert.equal(cell.verdict, "fail", "a denied required read is fail even on exit 0");
    assert.equal(cell.reason, "denied_tool_call");
    assert.equal(cell.process_exit_code, 0, "the raw exit code stays the raw exit code");
    assert.equal(cell.denied_tool_call.stream_offset, denied[0].stream_offset);
    assert.equal(cell.denied_tool_call.raw_sha256, denied[0].raw_sha256);
    assert.equal(cell.observed_verify_outcome, "permission-denied");
    assert.notEqual(cell.verdict, exitCodeVerdict(cell.process_exit_code), "the verdict is not the exit-code mapping");

    artifact.controls.push({
      control_id: "exit0-denied-read",
      verdict: cell.verdict,
      reason: cell.reason,
      process_exit_code: cell.process_exit_code,
      denial_offset: cell.denied_tool_call.stream_offset,
      target: cell.denied_tool_call.target,
      evidence_paths: cell.evidence_paths,
    });

    // ---- the writer: temp -> fsync -> rename -> read back ---------------------------------
    const written = writeGrade({ dir: gradeDir, cell });
    const readBack = readGrade(written.path);
    const identity = verifyReadBack(cell, readBack);
    assert.equal(identity.ok, true, `read-back mismatches: ${JSON.stringify(identity.mismatches)}`);
    assert.equal(readBack.verdict, "fail");
    assert.equal(readBack.process_exit_code, 0);
    assert.equal(readBack.harness, "claude-code");
    assert.equal(readBack.track, "pinned");
    assert.equal(readBack.check_id, "verify");
    assert.equal(readBack.installation.resolved_cli_version, "2.1.291");
    assert.equal(existsSync(written.temp_path), false, "no temp file is left behind");
    artifact.assertions.push(`writer read-back matched: ${written.path}`);
    artifact.grade_path = written.path;

    // ---- negative control: a tampered read-back is could-not-run, not a pass ---------------
    const tamperedPath = join(gradeDir, "tampered.json");
    writeFileSync(tamperedPath, JSON.stringify({ ...readBack, verdict: "pass" }), "utf8");
    const tampered = verifyReadBack(cell, readGrade(tamperedPath));
    assert.equal(tampered.ok, false);
    assert.equal(tampered.verdict, "could-not-run");
    assert.equal(tampered.reason, "read-back-mismatch");
    assert.ok(tampered.mismatches.some((entry) => entry.field === "verdict"));
    artifact.controls.push({ control_id: "tampered-readback", verdict: tampered.verdict, reason: tampered.reason });

    // Every identity field is compared, one at a time: a read-back that checks three of five is a
    // grade from the wrong harness/version/track waiting to be read as this one.
    const fieldMutations = {
      verdict: (copy) => {
        copy.verdict = copy.verdict === "pass" ? "fail" : "pass";
      },
      harness: (copy) => {
        copy.harness = "codex";
      },
      version: (copy) => {
        copy.installation.resolved_cli_version = "0.0.0-not-the-graded-version";
      },
      track: (copy) => {
        copy.track = copy.track === "pinned" ? "newest" : "pinned";
      },
      check_id: (copy) => {
        copy.check_id = "status";
      },
    };
    for (const field of ["verdict", "harness", "version", "track", "check_id"]) {
      const copy = JSON.parse(JSON.stringify(readBack));
      fieldMutations[field](copy);
      const path = join(gradeDir, `identity-${field}.json`);
      writeFileSync(path, JSON.stringify(copy), "utf8");
      const result = verifyReadBack(cell, readGrade(path));
      assert.equal(result.ok, false, `a read-back differing only in ${field} must not be accepted`);
      assert.equal(result.verdict, "could-not-run");
      assert.equal(result.reason, "read-back-mismatch");
      assert.deepEqual(
        result.mismatches.map((entry) => entry.field),
        [field],
        `${field} is one of the five identity fields the read-back compares`,
      );
    }
    artifact.assertions.push("read-back compares all five identity fields: verdict, harness, version, track, check_id");

    // ---- negative control: a partial file is could-not-run --------------------------------
    const partialPath = join(gradeDir, "partial.json");
    writeFileSync(partialPath, JSON.stringify(cell), "utf8");
    truncateSync(partialPath, Math.floor(readFileSync(partialPath).length / 2));
    const partial = readGrade(partialPath);
    assert.equal(partial.ok, false);
    assert.equal(partial.verdict, "could-not-run");
    assert.equal(partial.reason, "grade-partial");
    artifact.controls.push({ control_id: "partial-grade-file", verdict: partial.verdict, reason: partial.reason });

    // ---- negative control: a citation with no bytes behind it -----------------------------
    const fabricated = gradeFromEvidence({
      record: {
        ...record,
        observations: [
          ...record.observations,
          {
            kind: "permission_denied",
            operation: "read",
            target: requiredPath,
            required_read: true,
            stream_offset: 10_000_000,
            stream_end_offset: 10_000_040,
            raw_sha256: "0".repeat(64),
            raw_event: { type: "read_attempt", ok: false, code: "EACCES", path: requiredPath },
          },
        ],
      },
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: record.evidence_paths,
      report_paths: [],
      required_facts: [],
    });
    assert.equal(fabricated.verdict, "could-not-run", "a denial with no captured bytes is not evidence");
    assert.equal(fabricated.reason, "evidence-unresolvable");
    artifact.controls.push({ control_id: "fabricated-denial", verdict: fabricated.verdict, reason: fabricated.reason });

    // ---- negative control: evidence paths that do not resolve -----------------------------
    const unbacked = gradeFromEvidence({
      record,
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: [join(evidenceDir, "not-written.json")],
      report_paths: [],
      required_facts: [],
    });
    assert.equal(unbacked.verdict, "could-not-run");
    assert.equal(unbacked.reason, "evidence-unresolvable");
    artifact.controls.push({ control_id: "absent-evidence-path", verdict: unbacked.verdict, reason: unbacked.reason });

    // ---- an undeclared required read is never read as optional (F-T3-2) -----------------
    // The same real denial, observed with observe()'s default: nobody declared which target was
    // required, and absence of a declaration must not be graded as "optional".
    const { capture: undeclaredCapture } = await captureReader({ dir: projectDir });
    undeclaredCapture.observe(readAttemptMapper());
    const undeclaredRecord = undeclaredCapture.persist(evidenceDir);
    assert.equal(denials(undeclaredRecord).length, 0, "without a declaration the capture counts no denial");
    assert.equal(
      undeclaredRecord.observations.find((observation) => observation.kind === "permission_denied").required_read,
      null,
      "undeclared requiredness is recorded as undeclared, not as false",
    );
    const undeclared = gradeFromEvidence({
      record: undeclaredRecord,
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: undeclaredRecord.evidence_paths,
      report_paths: [],
      required_facts: [],
    });
    assert.notEqual(undeclared.verdict, "pass", "a visible denial must never grade pass by default");
    assert.equal(undeclared.verdict, "could-not-run");
    assert.equal(undeclared.reason, "requiredness-undeclared");
    artifact.controls.push({ control_id: "undeclared-required-read", verdict: undeclared.verdict, reason: undeclared.reason });

    // ---- the record still regrades after the artifact is moved (F-T3-8) -----------------
    // A downloaded artifact lives at a new path and the recorded absolute paths are gone; the record
    // travels with its bytes, so it must regrade off the root it now sits in.
    const movedDir = mkdtempSync(join(tmpdir(), "pp-moved-"));
    for (const path of record.evidence_paths) writeFileSync(join(movedDir, path.split("/").pop()), readFileSync(path));
    for (const path of record.evidence_paths) rmSync(path, { force: true });
    assert.equal(
      existsSync(record.evidence_paths.find((path) => path.endsWith("stdout.bin"))),
      false,
      "the recorded absolute path is gone: only the moved copy is left",
    );
    const moved = gradeFromEvidence({
      record,
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: record.evidence_paths,
      evidence_root: movedDir,
      report_paths: [],
      required_facts: [],
    });
    assert.equal(moved.verdict, "fail", "a moved artifact still resolves its citations");
    assert.equal(moved.reason, "denied_tool_call");
    assert.equal(moved.denied_tool_call.stream_offset, denied[0].stream_offset);
    artifact.controls.push({ control_id: "moved-artifact-regrade", verdict: moved.verdict, reason: moved.reason });
    rmSync(movedDir, { recursive: true, force: true });

    // ---- a pass is impossible without an observed required fact --------------------------
    // The required file is readable now, so the same child reports a successful read.
    chmodSync(join(projectDir, "workflows/RUNTIME-CONTRACT.md"), 0o600);
    const { capture: cleanCapture } = await captureReader({ dir: projectDir });
    cleanCapture.observe(readAttemptMapper(), { required_read_paths: [join(projectDir, "workflows/RUNTIME-CONTRACT.md")] });
    const cleanRecord = cleanCapture.persist(evidenceDir);
    assert.equal(denials(cleanRecord).length, 0, "no denial left once the read succeeded");
    const unevidenced = gradeFromEvidence({
      record: cleanRecord,
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: cleanRecord.evidence_paths,
      report_paths: [],
      required_facts: [{ fact_id: "session_ended" }],
    });
    assert.equal(unevidenced.verdict, "could-not-run", "exit 0 with an unobserved required fact is never a pass");
    assert.equal(unevidenced.reason, "required-fact-unobserved");
    artifact.controls.push({ control_id: "exit0-no-required-fact", verdict: unevidenced.verdict, reason: unevidenced.reason });

    // ---- a real pass: the required fact was observed, and it survives the write path -----
    // Without this the only verdicts ever asserted are fail and could-not-run, so a writer that
    // can never return pass - or that dropped its pass-evidence gate - would ship green.
    const readable = join(projectDir, "workflows/RUNTIME-CONTRACT.md");
    const { capture: passCapture } = await captureReader({ dir: projectDir });
    passCapture.observe(passMapper(), { required_read_paths: [readable] });
    const passRecord = passCapture.persist(evidenceDir);
    const passCell = gradeFromEvidence({
      record: passRecord,
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: passRecord.evidence_paths,
      report_paths: [],
      required_facts: [{ fact_id: "required_read_ok" }],
    });
    assert.equal(passCell.verdict, "pass", "an observed required fact on a clean exit is a pass");
    assert.equal(passCell.reason, null);
    assert.equal(passCell.denied_tool_call, null);
    assert.equal(passCell.process_exit_code, 0);
    const passWritten = writeGrade({ dir: gradeDir, cell: passCell });
    assert.equal(passWritten.ok, true, `pass grade did not read back: ${JSON.stringify(passWritten.mismatches)}`);
    assert.equal(readGrade(passWritten.path).verdict, "pass", "the pass survives temp->fsync->rename->read-back");
    artifact.controls.push({ control_id: "required-fact-observed-pass", verdict: passCell.verdict, reason: passCell.reason });

    // A citation outside the captured bytes is refused at capture time, not only at grading.
    assert.throws(
      () => passCapture.spanOf(0, passRecord.stdout.byte_length + 1),
      (error) => error.reason === "span-outside-capture",
      "a span nobody captured cannot be cited",
    );

    // A mapper cannot supply its own digest: the runtime re-hashes the span it really produced.
    const { capture: lyingCapture } = await captureReader({ dir: projectDir });
    assert.throws(
      () =>
        lyingCapture.observe(() => [
          { kind: "permission_denied", operation: "read", target: readable, required_read: true, raw_sha256: "0".repeat(64) },
        ]),
      (error) => error.reason === "span-digest-mismatch",
      "an inflated citation is caught here rather than travelling into a grade",
    );
    artifact.assertions.push("span bounds and span digests are enforced at capture time");

    // Negative twin: the same capture with the required fact removed is not a pass.
    const factRemoved = gradeFromEvidence({      record: { ...passRecord, observations: passRecord.observations.filter((row) => row.fact_id === null) },
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: passRecord.evidence_paths,
      report_paths: [],
      required_facts: [{ fact_id: "required_read_ok" }],
    });
    assert.equal(factRemoved.verdict, "could-not-run", "the pass above is the fact, not the exit code");
    assert.equal(factRemoved.reason, "required-fact-unobserved");
    artifact.controls.push({ control_id: "pass-twin-fact-removed", verdict: factRemoved.verdict, reason: factRemoved.reason });

    // A fact the capture itself classified as not-required cannot carry a pass either, and exit 0
    // with nothing declared for the cell to prove is could-not-run rather than an empty pass.
    const optionalFact = gradeFromEvidence({
      record: {
        ...passRecord,
        observations: passRecord.observations.map((row) =>
          row.fact_id === "required_read_ok" ? { ...row, required_read: false } : row,
        ),
      },
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: passRecord.evidence_paths,
      report_paths: [],
      required_facts: [{ fact_id: "required_read_ok" }],
    });
    assert.equal(optionalFact.verdict, "could-not-run", "an optional read is not the required fact");
    assert.equal(optionalFact.reason, "required-fact-unobserved");
    artifact.controls.push({ control_id: "optional-fact-not-required", verdict: optionalFact.verdict, reason: optionalFact.reason });

    const undeclaredFacts = gradeFromEvidence({
      record: passRecord,
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "verify",
      evidence_paths: passRecord.evidence_paths,
      report_paths: [],
      required_facts: [],
    });
    assert.equal(undeclaredFacts.verdict, "could-not-run", "a clean exit with nothing declared graded nothing");
    assert.equal(undeclaredFacts.reason, "nothing-graded");
    artifact.controls.push({ control_id: "nothing-declared", verdict: undeclaredFacts.verdict, reason: undeclaredFacts.reason });

    // ---- a pass with no raw exit status is refused, not graded (assertPassEvidence) -----
    const killedCapture = createCapture({ harness: "claude-code", check_id: "verify", cwd: projectDir, timeout_ms: 20_000 });
    const killedStatus = await spawnCaptured({
      command: process.execPath,
      args: ["-e", KILLED_AFTER_READ, readable],
      cwd: projectDir,
      capture: killedCapture,
      timeout_ms: 20_000,
    });
    killedCapture.finish(killedStatus);
    killedCapture.observe(passMapper(), { required_read_paths: [readable] });
    const killedRecord = killedCapture.persist(evidenceDir);
    assert.equal(killedStatus.timed_out, false);
    assert.equal(killedRecord.process_status.exit_code, null, "an unexplained kill leaves no exit code");
    assert.equal(killedRecord.observations.length, 1, "the required fact was really captured before the kill");
    assert.throws(
      () =>
        gradeFromEvidence({
          record: killedRecord,
          installation: installation(),
          harness: "claude-code",
          track: "pinned",
          check_id: "verify",
          evidence_paths: killedRecord.evidence_paths,
          report_paths: [],
          required_facts: [{ fact_id: "required_read_ok" }],
        }),
      (error) => error.reason === "pass-without-evidence",
      "a pass needs a raw integer exit status: an unexplained kill is could-not-run",
    );
    artifact.controls.push({ control_id: "pass-without-exit-status", verdict: "refused", reason: "pass-without-evidence" });

    // ---- a real timeout is could-not-run, never a silent pass ----------------------------
    const slow = createCapture({ harness: "claude-code", check_id: "status", cwd: projectDir, timeout_ms: 250 });
    const timeoutStatus = await spawnCaptured({
      command: process.execPath,
      args: ["-e", "setTimeout(() => {}, 60_000)"],
      cwd: projectDir,
      capture: slow,
      timeout_ms: 250,
    });
    slow.finish(timeoutStatus);
    const slowRecord = slow.persist(evidenceDir);
    assert.equal(timeoutStatus.timed_out, true);
    assert.equal(slowRecord.termination_kind, "timeout");
    const timedOut = gradeFromEvidence({
      record: slowRecord,
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "status",
      evidence_paths: slowRecord.evidence_paths,
      report_paths: [],
      required_facts: [],
    });
    assert.equal(timedOut.verdict, "could-not-run");
    assert.equal(timedOut.reason, "termination-timeout");
    artifact.controls.push({ control_id: "timeout", verdict: timedOut.verdict, reason: timedOut.reason });

    // ---- stdin is closed: the child sees EOF, it does not hang ---------------------------
    const stdinCapture = createCapture({ harness: "claude-code", check_id: "status", cwd: projectDir, timeout_ms: 20_000 });
    const stdinStatus = await spawnCaptured({
      command: process.execPath,
      args: ["-e", STDIN_PROBE],
      cwd: projectDir,
      capture: stdinCapture,
      timeout_ms: 20_000,
    });
    stdinCapture.finish(stdinStatus);
    const stdinLine = JSON.parse(stdinCapture.lines().map((line) => line.text).join("\n").trim());
    assert.equal(stdinStatus.timed_out, false, "an open stdin would have hung this child");
    assert.equal(stdinLine.eof, true);
    assert.equal(stdinLine.bytes, 0);
    artifact.assertions.push("stdin closed: the child observed EOF with 0 bytes");

    // ---- a boundary stop is only gradeable when its prefix is complete (F-T3-5) ---------
    // A question boundary is the one kind that may skip a native end, so a truncated prefix is
    // could-not-run: the exception must never turn a partial capture into a pass.
    const boundaryCapture = createCapture({
      harness: "claude-code",
      check_id: "question_before_expensive_work",
      cwd: projectDir,
      timeout_ms: 20_000,
    });
    const boundaryStatus = await spawnCaptured({
      command: process.execPath,
      args: ["-e", STDIN_PROBE],
      cwd: projectDir,
      capture: boundaryCapture,
      timeout_ms: 20_000,
    });
    boundaryCapture.finish({
      ...boundaryStatus,
      stop_reason: "question-boundary",
      boundary_event_offset: boundaryCapture.byteLength + 1,
    });
    const truncatedRecord = boundaryCapture.persist(evidenceDir);
    assert.equal(truncatedRecord.termination_kind, "boundary-stop");
    assert.equal(truncatedRecord.prefix_complete, false, "the boundary offset lies past the captured bytes");
    const truncated = gradeFromEvidence({
      record: truncatedRecord,
      installation: installation(),
      harness: "claude-code",
      track: "pinned",
      check_id: "question_before_expensive_work",
      evidence_paths: truncatedRecord.evidence_paths,
      report_paths: [],
      required_facts: [],
    });
    assert.equal(truncated.verdict, "could-not-run", "a truncated prefix is not gradeable");
    assert.equal(truncated.reason, "capture-prefix-incomplete");
    artifact.controls.push({ control_id: "truncated-boundary-prefix", verdict: truncated.verdict, reason: truncated.reason });

    // ---- the first-party capture and the live artifact, when they exist ------------------
    const archived = existsSync(ARCHIVED_CAPTURE_DIR)
      ? execFileSync("find", [ARCHIVED_CAPTURE_DIR, "-name", "exit0-denied-read*", "-type", "f"], { encoding: "utf8" })
          .trim()
          .split("\n")
          .filter(Boolean)
      : [];
    if (archived.length > 0) {
      artifact.provenance.archived_capture = { status: "present", paths: archived };
      artifact.assertions.push(`archived capture present: ${archived[0]}`);
    } else {
      artifact.provenance.archived_capture = {
        status: "absent",
        path: ARCHIVED_CAPTURE_DIR,
        owner: "T5/T11",
        why: "the deny-under-default-mode capture is recorded on a hosted run; a synthesized one is banned",
      };
      artifact.awaiting.push("test/harness/fixtures/streams/exit0-denied-read* (T5/T11 archived capture)");
    }

    if (existsSync(LIVE_ARTIFACT)) {
      const live = JSON.parse(readFileSync(LIVE_ARTIFACT, "utf8"));
      const cells = live.cells ?? [];
      const fourSource = cells
        .filter((cell) => cell.harness === "claude-code" && cell.track === "pinned")
        .flatMap((cell) => cell.checks ?? [])
        .filter((check) => check.source === "files-and-event-stream");
      assert.equal(fourSource.length, 4, "four graded checks cite files-and-event-stream");
      for (const cell of cells) {
        if (cell.verdict !== "pass") continue;
        assert.ok((cell.evidence_paths ?? []).length > 0, `${cell.harness}/${cell.track} pass cites evidence`);
      }
      artifact.provenance.live_artifact = { status: "present", path: LIVE_ARTIFACT, cells: cells.length };
    } else {
      artifact.provenance.live_artifact = {
        status: "absent",
        path: LIVE_ARTIFACT,
        owner: "T8",
        why: "no hosted run has been downloaded into this worktree; HARNESS_EVAL_RESULT points at one when it exists",
      };
      artifact.awaiting.push("HARNESS_EVAL_RESULT: the run artifact whose claude-code checks cite files-and-event-stream");
    }
  } finally {
    discard(projectDir);
    rmSync(gradeDir, { recursive: true, force: true });
    rmSync(evidenceDir, { recursive: true, force: true });
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(ARTIFACT, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  t.diagnostic(`controls=${artifact.controls.map((row) => `${row.control_id}:${row.verdict}/${row.reason}`).join(",")}`);
  t.diagnostic(`archived_capture=${artifact.provenance.archived_capture.status}`);
  t.diagnostic(`live_artifact=${artifact.provenance.live_artifact.status}`);
  assert.equal(artifact.failures.length, 0, artifact.failures.join("; "));
});
