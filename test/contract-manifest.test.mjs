// Behavioral tests for the gate's manifest mode and its coverage rule.
//
// Every test runs the real script as a subprocess against real files on disk, because
// the exit code is the contract with workflows/build.md. Tests that write into a
// project copy the monorepo fixture into a temp directory first; the shipped fixture is
// never modified.
//
// The monorepo fixture keeps the web app under apps/site. The planted violations are
// Badge.tsx (shadcn: a bare <button>) and Toolbar.tsx (Tailwind: an inline style object).

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import * as gate from "../plugins/pixel-perfect/scripts/verify-styling-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GATE = path.join(ROOT, "plugins/pixel-perfect/scripts/verify-styling-contract.mjs");
const MONOREPO = path.join(ROOT, "test/fixtures/monorepo-web");
const TAILWIND = path.join(ROOT, "plugins/pixel-perfect/docs/styling-contracts/tailwind-web.md");
const SHADCN = path.join(ROOT, "plugins/pixel-perfect/docs/component-contracts/shadcn.md");

const CLEAN_SCREEN = "export function Home() {\n  return <main className=\"p-4\">Home</main>;\n}\n";

// A researched contract with a forbidden check that matches Toolbar and a mustInclude
// check whose glob matches nothing in the fixture, so it scopes zero files.
const MINI_CHECKS = {
  forbiddenPatterns: [
    {
      id: "inline-style-objects",
      mode: "content",
      glob: ["**/*.tsx"],
      regex: "\\bstyle=\\{\\{",
      rationale: "Inline style objects bypass design tokens.",
    },
  ],
  mustInclude: [
    {
      id: "layout-testid",
      glob: ["src/layouts/**/*.tsx"],
      regex: "data-testid=",
      description: "Layouts carry a test id.",
    },
  ],
};
const miniContract = () =>
  `---\nid: mini\nname: Mini researched contract\nsource: researched\n---\n\n## Checks\n\n\`\`\`json\n${JSON.stringify(MINI_CHECKS, null, 2)}\n\`\`\`\n`;

