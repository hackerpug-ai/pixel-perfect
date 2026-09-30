#!/usr/bin/env node
// Catalog capture (pixel-perfect sandbox-spec piece #8) for this Storybook.
//
// Reads the built Storybook's index.json, renders every story headlessly in Chrome in both
// themes, and writes one normalized DOM file per story and theme (the structural golden, with each
// element's resolved colours and type) plus
// a PNG (review only) to {out}/{layer}/{Name}/{state}.{html,png}.
//
//   node scripts/sandbox-capture.mjs [--width 1440] [--out dir]
//
// {out} defaults to $PIXEL_PERFECT_CAPTURE_OUT (set by verify-catalog.mjs). Run after
// `storybook build` (the npm script does both). A story that renders Storybook's error
// display fails the capture; it is never written as a golden.
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : fallback;
};
const width = Number(opt('width', '1440'));
const out = resolve(opt('out', process.env.PIXEL_PERFECT_CAPTURE_OUT || 'design/.captures/manual'));
const root = resolve('storybook-static');
if (!existsSync(join(root, 'index.json'))) {
	console.error('storybook-static/index.json not found — run `storybook build` first.');
	process.exit(2);
}

// Storybook title prefix → catalog layer (sandbox-spec layer names).
const LAYERS = { 'Design System': 'tokens', Components: 'atoms', Molecules: 'molecules', Organisms: 'organisms', Screens: 'screens' };
const THEMES = ['light', 'dark'];
const kebab = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Svelte hydration markers and scoped-style hashes vary between builds; nothing else should.
function normalize(html) {
	return html
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\s*\bsvelte-[a-z0-9]+\b/g, '')
		.replace(/\s+class=""/g, '')
		.replace(/>\s+</g, '><')
		.replace(/></g, '>\n<')
		.trim() + '\n';
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png' };
const server = createServer((req, res) => {
	const path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
	if (!path.startsWith(root) || !existsSync(path) || statSync(path).isDirectory()) {
		res.writeHead(404).end();
		return;
	}
	res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }).end(readFileSync(path));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const stories = Object.values(JSON.parse(readFileSync(join(root, 'index.json'), 'utf8')).entries).filter((e) => e.type === 'story');
const browser = await chromium.launch({ channel: 'chrome' });
let failed = 0;
// One job per story × theme; a small pool of pages renders them in parallel. Each job is
// independent (fresh navigation), so the output is identical to a sequential run.
const jobs = [];
for (const s of stories) {
	const [prefix, ...rest] = s.title.split('/');
	const layer = LAYERS[prefix];
	if (!layer) {
		console.error(`✗ ${s.id}: title prefix "${prefix}" is not a catalog layer`);
		failed++;
		continue;
	}
	const name = rest.join('/').replace(/\s+/g, '');
	for (const theme of THEMES) jobs.push({ s, layer, name, theme, state: theme === 'light' ? kebab(s.name) : `${kebab(s.name)}--dark` });
}

async function capture(page, { s, layer, name, theme, state }) {
	await page.goto(`${base}/iframe.html?id=${s.id}&viewMode=story&globals=theme:${theme}`, { waitUntil: 'load' });
	await page.waitForFunction(() => document.querySelector('#storybook-root')?.childElementCount > 0 || document.body.classList.contains('sb-show-errordisplay'));
	if (await page.evaluate(() => document.body.classList.contains('sb-show-errordisplay'))) {
		const msg = await page.textContent('#error-message').catch(() => '');
		console.error(`✗ ${s.id} [${theme}]: story failed to render — ${msg?.trim()}`);
		failed++;
		return;
	}
	await page.evaluate(() => document.fonts.ready);
	// Wait until the story has settled: no DOM mutations under the root for 150ms (max 3s), so a
	// late re-render (Storybook applying args, Svelte effects) is never half-captured.
	await page.evaluate(
		() =>
			new Promise((resolve) => {
				const root = document.querySelector('#storybook-root');
				let timer = setTimeout(done, 150);
				const cap = setTimeout(done, 3000);
				const obs = new MutationObserver(() => {
					clearTimeout(timer);
					timer = setTimeout(done, 150);
				});
				obs.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
				function done() {
					obs.disconnect();
					clearTimeout(timer);
					clearTimeout(cap);
					resolve();
				}
			})
	);
	// Images must be decoded before the screenshot and the DOM read (brand marks).
	await page.evaluate(() => Promise.all([...document.images].map((img) => (img.complete ? null : img.decode().catch(() => null)))));
	const applied = await page.evaluate(() => document.documentElement.dataset.theme);
	if (applied !== theme) throw new Error(`${s.id}: expected data-theme=${theme}, got ${applied}`);
	const dir = join(out, layer, name);
	mkdirSync(dir, { recursive: true });
	await page.screenshot({ path: join(dir, `${state}.png`), fullPage: true });
	// Resolved token values per element, so a token edit, the theme, and width-dependent
	// type all show up as drift (markup alone is identical across themes and widths).
	await page.evaluate(() => {
		for (const el of document.querySelectorAll('#storybook-root *')) {
			const c = getComputedStyle(el);
			const parts = [`color:${c.color}`, `bg:${c.backgroundColor}`];
			if (parseFloat(c.borderTopWidth) > 0) parts.push(`border:${c.borderTopWidth} ${c.borderTopColor}`);
			parts.push(`font:${c.fontWeight} ${c.fontStretch} ${c.fontSize}/${c.lineHeight} ${c.fontFamily.split(',')[0]}`);
			el.setAttribute('data-cs', parts.join(';'));
			// Canonical attribute order, so the order attributes happened to be set in never reads as drift.
			const attrs = [...el.attributes].map((at) => [at.name, at.value]).sort(([x], [y]) => (x < y ? -1 : 1));
			for (const [n] of attrs) el.removeAttribute(n);
			for (const [n, v] of attrs) el.setAttribute(n, v);
		}
	});
	writeFileSync(join(dir, `${state}.html`), normalize(await page.innerHTML('#storybook-root')));
}

const WORKERS = Number(process.env.CAPTURE_WORKERS || 6);
try {
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(WORKERS, jobs.length) }, async () => {
			const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
			while (next < jobs.length) await capture(page, jobs[next++]);
			await page.close();
		})
	);
} finally {
	await browser.close();
	server.close();
}
console.log(`${failed ? '✗' : '✓'} captured ${stories.length} stories × ${THEMES.length} themes at ${width}px → ${out}`);
process.exit(failed ? 1 : 0);
