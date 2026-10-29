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
