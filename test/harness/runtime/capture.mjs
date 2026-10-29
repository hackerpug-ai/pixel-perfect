// InvocationCapture: stdout recorded incrementally by byte offset, with the original bytes kept.
//
// This module records bytes and provenance only. It does not know what a harness event means: the
// adapter/grader supplies an observation mapper, and every observation it produces is bound to the
// span of captured bytes that produced it. That binding is load-bearing: a citation whose offset is
// outside the capture, or whose span no longer hashes to the cited digest, is refused here rather
// than travelling into a grade as if it were evidence.
//
// Nothing at module load reads the environment, spawns a process or writes a file.
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

export const TERMINATION_KINDS = ["native", "boundary-stop", "timeout", "unexpected"];
export const CAPTURE_SCHEMA = "invocation-capture/v1";
const SKIP_DIRS = new Set(["node_modules", ".git", ".tmp"]);

export class CaptureError extends Error {
  constructor(reason, detail = {}) {
    super(`${reason}: ${JSON.stringify(detail)}`);
    this.name = "CaptureError";
    this.reason = reason;
    this.detail = detail;
  }
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Sorted relative-path -> sha256 of every fixture file, so before/after can be compared. */
export function manifestOf(root, { skip = SKIP_DIRS } = {}) {
  if (!root) return null;
  const files = {};
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) walk(join(dir, entry.name));
      } else if (entry.isFile()) {
        const path = join(dir, entry.name);
        const key = relative(root, path).split("\\").join("/");
        try {
          files[key] = sha256(readFileSync(path));
        } catch (error) {
          // An unreadable fixture file is recorded as unreadable, not skipped: a manifest that omits
          // what it could not read would report a change-free fixture that was never fully hashed.
          files[key] = `unreadable:${error.code ?? "unknown"}`;
        }
      }
    }
  };
  walk(root);
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)));
}

function terminationKind(status) {
  if (status.timed_out) return "timeout";
  if (status.stop_reason === "question-boundary" && Number.isInteger(status.boundary_event_offset)) return "boundary-stop";
  return "native";
}

/**
 * Records one invocation. Every method mutates this capture only; `persist` is the single write.
 *
 * @param {object} options
 * @param {string} options.harness
 * @param {string} options.check_id
 * @param {string} [options.cwd] fixture root: the before/after manifests are taken over it
 * @param {number} [options.timeout_ms] the timeout the caller wrapped the process in
 * @param {string} [options.stream_source] provenance word for where the bytes came from
 * @param {string} [options.argv]
 */
