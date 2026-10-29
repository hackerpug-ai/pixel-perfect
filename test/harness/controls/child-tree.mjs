// controls/child-tree.mjs — the child-tree scan behind the hidden-image-judge control.
//
// The claim is a negative: no screenshot judging happened anywhere in the verify child tree. A
// negative is only evidence if the scan could have found the thing, so it looks everywhere an image
// judge has to touch something — the child's own output tree (a screenshot lands on disk before any
// judge reads it), its model-request log, and the bytes the capture says it produced. Three
// detectors, each independently fatal, and none of them consults a verdict.
//
// Accessibility is a first-class answer, not a footnote: a missing root, an unrecorded request log,
// an unhashed stream, an unreadable file or an unobserved child environment makes the whole control
// `could-not-run`. A scan that cannot see is never a pass.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { sha256Hex } from "../pins.mjs";

export const IMAGE_SCAN_REASONS = Object.freeze({
  CLEAN: "no-image-judge-in-child-tree",
  OBSERVED: "image-judge-observed",
  INACCESSIBLE: "inaccessible-child-tree",
});

const IMAGE_EXTENSION = /\.(png|jpe?g|webp|gif|tiff?|avif|heic)$/i;
// A judge's request log is a file too: an image block written to disk is the same evidence as one
// written into the request log, and it would otherwise be invisible to a magic-byte scan.
const TEXT_EXTENSION = /\.(json|jsonl|ndjson|log|txt|md|http)$/i;
// Four bytes or more: a two-byte magic ("BM") matches ordinary text often enough to be noise.
const IMAGE_MAGIC = Object.freeze([
  { format: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { format: "jpeg", bytes: [0xff, 0xd8, 0xff] },
  { format: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { format: "webp", bytes: [0x52, 0x49, 0x46, 0x46], tail: [0x57, 0x45, 0x42, 0x50] },
]);
// Any of these in a request or a captured byte stream means image input reached a model.
const IMAGE_MARKERS = Object.freeze([/"type"\s*:\s*"image"/, /"media_type"\s*:\s*"image\//, /data:image\//]);
const HEX64 = /^[0-9a-f]{64}$/;

function magicFormat(bytes) {
  for (const entry of IMAGE_MAGIC) {
    if (bytes.length < entry.bytes.length) continue;
    if (!entry.bytes.every((byte, index) => bytes[index] === byte)) continue;
    if (entry.tail && !entry.tail.every((byte, index) => bytes[entry.bytes.length + index] === byte)) continue;
    return entry.format;
  }
  return null;
}

/** Every image-shaped value inside one model request, with the path it sat at. */
export function imageInputsInValue(value, at = "", found = []) {
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) found.push({ kind: "data-url", at });
    else if (IMAGE_EXTENSION.test(value)) found.push({ kind: "image-path", at });
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => imageInputsInValue(entry, `${at}[${index}]`, found));
    return found;
  }
  if (value === null || typeof value !== "object") return found;
  if (value.type === "image") found.push({ kind: "content-block", at });
  if (typeof value.media_type === "string" && value.media_type.startsWith("image/")) {
    found.push({ kind: "media-type", at, detail: value.media_type });
  }
  for (const [key, entry] of Object.entries(value)) imageInputsInValue(entry, at ? `${at}.${key}` : key, found);
  return found;
}

/** Image bytes sitting in a directory tree, by declared extension or by their own magic. */
export function imageFilesInTree({ root, manifest }) {
  const found = [];
  const unreadable = [];
  for (const [rel, sha] of Object.entries(manifest)) {
    const path = join(root, rel);
    if (IMAGE_EXTENSION.test(rel)) found.push({ kind: "image-file", path, at: rel });
    if (!existsSync(path)) {
      unreadable.push({ path, at: rel, why: "missing" });
      continue;
    }
    const bytes = readFileSync(path);
    if (sha256Hex(bytes) !== sha) unreadable.push({ path, at: rel, why: "digest-mismatch" });
    const format = magicFormat(bytes.subarray(0, 16));
    if (format) found.push({ kind: "image-magic", path, at: rel, detail: format });
    if (TEXT_EXTENSION.test(rel)) {
      const text = bytes.toString("utf8");
      for (const marker of IMAGE_MARKERS) {
        if (marker.test(text)) found.push({ kind: "image-block-in-file", path, at: rel, detail: String(marker) });
      }
    }
  }
  return { found, unreadable };
}

/** Image markers in the bytes a capture says it produced. Bytes, not a memory of them. */
function imageInputsInCapturedBytes(capture) {
  const found = [];
  const unreadable = [];
  for (const path of capture?.evidence_paths ?? []) {
    if (!/\.(stdout|stderr)\.bin$/.test(path)) continue;
    if (!existsSync(path)) {
      unreadable.push({ path, why: "missing" });
      continue;
    }
    const text = readFileSync(path).toString("utf8");
    for (const marker of IMAGE_MARKERS) {
      if (marker.test(text)) found.push({ kind: "captured-bytes", path, detail: String(marker) });
    }
  }
  return { found, unreadable };
}

/**
 * Scans the whole verify child tree. `trees` are `{ root, manifest }` pairs — a manifest is the
 * post-run listing of that root, so a file the child wrote cannot be missing from the scan.
 * `capture` is the persisted InvocationCapture for the child, `environment` its observed env.
 */
export function scanChildTree({ trees = [], capture = null, environment = null } = {}) {
  const inaccessible = [];
  if (trees.length === 0) inaccessible.push({ what: "child tree", why: "no-tree-declared" });
  for (const tree of trees) {
    if (!tree?.root || !existsSync(tree.root)) inaccessible.push({ what: tree?.root ?? "child root", why: "root-missing" });
    if (!tree?.manifest || Object.keys(tree.manifest).length === 0) {
      inaccessible.push({ what: tree?.root ?? "child root", why: "manifest-absent" });
    }
  }
  if (!capture || !Array.isArray(capture.model_requests)) inaccessible.push({ what: "model-request log", why: "unrecorded" });
  if (!HEX64.test(String(capture?.stdout?.sha256 ?? ""))) inaccessible.push({ what: "captured stdout", why: "unhashed" });
  if (!environment || !Array.isArray(environment.credential_names)) {
    inaccessible.push({ what: "child environment", why: "unobserved" });
  }

  const imageInputs = [];
  let files = 0;
  let bytes = 0;
  for (const tree of trees) {
    if (!tree?.root || !tree?.manifest || !existsSync(tree.root)) continue;
    files += Object.keys(tree.manifest).length;
    for (const rel of Object.keys(tree.manifest)) {
      const path = join(tree.root, rel);
      if (existsSync(path)) bytes += statSync(path).size;
    }
    const scan = imageFilesInTree(tree);
    imageInputs.push(...scan.found);
    inaccessible.push(...scan.unreadable.map((entry) => ({ what: entry.path, why: `file-${entry.why}` })));
  }
  for (const request of capture?.model_requests ?? []) {
    for (const hit of imageInputsInValue(request)) imageInputs.push({ ...hit, kind: `model-request/${hit.kind}` });
  }
  const captured = imageInputsInCapturedBytes(capture);
  imageInputs.push(...captured.found);
  inaccessible.push(...captured.unreadable.map((entry) => ({ what: entry.path, why: `capture-file-${entry.why}` })));

  return {
    accessible: inaccessible.length === 0,
    inaccessible_because: inaccessible.length === 0 ? null : `child activity not observable: ${inaccessible.map((entry) => `${entry.what} (${entry.why})`).join("; ")}`,
    scanned: {
      trees: trees.length,
      files,
      bytes,
      model_requests: Array.isArray(capture?.model_requests) ? capture.model_requests.length : null,
      credential_names_in_child: Array.isArray(environment?.credential_names) ? environment.credential_names.length : null,
      stdout_sha256: capture?.stdout?.sha256 ?? null,
      stderr_sha256: capture?.stderr?.sha256 ?? null,
    },
    image_inputs: imageInputs,
  };
}

/** The control's verdict, derived from the scan and nothing else. */
export function verdictForChildTreeScan(scan) {
  if (!scan?.accessible) return { verdict: "could-not-run", reason: IMAGE_SCAN_REASONS.INACCESSIBLE };
  if ((scan.image_inputs ?? []).length > 0) return { verdict: "fail", reason: IMAGE_SCAN_REASONS.OBSERVED };
  return { verdict: "pass", reason: IMAGE_SCAN_REASONS.CLEAN };
}
