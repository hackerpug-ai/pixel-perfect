#!/usr/bin/env node
// Drive the built landing preview in Chrome and check the evolve thread's recorded counts and the
// looping terminal demo (DemoStats). Serve the build on the address you pass:
//
//   pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 4177
//   node scripts/verify-demo.mjs http://127.0.0.1:4177/pixel-perfect/
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evolveDir = resolve(siteDir, 'design/evolve-run');
const demo = JSON.parse(readFileSync(resolve(siteDir, 'src/lib/demo.json'), 'utf8'));

function fail(message) {
	console.error(`FAIL ${message}`);
	process.exit(1);
}

const pageUrl = process.argv[2];
if (!pageUrl) fail('missing page URL');
let parsed;
try {
	parsed = new URL(pageUrl);
} catch {
	fail(`page URL is not a URL: ${pageUrl}`);
}
if (!parsed.pathname.startsWith('/pixel-perfect/')) {
	fail(`page path ${parsed.pathname} does not start with /pixel-perfect/`);
}

function readJson(name) {
	return JSON.parse(readFileSync(resolve(evolveDir, name), 'utf8'));
}

function entityKeys(inventory) {
	const found = new Set();
	for (const key of ['screens', 'organisms', 'molecules', 'atoms']) {
		for (const item of inventory[key] || []) found.add(`${key}/${item.name}`);
	}
	return found;
}

function entityNames(inventory) {
	const found = new Set();
	for (const key of ['screens', 'organisms', 'molecules', 'atoms']) {
		for (const item of inventory[key] || []) found.add(item.name);
	}
	return found;
}

const before = readJson('inventory-before.json');
const after = readJson('inventory-after.json');
const counts = readJson('counts.json');
const transcript = readFileSync(resolve(evolveDir, 'transcript.md'), 'utf8');
const resultPath = readFileSync(resolve(evolveDir, 'result-path.txt'), 'utf8').trim();
const recapture = readFileSync(resolve(evolveDir, 'recapture.txt'), 'utf8');

const beforeKeys = entityKeys(before);
const afterKeys = entityKeys(after);
const added = [...afterKeys].filter((key) => !beforeKeys.has(key));
const known = entityNames(before);
let reuse = 0;
for (const screen of after.screens || []) {
	if (beforeKeys.has(`screens/${screen.name}`)) continue;
	for (const composed of screen.composes || []) {
		if (known.has(composed)) reuse += 1;
	}
}
const changedLine = recapture.match(/pre-existing golden HTML files changed:\s*(\d+)\s+of\s+(\d+)/);
if (!changedLine) fail('recapture note has no pre-existing golden count');
const capturedMoved = Number(changedLine[1]);

function transcriptCount(label) {
	const match = transcript.match(new RegExp(`^${label}:\\s*(\\d+)\\s*$`, 'm'));
	if (!match) fail(`transcript has no ${label} line`);
	return Number(match[1]);
}

const fromTranscript = {
	reuse: transcriptCount('reuse'),
	new: transcriptCount('new'),
	capturedMoved: transcriptCount('capturedMoved')
};
const measured = { reuse, new: added.length, capturedMoved };

function sameCounts(left, right) {
	return left.reuse === right.reuse && left.new === right.new && left.capturedMoved === right.capturedMoved;
}

if (!sameCounts(counts, measured)) {
	fail(`counts.json ${JSON.stringify(counts)} disagrees with the inventory difference ${JSON.stringify(measured)}`);
}
if (!sameCounts(counts, fromTranscript)) {
	fail(`counts.json ${JSON.stringify(counts)} disagrees with the transcript ${JSON.stringify(fromTranscript)}`);
}
console.log(
	`PASS counts reuse=${counts.reuse} new=${counts.new} capturedMoved=${counts.capturedMoved} added=${added.join(',') || '(none)'}`
);

