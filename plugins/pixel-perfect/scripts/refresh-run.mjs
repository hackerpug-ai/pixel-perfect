#!/usr/bin/env node
// Durable refresh coordinator. Model analysis supplies a plan; code owns state and evidence.
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { main as renderFrames } from './render-frames.mjs';
import { digest, inside, jsonDigest, readInside, reconcileFrames, sourceRevision, validateFrameIndex, validateReferenceInventory } from './reference-revisions.mjs';
import { mergeInventories } from './merge-inventory.mjs';
import { verifyInventory } from './verify-inventory.mjs';
import { loadManifest, resolvePlatform } from './verify-catalog.mjs';

const execute = promisify(execFile);
const layers = ['tokens', 'atoms', 'molecules', 'organisms', 'screens'];
const classes = ['unchanged', 'visual-update', 'addition-extension', 'removal-candidate', 'unresolved-conflict'];
const hashPattern = /^sha256:[0-9a-f]{64}$/;
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const need = (condition, message) => { if (!condition) throw new Error(message); };
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const unique = (values) => new Set(values).size === values.length;
function atomic(file, bytes) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temp, bytes); renameSync(temp, file);
}
function safePath(root, file) {
  const full = inside(root, file);
  let current = full;
  while (current !== resolve(root)) {
    if (existsSync(current)) need(!lstatSync(current).isSymbolicLink(), `Symlink is not writable by refresh: ${file}`);
    current = dirname(current);
  }
  return full;
}
function listFiles(root, entry, output = []) {
  const full = safePath(root, entry);
  if (!existsSync(full)) return output;
  if (lstatSync(full).isDirectory()) {
    for (const name of readdirSync(full).sort()) {
      if (['node_modules', '.git', '.next', 'dist', 'build', '.cache'].includes(name)) continue;
      listFiles(root, `${entry}/${name}`, output);
    }
  } else output.push(entry);
  return output;
}
export function fileSnapshot(root, roots) {
  need(Array.isArray(roots) && roots.length > 0 && roots.every(nonempty), 'At least one implementation root is required');
  const files = [...new Set(roots.flatMap((entry) => listFiles(root, entry)))].sort();
  return Object.fromEntries(files.map((file) => [file, digest(readInside(root, file))]));
}
const implHash = (root, run) => jsonDigest(fileSnapshot(root, run.implementationRoots));
const fileHash = (root, file) => existsSync(safePath(root, file)) ? digest(readInside(root, file)) : null;
const runPath = (root, id) => { need(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(id), 'Invalid run id'); return join(root, 'design/refresh', id); };
const saveRun = (root, run) => { validateRun(run); atomic(join(runPath(root, run.id), 'run.json'), jsonBytes(run)); };
export function validateRun(run) {
  need(run?.version === 1 && nonempty(run.id) && nonempty(run.platform), 'Malformed refresh run');
  need(['staged', 'accepted', 'complete'].includes(run.status), 'Invalid run status');
  need(Array.isArray(run.implementationRoots) && run.implementationRoots.length && run.expected && typeof run.expected === 'object', 'Missing run fingerprints');
  need(hashPattern.test(run.targetRevision) && Array.isArray(run.worklist) && Array.isArray(run.reconciliation?.conflicts), 'Missing run references/worklist');
  for (const [file, hash] of Object.entries(run.expected)) need(nonempty(file) && hashPattern.test(hash), 'Malformed expected file fingerprint');
  if (run.status !== 'staged') {
    validatePlan(run.plan);
    need(run.accepted?.planHash === jsonDigest(run.plan), 'Accepted plan was modified; reconciliation required');
    need(run.worklist.length === run.plan.items.length && run.worklist.every((w, i) => w.id === run.plan.items[i].id && ['pending', 'implemented', 'verified'].includes(w.status)), 'Worklist differs from accepted plan');
  }
  return run;
}
export const loadRun = (root, id) => validateRun(readJSON(join(runPath(root, id), 'run.json')));
async function locked(root, work) {
  const lock = join(root, 'design/.refresh-lock');
  mkdirSync(dirname(lock), { recursive: true });
  if (existsSync(lock)) {
    let pid;
    try { pid = readJSON(join(lock, 'owner.json')).pid; } catch { throw new Error('Refresh lock has no owner; inspect before removing it'); }
    try { process.kill(pid, 0); throw new Error(`Refresh is active in process ${pid}`); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
    rmSync(lock, { recursive: true });
  }
  mkdirSync(lock); writeFileSync(join(lock, 'owner.json'), jsonBytes({ pid: process.pid }));
  try { return await work(); } finally { rmSync(lock, { recursive: true, force: true }); }
}
const watched = (run) => [...new Set([...run.implementationRoots, 'design/manifest.json', 'design/inventory.json', 'design/reference', ...(run.plan?.items.flatMap((i) => i.files) ?? [])])];
function assertUnchanged(root, run) {
  const now = fileSnapshot(root, watched(run));
  const changed = [...new Set([...Object.keys(now), ...Object.keys(run.expected)])].filter((file) => now[file] !== run.expected[file]);
  need(!changed.length, `Outside edits require reconciliation: ${changed.join(', ')}`);
}
function normalIndex(index, dir) {
  validateFrameIndex(index, dir, { revisions: false });
  const copy = structuredClone(index);
  for (const frame of copy.frames) frame.hash = digest(readInside(dir, frame.png));
  for (const source of copy.sources) {
    source.render_config ??= { version: 0, medium: 'legacy-unknown' };
    source.revision = sourceRevision(source, copy.frames.filter((f) => f.source === source.ref));
  }
  return copy;
}
function inventoryWithHashes(inventory, index) {
  const next = structuredClone(inventory);
  next.sources = next.sources.map((s) => ({ ...s, ...index.sources.find((i) => i.ref === s.ref) }));
  next.frames = next.frames.map((f) => ({ ...f, hash: index.frames.find((i) => i.id === f.id)?.hash }));
  return next;
}
function mergedIndex(old, next, reconciliation) {
  const removed = new Set(reconciliation.sourceMap.map((m) => m.from).filter(Boolean));
  const result = {
    version: 1,
    sources: [...old.sources.filter((s) => !removed.has(s.ref)), ...next.sources],
    frames: [...old.frames.filter((f) => !removed.has(f.source)), ...next.frames],
  };
  need(unique(result.sources.map((s) => s.ref)) && unique(result.frames.map((f) => f.id)), 'Reference collision');
  return result;
}
export async function stageRefresh(root, request) {
  return locked(root, async () => {
    need(Array.isArray(request.sources) && request.sources.length && request.sources.every(nonempty), 'Refresh requires sources');
    need(request.sources.every((s) => !/^https?:/.test(s)), 'Refresh requires local HTML/images or extracted bundles; save remote exports with their assets first');
    const manifest = loadManifest(root); const { id: platform, config } = resolvePlatform(manifest, request.platform);
    need(nonempty(config.capture?.command), 'Capture is not configured; repair capture setup before refresh');
    const implementation = fileSnapshot(root, request.implementationRoots);
    need(Object.keys(implementation).length > 0, 'Implementation roots contain no files');
    const old = normalIndex(readJSON(join(root, 'design/reference/frames.json')), join(root, 'design/reference'));
    const inventory = inventoryWithHashes(readJSON(join(root, 'design/inventory.json')), old);
    const temp = mkdtempSync(join(tmpdir(), 'pp-refresh-'));
    try {
      const args = [...request.sources, '--quiet', '--out', temp, '--reserve', join(root, 'design/reference/frames.json')];
      for (const [key, flag] of Object.entries({ width: '--width', mobileWidth: '--mobile-width', settleMs: '--settle', selector: '--frame-selector' })) if (request.render?.[key] !== undefined) args.push(flag, String(request.render[key]));
      const code = await renderFrames(args);
      need(code === 0, `Reference rendering failed (${code}); active references are unchanged`);
      const next = validateFrameIndex(readJSON(join(temp, 'frames.json')), temp);
      const reconciliation = reconcileFrames(old, next, request.sourceMap, request.mappings);
      const index = mergedIndex(old, next, reconciliation);
      const targetRevision = jsonDigest(index.sources.map((s) => ({ ref: s.ref, revision: s.revision })).sort((a, b) => a.ref.localeCompare(b.ref)));
      const priorRuns = listRuns(root);
      const previous = priorRuns.filter((r) => r.platform === platform && r.status === 'complete').at(-1);
      if (!request.reanalyze && !reconciliation.conflicts.length && previous?.targetRevision === targetRevision && previous.completedImplementation === jsonDigest(implementation) && JSON.stringify(previous.implementationRoots) === JSON.stringify(request.implementationRoots) && (await verifyRefresh(root, previous.id, next)).complete) return { unchanged: true, runId: previous.id };
      need(!priorRuns.some((r) => r.status !== 'complete'), 'An unfinished refresh exists; resume or reconcile it before starting another');
      const id = request.id ?? `refresh-${new Date().toISOString().replace(/[^0-9]/g, '')}-${randomUUID().slice(0, 8)}`;
      const dir = runPath(root, id); need(!existsSync(dir), 'Run already exists'); mkdirSync(dir, { recursive: true });
      cpSync(join(root, 'design/reference'), join(dir, 'history/reference'), { recursive: true });
      cpSync(join(root, 'design/inventory.json'), join(dir, 'history/inventory.json'));
      cpSync(join(root, 'design/manifest.json'), join(dir, 'history/manifest.json'));
      cpSync(temp, join(dir, 'staged'), { recursive: true });
      for (const source of next.sources) for (const input of source.inputs ?? []) {
        const file = relative(dirname(resolve(source.ref)), input.file);
        const target = inside(join(dir, 'exports', source.slug), file);
        mkdirSync(dirname(target), { recursive: true }); cpSync(input.file, target);
      }
      atomic(join(dir, 'prior-index.json'), jsonBytes(old));
      atomic(join(dir, 'base-inventory.json'), jsonBytes(inventory));
      const run = {
        version: 1, id, platform, status: 'staged', created: new Date().toISOString(),
        implementationRoots: request.implementationRoots, initialImplementation: jsonDigest(implementation),
        targetRevision, reconciliation, worklist: [], expected: {}, reanalyze: Boolean(request.reanalyze),
        stagedHash: jsonDigest(next), evidence: {},
      };
      run.expected = fileSnapshot(root, watched(run)); saveRun(root, run);
      return run;
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });
}
export function listRuns(root) {
  const dir = join(root, 'design/refresh');
  return existsSync(dir) ? readdirSync(dir).filter((id) => existsSync(join(dir, id, 'run.json'))).map((id) => loadRun(root, id)).sort((a, b) => a.created.localeCompare(b.created)) : [];
}
function validateCommand(command) {
  need(Array.isArray(command) && command.length && command.every(nonempty), 'Check/capture command must be a nonempty argv array');
}
export function validatePlan(plan) {
  need(plan?.version === 1 && Array.isArray(plan.items) && plan.items.length && unique(plan.items.map((i) => i.id)), 'Plan requires unique nonempty items');
  const seen = new Set(); let rank = -1;
  for (const item of plan.items) {
    need(/^[a-zA-Z0-9_-]+$/.test(item.id) && nonempty(item.name) && layers.includes(item.layer) && classes.includes(item.classification), 'Invalid work item');
    need(layers.indexOf(item.layer) >= rank, 'Execute tokens and shared components before consuming views'); rank = layers.indexOf(item.layer);
    need(Array.isArray(item.dependsOn) && item.dependsOn.every((id) => seen.has(id)), 'Dependencies must precede consumers'); seen.add(item.id);
    need(Array.isArray(item.files) && item.files.length && unique(item.files) && item.files.every(nonempty), 'Item requires exact editable file paths');
    need(Array.isArray(item.states) && item.states.length && unique(item.states.map((s) => `${s.name}:${s.viewport}:${s.theme}`)), 'Item requires every selected state');
    for (const state of item.states) {
      need(nonempty(state.name) && nonempty(state.frame) && /^\d+x\d+$/.test(state.viewport) && nonempty(state.theme), 'State requires target frame, viewport and theme');
      need(['browser', 'ios-simulator', 'android-emulator', 'native-device'].includes(state.medium), 'Record the actual capture medium');
      validateCommand(state.capture);
      need(state.capture.some((arg) => arg.includes('{output}')), 'Capture command must write {output}');
    }
    for (const kind of ['regression', 'behavior']) {
      need(Array.isArray(item.checks?.[kind]) && item.checks[kind].length, `Missing ${kind} checks`);
      item.checks[kind].forEach(validateCommand);
    }
  }
  return plan;
}
function stagedData(root, run, checkInputs = true) {
  const dir = runPath(root, run.id);
  const next = validateFrameIndex(readJSON(join(dir, 'staged/frames.json')), join(dir, 'staged'));
  if (checkInputs) for (const source of next.sources) for (const input of source.inputs ?? []) need(existsSync(input.file) && digest(readFileSync(input.file)) === input.hash, `Source input changed; reconcile refreshed exports: ${input.file}`);
  need(jsonDigest(next) === run.stagedHash, 'Staged references changed; restage/reconcile before accepting');
  return { dir, next, old: readJSON(join(dir, 'prior-index.json')), prior: readJSON(join(dir, 'base-inventory.json')) };
}
function validateCoverage(plan, inventory, before, reconciliation) {
  const changed = new Set(reconciliation.mappings.filter((m) => m.changed).map((m) => m.to));
  const affectedNames = new Set(plan.items.filter((i) => i.classification !== 'unchanged').map((i) => i.name));
  for (const layer of layers.filter((l) => l !== 'tokens')) for (const entity of inventory[layer]) {
    const frames = layer === 'screens' ? entity.states.flatMap((s) => s.frames ?? []) : entity.appears_on ?? [];
    if (!before[layer].some((e) => e.name === entity.name) || frames.some((id) => changed.has(id))) affectedNames.add(entity.name);
  }
  let grew;
  do {
    grew = false;
    for (const layer of ['molecules', 'organisms', 'screens']) for (const entity of inventory[layer]) {
      if (!affectedNames.has(entity.name) && entity.composes?.some((name) => affectedNames.has(name))) { affectedNames.add(entity.name); grew = true; }
    }
  } while (grew);
  if (plan.items.some((i) => i.layer === 'tokens' && i.classification !== 'unchanged')) for (const layer of layers.filter((l) => l !== 'tokens')) for (const entity of inventory[layer]) affectedNames.add(entity.name);
  for (const layer of layers.filter((l) => l !== 'tokens')) for (const entity of inventory[layer]) {
    const frames = layer === 'screens' ? entity.states.flatMap((s) => s.frames ?? []) : entity.appears_on ?? [];
    const isNew = !before[layer].some((e) => e.name === entity.name);
    const affected = isNew || affectedNames.has(entity.name);
    if (affected) {
      const work = plan.items.find((i) => i.name === entity.name && i.layer === layer);
      need(work, `Plan omits affected entity ${entity.name}`);
      need(work.classification !== 'unchanged', `Changed reference cannot classify ${entity.name} as unchanged`);
      const states = layer === 'screens' ? entity.states.map((s) => s.name) : entity.states ?? ['default'];
      for (const state of states) need(work.states.some((s) => s.name === state), `Plan omits selected state ${entity.name}/${state}`);
      for (const frame of frames) need(work.states.some((s) => s.frame === frame), `Plan omits selected viewport/reference ${entity.name}/${frame}`);
      for (const dependency of entity.composes ?? []) {
        const dependencyItem = plan.items.find((i) => i.name === dependency);
        if (dependencyItem && dependencyItem.classification !== 'unchanged') need(work.dependsOn.includes(dependencyItem.id), `Missing dependency ${entity.name} -> ${dependency}`);
      }
    }
  }
  for (const item of plan.items) {
    for (const file of item.files) need(!file.startsWith('design/refresh/') && !['design/manifest.json', 'design/inventory.json'].includes(file) && !file.startsWith('design/reference/'), 'Run owns reference and progress files');
    for (const state of item.states) {
      const frame = inventory.frames.find((f) => f.id === state.frame);
      need(frame, `Unknown evidence target ${state.frame}`);
      if (frame.viewport) need(frame.viewport === state.viewport, `Viewport differs from reference ${state.frame}`);
      if (item.layer !== 'tokens') {
        const entity = inventory[item.layer].find((e) => e.name === item.name);
        const frames = item.layer === 'screens' ? entity?.states.find((s) => s.name === state.name)?.frames : entity?.appears_on;
        need(frames?.includes(state.frame), `Reference does not cover ${item.name}/${state.name}`);
      }
    }
    if (item.layer !== 'tokens') need(inventory[item.layer].some((e) => e.name === item.name), `Unknown planned entity ${item.name}`);
  }
}
function manifestProgress(manifest, run, complete = false) {
  const copy = structuredClone(manifest); const { config } = resolvePlatform(copy, run.platform);
  for (const item of run.plan.items) {
    if (item.classification === 'unchanged') continue;
    if (item.layer === 'tokens') continue;
    config[item.layer] ??= [];
    let entry = config[item.layer].find((e) => e.name === item.name);
    if (!entry) {
      need(item.classification === 'addition-extension', `Missing existing manifest identity ${item.name}`);
      entry = { name: item.name, file: item.files[0], states: [...new Set(item.states.map((s) => s.name))] };
      config[item.layer].push(entry);
    }
    if (entry) { entry.status = complete ? 'verified' : 'pending'; entry.refresh_run = run.id; }
  }
  config.refresh = { run: run.id, status: complete ? 'complete' : 'pending', targetRevision: run.targetRevision };
  return copy;
}
// Each transaction is recorded before writes. Recovery accepts only its exact before/after bytes.
function transact(root, run, writes, action) {
  assertUnchanged(root, run);
  run.transaction = { action, writes: Object.entries(writes).map(([file, bytes]) => ({ file, before: fileHash(root, file), after: digest(bytes), bytes: Buffer.from(bytes).toString('base64') })) };
  saveRun(root, run); return recover(root, run);
}
function recover(root, run) {
  if (!run.transaction) { assertUnchanged(root, run); return run; }
  const entries = run.transaction.writes;
  const allowed = new Map(entries.map((e) => [e.file, e]));
  const now = fileSnapshot(root, watched(run));
  for (const file of new Set([...Object.keys(now), ...Object.keys(run.expected), ...allowed.keys()])) {
    const entry = allowed.get(file); const current = now[file] ?? fileHash(root, file);
    need(entry ? current === entry.before || current === entry.after : current === (run.expected[file] ?? null), `Outside edits block recovery: ${file}`);
  }
  for (const entry of entries) {
    const bytes = Buffer.from(entry.bytes, 'base64'); need(digest(bytes) === entry.after, 'Corrupt write journal');
    if (fileHash(root, entry.file) !== entry.after) atomic(safePath(root, entry.file), bytes);
  }
  const action = run.transaction.action;
  if (action.type === 'accept') run.status = 'accepted';
  if (action.type === 'apply') run.worklist.find((w) => w.id === action.id).status = 'implemented';
  if (action.type === 'complete') { run.status = 'complete'; run.completedImplementation = implHash(root, run); }
  delete run.transaction; run.expected = fileSnapshot(root, watched(run)); saveRun(root, run); return run;
}
export async function acceptRefresh(root, id, plan) {
  return locked(root, async () => {
    const run = loadRun(root, id); need(run.status === 'staged', 'Run is already accepted; resume its decisions'); assertUnchanged(root, run);
    validatePlan(plan); need(!plan.items.some((i) => ['removal-candidate', 'unresolved-conflict'].includes(i.classification)), 'Unresolved/removal candidates require explicit reconciliation before acceptance');
    const { dir, next, old, prior } = stagedData(root, run);
    const reconciliation = reconcileFrames(old, next, run.reconciliation.sourceMap, plan.mappings ?? run.reconciliation.mappings);
    need(!reconciliation.conflicts.length, 'Unresolved correspondence or omitted coverage');
    const candidate = mergeInventories(prior, plan.inventoryDelta ?? { version: 1, status: 'complete', sources: [], frames: [], screens: [], atoms: [], molecules: [], organisms: [] }, { mode: 'replace', frames: next, reconciliation });
    const index = mergedIndex(old, next, reconciliation);
    const check = verifyInventory(candidate); need(check.exit === 0, `Candidate inventory invalid: ${JSON.stringify(check.violations)}`);
    validateReferenceInventory(candidate, index); validateCoverage(plan, candidate, prior, reconciliation);
    for (const item of plan.items) for (const file of item.files) need(run.implementationRoots.some((entry) => file === entry || file.startsWith(`${entry}/`)), 'Editable files must be covered by implementation roots');
    run.reconciliation = reconciliation; run.plan = plan; run.accepted = { at: new Date().toISOString(), planHash: jsonDigest(plan) };
    run.worklist = plan.items.map((i) => ({ id: i.id, status: 'pending' }));
    candidate.confirmed = run.accepted.at;
    const manifest = manifestProgress(loadManifest(root), run);
    manifest.inventory = { ...manifest.inventory, file: 'design/inventory.json', reference: 'design/reference', confirmed: run.accepted.at, sources: candidate.sources.map(({ ref, hash, revision }) => ({ ref, hash, revision })), refresh_run: run.id };
    if (Array.isArray(manifest.references)) {
      manifest.references = manifest.references.map((ref) => typeof ref === 'string' ? reconciliation.sourceMap.find((mapping) => mapping.from === ref)?.to ?? ref : ref);
      for (const mapping of reconciliation.sourceMap) if (!mapping.from && !manifest.references.includes(mapping.to)) manifest.references.push(mapping.to);
    }
    // Add explicit new files to the watch set, retaining all earlier preconditions.
    assertUnchanged(root, run);
    const writes = {
      'design/reference/frames.json': jsonBytes(index),
      'design/inventory.json': jsonBytes(candidate),
      'design/manifest.json': jsonBytes(manifest),
    };
    for (const frame of next.frames) writes[`design/reference/${frame.png}`] = readInside(join(dir, 'staged'), frame.png);
    return transact(root, run, writes, { type: 'accept' });
  });
}
export async function resumeRefresh(root, id) { return locked(root, async () => recover(root, loadRun(root, id))); }
export async function reconcileEdits(root, id, decision) {
  return locked(root, async () => {
    const run = loadRun(root, id);
    need(run.status === 'accepted' && !run.transaction, 'Resolve the pending transaction before reconciling edits');
    need(nonempty(decision.reason) && decision.planHash === run.accepted.planHash && Array.isArray(decision.files), 'Reconciliation requires the accepted plan hash, reason and current file hashes');
    const now = fileSnapshot(root, watched(run));
    const changed = [...new Set([...Object.keys(now), ...Object.keys(run.expected)])].filter((file) => now[file] !== run.expected[file]).sort();
    need(changed.length && JSON.stringify(decision.files.map((f) => f.path).sort()) === JSON.stringify(changed), 'Reconcile the exact outside edit set');
    for (const file of decision.files) {
      need(run.implementationRoots.some((entry) => file.path === entry || file.path.startsWith(`${entry}/`)), 'Reference/configuration edits require a new analysis');
      need(file.hash === (now[file.path] ?? null), 'Reconciliation decision is stale');
    }
    run.reconciliations ??= []; run.reconciliations.push({ ...decision, at: new Date().toISOString() });
    run.expected = now;
    for (const receipt of Object.values(run.evidence)) { delete receipt.after; delete receipt.judgment; delete receipt.checks; }
    for (const work of run.worklist) work.status = 'implemented';
    saveRun(root, run); return run;
  });
}
function getItem(run, id) { const item = run.plan?.items.find((i) => i.id === id); need(item, 'Unknown or unaccepted work item'); return item; }
export async function applyRefresh(root, id, itemId, patchDirectory) {
  return locked(root, async () => {
    const run = recover(root, loadRun(root, id)); need(run.status === 'accepted', 'Run is not editable'); const item = getItem(run, itemId);
    need(item.dependsOn.every((id) => run.worklist.find((w) => w.id === id).status === 'verified'), 'Verify dependencies before editing consumers');
    for (let i = 0; i < item.states.length; i++) need(run.evidence[`${itemId}:${i}`]?.before, 'Capture all before states before editing');
    const files = readdirRecursive(patchDirectory).sort((a, b) => item.files.indexOf(a) - item.files.indexOf(b));
    need(files.length && files.every((file) => item.files.includes(file)), 'Patch contains files outside accepted scope');
    const writes = Object.fromEntries(files.map((file) => [file, readInside(patchDirectory, file)]));
    return transact(root, run, writes, { type: 'apply', id: itemId });
  });
}
function readdirRecursive(root, prefix = '') {
  return readdirSync(join(root, prefix)).sort().flatMap((name) => {
    const file = prefix ? `${prefix}/${name}` : name;
    const full = safePath(root, file);
    return lstatSync(full).isDirectory() ? readdirRecursive(root, file) : [file];
  });
}
async function commandResult(root, command) {
  try { const result = await execute(command[0], command.slice(1), { cwd: root, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 }); return { command, exit: 0, stdout: result.stdout, stderr: result.stderr }; }
  catch (error) { return { command, exit: typeof error.code === 'number' ? error.code : -1, stdout: error.stdout ?? '', stderr: error.stderr ?? error.message }; }
}
const pngValid = (bytes) => bytes.length > 32 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0;
export async function captureRefresh(root, id, itemId, phase) {
  return locked(root, async () => {
    const run = recover(root, loadRun(root, id)); need(run.status === 'accepted' && ['before', 'after'].includes(phase), 'Capture requires an accepted run and before/after phase');
    const item = getItem(run, itemId); const fingerprint = implHash(root, run);
    for (let i = 0; i < item.states.length; i++) {
      const key = `${itemId}:${i}`; const state = item.states[i]; const existing = run.evidence[key]?.[phase];
      if (phase === 'before' && existing) continue;
      if (phase === 'before') need(run.worklist.find((w) => w.id === itemId).status === 'pending', 'Before capture cannot be created after editing');
      if (phase === 'before') need(fingerprint === run.initialImplementation, 'Capture the complete before matrix before the first edit');
      const rel = `design/refresh/${id}/evidence/${itemId}-${i}-${phase}-${randomUUID()}.png`;
      const output = safePath(root, rel); mkdirSync(dirname(output), { recursive: true });
      const command = state.capture.map((arg) => arg.replaceAll('{output}', output));
      const result = await commandResult(root, command);
      need(result.exit === 0, `Capture failed: ${result.stderr}`);
      const bytes = readInside(root, rel); need(pngValid(bytes), 'Capture must produce a real PNG image');
      const receipt = readJSON(`${output}.json`);
      need(receipt.medium === state.medium && receipt.viewport === state.viewport && receipt.theme === state.theme && nonempty(receipt.source), 'Capture adapter receipt must identify its actual medium, source, viewport and theme');
      need(implHash(root, run) === fingerprint, 'Implementation changed during capture'); assertUnchanged(root, run);
      run.evidence[key] ??= {};
      run.evidence[key][phase] = { file: rel, hash: digest(bytes), implementation: fingerprint, targetRevision: run.targetRevision, viewport: state.viewport, theme: state.theme, medium: state.medium, command, captured: new Date().toISOString() };
      delete run.evidence[key].judgment; delete run.evidence[key].checks;
      saveRun(root, run);
    }
    return run;
  });
}
export async function judgeRefresh(root, id, itemId, judgments) {
  return locked(root, async () => {
    const run = recover(root, loadRun(root, id)); need(run.status === 'accepted', 'Run is not active'); const item = getItem(run, itemId);
    need(Array.isArray(judgments) && judgments.length === item.states.length, 'Judge the exact nonempty selected screenshot set');
    for (let i = 0; i < item.states.length; i++) {
      const evidence = run.evidence[`${itemId}:${i}`]; const judgment = judgments[i];
      need(evidence?.before && evidence?.after && evidence.after.implementation === implHash(root, run), 'Missing or stale before/after captures');
      need(judgment.frame === item.states[i].frame && nonempty(judgment.reviewer) && nonempty(judgment.reason) && ['pass', 'fail'].includes(judgment.verdict), 'Explicit reference fidelity judgment is required');
      need(Array.isArray(judgment.discrepancies) && judgment.discrepancies.every((d) => nonempty(d.description)), 'List reference discrepancies explicitly');
      for (const d of judgment.discrepancies) if (d.accepted) need(nonempty(d.acceptedBy) && nonempty(d.reason), 'Accepted exceptions need a decision and rationale');
      evidence.judgment = { ...judgment, before: evidence.before.hash, after: evidence.after.hash, targetRevision: run.targetRevision, implementation: implHash(root, run) };
    }
    saveRun(root, run); return run;
  });
}
export async function checkRefresh(root, id, itemId) {
  return locked(root, async () => {
    const run = recover(root, loadRun(root, id)); need(run.status === 'accepted', 'Run is not active'); const item = getItem(run, itemId); const fingerprint = implHash(root, run);
    const checks = { implementation: fingerprint, targetRevision: run.targetRevision, at: new Date().toISOString() };
    for (const kind of ['regression', 'behavior']) {
      checks[kind] = [];
      for (const command of item.checks[kind]) checks[kind].push(await commandResult(root, command));
    }
    assertUnchanged(root, run); need(implHash(root, run) === fingerprint, 'Implementation changed during checks');
    for (let i = 0; i < item.states.length; i++) { run.evidence[`${itemId}:${i}`] ??= {}; run.evidence[`${itemId}:${i}`].checks = checks; }
    saveRun(root, run);
    const report = await verifyRefresh(root, id);
    for (const work of run.worklist) work.status = report.items.find((i) => i.id === work.id)?.complete ? 'verified' : work.status === 'verified' ? 'implemented' : work.status;
    saveRun(root, run); return report;
  });
}
export async function verifyRefresh(root, id, freshlyRendered = null) {
  const run = loadRun(root, id); const errors = []; const items = [];
  try { assertUnchanged(root, run); } catch (error) { errors.push(error.message); }
  try {
    const { next, dir } = stagedData(root, run, false);
    const changedInputs = next.sources.some((source) => (source.inputs ?? []).some((input) => !existsSync(input.file) || digest(readFileSync(input.file)) !== input.hash));
    if (changedInputs) {
      let current = freshlyRendered;
      const temporary = current ? null : mkdtempSync(join(tmpdir(), 'pp-refresh-freshness-'));
      try {
        if (!current) {
          for (const source of next.sources) {
            const cfg = source.render_config;
            const code = await renderFrames([source.ref, '--quiet', '--out', temporary, '--reserve', join(dir, 'staged/frames.json'), '--width', String(cfg.width), '--mobile-width', String(cfg.mobileWidth), '--settle', String(cfg.settleMs), '--frame-selector', cfg.selector]);
            need(code === 0, 'Cannot verify current source render');
          }
          current = validateFrameIndex(readJSON(join(temporary, 'frames.json')), temporary);
        }
        for (const source of next.sources) need(current.sources.find((s) => s.ref === source.ref)?.revision === source.revision, `Source revision changed: ${source.ref}`);
      } finally { if (temporary) rmSync(temporary, { recursive: true, force: true }); }
    }
    if (run.status !== 'staged') {
      const index = validateFrameIndex(readJSON(join(root, 'design/reference/frames.json')), join(root, 'design/reference'));
      validateReferenceInventory(readJSON(join(root, 'design/inventory.json')), index);
      need(jsonDigest(index.sources.map((s) => ({ ref: s.ref, revision: s.revision })).sort((a, b) => a.ref.localeCompare(b.ref))) === run.targetRevision, 'Current reference revision differs');
    }
  } catch (error) { errors.push(error.message); }
  if (run.status === 'staged' || run.transaction || run.reconciliation.conflicts.length) errors.push('Plan or promotion is unfinished');
  const fingerprint = implHash(root, run);
  for (const item of run.plan?.items ?? []) {
    const missing = [];
    for (let i = 0; i < item.states.length; i++) {
      const state = item.states[i]; const evidence = run.evidence[`${item.id}:${i}`];
      try {
        need(evidence?.before && evidence?.after, 'Missing before/after captures');
        for (const phase of ['before', 'after']) {
          const capture = evidence[phase]; const bytes = readInside(root, capture.file);
          need(pngValid(bytes) && digest(bytes) === capture.hash, 'Missing or modified screenshot');
          need(capture.targetRevision === run.targetRevision && capture.viewport === state.viewport && capture.theme === state.theme && capture.medium === state.medium, 'Capture does not cover selected revision/state/medium');
        }
        need(evidence.after.implementation === fingerprint, 'Stale implementation capture');
        const judgment = evidence.judgment;
        need(judgment?.verdict === 'pass' && judgment.frame === state.frame && nonempty(judgment.reviewer) && nonempty(judgment.reason) && judgment.after === evidence.after.hash && judgment.before === evidence.before.hash && judgment.targetRevision === run.targetRevision && judgment.implementation === fingerprint, 'Missing or stale reference fidelity judgment');
        need(judgment.discrepancies.every((d) => d.accepted && nonempty(d.acceptedBy) && nonempty(d.reason)), 'Unresolved reference discrepancy');
        const checks = evidence.checks;
        need(checks?.implementation === fingerprint && checks.targetRevision === run.targetRevision, 'Missing or stale regression/behavior checks');
        for (const kind of ['regression', 'behavior']) need(checks[kind]?.length === item.checks[kind].length && checks[kind].every((c, j) => c.exit === 0 && JSON.stringify(c.command) === JSON.stringify(item.checks[kind][j])), `Failed or incomplete ${kind} checks`);
      } catch (error) { missing.push(`${state.name}/${state.viewport}/${state.theme}: ${error.message}`); }
    }
    items.push({ id: item.id, complete: missing.length === 0, outstanding: missing });
  }
  return { run: id, historicalStatus: run.status, complete: errors.length === 0 && items.length > 0 && items.every((i) => i.complete), errors, items };
}
export async function completeRefresh(root, id) {
  return locked(root, async () => {
    const run = recover(root, loadRun(root, id)); const report = await verifyRefresh(root, id); need(report.complete, `Refresh incomplete: ${JSON.stringify(report)}`);
    if (run.status === 'complete') return run;
    for (const work of run.worklist) work.status = 'verified';
    return transact(root, run, { 'design/manifest.json': jsonBytes(manifestProgress(loadManifest(root), run, true)) }, { type: 'complete' });
  });
}
export async function main(argv = process.argv.slice(2)) {
  const [command, rootArg, id, argument, extra] = argv; const root = resolve(rootArg ?? '.');
  try {
    let result;
    if (command === 'stage') result = await stageRefresh(root, readJSON(id));
    else if (command === 'accept') result = await acceptRefresh(root, id, readJSON(argument));
    else if (command === 'resume') result = await resumeRefresh(root, id);
    else if (command === 'reconcile') result = await reconcileEdits(root, id, readJSON(argument));
    else if (command === 'apply') result = await applyRefresh(root, id, argument, extra);
    else if (command === 'capture') result = await captureRefresh(root, id, argument, extra);
    else if (command === 'judge') result = await judgeRefresh(root, id, argument, readJSON(extra));
    else if (command === 'check') result = await checkRefresh(root, id, argument);
    else if (command === 'verify') result = await verifyRefresh(root, id);
    else if (command === 'complete') result = await completeRefresh(root, id);
    else if (command === 'status') { result = []; for (const run of listRuns(root)) result.push(await verifyRefresh(root, run.id)); }
    else throw new Error('Usage: refresh-run.mjs <stage|accept|resume|apply|capture|judge|check|verify|complete|status> <project> [run-id|request.json] [item-id|plan.json] [patch-directory|phase|judgments.json]');
    console.log(JSON.stringify(result, null, 2)); return ['verify', 'check'].includes(command) && !result.complete ? 1 : 0;
  } catch (error) { console.error(error.message); return 2; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = await main();