const scratch = [];
after(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function cloneMonorepo() {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-manifest-"));
  scratch.push(dir);
  cpSync(MONOREPO, dir, { recursive: true });
  return dir;
}

function readManifest(dir) {
  return JSON.parse(readFileSync(path.join(dir, "design/manifest.json"), "utf8"));
}

function editPlatform(dir, edit) {
  const manifest = readManifest(dir);
  edit(manifest.platforms["web-desktop"]);
  writeFileSync(path.join(dir, "design/manifest.json"), JSON.stringify(manifest, null, 2));
}

function writeProjectFile(dir, rel, text) {
  const abs = path.join(dir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}

function runGate(args) {
  const r = spawnSync(process.execPath, [GATE, ...args], { encoding: "utf8" });
  return {
    status: r.status,
    stdout: r.stdout,
    stderr: r.stderr,
    report: r.stdout.trim() ? JSON.parse(r.stdout) : null,
  };
}

// JSON report on stdout (--json). Use runManifestText for the text report.
function runManifest(dir, kind, extra = []) {
  return runGate(["--manifest", dir, "--platform", "web-desktop", "--kind", kind, "--json", ...extra]);
}

// Text mode: the human report on stderr, nothing on stdout.
function runManifestText(dir, kind, extra = []) {
  return runGate(["--manifest", dir, "--platform", "web-desktop", "--kind", kind, ...extra]);
}

const violationFiles = (report) => report.violations.map((v) => v.file);

// ---------------------------------------------------------------------------
// Positional mode: missing-root fix and the summary line
// ---------------------------------------------------------------------------

test("positional: a missing source root exits 2 instead of passing as a vacuous scan", () => {
  const r = runGate([TAILWIND, path.join(MONOREPO, "does-not-exist")]);
  assert.equal(r.status, 2, `expected exit 2, got ${r.status}: ${r.stderr}`);
  assert.match(r.stderr, /source root not found/i);
});

test("positional: text mode prints the scan root, files walked and files in scope on one line", () => {
  const r = runGate([TAILWIND, path.join(MONOREPO, "apps/site")]);
  const summary = r.stderr.split("\n")[0];
  assert.match(summary, /apps\/site/, `summary line missing the scan root: ${summary}`);
  assert.match(summary, /4 files walked/, `summary line missing files walked: ${summary}`);
  assert.match(summary, /3 in scope/, `summary line missing files in scope: ${summary}`);
});

// ---------------------------------------------------------------------------
// Monorepo: the scan root is platforms[p].root, not the repo root
// ---------------------------------------------------------------------------

test("monorepo: manifest mode scans apps/site and finds the planted styling violation", () => {
  const r = runManifest(MONOREPO, "styling");
  assert.equal(r.status, 1, r.stderr);
  assert.deepEqual(violationFiles(r.report), ["src/components/molecules/Toolbar.tsx"]);
  assert.equal(r.report.violations[0].checkId, "inline-style-objects");
  assert.equal(r.report.summary.filesScanned, 4);
  assert.equal(r.report.summary.filesInScope, 3);
});

test("monorepo: manifest mode finds the planted component violation and defaults to hard-fail", () => {
  const r = runManifest(MONOREPO, "component");
  assert.equal(r.status, 1, r.stderr);
  assert.equal(r.report.enforcement, "hard-fail");
  assert.deepEqual(violationFiles(r.report), ["src/components/atoms/Badge.tsx"]);
  assert.equal(r.report.violations[0].checkId, "raw-interactive-element");
});

test("monorepo: the positional form from the repo root misses both violations", () => {
  for (const contract of [TAILWIND, SHADCN]) {
    const r = runGate([contract, MONOREPO]);
    assert.equal(r.status, 3, "root-anchored globs match nothing at the repo root: a vacuous scan");
    assert.equal(r.report.violations.length, 0);
  }
});

test("monorepo: the positional form pointed at apps/site finds the same component violation", () => {
  const r = runGate([SHADCN, path.join(MONOREPO, "apps/site")]);
  assert.equal(r.status, 1, r.stderr);
  assert.deepEqual(violationFiles(r.report), ["src/components/atoms/Badge.tsx"]);
});

test("monorepo: manifest text mode prints one summary line with the scan root and both counts", () => {
  const r = runManifestText(MONOREPO, "component");
  const summary = r.stderr.split("\n")[0];
  assert.match(summary, /apps\/site/, `summary line missing the scan root: ${summary}`);
  assert.match(summary, /4 files walked/, `summary line missing files walked: ${summary}`);
  assert.match(summary, /3 in scope/, `summary line missing files in scope: ${summary}`);
});

test("monorepo: a missing platform root exits 2 and names it", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.root = "apps/nope";
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /apps\/nope/);
});

// ---------------------------------------------------------------------------
// Coverage: every recorded component file must be in some check's scope
// ---------------------------------------------------------------------------

test("a manifest component outside every check's scope exits 3 and names the file", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "apps/site/src/screens/Home.tsx", CLEAN_SCREEN);
  editPlatform(dir, (p) => {
    p.screens.push({ name: "Home", status: "verified", file: "apps/site/src/screens/Home.tsx" });
  });

  const component = runManifest(dir, "component");
  assert.equal(component.status, 3, component.stderr);
  assert.equal(component.report.coverage.failures.length, 1);
  assert.equal(component.report.coverage.failures[0].file, "apps/site/src/screens/Home.tsx");
  assert.equal(component.report.coverage.failures[0].status, "out-of-scope");
  assert.match(component.report.message, /1 component files are outside every check's scope/);
  assert.match(component.report.message, /apps\/site\/src\/screens\/Home\.tsx/);

  // The styling contract's globs do cover src/screens, so the same file is covered there.
  const styling = runManifest(dir, "styling");
  assert.equal(styling.status, 1, "Home is covered by the styling contract, so only Toolbar blocks");
  assert.equal(styling.report.coverage.failures.length, 0);
});