const basePath = parsed.pathname.replace(/\/$/, '');
const routeUrl = new URL(`${basePath}${resultPath.startsWith('/') ? resultPath : `/${resultPath}`}`, parsed.origin);
const routeResponse = await fetch(routeUrl, { redirect: 'manual' });
console.log(`PASS result-route HTTP ${routeResponse.status} ${routeUrl.pathname}`);
if (routeResponse.status !== 200) fail(`result route ${routeUrl.href} returned HTTP ${routeResponse.status}`);

const browser = await chromium.launch({ channel: 'chrome' });

// One page on the landing, loaded and still at the top. `requests` is every URL it has asked for.
async function open(reducedMotion) {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion });
	const page = await context.newPage();
	const requests = [];
	page.on('request', (request) => requests.push(request.url()));
	await page.goto(pageUrl, { waitUntil: 'networkidle' });
	const figure = page.locator('figure[data-demo-state]');
	const state = () => figure.getAttribute('data-demo-state');
	const until = (want) =>
		page
			.waitForFunction((w) => document.querySelector('figure[data-demo-state]')?.getAttribute('data-demo-state') === w, want, { timeout: 15000 })
			.catch(async () => fail(`the demo is ${await state()}, expected ${want}`));
	// What the terminal shows now, and whether that changes within `ms`.
	const screen = () => figure.locator('[aria-hidden="true"]').first().evaluate((node) => node.textContent);
	const moving = async (ms) => {
		const first = await screen();
		for (let waited = 0; waited < ms; waited += 250) {
			await page.waitForTimeout(250);
			if ((await screen()) !== first) return true;
		}
		return false;
	};
	return { context, page, requests, figure, state, until, moving };
}

const isRecording = (url) => url.includes('/demo/demo.cast');
const isPlayer = (url) => /asciinema-player[^/]*\.css/.test(url); // the player's stylesheet arrives with its code

