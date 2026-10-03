import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = process.env.README_TEST_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = ["README.md", "INSTALL.md", "CONTRIBUTING.md"];
const abs = (name) => path.join(ROOT, name);
const read = (name) => (fs.existsSync(abs(name)) ? fs.readFileSync(abs(name), "utf8") : null);
const stripFences = (text) => text.replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm, "");
const stripCode = (text) => stripFences(text).replace(/`[^`\n]*`/g, "");
const json = (name) => JSON.parse(fs.readFileSync(abs(name), "utf8"));

function slug(heading) {
  return heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

function anchors(text) {
  const body = stripFences(text);
  const found = new Set();
  const seen = new Map();
  for (const m of body.matchAll(/^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)) {
    const base = slug(m[1]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    found.add(n ? `${base}-${n}` : base);
  }
  for (const m of body.matchAll(/<[a-z][^>]*\s(?:name|id)=["']([^"']+)["']/gi)) found.add(m[1]);
  return found;
}

function targets(text) {
  const body = stripCode(text);
  const out = [];
  for (const m of body.matchAll(/\]\(\s*<?((?:[^()\s>]|\([^()\s]*\))+)>?(?:\s+"[^"]*")?\s*\)/g)) out.push(m[1]);
  for (const m of body.matchAll(/^\[[^\]]+\]:\s*<?(\S+?)>?\s*$/gm)) out.push(m[1]);
  for (const m of body.matchAll(/\b(?:src|href)=["']([^"']*)["']/g)) out.push(m[1]);
  return out.filter((t) => t && !/^(https?:\/\/|mailto:)/.test(t));
}

test("README.md, INSTALL.md and CONTRIBUTING.md exist at the repo root", () => {
  const missing = DOCS.filter((d) => !fs.existsSync(abs(d)));
  assert.deepEqual(missing, [], `missing root docs: ${missing.join(", ")}`);
});

for (const doc of DOCS) {
  test(`${doc}: relative links, images and anchors resolve`, () => {
    const text = read(doc);
    assert.notEqual(text, null, `${doc} does not exist`);
    const bad = [];
    for (const target of targets(text)) {
      const [rawPath, ...frag] = target.split("#");
      const fragment = frag.length ? decodeURIComponent(frag.join("#")) : null;
      if (rawPath === "") {
        if (fragment && !anchors(text).has(fragment)) bad.push(`${target} (no such anchor in ${doc})`);
        continue;
      }
      const rel = decodeURIComponent(rawPath).replace(/^\//, "");
      if (!fs.existsSync(abs(rel))) {
        bad.push(`${target} (no file ${rel})`);
        continue;
      }
      if (fragment && DOCS.includes(rel)) {
        const other = read(rel);
        if (!anchors(other).has(fragment)) bad.push(`${target} (no such anchor in ${rel})`);
      }
    }
    assert.deepEqual(bad, [], `${doc} has broken targets:\n  ${bad.join("\n  ")}`);
  });
}

test("README.md and INSTALL.md hard-code no release tag", () => {
  const hits = [];
  for (const doc of ["README.md", "INSTALL.md"]) {
    const text = read(doc);
    if (text === null) continue; // absence is reported by the "exist" test
    for (const m of text.matchAll(/\bv\d+\.\d+\.\d+\b/g)) hits.push(`${doc}: ${m[0]}`);
  }
  assert.deepEqual(hits, [], `hard-coded release tags (look up the newest tag at install time instead):\n  ${hits.join("\n  ")}`);
});

test("README.md run numbers match site/src/lib/run.json", () => {
  const { numbers: n } = json("site/src/lib/run.json");
  const text = read("README.md");
  assert.notEqual(text, null, "README.md does not exist");
  const want = ["tokens", "minutes", "frames", "gates", "components"];
  const expected = [`${(n.tokens / 1e6).toFixed(1)}M`, ...want.slice(1).map((k) => String(n[k]))];
  const lines = stripFences(text).split("\n");
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.replace(/[*_]/g, "").trim());
  const head = ["tokens", "minutes", "frames", "gates", "components"];
  const i = lines.findIndex((l) => l.includes("|") && JSON.stringify(cells(l).map((c) => c.toLowerCase())) === JSON.stringify(head));
  assert.ok(i >= 0, "README.md has no table with header cells Tokens | Minutes | Frames | Gates | Components");
  const row = cells(lines[i + 2] ?? "");
  assert.deepEqual(row, expected, `README.md run table first row ${JSON.stringify(row)} should be ${JSON.stringify(expected)} (from run.json)`);
  const cached = `${(n.cachedTokens / 1e6).toFixed(1)}M`;
  const whole = new RegExp(`(^|[^\\d.])${cached.replace(".", "\\.")}(?![\\d.]*\\d)`);
  assert.ok(whole.test(stripFences(text)), `README.md does not mention the cached-token figure ${cached}`);
});

test("README.md lists exactly the shipped /pixel-perfect: commands", () => {
  const text = read("README.md");
  assert.notEqual(text, null, "README.md does not exist");
  const shipped = new Set(json("scripts/adapters/capabilities.json").map((c) => c.name));
  const named = new Set([...text.matchAll(/\/pixel-perfect:([a-z][a-z-]*)/g)].map((m) => m[1]));
  const missing = [...shipped].filter((x) => !named.has(x)).sort();
  const extra = [...named].filter((x) => !shipped.has(x)).sort();
  assert.ok(!missing.length && !extra.length, `README.md commands differ from capabilities.json. missing: [${missing}] extra: [${extra}]`);
});

test("README.md and INSTALL.md follow the voice rules", () => {
  const rules = [
    [/Pixel Perfect/g, "title-case name (write pixel-perfect)"],
    [/\b(revolutionary|magic|seamless|effortless|10x)\b/gi, "banned hype word"],
    [/\bPhase \d/g, "phase numbering"],
  ];
  const hits = [];
  for (const doc of ["README.md", "INSTALL.md"]) {
    const text = read(doc);
    if (text === null) continue; // absence is reported by the "exist" test
    for (const [re, why] of rules) for (const m of text.matchAll(re)) hits.push(`${doc}: "${m[0]}" (${why})`);
  }
  assert.deepEqual(hits, [], `voice violations:\n  ${hits.join("\n  ")}`);
});
