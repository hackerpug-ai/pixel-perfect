// T12 — the review record's shape, and the three receipts it cites, re-executed against the repo.
//
// This is a read-only task's one owned file. It asserts two different things and keeps them apart:
//
//   1. the record exists, answers all ten checklist edges with a verdict and a receipt, and ends in
//      one of the two allowed words (`APPROVED` | `NEEDS_FIXES`);
//   2. the three receipt commands the record cites still produce the output it claims, re-run here
//      against the repository's own bytes — not against a copy, not against a stub.
//
// What is NOT here, and is said plainly: this file cannot prove a finding. The ten edges are proven
// by the receipts in the record (a command and its output, or a file:line); a record that states a
// wrong verdict is caught by re-running the command, which is the second half of each case below.
// The file never writes, invents or repairs a receipt — it has no write call at all — and it never
// copies or stubs `.github/workflows/harness-eval.yml`.
//
// The record lives in the run's evidence root, outside this worktree, so it is resolved through git:
// the common git dir's parent IS the workspace, and the record sits under `.kb-run-sprint/` there.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
/** The worktree root: two levels up from `tests/sprint-01/`. */
const ROOT = resolve(HERE, "../..");
const WORKFLOW_REL = ".github/workflows/harness-eval.yml";
const WORKFLOW = join(ROOT, WORKFLOW_REL);

/** The workspace is the run's checkout root, whose `.git` is the common git dir of every worktree. */
function workspaceRoot() {
  const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  return dirname(commonDir);
}

const RECORD = join(
  workspaceRoot(),
  ".kb-run-sprint",
  "sprint-01-evaluator-evidence-spine",
  "T12",
  "evidence",
  "t12-review-record.md",
);

const EDGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const VERDICT_WORDS = ["pass", "finding", "blocked"];
const SEVERITY_WORDS = ["BLOCKER", "MAJOR", "MINOR", "none"];
const FINAL_WORDS = ["APPROVED", "NEEDS_FIXES"];

/** Read the record unconditionally: an absent record is a failure, never something to create. */
function readRecord() {
  assert.ok(
    existsSync(RECORD),
    `the review record is absent at ${RECORD}. This case reads the record and re-runs its receipts; it never writes or repairs one.`,
  );
  return readFileSync(RECORD, "utf8");
}

/**
 * Split the record into its ten edges. An edge is a `### Edge <n> — <subject>` section whose body is
 * `- **key**: value` bullets; the section ends at the next edge, the next `##` heading, or a `---`.
 */
function parseEdges(text) {
  const lines = text.split("\n");
  const edges = new Map();
  let open = null;
  let body = [];
  const close = () => {
    if (open !== null) edges.set(open, body.join("\n"));
  };
  for (const line of lines) {
    const heading = /^### Edge (\d+) — /.exec(line);
    if (heading) {
      close();
      open = Number(heading[1]);
      body = [];
      continue;
    }
    if (open === null) continue;
    if (/^### /.test(line) || /^## /.test(line) || /^---\s*$/.test(line)) {
      close();
      open = null;
      body = [];
      continue;
    }
    body.push(line);
  }
  close();
  return edges;
}

/** The value of one `- **key**: value` bullet, including its indented continuation lines. */
function field(section, key) {
  const lines = section.split("\n");
  const head = new RegExp(`^- \\*\\*${key}\\*\\*:\\s*(.*)$`);
  for (let i = 0; i < lines.length; i += 1) {
    const match = head.exec(lines[i]);
    if (!match) continue;
    const value = [match[1]];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^\s+\S/.test(lines[j]) || /^\s*$/.test(lines[j])) value.push(lines[j]);
      else break;
    }
    return value.join("\n").trim();
  }
  return "";
}

function edgeOrFail(edges, n) {
  const section = edges.get(n);
  assert.ok(section !== undefined, `the record has no "### Edge ${n}" section`);
  return section;
}

/** Run one command in the worktree and hand back its raw result. */
function run(command, args) {
  return spawnSync(command, args, { cwd: ROOT, encoding: "utf8" });
}

const CELL_MODEL_STEP = /^Smoke model step (claude-code|codex|grok|opencode|pi|cursor) /;
const STEP_START = /^ {6}- /;