try {
	// The page's own text: the evolve thread prints the recorded counts and no placeholder is left.
	const d = await open('no-preference');
	const text = await d.page.locator('body').innerText();
	if (text.includes('[n]')) fail('the rendered page contains [n]');
	for (const line of [`reuse ${counts.reuse}`, `new ${counts.new}`, `${counts.capturedMoved} captured components moved`]) {
		if (!text.includes(line)) fail(`the page does not show "${line}"`);
	}
	console.log('PASS counts-shown, no [n]');

	// lazy: a page load fetches neither the recording nor the player.
	if ((await d.state()) !== 'idle') fail(`lazy: the demo is ${await d.state()} before any scrolling`);
	if (d.requests.some(isRecording)) fail('lazy: the recording was requested on page load');
	if (d.requests.some(isPlayer)) fail('lazy: the player was requested on page load');
	console.log(`PASS lazy idle after load, ${d.requests.length} requests, none for the recording or the player`);

	// autoplay: scrolled into view it starts by itself, and that is when the player and the recording arrive.
	const scrollIn = () => d.figure.scrollIntoViewIfNeeded();
	const scrollOut = () => d.page.evaluate(() => window.scrollTo(0, 0));
	await scrollIn();
	await d.until('playing');
	const began = Date.now();
	// The player asks for the recording a moment after it mounts.
	for (let waited = 0; waited < 5000 && !d.requests.some(isRecording); waited += 100) await d.page.waitForTimeout(100);
	if (!d.requests.some(isRecording)) fail('autoplay: the recording was never requested');
	if (!d.requests.some(isPlayer)) fail('autoplay: the player was never requested');
	if (!(await d.moving(4000))) fail('autoplay: the terminal text did not change');
	console.log('PASS autoplay playing after scroll; the player and the recording arrived then');

	// loop: nothing has paused it yet, so one full recording later it is on its second pass. The recording
	// ends on a 4 s still frame, so without the loop the text would have stopped for good.
	await d.page.waitForTimeout(Math.max(0, demo.duration * 1000 + 3000 - (Date.now() - began)));
	if ((await d.state()) !== 'playing') fail(`loop: the demo is ${await d.state()} after one full recording`);
	if (!(await d.moving(6000))) fail('loop: the terminal text stopped after one pass');
	console.log(`PASS loop still moving ${Math.round((Date.now() - began) / 1000)} s after the start of a ${demo.duration} s recording`);

	// scroll: out of view it pauses, back in view it resumes.
	await scrollOut();
	await d.until('paused');
	await scrollIn();
	await d.until('playing');
	if (!(await d.moving(6000))) fail('scroll: the terminal text did not move after scrolling back');
	console.log('PASS scroll paused out of view, resumed in view');

	// pause, by pointer and by keyboard: the text stops, then moves again. No still stretch in the
	// recording is longer than 4 s, so 5 s without a change is a real pause.
	const press = async (name, mode) => {
		const button = d.figure.getByRole('button', { name, exact: true });
		if (mode === 'pointer') await button.click();
		else {
			await button.focus();
			await d.page.keyboard.press('Enter');
		}
	};
	for (const mode of ['pointer', 'keyboard']) {
		await press('Pause', mode);
		await d.until('paused');
		if (await d.moving(5000)) fail(`pause-${mode}: the terminal text changed while paused`);
		await press('Play', mode);
		await d.until('playing');
		if (!(await d.moving(6000))) fail(`pause-${mode}: the terminal text did not move after Play`);
		console.log(`PASS pause-${mode} stopped, then resumed`);
	}

	// held: a pause the visitor asked for survives scrolling away and back.
	await press('Pause', 'pointer');
	await d.until('paused');
	await scrollOut();
	await d.page.waitForTimeout(500);
	await scrollIn();
	await d.page.waitForTimeout(1500);
	if ((await d.state()) !== 'paused') fail(`held: the demo is ${await d.state()} after scrolling away and back; the visitor had paused it`);
	console.log('PASS held stays paused across a scroll away and back');

	// off-screen play: with under half the frame in view, Play still plays, and scrolling it fully away stops it.
	await d.page.evaluate(() => {
		const box = document.querySelector('figure[data-demo-state] > div').getBoundingClientRect();
		window.scrollBy(0, box.top + box.height * 0.7); // the bottom 30% of the frame, and the button under it
	});
	await d.page.waitForTimeout(500);
	await press('Play', 'keyboard');
	await d.until('playing');
	await scrollOut();
	await d.until('paused');
	await scrollIn();
	await d.until('playing');
	console.log('PASS off-screen play stops once the frame is gone, resumes on return');

	// focus: the terminal is display only, so Tab must never land inside it (the player's own markup is focusable).
	await d.figure.getByRole('button', { name: 'Pause', exact: true }).focus();
	await d.page.keyboard.press('Shift+Tab');
	if (await d.page.evaluate(() => !!document.activeElement.closest('figure[data-demo-state] [aria-hidden="true"]'))) fail('focus: Shift+Tab from Pause landed inside the hidden terminal');
	console.log('PASS focus stays out of the terminal');
	await d.context.close();

	// reduced motion: nothing starts or loads until Play is pressed, and the keyboard keeps its place.
	const r = await open('reduce');
	await r.figure.scrollIntoViewIfNeeded();
	await r.page.waitForTimeout(2000);
	if ((await r.state()) !== 'idle') fail(`reduced-motion: the demo is ${await r.state()} without a press`);
	if (r.requests.some(isRecording) || r.requests.some(isPlayer)) fail('reduced-motion: the recording or the player was requested without a press');
	await r.figure.getByRole('button', { name: 'Play the demo' }).focus();
	await r.page.keyboard.press('Enter');
	await r.until('playing');
	if (!(await r.moving(4000))) fail('reduced-motion: the terminal text did not change after Play');
	const focused = await r.page.evaluate(() => document.activeElement?.textContent?.trim());
	if (focused !== 'Pause') fail(`reduced-motion: after Play, focus is on "${focused}", expected the Pause button`);
	console.log('PASS reduced-motion idle until Play, then playing with focus on Pause');
	await r.context.close();
} finally {
	await browser.close();
}
