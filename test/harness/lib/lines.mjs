// Byte-line splitting over a captured stream: ONE splitter, the callers' differences as options.
//
// Byte offsets are the evidence backbone (P-3 provenance): grades cite stream offsets, so a span is
// MEASURED here, never inferred — each span runs from the byte after the previous line's terminator
// through that line's own 0x0a (or through end-of-stream for an unterminated last line), so
// consecutive spans abut exactly and tile [0, bytes.length) once. A digest field, when asked for, is
// taken over the exact bytes of the span or of the text, never over a re-encoded copy. The module
// reads the bytes it is given: it never spawns, never reads a file, and never verifies a whole-stream
// digest — that stays with each caller.
//
// All callers parse the payload the same way: non-empty text through JSON.parse; empty text or a
// parse failure leaves `json` null.
//
//   measureLines   (stream/normalise.mjs)         splitLines(bytes, { keepTerminator: true, digest: "span" })
//   capture lines() (runtime/capture.mjs)         splitLines(bytes, { digest: "text" })
//   capturedLines  (stream/claude-code-facts.mjs) splitLines(bytes)
import { sha256Hex } from "../pins.mjs";

/**
 * Splits `bytes` into line records in stream order, each carrying measured byte offsets.
 *
 * @param {Buffer} bytes the captured stream
 * @param {object} [options]
 * @param {boolean} [options.keepTerminator=false] the evidence-tiling shape: blank lines are kept,
 *   a trailing "\n" (that terminator only) is reported in a `terminator` field and excluded from
 *   `text`, and `end_offset` is the span's end including the terminator. Without it, the payload
 *   shape: a trailing "\r\n" or "\n" is stripped from `text`, blank lines are dropped, and
 *   `end_offset` is the offset just past the text.
 * @param {string|null} [options.digest=null] `"span"` hashes the span including its terminator into
 *   `raw_sha256` (the bytes as captured); `"text"` hashes just the text bytes into `sha256`;
 *   `null` adds no digest field.
 * @returns {Array<object>} one record per emitted line, keyed as each caller has always keyed them
 */
export function splitLines(bytes, { keepTerminator = false, digest = null } = {}) {
  const out = [];
  let start = 0;
  while (start < bytes.length) {
    const newline = bytes.indexOf(0x0a, start);
    const end = newline === -1 ? bytes.length : newline + 1;
    const raw = bytes.subarray(start, end);
    const rawText = raw.toString("utf8");
    const terminator = keepTerminator && rawText.endsWith("\n") ? "\n" : "";
    const text = keepTerminator ? (terminator ? rawText.slice(0, -1) : rawText) : rawText.replace(/\r?\n$/, "");
    if (!keepTerminator && text.length === 0) {
      start = end;
      continue;
    }
    let json = null;
    try {
      json = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    const line = keepTerminator
      ? { offset: start, end_offset: end, text, terminator, json }
      : { text, json, offset: start, end_offset: start + Buffer.byteLength(text) };
    if (digest === "span") line.raw_sha256 = sha256Hex(raw);
    else if (digest === "text") line.sha256 = sha256Hex(raw.subarray(0, Buffer.byteLength(text)));
    out.push(line);
    start = end;
  }
  return out;
}