/** The index of the `- ` line that opens the step owning `index`. */
function stepStart(lines, index) {
  for (let i = index; i >= 0; i -= 1) {
    if (STEP_START.test(lines[i])) return i;
  }
  return -1;
}

/** The index just past a step: its children are indented deeper than six spaces. */
function stepEnd(lines, start) {
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "") continue;
    if (lines[i].match(/^ */)[0].length <= 6) return i;
  }
  return lines.length;
}

/**
 * Every `secrets.` reference in the workflow must sit inside the `env:` block of a cell's model step,
 * and that step must be gated to its own harness. Returns one string per violation.
 */
function secretPlacementViolations(lines) {
  const violations = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes("secrets.")) continue;
    const start = stepStart(lines, i);
    if (start === -1) {
      violations.push(`line ${i + 1}: secrets. reference with no owning step`);
      continue;
    }
    const block = lines.slice(start, stepEnd(lines, start));
    const nameLine = block.find((line) => /^ {6}- name: /.test(line));
    const stepName = nameLine ? nameLine.replace(/^ {6}- name: /, "").replace("${{ matrix.track }}", "<track>").trim() : "<unnamed step>";
    const cell = CELL_MODEL_STEP.exec(stepName);
    if (cell === null) {
      violations.push(`line ${i + 1}: secrets. reference outside a cell model step (in "${stepName}")`);
      continue;
    }
    const envAt = block.findIndex((line) => /^ {8}env:$/.test(line));
    if (envAt === -1) {
      violations.push(`line ${i + 1}: "${stepName}" carries a secrets. reference but no env: block`);
      continue;
    }
    let envEnd = block.length;
    for (let j = envAt + 1; j < block.length; j += 1) {
      if (block[j].trim() === "") continue;
      if (block[j].match(/^ */)[0].length <= 8) {
        envEnd = j;
        break;
      }
    }
    const within = i - start;
    if (!(within > envAt && within < envEnd)) {
      violations.push(`line ${i + 1}: secrets. reference in "${stepName}" sits outside its env: block`);
    }
    const gate = block.find((line) => /^ {8}if: /.test(line));
    if (gate === undefined || !gate.includes(`matrix.harness == '${cell[1]}'`)) {
      violations.push(`line ${i + 1}: "${stepName}" is not gated to matrix.harness == '${cell[1]}'`);
    }
  }
  return violations;
}

