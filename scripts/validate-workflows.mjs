#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_ROOT = "plugins/pixel-perfect";

// Workflows that collect decisions from the user. Each must declare at least one
// user_choice batch; none may print a decision as prose.
const INTERACTIVE_WORKFLOWS = ["add-platform", "build", "evolve", "init", "refine", "scaffold", "wireframe"];
// Workflows that never ask. Linted for prose decisions only.
const SILENT_WORKFLOWS = ["design-deconstruct", "research", "status", "verify"];
const INTERNAL_SKILLS = ["deconstruct-engine", "process-context"];

const CONTRACT_REQUIREMENTS = [
  "USER_CHOICE",
  "user_choice",
  "multiSelect",
  "self-contained",
  "Turn shape",
  "DIGEST",
  "How this workflow asks",
];

const PROSE_DECISION = /^\s*\?\s+\S/;
const STALE_ROUND_TRIP = /\[Yes \/ No, choose different\]/;
const FENCE_OPEN = /^\s*```user_choice\s*$/;
const FENCE_ANY = /^\s*```/;
const RECOMMENDED = /\(Recommended\)\s*$/;

const MAX_QUESTIONS_PER_BATCH = 4;
const MAX_HEADER_LENGTH = 12;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;
// A description shorter than this cannot carry what an option is, what it means, and its
// trade-off. Length is a proxy for "self-contained"; it catches bare product names.
const MIN_DESCRIPTION_LENGTH = 40;

// The section every interactive workflow uses to declare its round-trip cost up front.
const ASKS_HEADING = /^##\s+How this workflow asks\s*$/;
const BATCH_TABLE_ROW = /^\|\s*Batch\s*\|/;
const BATCH_DECLARATION = /^batch:\s*([^\s—-]+(?:-[^\s—]+)*)/;

