#!/usr/bin/env node
// Records this site's own pixel-perfect run (strategy T6 AC-4) and the release it describes into
// src/lib/run.json, which the page reads. Re-run it at the end of the run so the numbers are final:
//
//   node scripts/record-run.mjs [--session <id>]
//
// Method (stated on the page, so keep it in step):
// - frames: the design frames the build read, the PNGs under design/reference/{source}/NN.png.
// - components: the inventory's atoms, molecules, and organisms.
// - gates: gate records marked "passed" in design/manifest.json, summed over both platforms.
// - tokens: every Claude API response in the run, counted once by message id (forks repeat
//   history). The page's figure is new tokens: input + cache writes + output. Cache reads (the
//   same context re-read on each turn) are recorded separately as cachedTokens and stated in the
//   FAQ. Subagent sessions are included, and so is work done in the same session that is not the
//   build itself (fixing pixel-perfect bugs found along the way, the design review).
// - minutes: active time. All events from the run's sessions merged on one timeline from the
//   /pixel-perfect:init message on; a gap longer than IDLE_MINUTES counts as a break.
// - release: the plugin's version, its CHANGELOG date, and the tag the clone commands check out.
// - excerpts: the Build it panels quote this site's real design/manifest.json and inventory.json,
//   and the status panel is derived from the gates the manifest records.
// - cascade: the components a change to the --accent-text token reaches: those whose source uses
//   it, plus every component that imports one of them, transitively.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const IDLE_MINUTES = 15;
const site = resolve(import.meta.dirname, '..');
const repo = resolve(site, '..');
const arg = (name, fallback) => {
	const i = process.argv.indexOf(name);
	return i > -1 ? process.argv[i + 1] : fallback;
};
const session = arg('--session', '66712cf3-4caf-44ba-9fac-cd6b8af8a7d0');
const logs = join(homedir(), '.claude', 'projects', repo.replaceAll('/', '-'));

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const manifest = json(join(site, 'design/manifest.json'));
const inventory = json(join(site, 'design/inventory.json'));
const plugin = json(join(repo, 'plugins/pixel-perfect/.claude-plugin/plugin.json'));

// Release
const version = plugin.version;
const dated = readFileSync(join(repo, 'CHANGELOG.md'), 'utf8').match(new RegExp(`^## \\[${version.replaceAll('.', '\\.')}\\] - (\\d{4}-\\d{2}-\\d{2})`, 'm'));
if (!dated) throw new Error(`CHANGELOG.md has no dated entry for ${version}`);

