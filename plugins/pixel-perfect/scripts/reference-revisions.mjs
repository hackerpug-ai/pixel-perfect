// Content revisions and explicit reference replacement. No model decisions live here.
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';

export const digest = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export const jsonDigest = (value) => digest(JSON.stringify(value));
export function inside(root, file) {
  if (typeof file !== 'string' || !file || isAbsolute(file)) throw new Error(`Expected relative path: ${file}`);
  const full = resolve(root, file);
  const rel = relative(resolve(root), full);
  if (!rel || rel === '..' || rel.startsWith('../')) throw new Error(`Path escapes root: ${file}`);
  return full;
}
export function readInside(root, file) {
  const full = inside(root, file);
  const rel = relative(realpathSync(root), realpathSync(full));
  if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error(`Symlink escapes root: ${file}`);
  return readFileSync(full);
}
export function sourceRevision(source, frames) {
  return jsonDigest({
    configuration: source.render_config,
    frames: frames.map(({ hash, route, state, viewport, label }) => ({ hash, route, state, viewport, label }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  });
}
export function validateFrameIndex(index, directory, { revisions = true } = {}) {
  if (!Array.isArray(index?.sources) || !index.sources.length || !Array.isArray(index.frames) || !index.frames.length) throw new Error('Empty or malformed frame index');
  const sources = new Map(); const frames = new Map();
  for (const source of index.sources) {
    if (!source.ref || sources.has(source.ref) || !Array.isArray(source.frames) || !source.frames.length || (source.status && source.status !== 'rendered')) throw new Error(`Invalid/duplicate source: ${source.ref}`);
    sources.set(source.ref, source);
  }
  for (const frame of index.frames) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\/[0-9]{2,}$/.test(frame.id) || frames.has(frame.id)) throw new Error(`Invalid/duplicate frame: ${frame.id}`);
    const source = sources.get(frame.source);
    if (!source || source.frames.filter((id) => id === frame.id).length !== 1) throw new Error(`Dangling frame/source mapping: ${frame.id}`);
    const hash = digest(readInside(directory, frame.png));
    if (frame.hash && hash !== frame.hash) throw new Error(`Stale frame content: ${frame.id}`);
    if (revisions && !frame.hash) throw new Error(`Missing frame hash: ${frame.id}`);
    frames.set(frame.id, frame);
  }
  for (const source of sources.values()) {
    if (new Set(source.frames).size !== source.frames.length || source.frames.some((id) => frames.get(id)?.source !== source.ref)) throw new Error(`Dangling source/frame mapping: ${source.ref}`);
    if ((revisions || source.revision) && (!source.render_config || source.revision !== sourceRevision(source, source.frames.map((id) => frames.get(id))))) throw new Error(`Stale source revision: ${source.ref}`);
  }
  return index;
}

// Mapping source paths is explicit for renamed exports. Never infer supersession from basenames.
export function reconcileFrames(prior, next, sourceMap = [], decisions = []) {
  if (new Set(decisions.map((d) => d.from)).size !== decisions.length) throw new Error('Duplicate frame decision');
  const conflicts = []; const mappings = []; const used = new Set();
  const allSources = new Set(prior.sources.map((s) => s.ref));
  const maps = sourceMap.length ? sourceMap : next.sources.map((s) => ({ from: allSources.has(s.ref) ? s.ref : null, to: s.ref }));
  if (new Set(maps.map((m) => m.to)).size !== maps.length || new Set(maps.filter((m) => m.from).map((m) => m.from)).size !== maps.filter((m) => m.from).length) throw new Error('Source supersession must be one-to-one');
  for (const map of maps) {
    const src = next.sources.find((s) => s.ref === map.to);
    const old = prior.sources.find((s) => s.ref === map.from);
    if (!src || (map.from && !old)) throw new Error('Unknown source in supersession mapping');
    if (map.revision && map.revision !== (old.revision ?? old.hash)) throw new Error('Stale source revision in mapping');
    if (!old) continue;
    const fresh = next.frames.filter((f) => f.source === map.to);
    for (const frame of prior.frames.filter((f) => f.source === map.from)) {
      const decision = decisions.find((d) => d.from === frame.id);
      let candidates;
      if (decision) {
        if (!decision.reason?.trim()) throw new Error('Explicit frame decision requires a reason');
        candidates = fresh.filter((f) => f.id === decision.to);
      } else {
        candidates = fresh.filter((f) => f.route === frame.route && f.state === frame.state && f.viewport === frame.viewport &&
          (frame.route ? true : frame.label ? f.label === frame.label : frame.hash && f.hash === frame.hash));
      }
      if (candidates.length !== 1 || used.has(candidates[0]?.id)) {
        conflicts.push({ from: frame.id, reason: candidates.length ? 'ambiguous frame correspondence' : 'omitted frame or changed identity requires a decision', candidates: candidates.map((f) => f.id) });
        continue;
      }
      const target = candidates[0]; used.add(target.id);
      mappings.push({ from: frame.id, to: target.id, reason: decision?.reason ?? 'source, route/state, viewport and label/content', changed: !frame.hash || frame.hash !== target.hash });
    }
  }
  if (maps.length !== next.sources.length || next.sources.some((s) => !maps.some((m) => m.to === s.ref))) throw new Error('Every refreshed source requires a source mapping');
  if (decisions.some((d) => !mappings.some((m) => m.from === d.from && m.to === d.to))) throw new Error('Unknown, duplicate or unresolved frame decision');
  return { sourceMap: maps, mappings, conflicts, additions: next.frames.filter((f) => !used.has(f.id)).map((f) => f.id) };
}

