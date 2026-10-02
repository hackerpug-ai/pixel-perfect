#!/usr/bin/env node
// Drive the built landing preview in Chrome. The page URL is required.
//
//   node scripts/verify-landing.mjs http://127.0.0.1:4177/pixel-perfect/
//   node scripts/verify-landing.mjs --only install-deeplink http://127.0.0.1:4177/pixel-perfect/
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = resolve(siteDir, '..');
const args = process.argv.slice(2);
let only = null;
const positional = [];
for (let i = 0; i < args.length; i++) {
	if (args[i] === '--only') {
		only = args[++i];
		continue;
	}
	positional.push(args[i]);
}

function fail(message) {
	console.error(`FAIL ${message}`);
	process.exit(1);
}

const pageUrl = positional[0];
if (!pageUrl) fail('missing page URL');
let parsed;
try {
	parsed = new URL(pageUrl);
} catch {
	fail(`page URL is not a URL: ${pageUrl}`);
}
if (!parsed.pathname.startsWith('/pixel-perfect/')) fail(`page path ${parsed.pathname} does not start with /pixel-perfect/`);
if (parsed.hash) fail('pass the page URL without a hash; the cases set their own');

const results = [];
function report(name, ok, detail) {
	results.push({ name, ok });
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
}

function withHash(hash) {
	const url = new URL(pageUrl);
	url.hash = hash;
	return url.href;
}

const AGENTS = [
	{ id: 'opencode', hash: 'install-opencode', name: 'OpenCode' },
	{ id: 'claude', hash: 'install-claude', name: 'Claude Code' }
];

async function geometry(page, id) {
	return page.evaluate((agentId) => {
		const header = document.querySelector('header.sticky');
		const panel = document.getElementById(`install-${agentId}`);
		const command = panel?.querySelector('.rounded-md');
		const tab = document.getElementById(`tab-${agentId}`);
		if (!header || !command || !tab) return null;
		return {
			headerBottom: header.getBoundingClientRect().bottom,
			commandTop: command.getBoundingClientRect().top,
			selected: tab.getAttribute('aria-selected') === 'true',
			scrollY: window.scrollY
		};
	}, id);
}

async function installDeeplink(browser) {
	const runs = [];
	let ok = true;
	for (const width of [1440, 390]) {
		for (const agent of AGENTS) {
			for (const mode of ['fresh', 'hashchange']) {
				const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
				const page = await context.newPage();
				try {
					if (mode === 'fresh') {
						await page.goto(withHash(agent.hash), { waitUntil: 'networkidle' });
					} else {
						const other = agent.id === 'opencode' ? 'install-claude' : 'install-opencode';
						await page.goto(withHash(other), { waitUntil: 'networkidle' });
						await page.evaluate((hash) => {
							location.hash = hash;
						}, `#${agent.hash}`);
					}
					await page.waitForFunction((id) => document.getElementById(`tab-${id}`)?.getAttribute('aria-selected') === 'true', agent.id);
					await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
					const measured = await geometry(page, agent.id);
					const pass = !!measured && measured.selected && measured.commandTop >= measured.headerBottom;
					ok &&= pass;
					runs.push({ width, agent: agent.id, name: agent.name, mode, ...measured, pass });
				} finally {
					await context.close();
				}
			}
		}
	}
	const dir = join(siteDir, 'design/evidence/landing-remediation/f-003');
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'geometry.json'), JSON.stringify({ pageUrl, runs }, null, 2) + '\n');
	const detail = runs
		.map((run) => `${run.width} ${run.agent} ${run.mode} headerBottom=${run.headerBottom} commandTop=${run.commandTop} ${run.pass ? 'pass' : 'fail'}`)
		.join(' | ');
	report('install-deeplink', ok, detail);
}