test("a manifest component file outside the scan root exits 3", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "packages/shared/Thing.tsx", CLEAN_SCREEN);
  editPlatform(dir, (p) => {
    p.molecules.push({ name: "Thing", status: "verified", file: "packages/shared/Thing.tsx" });
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 3, r.stderr);
  assert.deepEqual(
    r.report.coverage.failures.map((f) => [f.file, f.status]),
    [["packages/shared/Thing.tsx", "outside-root"]]
  );
});

test("a manifest component file that does not exist exits 2 and names it", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.atoms.push({ name: "Ghost", status: "built", file: "apps/site/src/components/atoms/Ghost.tsx" });
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /Ghost\.tsx/);
});

test("--layer limits coverage to the named layer's manifest files", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "apps/site/src/screens/Home.tsx", CLEAN_SCREEN);
  editPlatform(dir, (p) => {
    p.screens.push({ name: "Home", status: "verified", file: "apps/site/src/screens/Home.tsx" });
  });

  const molecules = runManifest(dir, "component", ["--layer", "molecules"]);
  assert.equal(molecules.report.coverage.scope, "molecules");
  assert.equal(molecules.report.coverage.files.length, 1, "only the molecule is covered");
  assert.equal(molecules.report.coverage.failures.length, 0, "the screen is outside the layer, so it is not required");
  assert.notEqual(molecules.status, 3, "the uncovered screen does not fail a molecules-only run");
  // --layer narrows coverage only. The violation report still covers the whole scan root;
  // --files is the option that narrows violations.
  assert.deepEqual(violationFiles(molecules.report), ["src/components/atoms/Badge.tsx"]);

  const everything = runManifest(dir, "component");
  assert.equal(everything.status, 3, "without --layer the screen is covered and fails");
});

test("--files limits violations to the named files and still applies coverage to them", () => {
  const clean = runManifest(MONOREPO, "component", ["--files", "apps/site/src/components/atoms/Button.tsx"]);
  assert.equal(clean.status, 0, clean.stderr);
  assert.deepEqual(clean.report.violations, [], "Badge's violation is outside --files");

  const flagged = runManifest(MONOREPO, "component", ["--files", "apps/site/src/components/atoms/Badge.tsx"]);
  assert.equal(flagged.status, 1, flagged.stderr);
  assert.deepEqual(violationFiles(flagged.report), ["src/components/atoms/Badge.tsx"]);

  const dir = cloneMonorepo();
  writeProjectFile(dir, "apps/site/src/screens/Home.tsx", CLEAN_SCREEN);
  const uncovered = runManifest(dir, "component", ["--files", "apps/site/src/screens/Home.tsx"]);
  assert.equal(uncovered.status, 3, "a file named by --files is still subject to the coverage rule");

  const missing = runManifest(MONOREPO, "component", ["--files", "apps/site/src/nope.tsx"]);
  assert.equal(missing.status, 2, "a --files entry that does not exist is exit 2");
});

test("a manifest with no recorded component files falls back to the global guard", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    for (const layer of ["atoms", "molecules"]) {
      for (const entry of p[layer]) {
        delete entry.file;
        entry.status = "pending";
      }
    }
  });
  const styling = runManifest(dir, "styling");
  assert.equal(styling.status, 1, styling.stderr);
  assert.equal(styling.report.coverage.applied, false);
  assert.match(styling.report.coverage.reason, /no built component files/);

  // A scan root with no component globs at all: the old vacuous guard still fails the run.
  writeProjectFile(dir, "apps/site/src/screens/Home.tsx", CLEAN_SCREEN);
  editPlatform(dir, (p) => {
    p.root = "apps/site/src/screens";
  });
  const vacuous = runManifest(dir, "component");
  assert.equal(vacuous.status, 3, vacuous.stderr);
  assert.match(vacuous.report.warnings.join(" "), /vacuous/i);
});

// ---------------------------------------------------------------------------
// Per-check reporting
// ---------------------------------------------------------------------------

