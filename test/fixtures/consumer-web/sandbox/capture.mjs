#!/usr/bin/env node
/**
 * Consumer-style sandbox capture command.
 * Reads sandbox/stories (structural medium for CI without a browser), resolves
 * composition markers, writes design/.captures/{platform}/… layout expected by
 * verify-catalog.mjs. Real projects swap this for DOM/TestBackend dumps.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, sep } from "node:path";

const root = process.cwd();
const out = process.env.PIXEL_PERFECT_CAPTURE_OUT || join(root, "design/.captures/web-desktop");
const stories = join(root, "sandbox/stories");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function readDefault(name) {
  for (const full of walk(stories)) {
    const rel = relative(stories, full).split(sep).join("/");
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

mkdirSync(out, { recursive: true });
let n = 0;
for (const full of walk(stories)) {
  const rel = relative(stories, full).split(sep).join("/");
  const parts = rel.split("/");
  if (parts.length < 3 || !parts[2].endsWith(".txt")) continue;
  const body = resolve(readFileSync(full, "utf8"), [parts[1]]);
  const dest = join(out, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, body.endsWith("\n") ? body : body + "\n", "utf8");
  n++;
}
if (n === 0) {
  console.error("capture: zero stories under sandbox/stories");
  process.exit(1);
}
console.error(`capture: ${n} stor${n === 1 ? "y" : "ies"} → ${out}`);