async function clipboard(browser) {
	const granted = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		permissions: ['clipboard-read', 'clipboard-write']
	});
	const grantPage = await granted.newPage();
	let grantOk = false;
	let read = '';
	let expected = '';
	try {
		await grantPage.goto(pageUrl, { waitUntil: 'networkidle' });
		const row = grantPage.locator('#install-claude .rounded-md').first();
		expected = ((await row.locator('code').first().textContent()) ?? '').trim();
		await row.getByRole('button', { name: 'Copy' }).click();
		await grantPage.waitForFunction(() => (document.querySelector('#install-claude [aria-live]')?.textContent ?? '').trim().length > 0);
		read = (await grantPage.evaluate(() => navigator.clipboard.readText())).trim();
		grantOk = read === expected && expected.length > 0;
	} finally {
		await granted.close();
	}

	const denied = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const denyPage = await denied.newPage();
	let selection = '';
	let announced = '';
	let label = '';
	try {
		// Permissions-Policy makes the real writeText throw. During the click, Chrome's
		// execCommand('copy') still returns true and the control would say the text was
		// copied. That command returns false once transient activation expires, so this
		// deny waits the activation out and then calls the real writeText.
		await denyPage.addInitScript(() => {
			const writeText = navigator.clipboard.writeText.bind(navigator.clipboard);
			navigator.clipboard.writeText = async (text) => {
				await new Promise((resolve) => setTimeout(resolve, 5500));
				return writeText(text);
			};
		});
		await denyPage.route('**/*', async (route) => {
			const response = await route.fetch();
			const headers = { ...response.headers(), 'permissions-policy': 'clipboard-write=(), clipboard-read=()' };
			await route.fulfill({ status: response.status(), headers, body: await response.body() });
		});
		await denyPage.goto(pageUrl, { waitUntil: 'networkidle' });
		await denyPage.locator('#install-claude .rounded-md').first().getByRole('button', { name: 'Copy' }).click();
		await denyPage.waitForFunction(
			() => (document.querySelector('#install-claude [aria-live]')?.textContent ?? '').trim().length > 0,
			null,
			{ timeout: 15000 }
		);
		selection = (await denyPage.evaluate(() => getSelection()?.toString() ?? '')).trim();
		announced = (await denyPage.locator('#install-claude [aria-live]').first().innerText()).trim();
		label = (await denyPage.locator('#install-claude button').first().innerText()).trim();
	} finally {
		await denied.close();
	}
	const denyOk =
		selection === expected &&
		label === 'Selected' &&
		announced === 'Command selected. Press Command-C or Control-C to copy.';
	report(
		'clipboard',
		grantOk && denyOk,
		`grant read=${JSON.stringify(read)} expected=${JSON.stringify(expected)} denySelection=${JSON.stringify(selection)} label=${JSON.stringify(label)} announce=${JSON.stringify(announced)}`
	);
}

async function tabsHashPersistence(browser) {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	try {
		await page.goto(pageUrl, { waitUntil: 'networkidle' });
		await page.getByRole('tab', { name: 'Grok' }).click();
		await page.waitForFunction(() => location.hash === '#install-grok');
		const stored = await page.evaluate(() => localStorage.getItem('pixel-perfect:install-tab'));
		await page.reload({ waitUntil: 'networkidle' });
		await page.waitForFunction(() => document.getElementById('tab-grok')?.getAttribute('aria-selected') === 'true');
		await page.goto(pageUrl, { waitUntil: 'networkidle' });
		await page.waitForFunction(() => document.getElementById('tab-grok')?.getAttribute('aria-selected') === 'true');
		await page.evaluate(() => {
			location.hash = '#install-not-an-agent';
		});
		await page.waitForTimeout(200);
		const selected = await page.locator('[role="tab"][aria-selected="true"]').evaluateAll((tabs) => tabs.map((tab) => tab.id));
		const known = ['tab-claude', 'tab-codex', 'tab-cursor', 'tab-grok', 'tab-opencode', 'tab-pi'];
		const ok = stored === 'grok' && errors.length === 0 && selected.length === 1 && known.includes(selected[0]);
		report('tabs-hash-persistence', ok, `stored=${stored} selected=${selected.join(',') || 'none'} errors=${errors.length}`);
	} finally {
		await context.close();
	}
}

async function slider(browser) {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	try {
		await page.goto(pageUrl, { waitUntil: 'networkidle' });
		const input = page.locator('input[type="range"]').first();
		await input.focus();
		await page.keyboard.press('End');
		const atEnd = await input.inputValue();
		await page.keyboard.press('Home');
		const atHome = await input.inputValue();
		report('slider', atEnd === '100' && atHome === '0', `end=${atEnd} home=${atHome}`);
	} finally {
		await context.close();
	}
}