test("a mustInclude check that scopes zero files is reported vacuous, and vacuity alone does not fail", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "design/research/styling/mini.md", miniContract());
  editPlatform(dir, (p) => {
    p.tools.style_contract = "mini";
    p.tools.style_contract_source = "researched";
  });
  const r = runManifest(dir, "styling");
  const layout = r.report.checks.find((c) => c.id === "layout-testid");
  assert.equal(layout.scoped, 0);
  assert.equal(layout.vacuous, true);
  assert.equal(r.report.coverage.failures.length, 0, "vacuity is not a coverage failure");
  assert.equal(r.status, 1, "the planted inline style in Toolbar still blocks");
  assert.deepEqual(violationFiles(r.report), ["src/components/molecules/Toolbar.tsx"]);
});

// ---------------------------------------------------------------------------
// Contract resolution and enforcement
// ---------------------------------------------------------------------------

test("a researched styling contract resolves to design/research/styling/{id}.md", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "design/research/styling/mini.md", miniContract());
  editPlatform(dir, (p) => {
    p.tools.style_contract = "mini";
    p.tools.style_contract_source = "researched";
  });
  const r = runManifest(dir, "styling");
  assert.equal(r.report.contract.path, path.join(dir, "design/research/styling/mini.md"));
  assert.equal(r.status, 1, r.stderr);
});

test("a researched styling contract that is not on disk exits 2 and names it", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.style_contract = "absent-research";
    p.tools.style_contract_source = "researched";
  });
  const r = runManifest(dir, "styling");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /absent-research\.md/);
});

test("a researched component contract resolves to design/research/libraries/{id}.md", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "design/research/libraries/shadcn-copy.md", readFileSync(SHADCN, "utf8"));
  editPlatform(dir, (p) => {
    p.tools.component_contract = "shadcn-copy";
    p.tools.component_contract_source = "researched";
  });
  const r = runManifest(dir, "component");
  assert.equal(r.report.contract.path, path.join(dir, "design/research/libraries/shadcn-copy.md"));
  assert.equal(r.status, 1, r.stderr);
  assert.deepEqual(violationFiles(r.report), ["src/components/atoms/Badge.tsx"]);
});

test("enforcement off exits 0 without scanning", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_enforcement = "off";
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.report.enforcement, "off");
  assert.equal(r.report.scanned, false);
  assert.deepEqual(r.report.violations, []);
});

test("warn reports violations and exits 0, but does not waive the coverage rule", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_enforcement = "warn";
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.report.enforcement, "warn");
  assert.equal(r.report.violations.length, 1, "the violation is still reported");

  writeProjectFile(dir, "apps/site/src/screens/Home.tsx", CLEAN_SCREEN);
  editPlatform(dir, (p) => {
    p.screens.push({ name: "Home", status: "verified", file: "apps/site/src/screens/Home.tsx" });
  });
  const uncovered = runManifest(dir, "component");
  assert.equal(uncovered.status, 3, "coverage failures still exit 3 under warn");
});

test("an unknown enforcement value exits 2", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_enforcement = "strict";
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /enforcement/);
});

test("contract source none resolves to no contract in force and exits 0", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_source = "none";
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.report.inForce, false);
  assert.equal(r.report.scanned, false);
});

test("an absent source with a selected library and the tools object deleted both exit 2", () => {
  const dir = cloneMonorepo();
  const manifest = readManifest(dir);
  delete manifest.platforms["web-desktop"].tools;
  writeFileSync(path.join(dir, "design/manifest.json"), JSON.stringify(manifest, null, 2));
  const r = runManifest(dir, "component");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /platform web-desktop has no tools object/);
});

// ---------------------------------------------------------------------------
// Overrides
// ---------------------------------------------------------------------------

test("a name-form override exempts the file the component resolves to and reports it", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_overrides = { Badge: "legacy raw button, tracked for migration" };
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.report.violations, []);
  const override = r.report.overrides.find((o) => o.key === "Badge");
  assert.equal(override.form, "name");
  assert.deepEqual(override.files, ["src/components/atoms/Badge.tsx"]);
  const covered = r.report.coverage.files.find((f) => f.file === "apps/site/src/components/atoms/Badge.tsx");
  assert.equal(covered.status, "exempted", "an exempted file counts as covered");
});

