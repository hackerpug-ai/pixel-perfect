#!/usr/bin/env node
// Records the landing page's terminal demo: a real Claude Code session running pixel-perfect in a
// sandbox project, captured with asciinema and cut into the short loop the page plays.
//
//   node scripts/record-demo.mjs record [--dir /tmp/acme-pricing] '/pixel-perfect:build' '/pixel-perfect:status'
//   node scripts/record-demo.mjs cut [--budgets 40,10]
//   node scripts/record-demo.mjs scrub [file]
//
// Needs asciinema 3 (brew install asciinema), tmux, and a logged-in claude CLI.
//
// Method (the page's caption states it, so keep them in step):
// - record: claude runs inside `asciinema rec` inside a private tmux server at 96x24. The commands
//   are typed into the real interface with tmux send-keys. A Stop hook in the sandbox's project
//   settings marks the end of each turn. User settings, hooks, and MCP servers are left out
//   (--setting-sources project,local --strict-mcp-config), so the picture is the product's own.
//   The plugin is loaded from a copy at /tmp/plugins/pixel-perfect, so tool calls do not print
//   this checkout's path. The raw cast goes to design/.captures/demo/ and is never committed.
// - cut: only rescales time and merges neighbouring output. It never drops or rewrites output,
//   because the interface redraws relative to what it printed before; `cut` proves this by comparing
//   the published bytes with the raw ones. Typing plays at recorded speed. Each command's working
//   stretch is compressed to its budget. Everything after the last command (the exit) is cut off.
//   One redaction: this machine's user name (file listings print it as the owner) is replaced by a
//   stand-in of the same length, so no column moves.
// - scrub: fails if the cast names this machine's user, host, home directory, or email, or holds a
//   key-shaped string. A cast is plain text of everything the terminal printed; run it before a commit.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, hostname, userInfo } from 'node:os';
import { join, resolve } from 'node:path';

const site = resolve(import.meta.dirname, '..');
const repo = resolve(site, '..');
const COLS = 96; // 96x24 in IBM Plex Mono at the player's line height is close to the 16:9 frame
const ROWS = 24;
const captures = join(site, 'design/.captures/demo');
const RAW = join(captures, 'raw.cast');
const RUN = join(captures, 'run.json');
const CAST = join(site, 'static/demo/demo.cast');
const META = join(site, 'src/lib/demo.json');
const PLUGIN = '/tmp/plugins/pixel-perfect'; // a copy, so the picture shows no personal path
const HOLD_BETWEEN = 2.5; // seconds a finished command stays on screen before the next is typed
const HOLD_END = 4; // seconds the last frame stays before the loop restarts
const IDLE_CAP = 2; // a real pause longer than this is shortened to this before scaling
const FRAME = 1 / 15; // output closer together than this is merged into one event

const [mode, ...rest] = process.argv.slice(2);
const flag = (name, fallback) => {
	const i = rest.indexOf(name);
	return i > -1 ? rest.splice(i, 2)[1] : fallback;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (message) => {
	console.error(`FAIL ${message}`);
	process.exit(1);
};

// ---- record ---------------------------------------------------------------------------------

const tmux = (...args) => spawnSync('tmux', ['-L', 'ppdemo', ...args], { encoding: 'utf8', env: childEnv() });
const alive = () => tmux('has-session', '-t', 'demo').status === 0;
const pane = () => tmux('capture-pane', '-p', '-t', 'demo').stdout ?? '';
const key = (...keys) => tmux('send-keys', '-t', 'demo', ...keys);

// This script may itself run inside Claude Code; the recorded session must not inherit that.
function childEnv() {
	const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('CLAUDE')));
	return { ...env, TERM: 'xterm-256color', COLORTERM: 'truecolor' };
}

