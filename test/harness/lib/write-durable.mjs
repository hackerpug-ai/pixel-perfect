// write-durable: a write only counts once it has been read back from disk.
//
// P-7 (docs/code-quality/profile.md): durable writes are atomic with read-back. The canon is a
// unique temp file in the target's directory -> write -> fsync -> rename in the same directory ->
// read back through the caller's compare callback. A compare that rejects the read-back destroys
// the file and throws ReadBackMismatch, so a partial or tampered artifact never survives where a
// later reader could mistake it for valid evidence.
import { closeSync, fsyncSync, openSync, renameSync, rmSync, writeSync } from "node:fs";

/** Thrown when the compare callback rejects the read-back. The file has already been destroyed. */
export class ReadBackMismatch extends Error {
  constructor({ file, tempPath, result }) {
    super(`durable write failed its read-back compare: ${file}`);
    this.name = "ReadBackMismatch";
    this.file = file;
    this.temp_path = tempPath;
    this.result = result ?? null;
  }
}

/**
 * Writes `bytes` so the file at `file` either lands whole and verified or does not exist at all.
 * `compare(file)` performs the read-back — it knows the file's format — and returns an outcome
 * whose `ok` is false when what came back disagrees with what was meant to be written. On `ok:
 * false` the file is destroyed and ReadBackMismatch carries the outcome; on success the outcome
 * is returned as `result`. `now` exists so a caller can make the temp name deterministic.
 */
export function writeDurable(file, bytes, { compare = null, now = () => Date.now() } = {}) {
  const tempPath = `${file}.tmp-${process.pid}-${now()}`;
  const fd = openSync(tempPath, "w");
  try {
    writeSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tempPath, file);

  const result = compare ? compare(file) : { ok: true };
  if (result?.ok === false) {
    // A read-back that disagrees is removed rather than left where a later reader could mistake
    // it for a verdict.
    rmSync(file, { force: true });
    throw new ReadBackMismatch({ file, tempPath, result });
  }
  return { ok: true, file, temp_path: tempPath, result };
}