test("a glob-form override is used as written, relative to the scan root", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_overrides = { "src/components/atoms/Badge.tsx": "legacy raw button" };
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 0, r.stderr);
  const override = r.report.overrides.find((o) => o.key === "src/components/atoms/Badge.tsx");
  assert.equal(override.form, "glob");
  assert.deepEqual(override.files, ["src/components/atoms/Badge.tsx"]);
});

test("an override key that resolves to no manifest component exits 2 and names the key", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_overrides = { Nonexistent: "no such component" };
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /Nonexistent/);
});

// ---------------------------------------------------------------------------
// Direct caller: the function the next script will call
// ---------------------------------------------------------------------------

test("runManifestGate returns the result object to a caller that is not the CLI", () => {
  const result = gate.runManifestGate({ projectRoot: MONOREPO, platform: "web-desktop", kind: "component" });
  assert.equal(result.exitCode, 1);
  assert.equal(result.inForce, true);
  assert.equal(result.enforcement, "hard-fail");
  assert.deepEqual(result.violations.map((v) => v.file), ["src/components/atoms/Badge.tsx"]);
  assert.equal(result.coverage.files.length, 3);
  assert.ok(result.checks.every((c) => typeof c.scoped === "number" && typeof c.vacuous === "boolean"));
});

test("runManifestGate rejects an unknown kind with an error carrying exitCode 2", () => {
  assert.throws(
    () => gate.runManifestGate({ projectRoot: MONOREPO, platform: "web-desktop", kind: "bogus" }),
    (e) => e.exitCode === 2 && /kind/.test(e.message)
  );
});

// ---------------------------------------------------------------------------
// Absent contract source, enforcement typos, and unbuilt items
// ---------------------------------------------------------------------------

const CLEAN_BADGE = `import { Button } from "@/components/ui/button";

export function StatusBadge({ label }: { label: string }) {
  return <Button className="px-2" variant="outline" size="sm">{label}</Button>;
}
`;

test("an absent style source exits 2 and names the field", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    delete p.tools.style_contract_source;
  });
  const r = runManifest(dir, "styling");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /no styling contract source is recorded for platform web-desktop/);
  assert.match(r.stderr, /tools\.style_contract_source to "none"/);
});

test("an absent component source exits 2 and names the field", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    delete p.tools.component_contract_source;
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /no component contract source is recorded for platform web-desktop/);
  assert.match(r.stderr, /tools\.component_contract_source to "none"/);
});

test("an absent source is exit 2 even when no tool is selected", () => {
  const none = cloneMonorepo();
  editPlatform(none, (p) => {
    delete p.tools.component_contract_source;
    p.tools.components = "none";
  });
  const noneRun = runManifest(none, "component");
  assert.equal(noneRun.status, 2, noneRun.stderr);
  assert.match(noneRun.stderr, /no component contract source is recorded/);

  const missing = cloneMonorepo();
  editPlatform(missing, (p) => {
    delete p.tools.component_contract_source;
    delete p.tools.components;
  });
  const missingRun = runManifest(missing, "component");
  assert.equal(missingRun.status, 2, missingRun.stderr);
  assert.match(missingRun.stderr, /no component contract source is recorded/);
});

test("an explicit source of none exits 0 even when a library is selected", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_source = "none";
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.report.inForce, false);
});

test("an enforcement typo exits 2 even when the contract is skipped", () => {
  const explicitNone = cloneMonorepo();
  editPlatform(explicitNone, (p) => {
    p.tools.component_contract_source = "none";
    p.tools.component_contract_enforcement = "hardfail";
  });
  const a = runManifest(explicitNone, "component");
  assert.equal(a.status, 2, a.stderr);
  assert.match(a.stderr, /enforcement/);

  const absentTool = cloneMonorepo();
  editPlatform(absentTool, (p) => {
    delete p.tools.component_contract_source;
    p.tools.components = "none";
    p.tools.component_contract_enforcement = "hardfail";
  });
  const b = runManifest(absentTool, "component");
  assert.equal(b.status, 2, b.stderr);
  assert.match(b.stderr, /enforcement/);
});

