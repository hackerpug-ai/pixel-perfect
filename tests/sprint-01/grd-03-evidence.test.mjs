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
import { execFileSync, spawnSync } from "node:child_process";
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

// ===========================================================================================
// T6 — a grade read from the CanonicalEvent stream: tiled, lossless, version-scoped.
//
// This second block of the same flow normalises a REAL captured claude-code stdout stream into
// CanonicalEvents and checks the two properties that make a stream usable as evidence at all: the
// measured spans tile the bytes exactly once, and the events rebuild to the same bytes. The capture
// is archived under test/harness/stream/captures/ with its hashes; it is keyless (zero model
// requests, every credential name stripped), so it can contain no answer — which is itself the
// sharpest control here: `subtype: success` with `is_error: true` on exit 1 must never become a
// verdict, and the block asserts it does not.
// ===========================================================================================
test("FLOW-GRD-03-FILES-AND-STREAM", async (t) => {
  const stream = await import("../../test/harness/stream/index.mjs");
  const { exitCodeVerdict, worstVerdict } = await import("../../test/harness/lib/verdict.mjs");
  const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const ARCHIVE = join(ROOT, "test/harness/stream/captures/claude-code-stream-probe.capture.json");

  // A capture record may only be graded against the bytes it cites, so a constructed stream is
  // persisted next to a record that hashes it. Building one here keeps the byte/digest coupling in
  // the fixture rather than in the grader.
  const stagedRecords = [];
  t.after(() => { for (const dir of stagedRecords) rmSync(dir, { recursive: true, force: true }); });
  const stageRecord = (bytes, overrides = {}, { id = "inv-staged" } = {}) => {
    const dir = mkdtempSync(join(tmpdir(), "pp-stream-staged-"));
    stagedRecords.push(dir);
    const stdoutPath = join(dir, `${id}.stdout.bin`);
    const recordPath = join(dir, `${id}.capture.json`);
    writeFileSync(stdoutPath, bytes);
    const record = {
      ...archived.record,
      invocation_id: id,
      stdout: { byte_length: bytes.length, sha256: sha256(bytes) },
      evidence_root: dir,
      evidence_relative_paths: [`${id}.capture.json`, `${id}.stdout.bin`],
      evidence_paths: [recordPath, stdoutPath],
      ...overrides,
    };
    writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    return { dir, record, bytes };
  };
  const artifact2 = {
    flow: "FLOW-GRD-03-FILES-AND-STREAM",
    uc_ref: "UC-GRD-03",
    generated_at: new Date().toISOString(),
    provenance: { stream_source: "live-subprocess", mapping: "test/harness/stream/tables/claude-code@2.1.291.json", mapped_by: "T6" },
    controls: [],
    assertions: [],
    awaiting: [],
  };

  // ---- the archived bytes are the bytes the record cites ------------------------------------
  const archived = stream.readArchived(ARCHIVE);
  assert.equal(archived.intact, true, "the archived stdout hashes to the record's citation");
  const meta = JSON.parse(readFileSync(join(ROOT, "test/harness/stream/captures/claude-code-keyless-first-turn.meta.json"), "utf8"));
  assert.equal(archived.sha256, meta.stdout_sha256, "the archiver's own record and the bytes agree");
  assert.equal(archived.record.process_status.exit_code, meta.exit_code);
  assert.deepEqual(meta.credential_names_in_child, [], "the probe ran with no credential in the child");
  assert.equal(meta.model_requests, 0, "the probe made no model request");

  const table = stream.loadTable({ version: "2.1.291" });
  const real = stream.normalise({ bytes: archived.bytes, table, invocation_id: archived.record.invocation_id });

  // ---- TC-3: the offsets tile the capture exactly once, with no gap and no overlap ---------
  assert.equal(real.tiling.ok, true, `tiling: ${JSON.stringify(real.tiling)}`);
  assert.deepEqual(real.tiling.gaps, [], "no uncovered byte range");
  assert.deepEqual(real.tiling.overlaps, [], "no byte range claimed twice");
  assert.equal(real.tiling.covered, archived.bytes.length, "the spans cover the whole capture");
  assert.equal(real.tiling.covered, real.tiling.byte_length);
  // Every event's span is one of the measured line spans, and its own bytes are the bytes there.
  const lineSpans = new Set(real.lines.map((line) => `${line.offset}:${line.end_offset}`));
  for (const event of real.events) {
    assert.ok(lineSpans.has(`${event.stream_offset}:${event.stream_end_offset}`), `event ${event.sequence} cites a measured span`);
    assert.equal(
      archived.bytes.subarray(event.stream_offset, event.stream_end_offset).toString("utf8"),
      `${event.original_event}${event.terminator}`,
      `event ${event.sequence} preserves its original bytes`,
    );
  }

  // ---- TC-3: losslessness, and unknown lines survive as harness_specific -------------------
  const intact = stream.lossless(real.events, archived.bytes);
  assert.equal(intact.ok, true, "the events rebuild the capture byte for byte");
  assert.equal(intact.sha256, archived.sha256, "the rebuild hashes to the capture");
  assert.deepEqual(intact.rewritten, [], "no rule rewrote the line it cites");
  // The real stream starts with four SessionStart hook lines this table does not map. They are
  // preserved, they keep their bytes, and they satisfy no required fact.
  assert.equal(real.unknown_lines, 4, `4 unmapped hook lines survive: ${real.unknown_lines}`);
  const unknown = real.events.filter((event) => event.type === "harness_specific");
  assert.equal(unknown.length, 4);
  for (const event of unknown) {
    assert.ok(event.original_event.includes("hook_"), "an unmapped line keeps its own content");
    assert.deepEqual(event.fact_ids, [], "an unmapped line satisfies no required fact");
  }
  assert.equal(unknown.filter((event) => stream.CANONICAL_TYPES.indexOf(event.type) === -1).length, 0);
  // A mapper that dropped those lines could not state completeness: this is the tiling failure.
  assert.equal(stream.tilingReport(real.lines.slice(0, 3), archived.bytes.length).ok, false, "dropping lines leaves a gap");
  assert.equal(stream.tilingReport(real.lines.slice(0, 3), archived.bytes.length).gaps.length > 0, true);

  // ---- AC-2: the version-scoped validator refuses an unqualified capture -------------------
  const report = stream.validateMapping({ version: "2.1.291", bytes: archived.bytes, record: archived.record });
  assert.equal(report.table_coverage.verdict, "pass", "the table maps all six required facts");
  assert.equal(report.table_coverage.facts.filter((fact) => fact.mapped).length, 6, "six of six mapped");
  assert.equal(report.capture.observed_cli_version, "2.1.312");
  assert.equal(report.capture.version_qualified, false, "the capture is not the pinned version");
  assert.equal(report.verdict, "could-not-run", "an unqualified capture is never validated");
  assert.ok(report.reasons.some((entry) => entry.reason === "version-not-qualified"));
  assert.deepEqual(report.capture.missing, ["question-tool-start", "expensive-tool-start", "required-read-denial"]);
  artifact2.controls.push({ control_id: "version-bumped-capture", verdict: report.verdict, reason: report.reason, observed: report.capture.observed_cli_version, expected: report.table.cli_version });
  artifact2.controls.push({ control_id: "capture-facts-unobserved", verdict: report.capture.missing.length > 0 ? "could-not-run" : "pass", reason: report.capture.missing.join(",") });

  // The pass branch is reachable, and this proves it is not dead code: the SAME real bytes, a table
  // at the version the capture actually reports, plus the three declared event shapes the keyless
  // turn never reached. This leg is branch conformance, NOT evidence: it is not a grade.
  const shapes = [
    { type: "assistant", session_id: "shape", message: { id: "m-q", content: [{ type: "tool_use", id: "tu-q", name: "AskUserQuestion", input: { question: "platform?" } }] } },
    { type: "assistant", session_id: "shape", message: { id: "m-e", content: [{ type: "tool_use", id: "tu-e", name: "Task", input: { prompt: "x" } }] } },
    { type: "result", subtype: "success", is_error: false, stop_reason: "end_turn", result: "done", permission_denials: [{ tool_name: "Read", input: { file_path: "/tmp/x" } }] },
  ];
  const shapeBytes = Buffer.concat([archived.bytes, Buffer.from(`${shapes.map((line) => JSON.stringify(line)).join("\n")}\n`)]);
  // The branch-conformance leg cites the bytes it actually grades: a record whose stdout hash names
  // different bytes is refused (F-7), so it is staged with its own record rather than borrowing one.
  const shapeStaged = stageRecord(shapeBytes, { model_request_count: 0 }, { id: "inv-shapes" });
  const conformantTable = { ...table, cli_version: "2.1.312" };
  const conformant = stream.validateMapping({ version: "2.1.312", bytes: shapeBytes, record: shapeStaged.record, table: conformantTable });
  assert.equal(conformant.table_coverage.verdict, "pass");
  assert.equal(conformant.capture.version_qualified, true, "the capture reports the version this in-memory table is for");
  assert.deepEqual(conformant.capture.missing, [], "all six required facts observed");
  assert.equal(conformant.verdict, "pass", `the pass branch is reachable: ${JSON.stringify(conformant.reasons)}`);
  artifact2.assertions.push("branch conformance (not evidence): all six facts + matching version -> pass; the shipped table still refuses the same bytes");

  // ---- AC-2: the verdict comes from the stream, beside a raw exit code --------------------
  const installation = stream.provisionalInstallation("2.1.291");
  const graded = stream.gradeStreamCheck({
    record: archived.record,
    events: real.events,
    check_id: "verify",
    ask_policy: "ask-nothing",
    required_facts: ["plugin-loaded", "result-event"],
    installation,
  });
  const cell = graded.cell;
  assert.equal(cell.source, "files-and-event-stream", "the grade declares where it came from");
  assert.equal(cell.process_exit_code, 1, "the raw exit code is carried as a diagnostic");
  assert.equal(cell.verdict, "could-not-run", `subtype success + is_error true is not a verdict: ${JSON.stringify(cell.block_reasons)}`);
  assert.equal(cell.reason, "model-never-answered");
  assert.notEqual(cell.verdict, exitCodeVerdict(cell.process_exit_code), "the verdict is not the exit-code mapping (1 -> fail)");
  assert.ok(cell.evidence_paths.length >= 1, "every graded check cites at least one evidence path");
  assert.equal(cell.stream_evidence.completion.is_error, true);
  assert.equal(cell.stream_evidence.completion.subtype, "success", "the CLI's success subtype is preserved and still not a verdict");
  assert.equal(cell.stream_evidence.questions.count, 0, "the real capture asks nothing");
  // Four check ids, four `files-and-event-stream` sources: the shape the live artifact must show.
  const four = ["command_list", "status", "verify", "question_before_expensive_work"].map((check_id) =>
    stream.gradeStreamCheck({ record: archived.record, events: real.events, check_id, required_facts: ["plugin-loaded"], installation }).cell,
  );
  assert.equal(four.filter((row) => row.source === "files-and-event-stream").length, 4, "4 checks cite files-and-event-stream");
  assert.ok(four.every((row) => Number.isInteger(row.process_exit_code)));
  assert.ok(four.every((row) => row.verdict !== "pass"), "no check passes on a stream whose required fact was not observed");

  // ---- a denied required read is fail denied_tool_call, and requiredness is the case's -----
  const denialLine = JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    stop_reason: "end_turn",
    result: "read it",
    permission_denials: [{ tool_name: "Read", input: { file_path: "/tmp/pp-denied/RUNTIME-CONTRACT.md" } }],
  });
  const denialBytes = Buffer.concat([archived.bytes, Buffer.from(`${denialLine}\n`)]);
  const denialOffset = archived.bytes.length;
  const declaredBytes = stageRecord(denialBytes, {}, { id: "inv-denial" });
  const declared = stream.normalise({ bytes: denialBytes, table, required_read_paths: ["/tmp/pp-denied"] });
  const denialEvent = declared.events.find((event) => event.type === "permission_denied");
  assert.equal(denialEvent.stream_offset, denialOffset, "the denial is cited at its own offset");
  assert.equal(denialEvent.required_read, true, "a declared path makes the read required");
  assert.equal(denialEvent.target, "/tmp/pp-denied/RUNTIME-CONTRACT.md");
  const denialGrade = stream.gradeStreamCheck({
    record: declaredBytes.record,
    events: declared.events,
    check_id: "verify",
    required_facts: ["required-read-denial"],
    installation,
  });
  // The denial is a `fail` block carrying its own offset, and the aggregate is could-not-run because
  // this capture never got an answer: could-not-run outranks fail, so a visible denial is never lost
  // to a missing model reply, and never turns into one.
  const denialBlock = denialGrade.cell.block_reasons.find((entry) => entry.reason === "denied_tool_call");
  assert.ok(denialBlock, `an observable denial is a fail block: ${JSON.stringify(denialGrade.cell.block_reasons)}`);
  assert.equal(denialBlock.verdict, "fail");
  assert.equal(denialGrade.cell.denied_tool_call.stream_offset, denialOffset, "the citation is the denial's own offset");
  assert.equal(denialGrade.cell.denied_tool_call.operation, "Read");
  assert.equal(denialGrade.cell.verdict, "could-not-run", "could-not-run outranks fail in the aggregate order");
  assert.equal(denialGrade.cell.block_reasons.some((entry) => entry.reason === "evidence-unresolvable"), false, "the staged record cites the bytes it grades");
  artifact2.controls.push({ control_id: "denied-required-read", verdict: denialBlock.verdict, reason: denialBlock.reason, denial_offset: denialOffset });

  // The exit-0 form of the same trap: an answering run whose required read was denied, exiting 0.
  const answeredDenial = Buffer.from(
    `${JSON.stringify({ type: "system", subtype: "init", session_id: "s-exit0", claude_code_version: "2.1.291", permissionMode: "dontAsk", plugins: [{ name: "pixel-perfect" }] })}\n${JSON.stringify({
      type: "assistant",
      session_id: "s-exit0",
      message: { id: "m-0", content: [{ type: "text", text: "I read it." }] },
    })}\n${denialLine}\n`,
    "utf8",
  );
  const exitZeroBytes = stageRecord(
    answeredDenial,
    { process_status: { ...archived.record.process_status, exit_code: 0 }, model_request_count: 1 },
    { id: "inv-exit0" },
  );
  const exitZero = stream.gradeStreamCheck({
    record: exitZeroBytes.record,
    events: stream.normalise({ bytes: answeredDenial, table, required_read_paths: ["/tmp/pp-denied"] }).events,
    check_id: "verify",
    required_facts: ["plugin-loaded", "required-read-denial"],
    installation,
  });
  assert.equal(exitZero.cell.verdict, "fail", `a denied required read fails even on exit 0: ${JSON.stringify(exitZero.cell.block_reasons)}`);
  assert.equal(exitZero.cell.reason, "denied_tool_call");
  assert.equal(exitZero.cell.process_exit_code, 0, "the raw exit code stays 0 beside a fail");
  assert.notEqual(exitZero.cell.verdict, exitCodeVerdict(exitZero.cell.process_exit_code), "the verdict is not the exit-code mapping (0 -> pass)");
  assert.equal(exitZero.cell.stream_evidence.completion.subtype, "success", "the success subtype is present and still is not a verdict");
  artifact2.controls.push({ control_id: "exit0-denied-read-stream", verdict: exitZero.cell.verdict, reason: exitZero.cell.reason, process_exit_code: exitZero.cell.process_exit_code });

  // The same denial with nobody declaring which read was required is undeclared, not optional.
  const undeclaredGrade = stream.gradeStreamCheck({ record: declaredBytes.record, events: stream.normalise({ bytes: denialBytes, table }).events, check_id: "verify", required_facts: ["required-read-denial"], installation });
  assert.equal(undeclaredGrade.cell.verdict, "could-not-run", "an undeclared denial is not a pass");
  assert.ok(
    undeclaredGrade.cell.block_reasons.some((entry) => entry.reason === "requiredness-undeclared" && entry.verdict === "could-not-run"),
    `absence of a requiredness declaration is not permission: ${JSON.stringify(undeclaredGrade.cell.block_reasons)}`,
  );
  assert.equal(undeclaredGrade.cell.block_reasons.some((entry) => entry.reason === "denied_tool_call"), false, "an undeclared denial is not counted as a required-read failure either");
  artifact2.controls.push({ control_id: "undeclared-denial", verdict: "could-not-run", reason: "requiredness-undeclared" });
  // And a denial declared optional by the case is neither a failure nor a required fact.
  const optional = stream.normalise({ bytes: denialBytes, table, required_read_paths: ["/somewhere/else"] });
  assert.equal(optional.events.find((event) => event.type === "permission_denied").required_read, false);

  // ---- F-1: a grade may not take its expectations from the events it grades ----------------
  // A clean exit-0 stream whose own events claim facts. If the check's required facts default to
  // what the stream says about itself, the stream supplies both the question and the answer and the
  // grade is the exit-code mapping the flow exists to forbid.
  const line = (event) => `${JSON.stringify(event)}\n`;
  const cleanBytes = Buffer.from(
    line({ type: "system", subtype: "init", session_id: "s-clean", claude_code_version: "2.1.291", permissionMode: "dontAsk", plugins: [{ name: "pixel-perfect" }] }) +
      line({ type: "assistant", session_id: "s-clean", message: { id: "m-c", content: [{ type: "text", text: "ready" }] } }) +
      line({ type: "result", subtype: "success", is_error: false, stop_reason: "end_turn", result: "ready", permission_denials: [] }),
    "utf8",
  );
  const clean = stageRecord(
    cleanBytes,
    { termination_kind: "native", prefix_complete: true, model_request_count: 1, process_status: { ...archived.record.process_status, exit_code: 0 } },
    { id: "inv-clean-exit0" },
  );
  const cleanEvents = stream.normalise({ bytes: cleanBytes, table }).events;
  assert.throws(
    () => stream.gradeStreamCheck({ record: clean.record, events: cleanEvents, check_id: "verify", installation }),
    /required_facts/,
    "a grade cannot be computed from a required-fact list the stream supplied about itself",
  );
  const tableDeclared = stream.gradeStreamCheck({ record: clean.record, events: cleanEvents, check_id: "verify", table, installation });
  assert.equal(tableDeclared.cell.verdict, "could-not-run", `a clean exit 0 is not a pass when the table's facts are required: ${JSON.stringify(tableDeclared.cell.block_reasons)}`);
  assert.ok(tableDeclared.cell.block_reasons.some((entry) => entry.reason === "required-fact-unobserved"), "the table's unobserved facts are what refuse it");
  assert.notEqual(tableDeclared.cell.verdict, exitCodeVerdict(tableDeclared.cell.process_exit_code), "the verdict is not the exit-code mapping (0 -> pass)");
  artifact2.controls.push({ control_id: "clean-exit-without-declared-facts", verdict: tableDeclared.cell.verdict, reason: tableDeclared.cell.reason });

  // ---- F-2: an unattributable denial is undeclared, never optional ------------------------
  // A real-shaped Bash denial names no file path in its input. An answering exit-0 stream carrying
  // it must not pass: no one declared whether that read was required, so it cannot be graded.
  const bashDenialLine = JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    stop_reason: "end_turn",
    result: "read it",
    permission_denials: [{ tool_name: "Bash", input: { command: "cat /tmp/pp-denied/RUNTIME-CONTRACT.md" } }],
  });
  const answeredBash = Buffer.from(
    line({ type: "system", subtype: "init", session_id: "s-bash", claude_code_version: "2.1.291", permissionMode: "dontAsk", plugins: [{ name: "pixel-perfect" }] }) +
      line({ type: "assistant", session_id: "s-bash", message: { id: "m-b", content: [{ type: "text", text: "I read it." }] } }) +
      `${bashDenialLine}\n`,
    "utf8",
  );
  const bashStaged = stageRecord(
    answeredBash,
    { termination_kind: "native", prefix_complete: true, model_request_count: 1, process_status: { ...archived.record.process_status, exit_code: 0 } },
    { id: "inv-bash-denial" },
  );
  const bashNormalised = stream.normalise({ bytes: answeredBash, table, required_read_paths: ["/tmp/pp-denied"] });
  const bashEvent = bashNormalised.events.find((event) => event.type === "permission_denied");
  assert.equal(bashEvent.target, null, "a Bash denial names no file path, so its target is unresolvable");
  assert.equal(bashEvent.required_read, null, "a denial whose target cannot be extracted is undeclared, never optional");
  const bashGraded = stream.gradeStreamCheck({ record: bashStaged.record, events: bashNormalised.events, check_id: "verify", required_facts: ["plugin-loaded", "required-read-denial"], installation });
  assert.notEqual(bashGraded.cell.verdict, "pass", `an unattributable denial cannot pass on exit 0: ${JSON.stringify(bashGraded.cell.block_reasons)}`);
  assert.ok(
    bashGraded.cell.block_reasons.some((entry) => entry.reason === "requiredness-undeclared" && entry.verdict === "could-not-run"),
    `an unattributable denial refuses the grade instead of disappearing: ${JSON.stringify(bashGraded.cell.block_reasons)}`,
  );
  artifact2.controls.push({ control_id: "unattributable-denial-exit0", verdict: bashGraded.cell.verdict, reason: bashGraded.cell.reason, process_exit_code: bashGraded.cell.process_exit_code });

  // ---- F-4: a capture that cannot rebuild its own bytes cannot grade ----------------------
  // An invalid-UTF-8 tail survives as harness_specific with replacement characters, so the events
  // cannot rebuild the capture. The validator refuses it; the grading path must too.
  const lossyBytes = Buffer.concat([archived.bytes, Buffer.from([0x61, 0xff, 0x0a])]);
  const lossyStaged = stageRecord(
    lossyBytes,
    { termination_kind: "native", prefix_complete: true, model_request_count: 1, process_status: { ...archived.record.process_status, exit_code: 0 } },
    { id: "inv-lossy" },
  );
  const lossyStream = stream.normalise({ bytes: lossyBytes, table });
  assert.equal(stream.lossless(lossyStream.events, lossyBytes).ok, false, "the lossy capture cannot rebuild its bytes");
  // A table at the version these bytes report, so losslessness is the ONLY thing that can refuse it.
  const lossyReport = stream.validateMapping({ version: "2.1.312", bytes: lossyBytes, record: lossyStaged.record, table: conformantTable });
  assert.notEqual(lossyReport.verdict, "pass", "the validator refuses a lossy capture");
  assert.ok(lossyReport.reasons.some((entry) => entry.reason === "capture-not-lossless"), `losslessness is the refusal: ${JSON.stringify(lossyReport.reasons)}`);
  const lossyGrade = stream.gradeStreamCheck({
    record: lossyStaged.record,
    events: lossyStream.events,
    check_id: "verify",
    required_facts: ["incremental-text", "completion"],
    installation,
  });
  assert.equal(lossyGrade.cell.verdict, "could-not-run", `a lossy capture cannot grade: ${JSON.stringify(lossyGrade.cell.block_reasons)}`);
  assert.ok(lossyGrade.cell.block_reasons.some((entry) => entry.reason === "capture-not-lossless"), "losslessness is checked on the grading path, not only in the validator");
  artifact2.controls.push({ control_id: "lossy-capture", verdict: lossyGrade.cell.verdict, reason: lossyGrade.cell.reason });

  // ---- F-7: the record's own citation is checked, not decorative --------------------------
  // Same real bytes, a table at the version they report, so the ONLY thing that can refuse this is
  // the citation itself: a record whose stdout hash does not name these bytes cannot validate.
  const zeroRecord = { ...archived.record, stdout: { ...archived.record.stdout, sha256: "0".repeat(64) } };
  const citation = stream.validateMapping({ version: "2.1.312", bytes: shapeBytes, record: zeroRecord, table: conformantTable });
  assert.equal(citation.verdict, "could-not-run", "a record whose citation hash names other bytes is refused");
  assert.ok(citation.reasons.some((entry) => entry.reason === "capture-citation-mismatch"), `the refusal names the citation: ${JSON.stringify(citation.reasons)}`);
  artifact2.controls.push({ control_id: "citation-hash-mismatch", verdict: citation.verdict, reason: citation.reason });

  // ---- F-8: table-only mode is a gate, not a label ----------------------------------------
  // Every evidence gate in this sprint reads exit codes, so an unqualified table must not be
  // indistinguishable from a qualified one to a caller that only sees the code.
  const tableOnly = spawnSync(process.execPath, [join(ROOT, "test/harness/stream/validate-mapping.mjs"), "--version", "2.1.291"], { encoding: "utf8" });
  assert.notEqual(tableOnly.status, 0, "an unqualified table does not exit 0 in table-only mode");
  assert.match(tableOnly.stdout, /UNQUALIFIED/, "the qualification state is printed, not implied");
  artifact2.controls.push({ control_id: "table-only-unqualified", verdict: tableOnly.status === 0 ? "pass" : "could-not-run", reason: "unqualified-table" });

  // ---- F-9: the aggregate order is a recorded decision, not a consequence -----------------
  // 'An observable denial is always fail' (the frozen flow's wording) and 'could-not-run outranks
  // fail' (03-data-schema) collide when a denial sits on a stream that never answered. The schema's
  // order wins, because could-not-run is never more permissive than fail: the denial is still a
  // fail block carrying its own offset, only the aggregate is undecided. Asserted here so the
  // choice cannot drift silently.
  assert.equal(worstVerdict(["fail", "could-not-run"]), "could-not-run", "could-not-run outranks fail by decision");
  assert.equal(worstVerdict(["pass", "fail"]), "fail", "fail outranks pass");

  // A tampered archive is refused at read time, so a fixture cannot be edited into a cleaner story.
  const tamperedDir = mkdtempSync(join(tmpdir(), "pp-stream-tamper-"));
  try {
    const tamperedBytes = Buffer.from(archived.bytes);
    tamperedBytes[0] = 0x5b; // the original byte is "{" — change it to "["
    writeFileSync(join(tamperedDir, "claude-code-stream-probe.stdout.bin"), tamperedBytes);
    writeFileSync(join(tamperedDir, "claude-code-stream-probe.capture.json"), JSON.stringify(archived.record));
    const tampered = stream.readArchived(join(tamperedDir, "claude-code-stream-probe.capture.json"));
    assert.equal(tampered.intact, false, "edited bytes no longer hash to the citation");
    artifact2.controls.push({ control_id: "tampered-archive", verdict: "could-not-run", reason: "captured-bytes-tampered" });
  } finally {
    rmSync(tamperedDir, { recursive: true, force: true });
  }

  // ---- the hosted artifact, when a run has been downloaded -------------------------------
  if (existsSync(LIVE_ARTIFACT)) {
    const live = JSON.parse(readFileSync(LIVE_ARTIFACT, "utf8"));
    const sourceRows = (live.cells ?? [])
      .filter((row) => row.harness === "claude-code" && row.track === "pinned")
      .flatMap((row) => row.checks ?? [])
      .filter((check) => check.source === "files-and-event-stream");
    assert.equal(sourceRows.length, 4, "4 graded checks cite files-and-event-stream in the live artifact");
    const control = (live.controls ?? []).find((row) => row.id === "exit0-denied-read" || row.control_id === "exit0-denied-read");
    assert.ok(control, "the live artifact carries the exit0-denied-read control");
    artifact2.assertions.push(`live artifact: ${sourceRows.length} files-and-event-stream checks, exit0-denied-read present`);
  } else {
    artifact2.awaiting.push({ leg: "live-result-artifact", owner: "T8/T11", path: LIVE_ARTIFACT, why: "no hosted harness-eval run has been downloaded into this worktree" });
  }

  artifact2.assertions.push(
    "offsets tile the capture exactly once (no gap, no overlap) and every event preserves its original bytes",
    "the events rebuild to the capture's own sha256; 4 unmapped hook lines survive as harness_specific with empty fact_ids",
    "the validator refuses the archived capture: version-not-qualified (2.1.312 != 2.1.291) and 3 unobserved facts",
    "subtype success + is_error true on exit 1 grades could-not-run, never pass and never its exit-code mapping",
  );
  const { loadPins } = await import("../../test/harness/pins.mjs");
  artifact2.provenance.pins_sha256 = loadPins().pins_sha256;
  artifact2.provenance.capture_sha256 = archived.sha256;
  artifact2.provenance.capture_bytes = archived.bytes.length;
  artifact2.provenance.events = real.events.length;
  artifact2.provenance.unknown_lines = real.unknown_lines;

  mkdirSync(REPORT_DIR, { recursive: true });
  const prior = existsSync(ARTIFACT) ? JSON.parse(readFileSync(ARTIFACT, "utf8")) : {};
  const merged = {
    ...prior,
    stream: {
      ...artifact2,
      controls: [...(prior.stream?.controls ?? []), ...artifact2.controls],
      assertions: [...(prior.stream?.assertions ?? []), ...artifact2.assertions],
      awaiting: [...(prior.stream?.awaiting ?? []), ...artifact2.awaiting],
    },
  };
  writeFileSync(ARTIFACT, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

  // The product-owned success target: the report this flow publishes, read back off disk. Its
  // pins_sha256 binds it to this tree's manifest bytes and its capture hash to the bytes that were
  // graded, so a report from a different tree or a different capture is refused rather than read.
  const published = JSON.parse(readFileSync(ARTIFACT, "utf8"));
  assert.match(published.stream.provenance.pins_sha256, /^[0-9a-f]{64}$/, "the published report carries a 64-hex pins_sha256 identity");
  assert.equal(published.stream.provenance.pins_sha256, loadPins().pins_sha256, "the report binds to this tree's pins manifest");
  assert.equal(published.stream.provenance.capture_sha256, archived.sha256, "the report cites the capture it graded");
  assert.notEqual(published.stream.controls.length, 0, "the report carries the controls the verdicts rest on");

  t.diagnostic(`stream_capture_sha256=${archived.sha256} events=${real.events.length} unknown=${real.unknown_lines}`);
  t.diagnostic(`stream_tiling=${real.tiling.ok} lossless=${intact.ok} validator=${report.verdict}/${report.reason}`);
  t.diagnostic(`stream_controls=${artifact2.controls.map((row) => `${row.control_id}:${row.verdict}`).join(",")}`);
  t.diagnostic(`stream_awaiting=${artifact2.awaiting.map((row) => row.leg).join(",")}`);
});
