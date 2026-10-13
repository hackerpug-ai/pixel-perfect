// png.mjs — PNG validity and pixel inspection shared by refresh-run.mjs and verify-catalog.mjs.
// Node built-ins only (node:zlib). The decoder reads 8-bit truecolour (colour type 2) and
// truecolour + alpha (colour type 6), non-interlaced: what Chrome and AppKit write. Any other
// format is reported as not decodable so callers can skip the blank test and say so; it is
// never failed for a format this module does not read.

import { inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Signature plus a non-empty IHDR. The check refresh-run has always used. */
export function pngValid(bytes) {
  return bytes.length > 32 && bytes.subarray(0, 8).equals(SIGNATURE) && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0;
}

/**
 * Inspect a PNG for the catalog gate.
 * Returns { valid, width, height, colorType, bitDepth, interlace, decodable, blank, reason }.
 *   valid      — a PNG with a usable header and, when decodable, intact image data
 *   decodable  — the pixels were read (8-bit colour type 2 or 6, non-interlaced)
 *   blank      — every pixel equals the first pixel; null when not decodable
 */
export function inspectPng(bytes) {
  const info = {
    valid: false,
    width: null,
    height: null,
    colorType: null,
    bitDepth: null,
    interlace: null,
    decodable: false,
    blank: null,
    reason: null,
  };
  if (!pngValid(bytes)) {
    info.reason = "not a PNG image (signature or IHDR missing)";
    return info;
  }
  info.valid = true;
  info.width = bytes.readUInt32BE(16);
  info.height = bytes.readUInt32BE(20);
  info.bitDepth = bytes[24];
  info.colorType = bytes[25];
  info.interlace = bytes[28];
  if (info.bitDepth !== 8 || (info.colorType !== 2 && info.colorType !== 6) || info.interlace !== 0) {
    info.reason = `colour type ${info.colorType}, bit depth ${info.bitDepth}, interlace ${info.interlace}: not decoded (blank test skipped)`;
    return info;
  }
  const bpp = info.colorType === 6 ? 4 : 3;
  let pixels;
  try {
    pixels = decodePixels(bytes, info.width, info.height, bpp);
  } catch (error) {
    info.valid = false;
    info.reason = `corrupt image data: ${error.message}`;
    return info;
  }
  info.decodable = true;
  info.blank = isBlank(pixels, bpp);
  return info;
}

function chunks(bytes) {
  const out = [];
  let off = 8;
  while (off + 8 <= bytes.length) {
    const len = bytes.readUInt32BE(off);
    const type = bytes.toString("ascii", off + 4, off + 8);
    out.push({ type, data: bytes.subarray(off + 8, off + 8 + len) });
    if (type === "IEND") break;
    off += 12 + len;
  }
  return out;
}

function decodePixels(bytes, width, height, bpp) {
  const idat = chunks(bytes)
    .filter((c) => c.type === "IDAT")
    .map((c) => c.data);
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length !== height * (stride + 1)) {
    throw new Error(`expected ${height * (stride + 1)} scanline bytes, found ${raw.length}`);
  }
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
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
        case 4:
          value = v + paeth(a, b, c);
          break;
        default:
          throw new Error(`unknown scanline filter ${filter}`);
      }
      out[row + x] = value & 0xff;
    }
  }
  return out;
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

function isBlank(pixels, bpp) {
  for (let i = bpp; i < pixels.length; i += bpp) {
    for (let k = 0; k < bpp; k++) {
      if (pixels[i + k] !== pixels[k]) return false;
    }
  }
  return true;
}
