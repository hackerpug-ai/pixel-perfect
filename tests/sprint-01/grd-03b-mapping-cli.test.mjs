// GRD-03b — the mapping validator CLI's --capture path, pinned as it behaves TODAY over the
// committed archive test/harness/stream/captures/claude-code-stream-probe.*.
//
// What is pinned here, with exact equality:
//   * the real CLI over the intact committed pair refuses: the table at the pinned 2.1.291 is
//     itself `provenance.qualified: false` and the archived capture reports a 2.1.312 CLI, so the
//     verdict is `could-not-run / version-not-qualified`, exit code 1, and formatVerdict's exact
//     one-line output is pinned character for character. Today no qualified pass is reachable
//     through this CLI over committed data — the pass line would require a capture at the table's
//     version plus a table whose provenance records qualification, and no such pair exists yet
//     (owner T11). grd-03 pins the pass branch's reachability with an in-memory table instead.
//   * a tampered COPY whose bytes no longer hash to the record's citation is refused by bytesOf
//     before any mapping: exit code 2 and the exact stderr line, reason doubled exactly as the
//     module prints it today (StreamError embeds the reason in its message and the CLI prepends
//     it again).
//   * a COPY whose record cites no .stdout.bin is refused as captured-bytes-uncited: exit code 2
//     and the exact stderr line.
//
// What is NOT here: the table-only mode gate (grd-03's F-8 owns it), the in-memory-table pass
// branch and stream grading (grd-03 owns both), no mocks, no network, no credential — every run
// is a real subprocess over committed archived bytes, and the committed pair itself is never
// modified: both tamper cases work on mkdtemp copies.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const CLI = join(ROOT, "test/harness/stream/validate-mapping.mjs");
const ARCHIVE_RECORD = join(ROOT, "test/harness/stream/captures/claude-code-stream-probe.capture.json");
const ARCHIVE_BYTES = join(ROOT, "test/harness/stream/captures/claude-code-stream-probe.stdout.bin");

// The committed citation, pinned: if the archive is ever re-captured, these two asserts are the
// conscious-update tripwire the tamper pins below read their expected stderr from.
const CITED_SHA256 = "47298ec50ca80cde9ef86eabce7c3de0da7a591f1722da4263730eb4bef100ab";
const CITED_BYTES = 6233;

// formatVerdict's exact line over the intact committed pair, observed today: could-not-run on
// version-not-qualified, the table's own unqualification named, six mapped facts, three observed.
const INTACT_VERDICT_LINE =
  "could-not-run: version-not-qualified claude-code@2.1.291 [unqualified (no capture at the pinned 2.1.291 exists; the only archived capture is from the local 2.1.312 CLI, so it proves shape and offsets, not version qualification. Owner: T11.)]"
  + " | table pass (6 required facts) incremental-text=mapped@observed question-tool-start=mapped expensive-tool-start=mapped required-read-denial=mapped native-session-identity=mapped@observed completion=mapped@observed";

function stageArchiveCopy(label) {
  const dir = mkdtempSync(join(tmpdir(), `pp-grd-03b-${label}-`));
  cpSync(ARCHIVE_BYTES, join(dir, "claude-code-stream-probe.stdout.bin"));
  cpSync(ARCHIVE_RECORD, join(dir, "claude-code-stream-probe.capture.json"));
  return dir;
}

test("grd-03b-capture-cli-verdict-over-intact-archive", () => {
  const run = spawnSync(process.execPath, [CLI, "--version", "2.1.291", "--capture", ARCHIVE_RECORD], {
    encoding: "utf8",
    timeout: 60_000,
  });

  assert.equal(run.status, 1, `the intact committed pair is could-not-run today, not a pass (stderr: ${run.stderr})`);
  assert.equal(run.stderr, "", "the verdict path writes nothing to stderr");
  assert.equal(run.stdout, `${INTACT_VERDICT_LINE}\n`, "formatVerdict's exact line over the intact archive");
});

test("grd-03b-capture-cli-refuses-tampered-bytes", (t) => {
  const dir = stageArchiveCopy("tampered");
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  assert.deepEqual(JSON.parse(readFileSync(join(dir, "claude-code-stream-probe.capture.json"), "utf8")).stdout, {
    byte_length: CITED_BYTES,
    sha256: CITED_SHA256,
  }, "control: the copy still carries the committed citation before the tamper");

  const bin = readFileSync(join(dir, "claude-code-stream-probe.stdout.bin"));
  bin[0] = 0x5b; // the original byte is "{" — the same one-byte drift grd-03 plants
  writeFileSync(join(dir, "claude-code-stream-probe.stdout.bin"), bin);

  const run = spawnSync(process.execPath, [CLI, "--version", "2.1.291", "--capture", join(dir, "claude-code-stream-probe.capture.json")], {
    encoding: "utf8",
    timeout: 60_000,
  });

  assert.equal(run.status, 2, `a cited-hash mismatch is a CLI refusal, not a verdict (stderr: ${run.stderr})`);
  assert.equal(run.stdout, "", "the refusal prints nothing to stdout");
  assert.equal(
    run.stderr,
    `capture-citation-mismatch: capture-citation-mismatch: {"stdoutPath":"${join(dir, "claude-code-stream-probe.stdout.bin")}","cited_sha256":"${CITED_SHA256}","cited_bytes":${CITED_BYTES},"read_bytes":${CITED_BYTES}}\n`,
    "the exact refusal line as bytesOf prints it today (reason doubled: message embeds it, CLI prepends it again)",
  );
});

test("grd-03b-capture-cli-refuses-uncited-bytes", (t) => {
  const dir = stageArchiveCopy("uncited");
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const record = JSON.parse(readFileSync(join(dir, "claude-code-stream-probe.capture.json"), "utf8"));
  record.evidence_paths = record.evidence_paths.filter((path) => !path.endsWith(".stdout.bin"));
  writeFileSync(join(dir, "claude-code-stream-probe.capture.json"), JSON.stringify(record));

  const recordCopyPath = join(dir, "claude-code-stream-probe.capture.json");
  const run = spawnSync(process.execPath, [CLI, "--version", "2.1.291", "--capture", recordCopyPath], {
    encoding: "utf8",
    timeout: 60_000,
  });

  assert.equal(run.status, 2, `a record citing no .stdout.bin is a CLI refusal, not a verdict (stderr: ${run.stderr})`);
  assert.equal(run.stdout, "", "the refusal prints nothing to stdout");
  assert.equal(
    run.stderr,
    `captured-bytes-uncited: captured-bytes-uncited: {"recordPath":"${recordCopyPath}"}\n`,
    "the exact refusal line as bytesOf prints it today",
  );
});
