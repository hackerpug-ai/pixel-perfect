// png.mjs — PNG validity and pixel evidence shared by refresh-run.mjs and verify-catalog.mjs.
// Node built-ins only (node:zlib).
//
// The decoder reads colour types 0 (grey), 2 (RGB), 3 (palette), 4 (grey + alpha) and 6 (RGBA) at
// bit depths 8 and 16, non-interlaced. Every other PNG is "undecodable": the gate reports it as a
// violation and asks for a non-interlaced 8- or 16-bit PNG. Nothing is passed unread.

import { inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
export const UNDECODABLE_HINT = "cannot verify this image; write a non-interlaced 8- or 16-bit PNG";

/** Signature plus a non-empty IHDR. The check refresh-run has always used. */
export function pngValid(bytes) {
  return bytes.length > 32 && bytes.subarray(0, 8).equals(SIGNATURE) && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0;
}

/** Walk the chunk stream. Throws a plain message when the stream is malformed. */
function readChunks(bytes) {
  if (!bytes.subarray(0, 8).equals(SIGNATURE)) throw new Error("missing PNG signature");
  const chunks = [];
  let off = 8;
  let sawEnd = false;
  while (off < bytes.length) {
    if (sawEnd) throw new Error("data after IEND");
    if (off + 8 > bytes.length) throw new Error("truncated chunk header");
    const len = bytes.readUInt32BE(off);
    const end = off + 12 + len;
    if (end > bytes.length) throw new Error(`truncated ${bytes.toString("ascii", off + 4, off + 8)} chunk`);
    const type = bytes.toString("ascii", off + 4, off + 8);
    chunks.push({ type, data: bytes.subarray(off + 8, off + 8 + len) });
    if (type === "IEND") sawEnd = true;
    off = end;
  }
  if (chunks.length === 0 || chunks[0].type !== "IHDR") throw new Error("IHDR must be the first chunk");
  if (!sawEnd) throw new Error("IEND chunk is missing");
  if (!chunks.some((c) => c.type === "IDAT")) throw new Error("no IDAT chunk: the file carries no pixel data");
  return chunks;
}

const invalid = (reason, extra = {}) => ({ ok: false, kind: "invalid", reason, ...extra });
const undecodable = (reason, extra = {}) => ({
  ok: false,
  kind: "undecodable",
  reason: `${reason}: ${UNDECODABLE_HINT}`,
  ...extra,
});

/**
 * Decode a PNG to raw, unfiltered samples.
 * Returns { ok: true, width, height, colorType, bitDepth, channels, samples }
 *      or { ok: false, kind: "invalid" | "undecodable", reason }.
 * Never throws for bad input.
 */
export function decodePng(bytes) {
  let chunks;
  try {
    chunks = readChunks(bytes);
  } catch (error) {
    return invalid(error.message);
  }
  const ihdr = chunks[0].data;
  if (ihdr.length !== 13) return invalid("IHDR has the wrong length");
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const meta = { width, height, bitDepth, colorType };
  if (width === 0 || height === 0) return invalid("zero width or height", meta);
  if (ihdr[10] !== 0 || ihdr[11] !== 0) return invalid("unknown compression or filter method", meta);
  if (!(colorType in CHANNELS)) return invalid(`unknown colour type ${colorType}`, meta);
  if (ihdr[12] !== 0) return undecodable("interlaced (Adam7) PNG", meta);
  if (bitDepth !== 8 && bitDepth !== 16) return undecodable(`bit depth ${bitDepth}`, meta);
  if (colorType === 3 && bitDepth !== 8) return undecodable(`palette image at bit depth ${bitDepth}`, meta);
  if (colorType === 3 && !chunks.some((c) => c.type === "PLTE")) {
    return invalid("palette image has no PLTE chunk", meta);
  }

  const channels = CHANNELS[colorType];
  const bpp = channels * (bitDepth / 8);
  const stride = width * bpp;
  const expected = height * (stride + 1);
  let raw;
  try {
    const idat = Buffer.concat(chunks.filter((c) => c.type === "IDAT").map((c) => c.data));
    raw = inflateSync(idat, { maxOutputLength: expected });
  } catch (error) {
    return invalid(`corrupt image data: ${error.message}`, meta);
  }
  if (raw.length !== expected) {
    return invalid(`image data is ${raw.length} bytes, expected ${expected} for ${width}x${height}`, meta);
  }
  const samples = unfilter(raw, width, height, bpp, stride);
  if (!samples.ok) return invalid(samples.reason, meta);
  return { ok: true, ...meta, channels, samples: samples.samples };
}

function unfilter(raw, width, height, bpp, stride) {
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    if (filter > 4) return { ok: false, reason: `unknown scanline filter ${filter} on row ${y}` };
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    const prev = row - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[row + x - bpp] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = x >= bpp && y > 0 ? out[prev + x - bpp] : 0;
      const v = raw[src + x];
      let value;
      switch (filter) {
        case 0:
          value = v;
          break;
        case 1:
          value = v + a;
          break;
        case 2:
          value = v + b;
          break;
        case 3:
          value = v + ((a + b) >> 1);
          break;
        default:
          value = v + paeth(a, b, c);
      }
      out[row + x] = value & 0xff;
    }
  }
  return { ok: true, samples: out };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Count pixels that differ from the most common pixel colour. */
export function inkCount(samples, bpp) {
  const counts = new Map();
  for (let i = 0; i < samples.length; i += bpp) {
    const key = samples.toString("latin1", i, i + bpp);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const total = samples.length / bpp;
  let most = 0;
  for (const n of counts.values()) if (n > most) most = n;
  return total - most;
}

/**
 * Inspect a PNG for the catalog gate.
 * status: "ok" (decoded; width, height and inkPixels are set),
 *         "invalid" (malformed or corrupt), or "undecodable" (a valid PNG this module cannot read).
 */
export function inspectPng(bytes) {
  const decoded = decodePng(bytes);
  if (!decoded.ok) {
    return {
      status: decoded.kind,
      reason: decoded.reason,
      width: decoded.width ?? null,
      height: decoded.height ?? null,
      inkPixels: null,
    };
  }
  const bpp = decoded.channels * (decoded.bitDepth / 8);
  return {
    status: "ok",
    reason: null,
    width: decoded.width,
    height: decoded.height,
    inkPixels: inkCount(decoded.samples, bpp),
  };
}
