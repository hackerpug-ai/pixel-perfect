// Corpus tests for the shipped contract files.
//
// Before this suite existed, nothing parsed a contract at build time: a typo in a
// regex shipped green and only surfaced as exit 2 inside a user's project, after
// they had already run BUILD. These tests parse every contract with the real gate
// parser and assert the invariants the gate depends on.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseContract, makeMatcher } from "../plugins/pixel-perfect/scripts/verify-styling-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "plugins/pixel-perfect/docs");

const KINDS = [
  { dir: path.join(DOCS, "styling-contracts"), label: "styling" },
  { dir: path.join(DOCS, "component-contracts"), label: "component" },
];

function contractsIn(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => ({ file: f, id: f.replace(/\.md$/, ""), full: path.join(dir, f) }));
}

for (const { dir, label } of KINDS) {
  const contracts = contractsIn(dir);

  test(`${label} contracts: the corpus is non-empty`, () => {
    assert.ok(contracts.length > 0, `no ${label} contracts found in ${dir}`);
  });

  for (const c of contracts) {
    test(`${label} contract ${c.id}: parses, and every regex compiles`, () => {
      // parseContract throws on: no '## Checks' section, an empty or unparseable
      // JSON block, a check missing id/glob/regex, an uncompilable regex, and a
      // checks block that would enforce nothing. Reaching this line means none of
      // those hold.
      const parsed = parseContract(c.full);
      const all = [...parsed.checks.forbiddenPatterns, ...parsed.checks.mustInclude];
      assert.ok(all.length > 0, `${c.id} enforces nothing`);

      for (const check of all) {
        assert.ok(check._re instanceof RegExp, `${c.id}/${check.id}: regex did not compile`);
        // A `g`-flagged regex carries lastIndex between calls, which would make
        // detection order-dependent. The parser builds them without flags; assert it.
        assert.equal(check._re.global, false, `${c.id}/${check.id}: regex must not be global`);
        assert.ok(Array.isArray(check.glob) && check.glob.length > 0, `${c.id}/${check.id}: empty glob`);
        assert.ok(["content", "exists", "file"].includes(check.mode), `${c.id}/${check.id}: unknown mode "${check.mode}"`);
      }
    });

    test(`${label} contract ${c.id}: frontmatter id matches the filename`, () => {
      const { id } = parseContract(c.full);
      assert.equal(id, c.id, `frontmatter id "${id}" does not match filename "${c.file}"`);
    });

    test(`${label} contract ${c.id}: every glob is a compilable matcher`, () => {
      const parsed = parseContract(c.full);
      for (const check of [...parsed.checks.forbiddenPatterns, ...parsed.checks.mustInclude]) {
        assert.doesNotThrow(() => makeMatcher(check.glob), `${c.id}/${check.id}: glob failed to compile`);
        if (check.exclude) assert.doesNotThrow(() => makeMatcher(check.exclude), `${c.id}/${check.id}: exclude failed to compile`);
      }
    });
  }
}

// Component contracts carry extra frontmatter the resolution step reads. These are
// scalar fields, so the gate's minimal frontmatter reader is not enough — assert on
// the raw text instead.
test("component contracts declare distribution and importRoot", () => {
  for (const c of contractsIn(path.join(DOCS, "component-contracts"))) {
    const md = readFileSync(c.full, "utf8");
    const fm = md.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(fm, `${c.file}: no frontmatter`);
    const distribution = fm[1].match(/^distribution:\s*(\S+)/m);
    assert.ok(distribution, `${c.file}: missing 'distribution'`);
    assert.ok(
      ["vendored", "package"].includes(distribution[1]),
      `${c.file}: distribution must be vendored|package, got "${distribution[1]}"`
    );
    assert.match(fm[1], /^importRoot:\s*\S+/m, `${c.file}: missing 'importRoot'`);
    assert.match(fm[1], /^\s+componentLibrary:\s*\S+/m, `${c.file}: missing appliesTo.componentLibrary`);
  }
});

// A vendored-distribution contract that forgets to exclude the library's own source
// will flag every file the CLI wrote. That is the fastest way to make the gate
// ignorable, so it is a structural requirement, not a style preference.
test("vendored component contracts exclude the library's own source", () => {
  for (const c of contractsIn(path.join(DOCS, "component-contracts"))) {
    const md = readFileSync(c.full, "utf8");
    if (!/^distribution:\s*vendored/m.test(md)) continue;
    const parsed = parseContract(c.full);
    for (const check of parsed.checks.forbiddenPatterns) {
      assert.ok(
        Array.isArray(check.exclude) && check.exclude.some((g) => g.includes("ui/")),
        `${c.file}/${check.id}: a vendored contract must exclude the ui/ layer`
      );
    }
  }
});
