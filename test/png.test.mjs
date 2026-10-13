// Decoder tests for scripts/png.mjs. Each image is built by test/helpers/png.mjs as a decoder input.
// Assertions compare decoded samples to the samples the builder started from, so a wrong filter,
// a wrong bytes-per-pixel, or a wrong sample width fails here.

import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { decodePng, inspectPng } from "../plugins/pixel-perfect/scripts/png.mjs";
import { buildPng, chunk, sampleBytes, SIGNATURE, CHANNELS, inkImage } from "./helpers/png.mjs";

const W = 6;
const H = 5;
const ALL_FILTERS = [0, 1, 2, 3, 4];

function roundTrip({ colorType, bitDepth = 8, filterOf, palette }) {
  const channels = CHANNELS[colorType];
  const samples = sampleBytes(W * H * channels * (bitDepth / 8), colorType * 17 + bitDepth);
  const bytes = buildPng({ width: W, height: H, colorType, bitDepth, samples, filterOf, palette });
  const decoded = decodePng(bytes);
  assert.equal(decoded.ok, true, decoded.reason);
  assert.equal(decoded.width, W);
  assert.equal(decoded.height, H);
  assert.equal(decoded.channels, channels);
  assert.deepEqual(Buffer.from(decoded.samples), samples);
  return decoded;
}

// --- filter types: each must reconstruct the original samples ---

for (const f of ALL_FILTERS) {
  test(`RGB 8-bit reconstructs exactly with scanline filter ${f}`, () => {
    roundTrip({ colorType: 2, filterOf: () => f });
  });
  test(`RGBA 8-bit reconstructs exactly with scanline filter ${f}`, () => {
    roundTrip({ colorType: 6, filterOf: () => f });
  });
}

test("every filter type in one image: rows cycle through 0..4", () => {
  roundTrip({ colorType: 6, filterOf: (y) => y % 5 });
  roundTrip({ colorType: 2, filterOf: (y) => (y * 3) % 5 });
});

// --- colour types and bit depths the decoder reads ---

test("grey 8-bit (colour type 0) decodes", () => {
  roundTrip({ colorType: 0, filterOf: (y) => y % 5 });
});

test("grey + alpha 8-bit (colour type 4) decodes with two bytes per pixel", () => {
  roundTrip({ colorType: 4, filterOf: (y) => y % 5 });
});

test("RGB 16-bit (colour type 2, depth 16) decodes with six bytes per pixel", () => {
  roundTrip({ colorType: 2, bitDepth: 16, filterOf: (y) => y % 5 });
});

test("RGBA 16-bit (colour type 6, depth 16) decodes with eight bytes per pixel", () => {
  roundTrip({ colorType: 6, bitDepth: 16, filterOf: (y) => (y + 2) % 5 });
});

test("grey 16-bit (colour type 0, depth 16) decodes", () => {
  roundTrip({ colorType: 0, bitDepth: 16, filterOf: (y) => y % 5 });
});

test("palette (colour type 3) returns indices and needs its PLTE", () => {
  const palette = Buffer.from([255, 255, 255, 255, 0, 0, 0, 0, 0]);
  const decoded = roundTrip({ colorType: 3, filterOf: (y) => y % 5, palette });
  assert.equal(decoded.channels, 1);
});

test("palette without a PLTE chunk is a malformed image", () => {
  const samples = sampleBytes(W * H, 3);
  const bytes = buildPng({ width: W, height: H, colorType: 3, samples });
  const decoded = decodePng(bytes);
  assert.equal(decoded.ok, false);
  assert.equal(decoded.kind, "invalid");
  assert.match(decoded.reason, /PLTE/);
});

// --- what the decoder refuses, and how it says so ---

test("an interlaced PNG is undecodable and says how to fix it", () => {
  const bytes = buildPng({ width: W, height: H, colorType: 2, samples: sampleBytes(W * H * 3, 4), interlace: 1 });
  const info = inspectPng(bytes);
  assert.equal(info.status, "undecodable");
  assert.match(info.reason, /cannot verify this image; write a non-interlaced 8- or 16-bit PNG/);
});

test("bit depths other than 8 and 16 are undecodable", () => {
  const bytes = buildPng({ width: 8, height: 8, colorType: 0, bitDepth: 1, samples: sampleBytes(8, 5) });
  const info = inspectPng(bytes);
  assert.equal(info.status, "undecodable");
  assert.match(info.reason, /non-interlaced 8- or 16-bit PNG/);
});

