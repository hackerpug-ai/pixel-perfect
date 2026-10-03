#!/usr/bin/env node
// Produce og.png from the prerendered SocialCard, copy the mark-B icons, and
// place both where `pnpm preview` actually reads (output/client).
//
//   node scripts/export-social-card.mjs
//   node scripts/export-social-card.mjs --check http://127.0.0.1:4177/pixel-perfect/
//
// The write mode screenshots the built card. --check only fetches the preview.
import { createServer } from 'node:http';
import { createReadStream, copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = resolve(siteDir, '..');
const basePath = '/pixel-perfect';
const clientDir = join(siteDir, '.svelte-kit/output/client');
const pagesDir = join(siteDir, '.svelte-kit/output/prerendered/pages');
const buildDir = join(siteDir, 'build');
const staticDir = join(siteDir, 'static');
const logoDir = join(repoDir, 'design/logo');

const ICONS = [
	['favicon-16.png', 'favicon-16.png'],
	['favicon-32.png', 'favicon-32.png'],
	['favicon-64.png', 'favicon-64.png'],
	['favicon-180.png', 'apple-touch-icon.png']
];

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2'
};

function fail(message) {
	console.error(`FAIL ${message}`);
	process.exit(1);
}

function inside(root, rel) {
	const full = resolve(root, rel);
	const limit = resolve(root);
	if (full !== limit && !full.startsWith(limit + sep)) return null;
	return full;
}

function isFile(path) {
	return !!path && existsSync(path) && statSync(path).isFile();
}

function send(res, path) {
	res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
	createReadStream(path).pipe(res);
}

// Same lookup preview uses: client files under paths.base, then prerendered pages.
function startBuildServer() {
	const server = createServer((req, res) => {
		let pathname = '/';
		try {
			pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
		} catch {
			res.writeHead(400).end();
			return;
		}
		if (pathname === basePath) {
			res.writeHead(307, { location: basePath + '/' }).end();
			return;
		}
		if (!pathname.startsWith(basePath + '/') && pathname !== basePath) {
			res.writeHead(404).end();
			return;
		}
		const rel = pathname.slice(basePath.length).replace(/^\/+/, '');
		const client = inside(clientDir, rel);
		if (isFile(client)) return send(res, client);
		const pages = [
			inside(pagesDir, rel),
			inside(pagesDir, `${rel}.html`),
			inside(pagesDir, join(rel, 'index.html')),
			rel === '' ? inside(pagesDir, 'index.html') : null
		];
		for (const page of pages) {
			if (isFile(page)) return send(res, page);
		}
		res.writeHead(404).end();
	});
	return new Promise((done) => {
		server.listen(0, '127.0.0.1', () => done(server));
	});
}