test("t12-review-record-complete", () => {
  const text = readRecord();
  const edges = parseEdges(text);

  assert.deepEqual(
    [...edges.keys()].sort((a, b) => a - b),
    EDGES,
    "the record answers ten edges — every checklist item carries a verdict, none is left unchecked",
  );

  for (const n of EDGES) {
    const section = edgeOrFail(edges, n);
    const verdict = field(section, "verdict").replace(/`/g, "").trim();
    const severity = field(section, "severity").replace(/`/g, "").trim();
    const owner = field(section, "owner_task").replace(/`/g, "").trim();
    const receipt = field(section, "receipt").trim();

    assert.ok(verdict.length > 0, `edge ${n} has no verdict`);
    assert.ok(
      VERDICT_WORDS.includes(verdict),
      `edge ${n} verdict "${verdict}" is not one of ${VERDICT_WORDS.join(" | ")}`,
    );
    assert.ok(severity.length > 0, `edge ${n} has no severity`);
    assert.ok(
      SEVERITY_WORDS.includes(severity),
      `edge ${n} severity "${severity}" is not one of ${SEVERITY_WORDS.join(" | ")}`,
    );
    assert.ok(owner.length > 0, `edge ${n} names no owner task`);
    assert.ok(
      receipt.length > 20,
      `edge ${n} carries no receipt — every edge needs the command it ran and its output, or a file:line`,
    );
    assert.ok(
      /grep|node |jq |git |assert|\.mjs:\d+|test !/.test(receipt),
      `edge ${n} receipt names no runnable command and no file:line: ${receipt.slice(0, 120)}`,
    );
  }

  const machine = /FINAL_VERDICT:\s*(APPROVED|NEEDS_FIXES)\b/.exec(text);
  const prose = /Final verdict[^\n]*?\b(APPROVED|NEEDS_FIXES)\b/.exec(text);
  const final = machine ?? prose;
  assert.ok(final !== null, `the record states no final verdict; allowed words are ${FINAL_WORDS.join(" | ")}`);
  assert.ok(FINAL_WORDS.includes(final[1]), `final verdict "${final[1]}" is not one of ${FINAL_WORDS.join(" | ")}`);
  assert.match(text, /^## Unresolved blockers$/m, "the record has no '## Unresolved blockers' section");
});

test("t12-edge1-secret-placement", () => {
  const text = readRecord();
  const edge = edgeOrFail(parseEdges(text), 1);

  // Re-run the receipt against the repository's own bytes.
  const result = run("grep", ["-n", "secrets\\.", WORKFLOW_REL]);
  assert.equal(result.error, undefined, `grep could not be executed: ${result.error?.message}`);
  const hits = result.stdout.split("\n").filter((line) => line.trim() !== "");
  assert.ok(hits.length > 0, "the workflow declares no secrets. reference at all — the record's edge 1 claims five");

  const lines = readFileSync(WORKFLOW, "utf8").split("\n");
  assert.deepEqual(secretPlacementViolations(lines), []);

  const receipt = field(edge, "receipt");
  assert.ok(
    receipt.includes("grep -n 'secrets\\.' .github/workflows/harness-eval.yml"),
    "edge 1 does not cite the secret-placement receipt command it was graded by",
  );
  const counted = /(\d+)\s+hits/.exec(receipt);
  assert.ok(counted !== null, `edge 1 cites the command but not its hit count; the command found ${hits.length}`);
  assert.equal(
    Number(counted[1]),
    hits.length,
    `edge 1 records ${counted[1]} hits; the command finds ${hits.length} today`,
  );
});

test("t12-edge2-banned-triggers", () => {
  const text = readRecord();
  const edge = edgeOrFail(parseEdges(text), 2);

  const result = run("grep", ["-Ec", "^  (pull_request|pull_request_target|workflow_run):", WORKFLOW_REL]);
  assert.equal(result.error, undefined, `grep could not be executed: ${result.error?.message}`);
  assert.equal(result.stdout.trim(), "0", "the workflow declares a banned pull_request-family trigger");
  // `grep -c` exits 1 when it matches nothing; that non-zero exit IS the pass.
  assert.equal(result.status, 1, "grep -Ec returned 0 rather than the zero-match exit 1");

  const receipt = field(edge, "receipt");
  assert.ok(
    receipt.includes("grep -Ec '^  (pull_request|pull_request_target|workflow_run):' .github/workflows/harness-eval.yml"),
    "edge 2 does not cite the banned-trigger receipt command it was graded by",
  );
  // The recorded count has to be a number, not a word: "zero" in the surrounding prose must not be
  // able to satisfy this, which is exactly how this assertion first let a wrong receipt through.
  const counted = /(\d+)\s+matches\b/.exec(receipt);
  assert.ok(
    counted !== null,
    `edge 2 cites the command but not its match count; the command reads ${result.stdout.trim()} today`,
  );
  assert.equal(Number(counted[1]), 0, `edge 2 records ${counted[1]} matches; the command reads ${result.stdout.trim()} today`);
});

test("t12-edge8-no-forbidden-salvage", () => {
  const text = readRecord();
  const edge = edgeOrFail(parseEdges(text), 8);

  const command = "test ! -d harness && test ! -f .github/workflows/harness-matrix.yml && grep -c 'harness-matrix' scripts/release.mjs";
  const result = spawnSync("bash", ["-c", command], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.error, undefined, `bash could not be executed: ${result.error?.message}`);
  // An empty stdout means one of the two `test`s failed, so the command never reached `grep`.
  assert.equal(
    result.stdout.trim(),
    "0",
    "the salvage probe did not reach grep: a root-level harness/ directory or .github/workflows/harness-matrix.yml exists",
  );
  assert.equal(result.status, 1, "grep -c 'harness-matrix' found a reference in scripts/release.mjs");

  const receipt = field(edge, "receipt");
  assert.ok(receipt.includes(command), "edge 8 does not cite the full three-part salvage receipt command");
});