// An unlabeled fenced block is an illustrative output the agent will imitate. Past this many
// lines it stops being a digest and becomes the wall of text that made build unusable.
const DIGEST_MAX_LINES = 12;
// Only blocks a workflow tells the agent to emit are capped. A file-format sample, a command
// to run, or a JSON schema is reference material and may be as long as it needs to be.
const PRESENTATION_CUE = /\b(present|presents|output|outputs|report|reports|display|displays|show|shows|print|prints|digest|digests)\b/i;
const FENCE_DELIMITER = /^(\s*)(`{3,})\s*(\S*)\s*$/;

class WorkflowValidationError extends Error {
  constructor(details) {
    super("workflow validation failed");
    this.details = details;
  }
}

function indentOf(line) {
  return line.length - line.trimStart().length;
}

// A fence nested inside a list item carries that list's indentation on every line. Strip the
// common prefix so the structure below sees the same shape either way.
function dedent(body) {
  const indents = body.filter((entry) => entry.text.trim()).map((entry) => indentOf(entry.text));
  const common = indents.length ? Math.min(...indents) : 0;
  return common === 0 ? body : body.map((entry) => ({ ...entry, text: entry.text.slice(common) }));
}

// Collects the user_choice fences in a document, preserving 1-based line numbers so every
// error can point at the offending line.
function collectFences(lines) {
  const fences = [];
  let open = null;
  for (const [index, line] of lines.entries()) {
    if (open === null) {
      if (FENCE_OPEN.test(line)) open = { startLine: index + 1, body: [] };
      continue;
    }
    if (FENCE_ANY.test(line)) {
      fences.push({ ...open, body: dedent(open.body) });
      open = null;
      continue;
    }
    open.body.push({ text: line, line: index + 1 });
  }
  if (open !== null) fences.push({ ...open, body: dedent(open.body), unterminated: true });
  return fences;
}

// Splits one fence into its question entries. A question starts at a `- header:` line at the
// fence's outermost indent; everything up to the next one belongs to it.
function splitQuestions(body) {
  const questions = [];
  let current = null;
  for (const entry of body) {
    const header = /^-\s+header:\s*(.*)$/.exec(entry.text.trim());
    if (header && indentOf(entry.text) === 0) {
      if (current) questions.push(current);
      current = { header: header[1].trim(), line: entry.line, body: [] };
      continue;
    }
    if (current) current.body.push(entry);
  }
  if (current) questions.push(current);
  return questions;
}

// Groups a question's options by the `options:` key that introduced them, so a keyed list
// (`options[react|nextjs|vite]:`) is counted per framework rather than in aggregate.
function splitOptionGroups(body) {
  const groups = [];
  let current = null;
  let pendingDescription = null;

  const flushDescription = () => {
    if (pendingDescription) pendingDescription.done = true;
    pendingDescription = null;
  };

  for (const entry of body) {
    const trimmed = entry.text.trim();
    const optionsKey = /^options(\[[^\]]*\])?:\s*(.*)$/.exec(trimmed);
    if (optionsKey) {
      flushDescription();
      current = { key: optionsKey[1] ?? "", line: entry.line, options: [] };
      groups.push(current);
      // Shorthand form: `options[web]: Next.js · Vite · SvelteKit` names labels inline and
      // carries its descriptions elsewhere in the workflow prose. Not a structured group.
      if (optionsKey[2].trim()) current.shorthand = true;
      continue;
    }

    const label = /^-\s+label:\s*(.*)$/.exec(trimmed);
    if (label && current) {
      flushDescription();
      current.options.push({ label: label[1].trim(), line: entry.line, description: "" });
      continue;
    }

    const description = /^description:\s*(.*)$/.exec(trimmed);
    if (description && current && current.options.length > 0) {
      const option = current.options.at(-1);
      option.description = description[1].trim();
      pendingDescription = option;
      continue;
    }

    // A continuation line extends the description it follows.
    if (pendingDescription && !pendingDescription.done && trimmed && !trimmed.startsWith("-")) {
      pendingDescription.description += ` ${trimmed}`;
      continue;
    }
    flushDescription();
  }
  return groups;
}

function lintFence(fence, relativePath, errors) {
  const at = (line) => `${relativePath}:${line}`;

  if (fence.unterminated) {
    errors.push(`${at(fence.startLine)} user_choice block is never closed`);
    return;
  }
  if (!fence.body.some((entry) => /^batch:\s*\S/.test(entry.text.trim()))) {
    errors.push(`${at(fence.startLine)} user_choice block must declare a batch`);
  }

  const questions = splitQuestions(fence.body);
  if (questions.length === 0) {
    errors.push(`${at(fence.startLine)} user_choice block declares no questions`);
    return;
  }
  if (questions.length > MAX_QUESTIONS_PER_BATCH) {
    errors.push(
      `${at(fence.startLine)} user_choice batch has ${questions.length} questions (max ${MAX_QUESTIONS_PER_BATCH})`,
    );
  }

  for (const question of questions) {
    if (!question.header) {
      errors.push(`${at(question.line)} question has an empty header`);
    } else if (question.header.length > MAX_HEADER_LENGTH) {
      errors.push(
        `${at(question.line)} header "${question.header}" is ${question.header.length} characters (max ${MAX_HEADER_LENGTH})`,
      );
    }
    if (!question.body.some((entry) => /^question:\s*\S/.test(entry.text.trim()))) {
      errors.push(`${at(question.line)} question "${question.header}" has no question text`);
    }

    const multiSelect = question.body.some((entry) => /^multiSelect:\s*true\s*$/.test(entry.text.trim()));
    const groups = splitOptionGroups(question.body);
    if (groups.length === 0) {
      errors.push(`${at(question.line)} question "${question.header}" has no options`);
      continue;
    }

    for (const group of groups) {
      if (group.shorthand) continue;
      const label = group.key ? `options${group.key}` : "options";
      if (group.options.length < MIN_OPTIONS || group.options.length > MAX_OPTIONS) {
        errors.push(
          `${at(group.line)} ${label} for "${question.header}" has ${group.options.length} options (need ${MIN_OPTIONS}-${MAX_OPTIONS})`,
        );
      }

      for (const option of group.options) {
        if (option.description.length < MIN_DESCRIPTION_LENGTH) {
          errors.push(
            `${at(option.line)} option "${option.label}" needs a self-contained description (${option.description.length} characters, need ${MIN_DESCRIPTION_LENGTH}+)`,
          );
        }
      }

      const recommended = group.options.filter((option) => RECOMMENDED.test(option.label));
      if (!multiSelect) {
        if (recommended.length > 1) {
          errors.push(`${at(group.line)} ${label} for "${question.header}" marks ${recommended.length} options (Recommended); only one may be`);
        }
        if (recommended.length === 1 && !RECOMMENDED.test(group.options[0]?.label ?? "")) {
          errors.push(`${at(recommended[0].line)} option "${recommended[0].label}" is marked (Recommended) but is not first`);
        }
      } else if (recommended.length > 0) {
        // A harness cannot pre-check a box, so proposed options must sort first.
        const firstUnmarked = group.options.findIndex((option) => !RECOMMENDED.test(option.label));
        const lastMarked = group.options.reduce((last, option, index) => (RECOMMENDED.test(option.label) ? index : last), -1);
        if (firstUnmarked !== -1 && lastMarked > firstUnmarked) {
          errors.push(`${at(group.line)} ${label} for "${question.header}" must sort every (Recommended) option before the unmarked ones`);
        }
      }
    }
  }
}

// Walks every fenced block in a document, closing on a delimiter of at least the opening
// length so a ````markdown sample containing ``` blocks is read as one fence, not three.
function collectAllFences(lines) {
  const fences = [];
  let open = null;
  for (const [index, line] of lines.entries()) {
    const match = FENCE_DELIMITER.exec(line);
    if (open === null) {
      if (match) open = { startLine: index + 1, ticks: match[2].length, info: match[3], body: [] };
      continue;
    }
    if (match && match[2].length >= open.ticks && !match[3]) {
      fences.push(open);
      open = null;
      continue;
    }
    open.body.push(line);
  }
  if (open !== null) fences.push(open);
  return fences;
}

// Flags illustrative output blocks that a workflow tells the agent to emit and that run past
// the digest budget. This is the rule that keeps a build plan from growing back into a report.
function lintDigestBudget(lines, relativePath, errors) {
  for (const fence of collectAllFences(lines)) {
    if (fence.info) continue;
    if (fence.body.length <= DIGEST_MAX_LINES) continue;

    // The two nearest non-blank lines above the fence say what the block is for.
    const preceding = lines
      .slice(0, fence.startLine - 1)
      .filter((line) => line.trim())
      .slice(-2)
      .join(" ");
    if (!PRESENTATION_CUE.test(preceding)) continue;

    errors.push(
      `${relativePath}:${fence.startLine} printed output is ${fence.body.length} lines (max ${DIGEST_MAX_LINES}) — digest it and put the detail in the workflow's brief`,
    );
  }
}

// Every interactive workflow declares its batches in one table, so its round-trip cost is
// reviewable rather than emergent, and no batch can be added without accounting for it.
function lintAsksSection(lines, relativePath, errors) {
  const headingIndex = lines.findIndex((line) => ASKS_HEADING.test(line));
  if (headingIndex === -1) {
    errors.push(`${relativePath} has no "## How this workflow asks" section declaring its batches`);
    return;
  }

  const nextHeading = lines.findIndex((line, index) => index > headingIndex && /^##\s+\S/.test(line));
  const section = lines.slice(headingIndex, nextHeading === -1 ? lines.length : nextHeading);
  if (!section.some((line) => BATCH_TABLE_ROW.test(line.trim()))) {
    errors.push(`${relativePath}:${headingIndex + 1} "How this workflow asks" needs a table whose first column is Batch`);
    return;
  }

  const table = section.join("\n");
  const declared = new Set();
  for (const line of lines) {
    const match = BATCH_DECLARATION.exec(line.trim());
    if (match) declared.add(match[1]);
  }
  for (const id of declared) {
    if (!new RegExp(`\\|\\s*${id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\|`).test(table)) {
      errors.push(`${relativePath} batch "${id}" is asked but missing from the "How this workflow asks" table`);
    }
  }
}

/**
 * Lints one workflow document. Pure: takes text, returns `file:line` errors.
 *
 * @param {string} text document contents
 * @param {string} relativePath path used in error messages
 * @param {{ structural?: boolean, interactive?: boolean }} [options] structural checks apply to
 *   canonical workflows; the asks-section check applies to the interactive ones
 * @returns {string[]}
 */
export function lintWorkflowText(text, relativePath, options = {}) {
  const { structural = true, interactive = false } = options;
  const errors = [];
  const lines = text.split("\n");

  for (const [index, line] of lines.entries()) {
    if (PROSE_DECISION.test(line)) {
      errors.push(`${relativePath}:${index + 1} prose decision — collect it with USER_CHOICE instead of printing it`);
    }
    if (STALE_ROUND_TRIP.test(line)) {
      errors.push(`${relativePath}:${index + 1} yes/no round trip — offer the detected value as option 1 instead`);
    }
  }

  if (!structural) return errors;
  // Only workflows that ask are budgeted. A workflow whose deliverable IS a report — status,
  // research, design-deconstruct — is doing exactly what it was invoked to do at any length.
  if (interactive) {
    lintDigestBudget(lines, relativePath, errors);
    lintAsksSection(lines, relativePath, errors);
  }
  for (const fence of collectFences(lines)) lintFence(fence, relativePath, errors);
  return errors;
}

export async function validateWorkflows(root = REPOSITORY_ROOT) {
  const errors = [];
  const targets = [
    ...INTERACTIVE_WORKFLOWS.map((name) => ({ relativePath: `${PLUGIN_ROOT}/workflows/${name}.md`, interactive: true })),
    ...SILENT_WORKFLOWS.map((name) => ({ relativePath: `${PLUGIN_ROOT}/workflows/${name}.md`, interactive: false })),
    { relativePath: `${PLUGIN_ROOT}/workflows/RUNTIME-CONTRACT.md`, interactive: false },
    ...INTERNAL_SKILLS.map((name) => ({
      relativePath: `${PLUGIN_ROOT}/skills/${name}/SKILL.md`,
      interactive: false,
      structural: false,
    })),
  ];

  await Promise.all(
    targets.map(async ({ relativePath, interactive, structural = true }) => {
      let content;
      try {
        content = await readFile(path.join(root, relativePath), "utf8");
      } catch (error) {
        errors.push(`${relativePath}: ${error.message}`);
        return;
      }
      errors.push(...lintWorkflowText(content, relativePath, { structural, interactive }));
      if (interactive && !content.split("\n").some((line) => FENCE_OPEN.test(line))) {
        errors.push(`${relativePath} collects decisions but declares no user_choice batch`);
      }
    }),
  );

  const contractPath = `${PLUGIN_ROOT}/workflows/RUNTIME-CONTRACT.md`;
  try {
    const contract = await readFile(path.join(root, contractPath), "utf8");
    const missing = CONTRACT_REQUIREMENTS.filter((term) => !contract.includes(term));
    if (missing.length) errors.push(`${contractPath} user choice protocol is missing: ${missing.join(", ")}`);
  } catch {
    // The missing-file case is already reported above.
  }

  if (errors.length) throw new WorkflowValidationError([...new Set(errors)]);
  return { workflows: targets.length, interactive: INTERACTIVE_WORKFLOWS.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  validateWorkflows()
    .then((result) =>
      process.stdout.write(`workflows valid: ${result.workflows} documents, ${result.interactive} interactive\n`),
    )
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      for (const detail of error.details ?? []) process.stderr.write(`- ${detail}\n`);
      process.exitCode = 1;
    });
}