function sandboxSettings(dir) {
	const mark = (word) => ({ hooks: [{ type: 'command', command: `echo ${word} >> "$CLAUDE_PROJECT_DIR/.claude/demo-marks"` }] });
	mkdirSync(join(dir, '.claude'), { recursive: true });
	writeFileSync(
		join(dir, '.claude/settings.json'),
		JSON.stringify(
			{
				permissions: { allow: ['Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'Skill', 'Agent', 'WebFetch', 'WebSearch'] },
				hooks: { Stop: [mark('stop')] }
			},
			null,
			2
		) + '\n'
	);
	writeFileSync(join(dir, '.claude/demo-marks'), '');
}
const stops = (dir) => readFileSync(join(dir, '.claude/demo-marks'), 'utf8').split('\n').filter((l) => l === 'stop').length;

async function launch(dir, recordTo) {
	const claude = `claude --plugin-dir ${PLUGIN} --setting-sources project,local --strict-mcp-config`;
	const command = recordTo ? `asciinema rec --quiet --overwrite --capture-input --window-size ${COLS}x${ROWS} -c '${claude}' '${recordTo}'` : claude;
	tmux('kill-server');
	const started = tmux('new-session', '-d', '-s', 'demo', '-x', String(COLS), '-y', String(ROWS), '-c', dir, command);
	if (started.status !== 0) fail(`tmux did not start: ${started.stderr}`);
	for (let i = 0; i < 60; i++) {
		await sleep(1000);
		const screen = pane();
		if (screen.includes('Yes, I trust this folder')) {
			if (recordTo) fail('the trust prompt appeared on camera');
			key('Down');
			await sleep(400);
			key('Enter');
		} else if (screen.includes('Claude Code v') && screen.includes('❯')) return;
		if (!alive()) fail('the session ended before the prompt appeared');
	}
	fail('the prompt did not appear within 60 s');
}

async function type(text) {
	for (const ch of text) {
		key('-l', ch);
		await sleep(45 + Math.random() * 70);
	}
	await sleep(700);
	key('Enter');
}

async function quit() {
	await type('/exit');
	for (let i = 0; i < 20 && alive(); i++) await sleep(500);
	tmux('kill-server');
}

// A turn is over when the Stop hook has fired and the interface has been idle for a few seconds
// (a background agent can wake the session again after a Stop).
async function run(dir, command, minutes) {
	const before = stops(dir);
	await sleep(1200);
	await type(command);
	const deadline = Date.now() + minutes * 60_000;
	let idle = 0;
	let asked = 0;
	while (idle < 6) {
		await sleep(1000);
		if (Date.now() > deadline) fail(`"${command}" did not finish within ${minutes} minutes`);
		if (!alive()) fail(`the session ended during "${command}"`);
		const screen = pane();
		// A picker or permission prompt: take the first (recommended) option once it has been readable.
		if (/Enter to (select|confirm)|Esc to cancel/.test(screen)) {
			idle = 0;
			if (++asked >= 3) {
				console.log(`answered a prompt with Enter:\n${screen.trimEnd()}\n`);
				key('Enter');
				asked = 0;
			}
			continue;
		}
		asked = 0;
		idle = stops(dir) > before && !/esc to interrupt/i.test(screen) ? idle + 1 : 0;
	}
}

async function record() {
	const dir = resolve(flag('--dir', '/tmp/acme-pricing'));
	const minutes = Number(flag('--minutes', '90'));
	const commands = rest;
	if (!commands.length) fail('give at least one command to record');
	mkdirSync(captures, { recursive: true });
	sandboxSettings(dir);
	rmSync(PLUGIN, { recursive: true, force: true });
	cpSync(join(repo, 'plugins/pixel-perfect'), PLUGIN, { recursive: true });
	// Off camera first: clears the folder-trust prompt and any first-run notice.
	await launch(dir, null);
	await quit();
	await launch(dir, RAW);
	for (const command of commands) {
		console.log(`recording ${command}`);
		await run(dir, command, minutes);
	}
	await sleep(1500);
	await quit();
	if (!existsSync(RAW)) fail(`asciinema wrote no cast at ${RAW}`);
	writeFileSync(RUN, JSON.stringify({ commands, dir }, null, '\t') + '\n');
	console.log(`PASS record ${RAW} (${readFileSync(RAW).length} bytes)`);
}

// ---- cut --------------------------------------------------------------------------------------

function parse(path) {
	const [head, ...lines] = readFileSync(path, 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
	const header = JSON.parse(head);
	if (header.version !== 3) fail(`${path} is asciicast v${header.version}; this script reads v3`);
	let at = 0;
	const events = lines.map((l) => {
		const [interval, code, data] = JSON.parse(l);
		at += interval;
		return { at, code, data };
	});
	return { header, events };
}

// The dark code-panel colours from src/app.css, so the terminal matches the page's code panels.
function theme() {
	const css = readFileSync(join(site, 'src/app.css'), 'utf8');
	const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? fail(`src/app.css has no --${name} hex colour`);
	const [bg, fg, dim, rule, blue, yellow, green, pink] = ['code-bg', 'code-fg', 'code-comment', 'code-rule', 'code-key', 'code-value', 'code-success', 'code-focus'].map(token);
	const eight = [rule, pink, green, yellow, blue, pink, blue, fg];
	return { fg, bg, palette: [...eight, dim, ...eight.slice(1)].join(':') };
}

function cut() {
	const budgets = flag('--budgets', '').split(',').filter(Boolean).map(Number);
	const { commands } = JSON.parse(readFileSync(RUN, 'utf8'));
	const { header, events } = parse(RAW);

	// Where each command was typed and submitted, from the recorded keystrokes.
	const keys = events.filter((e) => e.code === 'i').flatMap((e) => [...e.data].map((ch) => ({ ch, at: e.at })));
	const typedText = keys.map((k) => k.ch).join('');
	let cursor = 0;
	const find = (text) => {
		const i = typedText.indexOf(text, cursor);
		if (i < 0) fail(`the raw cast has no keystrokes for ${JSON.stringify(text)}`);
		cursor = i + text.length;
		return keys[i].at;
	};
	const typed = commands.map((c) => ({ start: find(c), submit: find('\r') }));
	const end = find('/exit'); // everything from here on is the session closing: cut

	const output = events.filter((e) => e.code === 'o' && e.at < end);
	// The one redaction: the user name, same length, applied to the joined stream so a name split
	// across two events is still caught, then sliced back into the same events.
	const user = userInfo().username;
	const standIn = 'local-user'.padEnd(user.length, '0').slice(0, user.length);
	const joined = output.map((e) => e.data).join('');
	const redacted = joined.replaceAll(user, standIn);
	let offset = 0;
	for (const e of output) e.data = redacted.slice(offset, (offset += e.data.length));
	// Each output event gets a playback gap: recorded speed while typing, compressed while working.
	const segment = (at) => {
		let k = -1;
		while (k + 1 < typed.length && at >= typed[k + 1].start) k++;
		return { k, working: k >= 0 && at > typed[k].submit };
	};
	const gaps = output.map((e, i) => Math.min(e.at - (i ? output[i - 1].at : 0), IDLE_CAP));
	const realWork = typed.map(() => 0);
	output.forEach((e, i) => {
		const s = segment(e.at);
		if (s.working) realWork[s.k] += gaps[i];
	});
	const scale = realWork.map((real, k) => Math.max(1, real / (budgets[k] ?? 20)));
	const out = [];
	let clock = 0;
	let last = -Infinity;
	output.forEach((e, i) => {
		const s = segment(e.at);
		const first = i > 0 && s.k !== segment(output[i - 1].at).k; // the first keystroke of a command
		clock += first && s.k > 0 ? HOLD_BETWEEN : s.working ? gaps[i] / scale[s.k] : Math.min(gaps[i], 1);
		if (clock - last < FRAME && out.length) out.at(-1).data += e.data;
		else {
			out.push({ at: clock, data: e.data });
			last = clock;
		}
	});
	out.push({ at: clock + HOLD_END, data: '\u001b[?25l' }); // holds the last frame; hiding the cursor changes nothing else

	// The proof that nothing was dropped or rewritten.
	if (out.slice(0, -1).map((e) => e.data).join('') !== redacted) fail('the cut changed the terminal output');
	if (redacted.length !== joined.length) fail('the redaction changed the length of the output');

	const lines = [JSON.stringify({ version: 3, term: { cols: header.term.cols, rows: header.term.rows, theme: theme() }, timestamp: header.timestamp, title: 'pixel-perfect' })];
	out.forEach((e, i) => lines.push(JSON.stringify([Number((e.at - (i ? out[i - 1].at : 0)).toFixed(3)), 'o', e.data])));
	mkdirSync(join(site, 'static/demo'), { recursive: true });
	writeFileSync(CAST, lines.join('\n') + '\n');
	const plugin = JSON.parse(readFileSync(join(repo, 'plugins/pixel-perfect/.claude-plugin/plugin.json'), 'utf8'));
	const meta = {
		recorded: new Date(header.timestamp * 1000).toISOString(),
		version: plugin.version,
		commands,
		cols: header.term.cols,
		rows: header.term.rows,
		duration: Number(out.at(-1).at.toFixed(1)),
		realSeconds: Math.round(end - typed[0].start),
		bytes: readFileSync(CAST).length,
		redactions: joined.split(user).length - 1,
		rawSha256: createHash('sha256').update(readFileSync(RAW)).digest('hex')
	};
	writeFileSync(META, JSON.stringify(meta, null, '\t') + '\n');
	console.log(JSON.stringify({ ...meta, events: out.length, speedUp: scale.map((s) => Number(s.toFixed(1))) }, null, 2));
	console.log(`PASS cut ${CAST}`);
}

// ---- scrub ------------------------------------------------------------------------------------

function scrub() {
	const file = resolve(rest[0] ?? CAST);
	const raw = readFileSync(file, 'utf8');
	const printed = raw
		.split('\n')
		.slice(1)
		.filter(Boolean)
		.map((l) => JSON.parse(l)[2])
		.join('')
		.replace(/\u001b\][^\u0007\u001b]*(\u0007|\u001b\\)/g, '')
		.replace(/\u001b\[[0-9;?<>=]*[ -/]*[@-~]/g, '');
	const git = (key) => {
		try {
			return execFileSync('git', ['config', key], { encoding: 'utf8' }).trim();
		} catch {
			return '';
		}
	};
	const email = git('user.email');
	const names = [userInfo().username, hostname().split('.')[0], homedir(), email, email.split('@')[0], git('user.name')].filter((n) => n.length >= 4);
	const found = names.filter((n) => [raw, printed].some((text) => text.toLowerCase().includes(n.toLowerCase())));
	const keys = [/sk-ant-[\w-]{10,}/, /gh[pousr]_\w{20,}/, /AKIA[0-9A-Z]{16}/, /Bearer\s+[\w.-]{20,}/].filter((re) => re.test(raw) || re.test(printed));
	for (const n of found) console.error(`FAIL scrub: the cast contains "${n}"`);
	for (const re of keys) console.error(`FAIL scrub: the cast matches ${re}`);
	if (found.length || keys.length) process.exit(1);
	console.log(`PASS scrub ${file}`);
}

if (mode === 'record') await record();
else if (mode === 'cut') cut();
else if (mode === 'scrub') scrub();
else fail('usage: record-demo.mjs record|cut|scrub (see the header of this file)');