test("pending items are left out of coverage and listed; a whole-platform run still passes", () => {
  const dir = cloneMonorepo();
  // Make the built components clean so the run has no violations of its own.
  writeProjectFile(dir, "apps/site/src/components/atoms/Badge.tsx", CLEAN_BADGE);
  editPlatform(dir, (p) => {
    p.organisms.push({ name: "Later", status: "pending" });
    p.screens.push({ name: "Home", status: "pending", file: "apps/site/src/screens/Home.tsx" });
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.report.coverage.required, 3, "only the built components are required");
  assert.equal(r.report.coverage.failures.length, 0);
  assert.deepEqual(
    r.report.coverage.pending.map((p) => [p.name, p.layer, p.file]),
    [
      ["Later", "organisms", null],
      ["Home", "screens", "apps/site/src/screens/Home.tsx"],
    ]
  );
});

test("an item with status built or verified and no file exits 2 and names the item", () => {
  for (const status of ["built", "verified"]) {
    const dir = cloneMonorepo();
    editPlatform(dir, (p) => {
      p.molecules.push({ name: "Orphan", status });
    });
    const r = runManifest(dir, "component");
    assert.equal(r.status, 2, `${status}: ${r.stderr}`);
    assert.match(r.stderr, /Orphan/, `${status}: names the item`);
    assert.match(r.stderr, /records no file/, `${status}: says why`);
  }
});

test("--files still checks exactly the named files, whatever their status", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.screens.push({ name: "Home", status: "pending", file: "apps/site/src/screens/Home.tsx" });
  });
  const r = runManifest(dir, "component", ["--files", "apps/site/src/screens/Home.tsx"]);
  assert.equal(r.status, 2, "a named file that does not exist is exit 2 even when pending");
  assert.match(r.stderr, /Home\.tsx/);
});

// ---------------------------------------------------------------------------
// Review follow-up: pending is not a way to hide a built file; overrides are
// visible; the gate reports when it did not run; unrecorded and vacuous notes
// ---------------------------------------------------------------------------

test("a pending item whose file exists is built: coverage applies to it", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "apps/site/src/screens/Home.tsx", CLEAN_SCREEN);
  editPlatform(dir, (p) => {
    p.screens.push({ name: "Home", status: "pending", file: "apps/site/src/screens/Home.tsx" });
  });
  const component = runManifest(dir, "component");
  assert.equal(component.status, 3, component.stderr);
  assert.equal(component.report.coverage.required, 4, "Home is required once its file exists");
  assert.deepEqual(component.report.coverage.pending, [], "an existing file is not pending");
  assert.deepEqual(component.report.coverage.failures.map((f) => f.file), ["apps/site/src/screens/Home.tsx"]);

  const styling = runManifest(dir, "styling");
  assert.equal(styling.report.coverage.required, 4);
  assert.equal(styling.report.coverage.failures.length, 0, "Home is in the styling contract's scope");
});

test("a missing status with no file is an error, not a pending item", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.molecules.push({ name: "Bare" });
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /Bare/);
  assert.match(r.stderr, /records no file/);
});

test("the summary line counts pending items and names them when there are five or fewer", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.organisms.push({ name: "Later", status: "pending" });
    p.screens.push({ name: "Home", status: "pending", file: "apps/site/src/screens/Home.tsx" });
  });
  const r = runManifestText(dir, "component");
  const summary = r.stderr.split("\n")[0];
  assert.match(summary, /2 pending \(organisms\/Later, screens\/Home\)/, summary);
});