// Exact counts
const refDir = join(site, 'design/reference');
const frames = readdirSync(refDir, { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.reduce((n, d) => n + readdirSync(join(refDir, d.name)).filter((f) => /^\d+\.png$/.test(f)).length, 0);
const components = ['atoms', 'molecules', 'organisms'].reduce((n, layer) => n + inventory[layer].length, 0);
const gates = Object.values(manifest.platforms).reduce((n, p) => n + Object.values(p.gates).filter((g) => g === 'passed').length, 0);

// Session logs: the run's session, its subagents, and any session sharing its messages (a fork)
const main = join(logs, `${session}.jsonl`);
if (!existsSync(main)) throw new Error(`no session log at ${main}`);
const subDir = join(logs, session, 'subagents');
const files = [main, ...(existsSync(subDir) ? readdirSync(subDir).filter((f) => f.endsWith('.jsonl')).map((f) => join(subDir, f)) : [])];
for (const f of readdirSync(logs)) if (f.endsWith('.jsonl') && !files.includes(join(logs, f))) files.push(join(logs, f));

const events = (file) =>
	readFileSync(file, 'utf8')
		.split('\n')
		.flatMap((line) => {
			try {
				return line ? [JSON.parse(line)] : [];
			} catch {
				return [];
			}
		});

const mainEvents = events(main);
const start = mainEvents.find((e) => e.type === 'user' && JSON.stringify(e.message?.content ?? '').includes('<command-name>/pixel-perfect:init</command-name>'))?.timestamp;
if (!start) throw new Error('the session has no /pixel-perfect:init message');
const runIds = new Set(mainEvents.map((e) => e.message?.id).filter(Boolean));

const seen = new Set();
const usage = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
const times = [];
for (const file of files) {
	const evs = file === main ? mainEvents : events(file);
	// Other top-level sessions count only if they share the run's messages (a fork of it).
	const inRun = file === main || file.startsWith(subDir) || evs.some((e) => runIds.has(e.message?.id));
	if (!inRun) continue;
	for (const e of evs) {
		if (!e.timestamp || e.timestamp < start) continue;
		times.push(Date.parse(e.timestamp));
		const m = e.message;
		if (e.type !== 'assistant' || !m?.id || !m.usage || seen.has(m.id)) continue;
		seen.add(m.id);
		usage.input += m.usage.input_tokens ?? 0;
		usage.cacheWrite += m.usage.cache_creation_input_tokens ?? 0;
		usage.cacheRead += m.usage.cache_read_input_tokens ?? 0;
		usage.output += m.usage.output_tokens ?? 0;
	}
}
times.sort((a, b) => a - b);
let activeMs = 0;
for (let i = 1; i < times.length; i++) {
	const gap = times[i] - times[i - 1];
	if (gap <= IDLE_MINUTES * 60_000) activeMs += gap;
}

// Code-panel lines are [kind, text] tokens (CodePanel): key, value, comment, success, plain.
function excerpts() {
	const tools = manifest.platforms['web-desktop'].tools;
	const kv = (key, value, last = false) => [['plain', '  '], ['key', `"${key}"`], ['plain', ': '], ['value', JSON.stringify(value)], ['plain', last ? '' : ',']];
	const manifestLines = [
		[['plain', '{']],
		kv('spec', manifest.spec),
		[['plain', '  '], ['key', '"references"'], ['plain', `: [${manifest.references.length} design files]`], ['plain', ',']],
		kv('framework', tools.framework),
		kv('sandbox', tools.sandbox),
		[['plain', '  '], ['key', '"platforms"'], ['plain', `: [${Object.keys(manifest.platforms).map((p) => `"${p}"`).join(', ')}]`]]
	];
	const entry = (layer, name) => inventory[layer].find((c) => c.name === name);
	const button = entry('atoms', 'Button');
	const copy = entry('molecules', 'CopyBlock');
	const frameList = (c) => `["${c.appears_on[0]}", … ${c.appears_on.length} frames]`;
	const inventoryLines = [
		[['key', '"atoms"'], ['plain', ': [']],
		[['plain', '  { '], ['key', '"name"'], ['plain', ': '], ['value', `"${button.name}"`], ['plain', ',']],
		[['plain', '    '], ['key', '"appears_on"'], ['plain', `: ${frameList(button)} }, …`]],
		[['key', '"molecules"'], ['plain', ': [']],
		[['plain', '  { '], ['key', '"name"'], ['plain', ': '], ['value', `"${copy.name}"`], ['plain', ',']],
		[['plain', '    '], ['key', '"composes"'], ['plain', `: [${copy.composes.map((n) => `"${n}"`).join(', ')}],`]],
		[['plain', '    '], ['key', '"appears_on"'], ['plain', `: ${frameList(copy)} }, …`]]
	];
	// Status: one line per layer from the gates this site's manifest records.
	const g = manifest.platforms['web-desktop'].gates;
	const colours = (readFileSync(join(site, 'src/app.css'), 'utf8').match(/^\s*--color-(?!\*|transparent|current)[a-z-]+:/gm) ?? []).length;
	const counts = { tokens: `${colours} colour tokens`, atoms: inventory.atoms.length, molecules: inventory.molecules.length, organisms: inventory.organisms.length, screens: inventory.screens.length };
	const gate = { tokens: 'tokens_capture', atoms: 'atoms', molecules: 'molecules', organisms: 'organisms', screens: 'compose' };
	let building = false;
	const statusLines = Object.keys(gate).map((layer) => {
		const name = layer.padEnd(12);
		const count = typeof counts[layer] === 'number' ? `${counts[layer]} components` : counts[layer];
		if (g[gate[layer]] === 'passed') return [['plain', `${name}built     `], ['success', 'gate passed'], ['plain', `   ${count}`]];
		if (!building) {
			building = true;
			return [['plain', name], ['value', 'building']];
		}
		return [['plain', name], ['comment', 'waiting']];
	});
	return { manifest: manifestLines, inventory: inventoryLines, status: statusLines };
}

// Components reached by a token change: direct users of the token, then their importers.
function cascade(token) {
	const root = join(site, 'src/lib/components');
	const sources = new Map();
	for (const layer of ['atoms', 'molecules', 'organisms']) {
		for (const f of readdirSync(join(root, layer))) {
			if (f.endsWith('.svelte') && !f.endsWith('.stories.svelte')) sources.set(f.slice(0, -7), readFileSync(join(root, layer, f), 'utf8'));
		}
	}
	const uses = new RegExp(`-${token}\\b`);
	const direct = [...sources].filter(([, src]) => uses.test(src)).map(([name]) => name);
	const reached = new Set(direct);
	for (let grew = true; grew; ) {
		grew = false;
		for (const [name, src] of sources) {
			if (reached.has(name)) continue;
			if ([...reached].some((r) => src.includes(`/${r}.svelte'`))) {
				reached.add(name);
				grew = true;
			}
		}
	}
	return { token, direct: direct.sort(), reached: reached.size };
}

const run = {
	recorded: new Date().toISOString(),
	release: { version, major: version.split('.')[0], tag: `v${version}`, date: dated[1] },
	numbers: {
		tokens: usage.input + usage.cacheWrite + usage.output,
		cachedTokens: usage.cacheRead,
		minutes: Math.round(activeMs / 60_000),
		frames,
		gates,
		components
	},
	excerpts: excerpts(),
	cascade: cascade('accent-text'),
	method: {
		tokens: usage,
		responses: seen.size,
		idleMinutes: IDLE_MINUTES,
		from: start,
		sessions: files.length
	}
};
writeFileSync(join(site, 'src/lib/run.json'), JSON.stringify(run, null, '\t') + '\n');
console.log(JSON.stringify(run, null, 2));