function pngSize(buf) {
	const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	if (buf.length < 24 || !buf.subarray(0, 8).equals(sig) || buf.subarray(12, 16).toString('ascii') !== 'IHDR') {
		throw new Error('not a PNG with an IHDR');
	}
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function copyPublicFiles() {
	for (const dir of [clientDir, buildDir]) {
		if (!existsSync(dir)) fail(`missing ${dir}; run pnpm build before export:social`);
	}
	mkdirSync(staticDir, { recursive: true });
	for (const [from, to] of ICONS) {
		const src = join(logoDir, from);
		if (!existsSync(src)) fail(`missing ${src}`);
		copyFileSync(src, join(staticDir, to));
	}
	const names = ['og.png', ...ICONS.map(([, to]) => to)];
	for (const dir of [clientDir, buildDir]) {
		for (const name of names) copyFileSync(join(staticDir, name), join(dir, name));
	}
}

async function writeCard() {
	const server = await startBuildServer();
	const origin = `http://127.0.0.1:${server.address().port}`;
	const browser = await chromium.launch({ channel: 'chrome' });
	try {
		const page = await browser.newPage({ viewport: { width: 1400, height: 800 }, deviceScaleFactor: 1 });
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		const response = await page.goto(`${origin}${basePath}/social-card`, { waitUntil: 'networkidle' });
		if (!response || response.status() !== 200) fail(`social-card page status ${response?.status()}`);
		await page.waitForFunction(() => document.documentElement.dataset.socialCardReady === 'true', null, { timeout: 15000 });
		await page.evaluate(() => document.fonts.ready);
		const card = page.locator('[data-theme="light"]');
		const box = await card.boundingBox();
		if (!box || Math.round(box.width) !== 1200 || Math.round(box.height) !== 630) {
			fail(`SocialCard box is ${box?.width}×${box?.height}, expected 1200×630`);
		}
		mkdirSync(staticDir, { recursive: true });
		const ogPath = join(staticDir, 'og.png');
		await card.screenshot({ path: ogPath, type: 'png', animations: 'disabled' });
		const size = pngSize(readFileSync(ogPath));
		if (size.width !== 1200 || size.height !== 630) fail(`og.png IHDR is ${size.width}×${size.height}`);
		if (errors.length) fail(`social-card page errors: ${errors.join('; ')}`);
		console.log(`wrote ${ogPath} IHDR ${size.width}×${size.height}`);
	} finally {
		await browser.close();
		await new Promise((done) => server.close(done));
	}
	copyPublicFiles();
	console.log('copied og.png and mark-B icons into static, .svelte-kit/output/client, and build');
}

function hasHost(value) {
	return /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//');
}

function attrs(tag) {
	const out = {};
	for (const match of tag.matchAll(/([^\s=/>]+)\s*=\s*"([^"]*)"/g)) out[match[1].toLowerCase()] = match[2];
	return out;
}

async function runCheck(pageUrl) {
	let page;
	try {
		page = new URL(pageUrl);
	} catch {
		fail(`page URL is not a URL: ${pageUrl}`);
	}
	if (!page.pathname.startsWith(`${basePath}/`)) fail(`page path ${page.pathname} does not start with ${basePath}/`);
	const response = await fetch(pageUrl);
	if (response.status !== 200) fail(`homepage HTTP ${response.status}`);
	const html = await response.text();
	const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attrs(match[0]));
	const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => attrs(match[0]));
	const meta = (key, attr) => metas.find((item) => item[attr] === key);
	const need = [
		['og:title', 'property'],
		['og:description', 'property'],
		['og:image', 'property'],
		['og:image:width', 'property'],
		['og:image:height', 'property'],
		['og:type', 'property'],
		['twitter:card', 'name'],
		['twitter:title', 'name'],
		['twitter:description', 'name'],
		['twitter:image', 'name']
	];
	let ok = true;
	const say = (pass, line) => {
		ok &&= pass;
		console.log(`${pass ? 'PASS' : 'FAIL'} ${line}`);
	};
	for (const [key, attr] of need) {
		const found = meta(key, attr);
		say(!!found?.content, `${key} ${found?.content ?? 'missing'}`);
	}
	say(meta('og:image:width', 'property')?.content === '1200', 'og:image:width is 1200');
	say(meta('og:image:height', 'property')?.content === '630', 'og:image:height is 630');
	say(meta('og:type', 'property')?.content === 'website', 'og:type is website');
	say(meta('twitter:card', 'name')?.content === 'summary_large_image', 'twitter:card is summary_large_image');
	const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
	say(title.length > 0 && meta('og:title', 'property')?.content === title, 'og:title matches the title element');
	const description = metas.find((item) => item.name === 'description')?.content ?? '';
	say(description.length > 0 && meta('og:description', 'property')?.content === description, 'og:description matches the description');

	const urls = [];
	for (const key of ['og:image', 'twitter:image']) {
		const value = key.startsWith('og:') ? meta(key, 'property')?.content : meta(key, 'name')?.content;
		if (value) urls.push([key, value]);
	}
	for (const link of links) {
		const rel = link.rel ?? '';
		if (rel.split(/\s+/).includes('icon') || rel === 'apple-touch-icon') urls.push([`link ${rel}`, link.href ?? '']);
	}
	say(urls.some(([, value]) => value.endsWith('/favicon-32.png') || value.endsWith('favicon-32.png')), 'favicon-32 link present');
	say(urls.some(([, value]) => value.endsWith('/apple-touch-icon.png') || value.endsWith('apple-touch-icon.png')), 'apple-touch-icon link present');

	const fetched = new Map();
	for (const [label, value] of urls) {
		const hosted = hasHost(value) || /localhost|127\.0\.0\.1/i.test(value);
		let resolved = '';
		try {
			resolved = new URL(value, pageUrl).pathname;
		} catch {
			resolved = '';
		}
		const pathOk = !hosted && resolved.startsWith(`${basePath}/`);
		say(pathOk, `${label} ${value || 'missing'} -> ${resolved || 'unresolved'}`);
		if (!pathOk) continue;
		const absolute = new URL(resolved, pageUrl);
		if (!fetched.has(absolute.href)) {
			const asset = await fetch(absolute);
			const bytes = Buffer.from(await asset.arrayBuffer());
			fetched.set(absolute.href, { status: asset.status, bytes });
		}
	}

	async function asset(name) {
		const hit = [...fetched.entries()].find(([href]) => href.endsWith(`/${name}`));
		return hit ? hit[1] : null;
	}

	const og = await asset('og.png');
	if (!og || og.status !== 200) say(false, `og.png HTTP ${og?.status ?? 'missing'}`);
	else {
		try {
			const size = pngSize(og.bytes);
			say(size.width === 1200 && size.height === 630, `og.png HTTP 200 IHDR ${size.width}×${size.height}`);
		} catch (error) {
			say(false, `og.png ${error.message}`);
		}
	}
	for (const [file, source] of [
		['favicon-32.png', 'favicon-32.png'],
		['apple-touch-icon.png', 'favicon-180.png']
	]) {
		const got = await asset(file);
		const expected = readFileSync(join(logoDir, source));
		const match = !!got && got.status === 200 && got.bytes.equals(expected);
		say(match, `${file} HTTP ${got?.status ?? 'missing'} bytes ${match ? 'match' : 'differ from'} design/logo/${source}`);
	}
	if (!ok) process.exit(1);
}

const args = process.argv.slice(2);
if (args.includes('--check')) {
	const pageUrl = args[args.indexOf('--check') + 1];
	if (!pageUrl || pageUrl.startsWith('--')) fail('--check requires the preview page URL');
	await runCheck(pageUrl);
} else {
	await writeCard();
}
