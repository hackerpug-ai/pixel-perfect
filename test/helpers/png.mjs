// Test-side PNG builder. It writes decoder inputs with explicit colour types, bit depths, scanline
// filters, and chunk layouts. The images are constructed on purpose, to exercise the decoder. They
// never stand in for a render: the render tests go through headless Chrome.

import { deflateSync } from "node:zlib";

export const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function chunk(type, data = Buffer.alloc(0)) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
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

/** Deterministic pseudo-random sample bytes, so every run builds the same image. */
export function sampleBytes(length, seed = 1) {
  const out = Buffer.alloc(length);
  let s = seed >>> 0;
  for (let i = 0; i < length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out[i] = s >>> 24;
  }
  return out;
}

/**
 * Apply a scanline filter to unfiltered samples. `filterOf(y)` picks the filter type for row y.
 * The predictor uses the unfiltered neighbours, as the PNG specification defines.
 */
export function filterSamples(samples, { width, height, bpp, filterOf = () => 0 }) {
  const stride = width * bpp;
  const out = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const type = filterOf(y);
    const row = y * stride;
    out[y * (stride + 1)] = type;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? samples[row + x - bpp] : 0;
      const b = y > 0 ? samples[row - stride + x] : 0;
      const c = x >= bpp && y > 0 ? samples[row - stride + x - bpp] : 0;
      const pred = [0, a, b, (a + b) >> 1, paeth(a, b, c)][type];
      out[y * (stride + 1) + 1 + x] = (samples[row + x] - pred) & 0xff;
    }
  }
  return out;
}

/**
 * Build a PNG from parts. Options:
 *   samples      unfiltered sample bytes, width * channels * bytesPerSample per row
 *   filterOf     row → filter type (default: all None)
 *   palette      Buffer for the PLTE chunk (colour type 3)
 *   interlace    IHDR interlace byte (default 0)
 *   omit         chunk types to leave out ("IDAT", "IEND", "PLTE")
 *   order        full list of chunk types to emit, in order (overrides the default order)
 *   idat         raw IDAT payload to use instead of deflating the filtered samples
 */
export function buildPng({
  width,
  height,
  colorType = 2,
  bitDepth = 8,
  interlace = 0,
  samples,
  filterOf,
  palette,
  omit = [],
  order,
  idat,
}) {
  const channels = CHANNELS[colorType];
  const bytesPerSample = bitDepth / 8;
  const bpp = channels * bytesPerSample;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = interlace;
  const payload = idat ?? deflateSync(filterSamples(samples, { width, height, bpp, filterOf }));
  const parts = {
    IHDR: chunk("IHDR", ihdr),
    PLTE: palette ? chunk("PLTE", palette) : null,
    IDAT: chunk("IDAT", payload),
    IEND: chunk("IEND"),
  };
  const sequence = order ?? ["IHDR", "PLTE", "IDAT", "IEND"];
  return Buffer.concat([
    SIGNATURE,
    ...sequence.filter((t) => parts[t] && !omit.includes(t)).map((t) => parts[t]),
  ]);
}

/** A white canvas with `inkCount` red pixels at the start, for exact ink assertions. */
export function inkImage({ width, height, inkCount, filterOf, colorType = 2, bitDepth = 8 }) {
  const channels = CHANNELS[colorType];
  const bytesPerSample = bitDepth / 8;
  const max = (1 << bitDepth) - 1;
  const white = Array.from({ length: channels }, () => max);
  const red = Array.from({ length: channels }, (_, i) => (i === 0 ? max : 0));
  const pixel = (values) =>
    Buffer.concat(values.map((v) => {
      const b = Buffer.alloc(bytesPerSample);
      if (bytesPerSample === 1) b[0] = v;
      else b.writeUInt16BE(v, 0);
      return b;
    }));
  const whitePx = pixel(white);
  const redPx = pixel(red);
  const count = width * height;
  const parts = [];
  for (let i = 0; i < count; i++) parts.push(i < inkCount ? redPx : whitePx);
  return buildPng({ width, height, colorType, bitDepth, samples: Buffer.concat(parts), filterOf });
}
