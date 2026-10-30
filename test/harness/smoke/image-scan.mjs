// hidden-image-judge scanner — the one observation the sprint's fourth control needs.
//
// The control's claim is a NEGATIVE ("no screenshot judging happened anywhere in the verify child
// tree"), and a negative is only worth something if the scanner could have found the opposite. So
// the scan reads every byte of every file under each root and reports where an image reached a
// model request: an `image` content block, an `image/*` media type, or an inline `data:image/…`
// payload. A tree it cannot open returns `null` — no observation — which the control layer turns
// into could-not-run / control-unobservable rather than a pass.
//
// Nothing here decides a verdict about quality: the scan answers one question, and the caller
// maps its answer onto the control's own vocabulary.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

/** The three shapes an image takes in a harness stream. Matched on raw bytes, not on parsed JSON. */
const IMAGE_PATTERNS = Object.freeze([
  { kind: "image-content-block", pattern: /"type"\s*:\s*"image"/g },
  { kind: "image-media-type", pattern: /"media_type"\s*:\s*"image\/[A-Za-z0-9.+-]+"/g },
  { kind: "image-inline-payload", pattern: /data:image\/[A-Za-z0-9.+-]+;base64,/g },
]);

/** Deterministic order and content: two trees that differ by one byte hash differently. */
function walk(root, out = []) {
  for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/**
 * Scans every file under `roots` for an image reaching a model request.
 *
 * @param {{ roots?: string[] }} [options]
 * @returns {{ verdict: "pass"|"fail", reason: string, files_scanned: number, tree_sha256: string,
 *   findings: Array<{file: string, offset: number, kind: string, excerpt: string}>, roots: string[] } | null}
 *   `null` means the tree could not be read, which is not a pass.
 */
export function scanTree({ roots = [] } = {}) {
  const resolvedRoots = (roots ?? []).filter((root) => typeof root === "string" && root.length > 0).map((root) => resolve(root));
  if (resolvedRoots.length === 0) return null;
  for (const root of resolvedRoots) {
    if (!existsSync(root) || !statSync(root).isDirectory()) return null;
  }

  let files;
  try {
    files = resolvedRoots.flatMap((root) => walk(root, []).map((file) => ({ file, root })));
  } catch {
    return null;
  }

  const findings = [];
  const digestLines = [];
  for (const { file, root } of files) {
    let bytes;
    try {
      bytes = readFileSync(file);
    } catch {
      // A file the scanner cannot read makes the whole scan unreadable: reporting the rest as a
      // pass would claim a tree was inspected that partly was not.
      return null;
    }
    const key = relative(root, file).split(sep).join("/");
    digestLines.push(`${createHash("sha256").update(bytes).digest("hex")}  ${key}`);
    const text = bytes.toString("latin1");
    for (const { kind, pattern } of IMAGE_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        findings.push({ file, offset: Buffer.byteLength(text.slice(0, match.index), "latin1"), kind, excerpt: match[0] });
      }
    }
  }

  const tree_sha256 = createHash("sha256").update(Buffer.from(digestLines.sort().join("\n"), "utf8")).digest("hex");
  return {
    verdict: findings.length === 0 ? "pass" : "fail",
    reason: findings.length === 0 ? "no-image-judge-in-child-tree" : "image-judge-in-child-tree",
    files_scanned: files.length,
    tree_sha256,
    findings: findings.sort((a, b) => (a.offset - b.offset) || (a.file < b.file ? -1 : 1)),
    roots: resolvedRoots,
  };
}