export function createCapture({
  harness,
  check_id,
  cwd = null,
  timeout_ms = null,
  stream_source = "live-subprocess",
  argv = [],
  invocation_id = `${harness}-${randomUUID()}`,
} = {}) {
  if (!harness || !check_id) throw new CaptureError("capture-identity-missing", { harness, check_id });

  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  const chunks = [];
  const modelRequests = [];
  const observations = [];
  let status = null;
  let boundaryStop = null;
  let refusal = null;
  let decidedBefore = null;
  const fixtures = { root: cwd, before: null, after: null };

  function append(chunk, stream = "stdout") {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    const offset = stream === "stdout" ? stdout.length : stderr.length;
    if (stream === "stdout") stdout = Buffer.concat([stdout, bytes]);
    else stderr = Buffer.concat([stderr, bytes]);
    chunks.push({ stream, offset, end_offset: offset + bytes.length, byte_length: bytes.length, sha256: sha256(bytes) });
    return { offset, end_offset: offset + bytes.length };
  }

  /** Lines of stdout with the byte span each one occupies. Offsets are measured, never inferred. */
  function lines() {
    const out = [];
    let start = 0;
    while (start < stdout.length) {
      const newline = stdout.indexOf(0x0a, start);
      const end = newline === -1 ? stdout.length : newline + 1;
      const raw = stdout.subarray(start, end);
      const text = raw.toString("utf8").replace(/\r?\n$/, "");
      if (text.length > 0) {
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
        const byteLength = Buffer.byteLength(text);
        out.push({ text, json, offset: start, end_offset: start + byteLength, sha256: sha256(raw.subarray(0, byteLength)) });
      }
      start = end;
    }
    return out;
  }

  /** Reads a cited span back out of the captured bytes; refuses a span that is not really there. */
  function spanOf(offset, endOffset) {
    if (!Number.isInteger(offset) || !Number.isInteger(endOffset)) {
      throw new CaptureError("span-invalid", { offset, endOffset });
    }
    if (offset < 0 || endOffset > stdout.length || offset >= endOffset) {
      throw new CaptureError("span-outside-capture", { offset, endOffset, captured: stdout.length });
    }
    return stdout.subarray(offset, endOffset);
  }

  const api = {
    /** The identity a guard and a writer both need, without reaching into the record mid-run. */
    identity: { harness, check_id, invocation_id },

    get byteLength() {
      return stdout.length;
    },

    /** The guard's decision, recorded on the capture on both paths: refuse and proceed. */
    recordDecision(decision) {
      refusal = decision?.refusal ?? null;
      decidedBefore = decision?.refusal?.decided_before ?? "model-request";
      return refusal;
    },

    /** A model request is recorded when the guard actually dispatches one — never on refusal. */
    beginRequest(meta = {}) {
      modelRequests.push({ sequence: modelRequests.length, stream_offset: stdout.length, ...meta });
      return modelRequests.length;
    },

    append,

    lines,

    spanOf,

    snapshotFixtures(which) {
      fixtures[which] = manifestOf(fixtures.root);
      return fixtures[which];
    },

    /**
     * Maps captured lines to observations. Each observation inherits the span and digest of the line
     * that produced it, and its raw bytes are re-hashed here so an inflated citation is caught.
     */
    observe(mapper, { required_read_paths = null } = {}) {
      for (const line of lines()) {
        const produced = mapper(line.json, line) ?? [];
        for (const observation of produced) {
          const span = spanOf(line.offset, line.end_offset);
          if (observation.raw_sha256 && observation.raw_sha256 !== sha256(span)) {
            throw new CaptureError("span-digest-mismatch", { offset: line.offset, cited: observation.raw_sha256 });
          }
          const required =
            observation.required_read === true ||
            (required_read_paths !== null && observation.target != null && required_read_paths.includes(observation.target));
          observations.push({
            sequence: observations.length,
            fact_id: observation.fact_id ?? null,
            ...observation,
            required_read: required,
            stream_offset: line.offset,
            stream_end_offset: line.end_offset,
            raw_sha256: sha256(span),
          });
        }
      }
      return observations;
    },

    finish(processStatus) {
      boundaryStop = Number.isInteger(processStatus.boundary_event_offset) ? processStatus.boundary_event_offset : null;
      status = {
        exit_code: Number.isInteger(processStatus.exit_code) ? processStatus.exit_code : null,
        signal: processStatus.signal ?? null,
        timed_out: processStatus.timed_out === true,
        spawn_error: processStatus.spawn_error ?? null,
        stop_reason: processStatus.stop_reason ?? null,
        duration_ms: processStatus.duration_ms ?? null,
      };
      return api.toRecord();
    },

    toRecord() {
      const kind = status === null ? "unexpected" : terminationKind({ ...status, boundary_event_offset: boundaryStop });
      const prefixComplete =
        kind === "native" || (kind === "boundary-stop" && boundaryStop !== null && boundaryStop <= stdout.length);
      return {
        schema: CAPTURE_SCHEMA,
        harness,
        check_id,
        invocation_id,
        argv,
        cwd: fixtures.root,
        stream_source,
        timeout_ms,
        stdout: { byte_length: stdout.length, sha256: sha256(stdout) },
        stderr: { byte_length: stderr.length, sha256: sha256(stderr) },
        chunks: [...chunks],
        termination_kind: kind,
        boundary_event_offset: boundaryStop,
        prefix_complete: prefixComplete,
        process_status: status,
        refusal,
        decided_before: decidedBefore,
        model_requests: [...modelRequests],
        model_request_count: modelRequests.length,
        observations: [...observations],
        fixture_manifests: {
          before: fixtures.before,
          after: fixtures.after,
          changed: diffManifests(fixtures.before, fixtures.after),
        },
      };
    },

    /** The only write. Original bytes land beside the record so a citation can be re-resolved later. */
    persist(dir) {
      mkdirSync(dir, { recursive: true });
      const stdoutPath = join(dir, `${invocation_id}.stdout.bin`);
      writeFileSync(stdoutPath, stdout);
      const paths = [stdoutPath];
      if (stderr.length > 0) {
        const stderrPath = join(dir, `${invocation_id}.stderr.bin`);
        writeFileSync(stderrPath, stderr);
        paths.push(stderrPath);
      }
      const recordPath = join(dir, `${invocation_id}.capture.json`);
      const record = { ...api.toRecord(), evidence_paths: [recordPath, ...paths] };
      writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
      return record;
    },
  };

  return api;
}