test("the summary line counts pending items without names when there are more than five", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    for (let i = 1; i <= 6; i++) p.organisms.push({ name: `Later${i}`, status: "pending" });
  });
  const r = runManifestText(dir, "component");
  const summary = r.stderr.split("\n")[0];
  assert.match(summary, /6 pending,/, summary);
  assert.doesNotMatch(summary, /Later1/, "names are omitted above five");
});

test("an override with no reason, an empty reason, or a non-string reason exits 2 naming the key", () => {
  for (const value of ["", "   ", 5, null]) {
    const dir = cloneMonorepo();
    editPlatform(dir, (p) => {
      p.tools.component_contract_overrides = { Badge: value };
    });
    const r = runManifest(dir, "component");
    assert.equal(r.status, 2, `reason ${JSON.stringify(value)}: ${r.stderr}`);
    assert.match(r.stderr, /Badge/, `reason ${JSON.stringify(value)} names the key`);
    assert.match(r.stderr, /non-empty string reason/);
  }
});

test("overrides that exempt every recorded component file exit 3", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_overrides = {
      Button: "legacy",
      Badge: "legacy",
      Toolbar: "legacy",
    };
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.report.message, /overrides exempt every recorded component file/);
});

test("text mode prints one line per override with its key, form, reason and exempted files", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_overrides = { Badge: "legacy raw button", "src/components/atoms/Nothing.tsx": "none yet" };
  });
  const r = runManifestText(dir, "component");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /override Badge \(name\): "legacy raw button" exempts 1 file\(s\): apps\/site\/src\/components\/atoms\/Badge\.tsx/);
  assert.match(r.stderr, /override src\/components\/atoms\/Nothing\.tsx \(glob\): "none yet" exempts 0 file\(s\) — nothing matched/);
});

test("an absent source with the tools object present and both tools none exits 2", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    delete p.tools.style_contract_source;
    delete p.tools.component_contract_source;
    p.tools.style = "none";
    p.tools.components = "none";
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /no component contract source is recorded for platform web-desktop; record one or set tools\.component_contract_source to "none"/);
});

test("GATE DID NOT RUN is printed for an explicit source of none", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_source = "none";
  });
  const r = runManifestText(dir, "component");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr.split("\n")[0], /^GATE DID NOT RUN: source is "none" for component on platform web-desktop/);
  const json = runManifest(dir, "component");
  assert.equal(json.report.scanned, false);
  assert.match(json.report.note, /source is "none"/);
});

test("GATE DID NOT RUN is printed under enforcement off, and the root and contract are still validated", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract_enforcement = "off";
  });
  const r = runManifestText(dir, "component");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr.split("\n")[0], /^GATE DID NOT RUN: enforcement is "off" for component on platform web-desktop/);
});

test("under enforcement off a broken scan root still exits 2", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.root = "apps/nope";
    p.tools.component_contract_enforcement = "off";
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /apps\/nope/);
});

test("under enforcement off a missing researched contract still exits 2", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.tools.component_contract = "absent-library";
    p.tools.component_contract_source = "researched";
    p.tools.component_contract_enforcement = "off";
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /absent-library\.md/);
});

test("a recorded file under dist/ or node_modules/ is not covered", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "apps/site/dist/Old.tsx", CLEAN_SCREEN);
  writeProjectFile(dir, "apps/site/node_modules/pkg/Thing.tsx", CLEAN_SCREEN);
  editPlatform(dir, (p) => {
    p.molecules.push({ name: "Old", status: "verified", file: "apps/site/dist/Old.tsx" });
    p.molecules.push({ name: "Thing", status: "verified", file: "apps/site/node_modules/pkg/Thing.tsx" });
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 3, r.stderr);
  const byFile = Object.fromEntries(r.report.coverage.files.map((f) => [f.file, f.status]));
  assert.equal(byFile["apps/site/dist/Old.tsx"], "not-scanned");
  assert.equal(byFile["apps/site/node_modules/pkg/Thing.tsx"], "not-scanned");
  assert.equal(r.report.coverage.covered, 3, "only the three real components are covered");
});