export function replaceReferences(prior, next, reconciliation) {
  if (reconciliation.conflicts.length) throw new Error('Unresolved frame correspondence; references cannot be promoted');
  const replaced = new Set(reconciliation.sourceMap.map((m) => m.from).filter(Boolean));
  const frameMap = new Map(reconciliation.mappings.map((m) => [m.from, m.to]));
  const oldByTarget = new Map(reconciliation.mappings.map((m) => [m.to, prior.frames.find((f) => f.id === m.from)]));
  const result = structuredClone(prior);
  delete result.confirmed;
  result.sources = [...prior.sources.filter((s) => !replaced.has(s.ref)), ...next.sources.map((s) => {
    const oldRef = reconciliation.sourceMap.find((m) => m.to === s.ref)?.from;
    const old = prior.sources.find((p) => p.ref === oldRef);
    const { status, diagnosis, ...source } = s;
    return { ...old, ...source };
  })];
  result.frames = [...prior.frames.filter((f) => !replaced.has(f.source)), ...next.frames.map((f) => {
    const { index, width, height, ...frame } = f;
    return { ...oldByTarget.get(f.id), ...frame, png: `design/reference/${f.png}`, shows: oldByTarget.get(f.id)?.shows ?? [] };
  })];
  for (const layer of ['atoms', 'molecules', 'organisms']) for (const item of result[layer]) item.appears_on = (item.appears_on ?? []).map((id) => frameMap.get(id) ?? id);
  for (const item of result.screens) for (const state of item.states) if (state.frames) state.frames = state.frames.map((id) => frameMap.get(id) ?? id);
  if (result.unclaimed_frames) result.unclaimed_frames = result.unclaimed_frames.map((f) => ({ ...f, id: frameMap.get(f.id) ?? f.id }));
  return result;
}

export function validateReferenceInventory(inventory, index) {
  const frameIds = new Set(index.frames.map((f) => f.id));
  if (inventory.frames.length !== frameIds.size || inventory.frames.some((f) => !frameIds.has(f.id))) throw new Error('Inventory/frame index coverage differs');
  for (const source of inventory.sources) {
    const actual = index.sources.find((s) => s.ref === source.ref);
    if (!actual || source.hash !== actual.hash || source.revision !== actual.revision) throw new Error(`Stale inventory source revision: ${source.ref}`);
    if (JSON.stringify([...(source.frames ?? [])].sort()) !== JSON.stringify([...actual.frames].sort())) throw new Error('Inventory source/frame mappings differ');
  }
  if (inventory.sources.length !== index.sources.length) throw new Error('Inventory source coverage differs');
  for (const frame of inventory.frames) {
    const actual = index.frames.find((f) => f.id === frame.id);
    if (frame.source !== actual.source || frame.hash !== actual.hash) throw new Error(`Stale inventory frame: ${frame.id}`);
  }
  for (const layer of ['atoms', 'molecules', 'organisms']) for (const item of inventory[layer]) for (const id of item.appears_on ?? []) if (!frameIds.has(id)) throw new Error(`Dangling component frame: ${id}`);
  for (const screen of inventory.screens) for (const state of screen.states) for (const id of state.frames ?? []) if (!frameIds.has(id)) throw new Error(`Dangling screen frame: ${id}`);
}