function diffManifests(before, after) {
  if (!before || !after) return null;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => before[key] !== after[key]).sort();
}

/** Required-read denials visible in a capture record. Exit code is not consulted. */
export function denials(record) {
  return (record?.observations ?? []).filter(
    (observation) => observation.kind === "permission_denied" && observation.required_read === true,
  );
}

/** Required facts the record actually observed, by fact id. */
export function observedFacts(record) {
  const seen = new Map();
  for (const observation of record?.observations ?? []) {
    if (observation.required === false || !observation.fact_id) continue;
    if (!seen.has(observation.fact_id)) seen.set(observation.fact_id, observation);
  }
  return seen;
}

/** A citation must resolve: its span exists in the original bytes and hashes to the cited digest. */
export function resolveObservation(record, observation) {
  const stdoutPath = (record.evidence_paths ?? []).find((path) => path.endsWith(".stdout.bin"));
  if (!stdoutPath) throw new CaptureError("captured-bytes-absent", { invocation_id: record.invocation_id });
  const bytes = readFileSync(stdoutPath);
  if (sha256(bytes) !== record.stdout?.sha256) {
    throw new CaptureError("captured-bytes-tampered", { path: stdoutPath, expected: record.stdout?.sha256 });
  }
  const { stream_offset: offset, stream_end_offset: endOffset, raw_sha256: cited } = observation;
  if (!Number.isInteger(offset) || !Number.isInteger(endOffset) || offset < 0 || endOffset > bytes.length || offset >= endOffset) {
    throw new CaptureError("span-outside-capture", { offset, endOffset, captured: bytes.length });
  }
  const span = bytes.subarray(offset, endOffset);
  if (typeof cited !== "string" || sha256(span) !== cited) {
    throw new CaptureError("span-digest-mismatch", { offset, cited });
  }
  return span;
}

/**
 * Spawns one real process and feeds its bytes to the capture. stdin is closed (stdio "ignore" is the
 * /dev/null a hung CLI needs), and the process is wrapped in a timeout that escalates to SIGKILL.
 * A timeout is reported, never thrown: it becomes `termination_kind: timeout` and a refusal.
 */
export function spawnCaptured({ command, args = [], cwd, env, capture, timeout_ms = 60_000 }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let timedOut = false;
    let settled = false;
    let escalate = null;
    const deadline = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      escalate = setTimeout(() => child.kill("SIGKILL"), 500);
    }, timeout_ms);

    const settle = (outcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (escalate) clearTimeout(escalate);
      resolve({ timed_out: timedOut, duration_ms: Date.now() - started, ...outcome });
    };

    child.stdout.on("data", (chunk) => capture.append(chunk, "stdout"));
    child.stderr.on("data", (chunk) => capture.append(chunk, "stderr"));
    child.on("error", (error) =>
      settle({ spawn_error: error.code ?? String(error.message ?? error), exit_code: null, signal: null }),
    );
    child.on("close", (code, signal) => settle({ exit_code: code, signal, spawn_error: null }));
  });
}