test("a truncated file is invalid and does not throw", () => {
  const full = buildPng({ width: W, height: H, colorType: 2, samples: sampleBytes(W * H * 3, 6) });
  const info = inspectPng(full.subarray(0, full.length - 20));
  assert.equal(info.status, "invalid");
  assert.ok(info.reason);
});

test("a file with no IDAT (no pixel data) is invalid", () => {
  const bytes = buildPng({ width: W, height: H, colorType: 2, samples: sampleBytes(W * H * 3, 7), omit: ["IDAT"] });
  const info = inspectPng(bytes);
  assert.equal(info.status, "invalid");
  assert.match(info.reason, /IDAT/);
});

test("IHDR must be the first chunk", () => {
  const bytes = buildPng({
    width: W,
    height: H,
    colorType: 2,
    samples: sampleBytes(W * H * 3, 8),
    order: ["IDAT", "IHDR", "IEND"],
  });
  assert.equal(inspectPng(bytes).status, "invalid");
  assert.match(inspectPng(bytes).reason, /IHDR/);
});

test("IEND must be present and last", () => {
  const missing = buildPng({ width: W, height: H, colorType: 2, samples: sampleBytes(W * H * 3, 9), omit: ["IEND"] });
  assert.equal(inspectPng(missing).status, "invalid");
  assert.match(inspectPng(missing).reason, /IEND/);
  const notLast = buildPng({
    width: W,
    height: H,
    colorType: 2,
    samples: sampleBytes(W * H * 3, 9),
    order: ["IHDR", "IEND", "IDAT"],
  });
  assert.equal(inspectPng(notLast).status, "invalid");
});

test("corrupt compressed data is invalid with the reason, never an uncaught throw", () => {
  const bytes = buildPng({
    width: W,
    height: H,
    colorType: 2,
    samples: sampleBytes(W * H * 3, 10),
    idat: Buffer.from("not zlib data at all"),
  });
  const info = inspectPng(bytes);
  assert.equal(info.status, "invalid");
  assert.match(info.reason, /corrupt image data/);
});

test("more decompressed data than the header allows is invalid (bounded inflate)", () => {
  const stride = W * 3;
  const oversized = deflateSync(Buffer.alloc(H * (stride + 1) + 500));
  const bytes = buildPng({ width: W, height: H, colorType: 2, samples: sampleBytes(W * H * 3, 11), idat: oversized });
  assert.equal(inspectPng(bytes).status, "invalid");
});

test("too little decompressed data is invalid", () => {
  const short = deflateSync(Buffer.alloc(10));
  const bytes = buildPng({ width: W, height: H, colorType: 2, samples: sampleBytes(W * H * 3, 12), idat: short });
  const info = inspectPng(bytes);
  assert.equal(info.status, "invalid");
  assert.match(info.reason, /expected/);
});

test("a file that is not a PNG at all is invalid", () => {
  const info = inspectPng(Buffer.from("this is text, not an image, and it is long enough to pass a length check.\n"));
  assert.equal(info.status, "invalid");
});

test("the signature alone is not a PNG", () => {
  const bytes = Buffer.concat([SIGNATURE, chunk("IEND")]);
  assert.equal(inspectPng(bytes).status, "invalid");
});

// --- ink: pixels that differ from the most common colour ---

test("ink counts exactly the pixels that differ from the background", () => {
  for (const inkCount of [0, 1, 100]) {
    const info = inspectPng(inkImage({ width: 16, height: 16, inkCount, filterOf: (y) => y % 5 }));
    assert.equal(info.status, "ok", info.reason);
    assert.equal(info.inkPixels, inkCount, `ink for ${inkCount} red pixels`);
    assert.equal(info.width, 16);
    assert.equal(info.height, 16);
  }
});

test("ink is exact for 16-bit and grey images as well", () => {
  const sixteen = inspectPng(inkImage({ width: 12, height: 12, inkCount: 37, colorType: 2, bitDepth: 16, filterOf: (y) => y % 5 }));
  assert.equal(sixteen.inkPixels, 37);
  const grey = inspectPng(
    buildPng({
      width: 10,
      height: 10,
      colorType: 0,
      samples: Buffer.from(Array.from({ length: 100 }, (_, i) => (i < 9 ? 0 : 255))),
    }),
  );
  assert.equal(grey.inkPixels, 9);
});

test("a single pixel that differs is one ink pixel", () => {
  const info = inspectPng(inkImage({ width: 16, height: 16, inkCount: 1 }));
  assert.equal(info.inkPixels, 1);
});
