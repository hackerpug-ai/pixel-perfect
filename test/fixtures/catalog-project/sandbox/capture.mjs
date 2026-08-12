#!/usr/bin/env node
// Real capture command for the catalog fixture: resolve compositions and write
// structural artifacts under PIXEL_PERFECT_CAPTURE_OUT (set by verify-catalog).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const out = process.env.PIXEL_PERFECT_CAPTURE_OUT || join(root, "design/.captures/web-desktop");
const catalog = join(root, "sandbox/catalog");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function readDefault(name) {
  for (const full of walk(catalog)) {
    const rel = relative(catalog, full).split(sep).join("/");
    const p = rel.split("/");
    if (p[1] === name && p[2]?.startsWith("default.")) return readFileSync(full, "utf8");
  }
  return null;
}

function resolve(raw, stack = []) {
  return raw.replace(/---\s*composed:([A-Za-z][A-Za-z0-9]*)\s*---[\s\S]*?---\s*end\s*---/g, (_, dep) => {
    if (stack.includes(dep)) return `--- composed:${dep} --- /*cycle*/ --- end ---`;
    const body = readDefault(dep);
    if (body == null) return `--- composed:${dep} --- /*missing*/ --- end ---`;
    return `--- composed:${dep} ---\n${resolve(body, [...stack, dep]).trimEnd()}\n--- end ---`;
  });
}

if (existsSync(out)) {
  // staging cleaned by verify-catalog before spawn; ensure dir
}
mkdirSync(out, { recursive: true });
for (const full of walk(catalog)) {
  const rel = relative(catalog, full).split(sep).join("/");
  const parts = rel.split("/");
  if (parts.length < 3 || !parts[2].endsWith(".txt")) continue;
  const [layer, name] = parts;
  const body = resolve(readFileSync(full, "utf8"), [name]);
  const dest = join(out, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, body.endsWith("\n") ? body : body + "\n", "utf8");
}
console.error(`capture: wrote stories to ${out}`);
