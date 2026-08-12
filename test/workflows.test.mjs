import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { lintWorkflowText } from "../scripts/validate-workflows.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN = path.join(ROOT, "plugins/pixel-perfect");
const readPlugin = (rel) => readFileSync(path.join(PLUGIN, rel), "utf8");

const VALID_BATCH = `# Example

\`\`\`user_choice
batch: B1 — what this project is
- header: Framework
  question: Which framework does this project build on?
  options:
    - label: Expo (Recommended)
      description: Found expo in package.json. React Native with managed builds, config plugins, and over-the-air updates.
    - label: React Native CLI
      description: Bare React Native. You own the ios/ and android/ directories, so any native module works, at the cost of managing Xcode and Gradle.
\`\`\`
`;

test("a well-formed batch produces no errors", () => {
  assert.deepEqual(lintWorkflowText(VALID_BATCH, "example.md"), []);
});

test("a batch nested inside a list item is read at its own indentation", () => {
  const nested = VALID_BATCH.split("\n")
    .map((line) => (line ? `  ${line}` : line))
    .join("\n");
  assert.deepEqual(lintWorkflowText(nested, "example.md"), []);
});

test("a printed decision is rejected with its line number", () => {
  const text = ["# Example", "", "? What web framework?", "  > Next.js", "    Vite"].join("\n");
  const errors = lintWorkflowText(text, "example.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^example\.md:3 prose decision/);
});

test("a yes/no round trip is rejected", () => {
  const text = "Detected Expo.\n\nUse Expo as your mobile framework? [Yes / No, choose different]\n";
  const errors = lintWorkflowText(text, "example.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^example\.md:3 yes\/no round trip/);
});

test("a batch may not exceed four questions", () => {
  const question = (name) => [
    `- header: ${name}`,
    `  question: Which ${name} does this project use?`,
    "  options:",
    "    - label: The first option",
    "      description: A description long enough to clear the self-contained floor for this option.",
    "    - label: The second option",
    "      description: Another description long enough to clear the self-contained floor here.",
  ];
  const text = [
    "```user_choice",
    "batch: B1 — too many",
    ...["One", "Two", "Three", "Four", "Five"].flatMap(question),
    "```",
  ].join("\n");
  const errors = lintWorkflowText(text, "example.md");
  assert.equal(errors.filter((error) => /5 questions \(max 4\)/.test(error)).length, 1);
});

test("a header longer than twelve characters is rejected", () => {
  const text = VALID_BATCH.replace("header: Framework", "header: Framework and style");
  const errors = lintWorkflowText(text, "example.md");
  assert.equal(errors.filter((error) => /is 19 characters \(max 12\)/.test(error)).length, 1);
});

test("a bare product name is rejected as not self-contained", () => {
  const text = VALID_BATCH.replace(
    "description: Bare React Native. You own the ios/ and android/ directories, so any native module works, at the cost of managing Xcode and Gradle.",
    "description: React Native.",
  );
  const errors = lintWorkflowText(text, "example.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /needs a self-contained description/);
});

test("a description continued on the next line counts toward the floor", () => {
  const text = VALID_BATCH.replace(
    "description: Bare React Native. You own the ios/ and android/ directories, so any native module works, at the cost of managing Xcode and Gradle.",
    "description: Bare React Native.\n        You own the ios/ and android/ directories, so any native module works.",
  );
  assert.deepEqual(lintWorkflowText(text, "example.md"), []);
});

test("a single-select may not recommend two options", () => {
  const text = VALID_BATCH.replace("label: React Native CLI", "label: React Native CLI (Recommended)");
  const errors = lintWorkflowText(text, "example.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /marks 2 options \(Recommended\)/);
});

test("a recommended option must come first", () => {
  const text = VALID_BATCH.replace("label: Expo (Recommended)", "label: Expo").replace(
    "label: React Native CLI",
    "label: React Native CLI (Recommended)",
  );
  const errors = lintWorkflowText(text, "example.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /is marked \(Recommended\) but is not first/);
});

test("a multi-select may recommend several options but must sort them first", () => {
  const build = (labels) =>
    [
      "```user_choice",
      "batch: B3 — where it runs",
      "- header: Platforms",
      "  multiSelect: true",
      "  question: Which platforms does this ship to? Select every one that applies.",
      "  options:",
      ...labels.flatMap((label) => [
        `    - label: ${label}`,
        "      description: A description long enough to clear the self-contained floor for this platform option.",
      ]),
      "```",
    ].join("\n");

  assert.deepEqual(lintWorkflowText(build(["iOS (Recommended)", "Android (Recommended)", "Desktop web"]), "a.md"), []);
  const errors = lintWorkflowText(build(["iOS (Recommended)", "Desktop web", "Android (Recommended)"]), "a.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /must sort every \(Recommended\) option before the unmarked ones/);
});

test("each keyed option list is counted on its own", () => {
  const text = [
    "```user_choice",
    "batch: B4 — the toolchain",
    "- header: Style",
    "  question: How are styles written in this project?",
    "  options[react|nextjs|vite]:",
    "    - label: Tailwind CSS (Recommended)",
    "      description: Found tailwindcss in package.json. Utility classes written inline on each element.",
    "    - label: CSS Modules",
    "      description: Scoped stylesheets imported per component, so class names never collide across files.",
    "  options[sveltekit]:",
    "    - label: Tailwind CSS (Recommended)",
    "      description: Utility classes written inline, the same system shadcn-svelte expects underneath.",
    "```",
  ].join("\n");
  const errors = lintWorkflowText(text, "example.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /options\[sveltekit\] for "Style" has 1 options \(need 2-4\)/);
});

test("an unclosed batch is rejected", () => {
  const errors = lintWorkflowText("```user_choice\nbatch: B1 — unterminated\n", "example.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /is never closed/);
});

test("a batch without a declared id is rejected", () => {
  const text = VALID_BATCH.replace("batch: B1 — what this project is\n", "");
  const errors = lintWorkflowText(text, "example.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /must declare a batch/);
});

test("structural checks can be disabled for pseudocode skills", () => {
  const text = "```user_choice\nbatch: incomplete\n```\n";
  assert.equal(lintWorkflowText(text, "skill.md").length, 1);
  assert.deepEqual(lintWorkflowText(text, "skill.md", { structural: false }), []);
});

// --- Turn shape: the digest budget and the batch table ---

const ASKS_SECTION = [
  "## How this workflow asks",
  "",
  "| Batch | Phase | Decisions | Fires |",
  "|-------|-------|-----------|-------|",
  "| B1 | discover | the framework | always |",
  "",
].join("\n");

const INTERACTIVE = { interactive: true };
const report = (lines) => ["Present the plan for confirmation:", "", "```", ...lines, "```", ""].join("\n");
const filler = (count) => Array.from({ length: count }, (_, index) => `  line ${index + 1}`);

test("an interactive workflow declaring its batches in a table passes", () => {
  const text = `# Example\n\n${ASKS_SECTION}\n${VALID_BATCH}`;
  assert.deepEqual(lintWorkflowText(text, "example.md", INTERACTIVE), []);
});

test("an interactive workflow with no asks section is rejected", () => {
  const errors = lintWorkflowText(`# Example\n\n${VALID_BATCH}`, "example.md", INTERACTIVE);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no "## How this workflow asks" section/);
});

test("an asks section without a batch table is rejected", () => {
  const text = `# Example\n\n## How this workflow asks\n\nIt asks some things.\n\n${VALID_BATCH}`;
  const errors = lintWorkflowText(text, "example.md", INTERACTIVE);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /needs a table whose first column is Batch/);
});

test("a batch that is asked but missing from the table is rejected", () => {
  const extra = VALID_BATCH.replace("batch: B1 — what this project is", "batch: B-eco — the libraries");
  const text = `# Example\n\n${ASKS_SECTION}\n${VALID_BATCH}\n${extra}`;
  const errors = lintWorkflowText(text, "example.md", INTERACTIVE);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /batch "B-eco" is asked but missing from/);
});

test("a printed output past the digest budget is rejected with its length", () => {
  const text = `# Example\n\n${ASKS_SECTION}\n${report(filler(20))}\n${VALID_BATCH}`;
  const errors = lintWorkflowText(text, "example.md", INTERACTIVE);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /printed output is 20 lines \(max 12\)/);
});

test("a printed output within the digest budget passes", () => {
  const text = `# Example\n\n${ASKS_SECTION}\n${report(filler(12))}\n${VALID_BATCH}`;
  assert.deepEqual(lintWorkflowText(text, "example.md", INTERACTIVE), []);
});

test("a long block the workflow never tells the agent to print is not budgeted", () => {
  const sample = ["Write one file per screen in this format:", "", "```", ...filler(30), "```", ""].join("\n");
  const text = `# Example\n\n${ASKS_SECTION}\n${sample}\n${VALID_BATCH}`;
  assert.deepEqual(lintWorkflowText(text, "example.md", INTERACTIVE), []);
});

test("a long labeled code block is not budgeted", () => {
  const json = ["Report the result:", "", "```json", ...filler(30), "```", ""].join("\n");
  const text = `# Example\n\n${ASKS_SECTION}\n${json}\n${VALID_BATCH}`;
  assert.deepEqual(lintWorkflowText(text, "example.md", INTERACTIVE), []);
});

test("a four-tick sample containing fences is read as one block, not three", () => {
  const nested = [
    "Show the file format:",
    "",
    "````markdown",
    ...filler(4),
    "```",
    ...filler(4),
    "```",
    ...filler(4),
    "````",
    "",
  ].join("\n");
  const text = `# Example\n\n${ASKS_SECTION}\n${nested}\n${VALID_BATCH}`;
  assert.deepEqual(lintWorkflowText(text, "example.md", INTERACTIVE), []);
});

test("a report-producing workflow is not budgeted and needs no batch table", () => {
  const text = `# Status\n\n${report(filler(59))}`;
  assert.deepEqual(lintWorkflowText(text, "status.md"), []);
});

// --- Living design system (v8) structural contracts ---

test("sandbox-spec documents piece #8 catalog capture with medium table and determinism", () => {
  const spec = readPlugin("docs/sandbox-spec.md");
  assert.match(spec, /### 8\. Catalog capture/);
  assert.match(spec, /Structural artifact/);
  assert.match(spec, /Determinism requirements/);
  assert.match(spec, /verify-catalog\.mjs/);
  assert.match(spec, /design\/goldens\//);
});

test("evolve workflow covers E1–E6, confirm-before-write, and prove matrix", () => {
  const wf = readPlugin("workflows/evolve.md");
  assert.match(wf, /## How this workflow asks/);
  assert.match(wf, /### E1 — ACQUIRE/);
  assert.match(wf, /### E2 — CLASSIFY/);
  assert.match(wf, /### E3 — REACH/);
  assert.match(wf, /### E4 — CONFIRM/);
  assert.match(wf, /### E5 — APPLY/);
  assert.match(wf, /### E6 — PROVE/);
  assert.match(wf, /batch: E4/);
  assert.match(wf, /Nothing is written, installed, or deleted before this gate/);
  assert.match(wf, /non-disturbance|Every pre-existing golden is unchanged/);
  assert.match(wf, /no remaining story moved/i);
  assert.ok(existsSync(path.join(PLUGIN, "commands/evolve.md")));
  assert.ok(existsSync(path.join(PLUGIN, "skills/evolve/SKILL.md")));
});

test("scaffold, build, verify, refine, status, custom-sandbox wire capture", () => {
  assert.match(readPlugin("workflows/scaffold.md"), /verify-catalog\.mjs --baseline/);
  assert.match(readPlugin("workflows/build.md"), /atoms_capture/);
  assert.match(readPlugin("workflows/build.md"), /Composition mutation check/);
  assert.match(readPlugin("workflows/verify.md"), /verify-catalog\.mjs --check/);
  assert.match(readPlugin("workflows/refine.md"), /pixel-perfect:evolve/);
  assert.match(readPlugin("workflows/status.md"), /Dead inventory/);
  assert.match(readPlugin("docs/adapters/custom-sandbox.md"), /sandbox:capture/);
  assert.match(readPlugin("docs/adapters/custom-sandbox.md"), /Catalog capture \(piece #8/);
});

test("manifest schema examples prefer capture/pinned/deprecations over controls authority", () => {
  const init = readPlugin("workflows/init.md");
  assert.match(init, /"capture"/);
  assert.match(init, /"pinned"/);
  assert.match(init, /"deprecations"/);
  assert.match(init, /Do \*\*not\*\* author composition-edge arrays/);
  // refine should not require controls: true as authority after verification
  const refine = readPlugin("workflows/refine.md");
  assert.doesNotMatch(refine, /"controls": true/);
});