test("unrecorded files in scope are counted on the summary line and listed in JSON", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "apps/site/src/components/atoms/Badge.tsx", CLEAN_BADGE);
  writeProjectFile(dir, "apps/site/src/components/atoms/Extra.tsx", CLEAN_SCREEN);
  const text = runManifestText(dir, "component");
  assert.equal(text.status, 0, text.stderr);
  const lines = text.stderr.split("\n");
  assert.match(lines[0], /1 unrecorded in scope/, lines[0]);
  assert.match(lines[1], /apps\/site\/src\/components\/atoms\/Extra\.tsx/);
  const json = runManifest(dir, "component");
  assert.deepEqual(json.report.unrecordedInScope, ["apps/site/src/components/atoms/Extra.tsx"]);
});

test("a vacuous check is named on a note line in text mode", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "design/research/styling/mini.md", miniContract());
  editPlatform(dir, (p) => {
    p.tools.style_contract = "mini";
    p.tools.style_contract_source = "researched";
  });
  const r = runManifestText(dir, "styling");
  assert.match(r.stderr, /^note: 1 check\(s\) scoped 0 files: layout-testid$/m);
});

test("a qualified layer/Name override resolves to that item only", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "apps/site/src/components/molecules/Button.tsx", CLEAN_SCREEN);
  editPlatform(dir, (p) => {
    p.molecules.push({ name: "Button", status: "verified", file: "apps/site/src/components/molecules/Button.tsx" });
    p.tools.component_contract_overrides = { "atoms/Button": "shared Button", Badge: "legacy raw button" };
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 0, r.stderr);
  const override = r.report.overrides.find((o) => o.key === "atoms/Button");
  assert.equal(override.form, "name");
  assert.deepEqual(override.files, ["src/components/atoms/Button.tsx"]);
});

test("a name matching two manifest items exits 2 and asks for the layer/Name form", () => {
  const dir = cloneMonorepo();
  writeProjectFile(dir, "apps/site/src/components/molecules/Button.tsx", CLEAN_SCREEN);
  editPlatform(dir, (p) => {
    p.molecules.push({ name: "Button", status: "verified", file: "apps/site/src/components/molecules/Button.tsx" });
    p.tools.component_contract_overrides = { Button: "ambiguous" };
  });
  const r = runManifest(dir, "component");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /override "Button" matches atoms\/Button and molecules\/Button; use the form layer\/Name/);
});

test("--layer with no recorded items in that layer exits 3", () => {
  const r = runManifest(MONOREPO, "component", ["--layer", "organisms"]);
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.report.message, /layer organisms has no recorded items/);
});

test("--layer combined with --files is rejected with exit 2", () => {
  const r = runManifest(MONOREPO, "component", ["--layer", "atoms", "--files", "apps/site/src/components/atoms/Button.tsx"]);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /cannot be combined/);
});

test("text mode writes only the text report to stdout; JSON needs --json", () => {
  const text = runManifestText(MONOREPO, "component");
  assert.equal(text.stdout, "", "no JSON on stdout without --json");
  assert.match(text.stderr, /^verify-styling-contract: scan root/);
  const json = runManifest(MONOREPO, "component");
  assert.equal(json.report.mode, "manifest");
});

test("a case-only difference between a recorded path and the disk is named as such, or is a missing file", () => {
  const dir = cloneMonorepo();
  editPlatform(dir, (p) => {
    p.molecules.push({ name: "Toolbar2", status: "verified", file: "apps/site/src/components/molecules/TOOLBAR.tsx" });
  });
  const r = runManifest(dir, "component");
  if (r.status === 2) {
    // A case-sensitive file system: the recorded path simply does not exist.
    assert.match(r.stderr, /TOOLBAR\.tsx/);
  } else {
    // A case-insensitive file system (macOS default): the file exists under another case.
    assert.equal(r.status, 3, r.stderr);
    const entry = r.report.coverage.failures.find((f) => f.file === "apps/site/src/components/molecules/TOOLBAR.tsx");
    assert.match(entry.reason, /differs from the file on disk only by letter case/);
  }
});
