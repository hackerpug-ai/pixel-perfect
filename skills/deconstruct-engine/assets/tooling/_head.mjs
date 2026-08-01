/* ============================================================================
 * _head.mjs — single source of truth for stylesheet <link> depth.
 *
 * design-deconstruct staged tooling. Copied into <output>/_head.mjs at run start.
 *
 * Given an OUTPUT html path (anywhere under the design-system root) and the set
 * of stylesheet basenames it needs, returns the exact <link> block with the
 * correct `../` depth COMPUTED from the path. This eliminates the hand-counted-
 * depth bug class — link depth is never typed by an agent, only derived here.
 * ========================================================================== */
import { relative, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(fileURLToPath(import.meta.url)); // the design-system output root

// canonical location (relative to ROOT) for each stylesheet basename.
// Matches the layer layout design-deconstruct emits.
const CANON = {
  'fonts.css':        'typography/fonts.css',
  'type-modules.css': 'typography/type-modules.css',
  'tokens.css':       'tokens/tokens.css',
  '_preview.css':     'atoms/_preview.css',
  // '_lower.css' is layer-specific → resolved per call (see buildLinks)
};

/** layer (atoms|molecules|organisms|views) inferred from the output path. */
export function layerOf(outAbs) {
  return relative(ROOT, outAbs).split(/[\\/]/)[0];
}

/** Build the ordered <link> block for an output file given the basenames it uses. */
export function buildLinks(outAbs, basenames) {
  const layer = layerOf(outAbs);
  const outDir = dirname(outAbs);
  return basenames.map((b) => {
    const target = b === '_lower.css' ? `${layer}/_lower.css` : CANON[b];
    if (!target) throw new Error(`_head: unknown stylesheet basename "${b}"`);
    const href = relative(outDir, join(ROOT, target)).replace(/\\/g, '/');
    return `<link rel="stylesheet" href="${href}">`;
  }).join('\n');
}