async function faq(browser) {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	try {
		await page.goto(pageUrl, { waitUntil: 'networkidle' });
		const item = page.locator('details').first();
		const summary = item.locator('summary');
		await summary.click();
		const opened = await item.evaluate((el) => el.open);
		const visible = await item.locator('p').isVisible();
		await summary.click();
		const closed = await item.evaluate((el) => !el.open);
		const hidden = !(await item.locator('p').isVisible());
		report('faq', opened && visible && closed && hidden, `opened=${opened} visible=${visible} closed=${closed} hidden=${hidden}`);
	} finally {
		await context.close();
	}
}

async function samplePlate(page) {
	return page.locator('[class*="animate-plate"]').first().evaluate((el) => {
		const style = getComputedStyle(el);
		return { transform: style.transform, opacity: style.opacity, animationName: style.animationName };
	});
}

async function motionNormal(browser) {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		reducedMotion: 'no-preference'
	});
	const page = await context.newPage();
	try {
		await page.goto(pageUrl, { waitUntil: 'commit' });
		await page.waitForSelector('[class*="animate-plate"]');
		const first = await samplePlate(page);
		await page.waitForTimeout(700);
		const second = await samplePlate(page);
		const differs = first.transform !== second.transform || first.opacity !== second.opacity;
		report('motion-normal', differs, `t0=${first.animationName} ${first.opacity} ${first.transform} t1=${second.animationName} ${second.opacity} ${second.transform}`);
	} finally {
		await context.close();
	}
}

async function motionReduced(browser) {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		reducedMotion: 'reduce'
	});
	const page = await context.newPage();
	try {
		await page.goto(pageUrl, { waitUntil: 'networkidle' });
		const plate = await samplePlate(page);
		const ink = await page.locator('h1').first().evaluate((el) => getComputedStyle(el).opacity);
		const part = await page.locator('[aria-label="A new Changelog page, assembled from existing parts"] > div').first().evaluate((el) => {
			const style = getComputedStyle(el);
			return { transform: style.transform, opacity: style.opacity };
		});
		const assembled = (part.transform === 'none' || part.transform === 'matrix(1, 0, 0, 1, 0, 0)') && Number(part.opacity) === 1;
		const rest = plate.animationName === 'none' && plate.opacity === '0' && Number(ink) === 1;
		report('motion-reduced', rest && assembled, `plate=${plate.animationName} ${plate.opacity} ink=${ink} part=${part.transform} ${part.opacity}`);
	} finally {
		await context.close();
	}
}

function conceptRadius() {
	const html = readFileSync(join(repoDir, 'design/pixel-perfect Landing.dc.html'), 'utf8');
	const frames = readdirSync(join(siteDir, 'design/reference/pixel-perfect-landing-dc')).filter((name) => name.endsWith('.png'));
	if (frames.length === 0) throw new Error('concept frames missing');
	const at = html.indexOf('Install pixel-perfect: fetch and follow');
	if (at < 0) throw new Error('concept install command missing');
	const before = html.slice(Math.max(0, at - 800), at);
	const radii = [...before.matchAll(/border-radius:\s*(\d+)px/g)];
	const nearest = radii.at(-1);
	if (!nearest) throw new Error('concept command radius missing');
	return { px: nearest[1], frames: frames.length };
}

async function fidelityRadius(browser) {
	const concept = conceptRadius();
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	try {
		await page.goto(pageUrl, { waitUntil: 'networkidle' });
		const live = await page.locator('.rounded-md').filter({ hasText: 'Install pixel-perfect' }).first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
		const livePx = live.endsWith('px') ? String(Math.round(parseFloat(live))) : live;
		const ok = livePx === concept.px;
		report('fidelity-radius', ok, `computed=${live} concept=${concept.px}px frames=${concept.frames}`);
	} finally {
		await context.close();
	}
}

const cases = {
	'install-deeplink': installDeeplink,
	clipboard,
	'tabs-hash-persistence': tabsHashPersistence,
	slider,
	faq,
	'motion-normal': motionNormal,
	'motion-reduced': motionReduced,
	'fidelity-radius': fidelityRadius
};

if (only && !cases[only]) fail(`unknown case ${only}`);
const selected = only ? [only] : Object.keys(cases);
const browser = await chromium.launch({ channel: 'chrome' });
try {
	for (const name of selected) {
		try {
			await cases[name](browser);
		} catch (error) {
			report(name, false, error instanceof Error ? error.stack ?? error.message : String(error));
		}
	}
} finally {
	await browser.close();
}
if (results.length !== selected.length || results.some((result) => !result.ok)) process.exit(1);
