#!/usr/bin/env node
// Drive the built landing preview in Chrome and check the recorded evolve demo.
//
//   node scripts/verify-demo.mjs http://127.0.0.1:4177/pixel-perfect/
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evolveDir = resolve(siteDir, 'design/evolve-run');

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

async function playback(mode) {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	await page.goto(pageUrl, { waitUntil: 'networkidle' });
	const bodyText = await page.locator('body').innerText();
	if (bodyText.includes('[n]')) fail(`rendered page contains [n] during ${mode}`);
	const shown = [
		`reuse ${counts.reuse}`,
		`new ${counts.new}`,
		`${counts.capturedMoved} captured components moved`
	];
	for (const line of shown) {
		if (!bodyText.includes(line)) fail(`${mode} page does not show ${line}`);
	}
	const button = page.getByRole('button', { name: 'Play the demo' });
	if (mode === 'pointer') await button.click();
	else {
		await button.focus();
		await page.keyboard.press('Enter');
	}
	const video = page.locator('video');
	await video.evaluate(
		(node) =>
			new Promise((resolve, reject) => {
				// A just-started video can still report currentTime 0 after `playing` has fired.
				// Waiting for that event then misses it. A later sample still has to move forward.
				if (!node.paused) {
					resolve(true);
					return;
				}
				const done = () => resolve(true);
				node.addEventListener('playing', done, { once: true });
				setTimeout(() => reject(new Error('video did not start playing')), 5000);
			})
	);
	const first = await video.evaluate((node) => node.currentTime);
	await page.waitForTimeout(500);
	const second = await video.evaluate((node) => node.currentTime);
	const cue = await video.evaluate(
		(node) =>
			new Promise((resolve) => {
				const track = node.textTracks && node.textTracks[0];
				if (!track) {
					resolve('');
					return;
				}
				track.mode = 'showing';
				const text = () =>
					track.cues ? Array.from(track.cues).map((item) => item.text).join('\n') : '';
				if (text()) {
					resolve(text());
					return;
				}
				const element = node.querySelector('track');
				const finish = () => resolve(text());
				element?.addEventListener('load', finish, { once: true });
				setTimeout(finish, 2000);
			})
	);
	console.log(`PASS playback-${mode} currentTime ${first} -> ${second}`);
	console.log(`PASS caption-${mode} cue: ${JSON.stringify(cue)}`);
	if (!(second > first)) fail(`${mode} currentTime did not advance (${first} -> ${second})`);
	if (!cue.includes('reuse:') || !cue.includes(String(counts.reuse))) {
		fail(`${mode} caption cue does not include the recorded reuse count`);
	}
	await context.close();
}

try {
	await playback('pointer');
	await playback('keyboard');
	const home = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await home.newPage();
	await page.goto(pageUrl, { waitUntil: 'networkidle' });
	const text = await page.locator('body').innerText();
	if (text.includes('[n]')) fail('rendered page contains [n]');
	console.log('PASS no [n]');
	await home.close();
} finally {
	await browser.close();
}
