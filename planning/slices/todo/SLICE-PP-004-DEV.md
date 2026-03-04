# SLICE-PP-004-DEV: Trim SKILL.md Context Overhead and Reduce scaffold.md Weight

---

## Metadata

SLICE-ID: PP-004
ROLE: Dev
STATUS: BLOCKED (waiting for PP-002-DEV merge)
PRIORITY: HIGH
EFFORT: M
TYPE: refactor
EVIDENCE_TIER: T3
PARENT_SLICE: PP-004
DEPENDS_ON: PP-002-DEV
CONTEXT_SCOPE: SLICE
TASK_LIST_ID: PP-004-DEV

---

## Context Scope (HIERARCHICAL CONTEXT POLICY)

**Your context scope: SLICE**

### You Receive:
- This slice definition (full document)
- Git diff of PP-002 (prior merge that touched SKILL.md)
- Current content of SKILL.md and scaffold.md

### You Do NOT Receive:
- Other slice details
- QA feedback from other slices
- Conversation history from prior sessions

---

## Dev Environment

**Model:** Claude Sonnet 4.6
**Environment:** Claude Code CLI
**MCP Servers Available:** None required
**Major Tools Available:** Read, Edit

---

## Scope

**Finding #5 — SKILL.md context overhead:** `skills/process-context/SKILL.md` auto-activates whenever `design/manifest.json` exists, adding ~15-20% context overhead to every interaction in a pixel-perfect project. The file duplicates content already available in specific command docs (storybook-conventions.md, adapter docs). The goal is to trim it to essential phase-awareness content only.

**Finding #6 — scaffold.md weight:** `commands/scaffold.md` is ~600 lines (3-5× heavier than other command files). Much of the bulk comes from inline adapter-specific scaffold steps that duplicate content in adapter docs. The goal is to streamline scaffold.md to orchestration logic, referencing adapters for tool-specific details.

---

## WRITE-ALLOWED

- `skills/process-context/SKILL.md` — Trim to essential phase-awareness content
- `commands/scaffold.md` — Reduce weight by removing duplicated inline examples

---

## WRITE-PROHIBITED

- `docs/adapters/` — Do NOT modify adapter docs (content moves TO adapters FROM scaffold.md, but adapter files themselves are owned by other slices)
- `commands/init.md` — Do NOT modify
- `commands/build.md` — Do NOT modify
- `commands/verify.md` — Do NOT modify

---

## Implementation Steps

### Step 1: Trim SKILL.md

Read `skills/process-context/SKILL.md` in full.

**Content to KEEP** (essential phase-awareness, cannot be easily sourced elsewhere at runtime):
- The `autoActivate` frontmatter
- The "pixel-perfect v4.3.1" version line
- The Legacy YAML Migration section (auto-migration behavior)
- Your Responsibilities list (6 bullet points)
- The "Read the Manifest" section (brief, critical)
- The Phase Awareness table (which phase = which actions)
- The Adapter Conventions (tool-specific rules — the `when X do Y` patterns)
- The Story Organization Convention (title prefix table)
- The Commands Reference table

**Content to REMOVE or SHORTEN** (already covered in dedicated docs):
- The Storybook Controls Convention table → REMOVE; agents can read `docs/storybook-conventions.md` for this
- The Design Token Stories Convention section → SHORTEN to 1 sentence pointing to storybook-conventions.md
- The Polyfill Disclaimer Convention code block → REMOVE the full code block; keep 1 sentence noting it's required and pointing to the react-native-web adapter
- The Manifest Updates section (JSON examples) → REMOVE; agents can read the manifest directly and follow the phase-specific commands

**Target size:** ~100 lines (from ~195 lines). Remove ~95 lines.

The trimmed SKILL.md should focus on WHAT to do in each phase, not HOW (the HOW is in adapter docs and command files).

### Step 2: Trim scaffold.md

Read `commands/scaffold.md` in full.

The file is heavy because it includes:
- Full inline step-by-step scaffold instructions for each tool combination
- Long config file examples (tailwind.config.js, .storybook/main.ts, etc.) repeated in adapter docs
- Inline hello-world component code
- Inline token story code

**Trimming strategy:**
- Keep the command structure (phases, gate checks, step ordering)
- Replace inline tool-specific config blocks with: "Follow the scaffold steps in `docs/adapters/{tool}.md`"
- Keep the high-level step descriptions (Step 1: Install, Step 2: Configure Storybook, etc.)
- Remove verbatim code blocks that are already in adapter docs

**Target:** Reduce from ~600 lines to ~200-250 lines. The command becomes an orchestrator that delegates detail to adapter docs.

**Do NOT remove:**
- Gate check logic
- Phase progression logic
- Semantic color enforcement section (unique to scaffold.md, not in adapters)
- Completion output format
- Frontend-design integration notes

### Step 3: Verify Size Reduction

```bash
wc -l skills/process-context/SKILL.md
# Expected: <120 lines

wc -l commands/scaffold.md
# Expected: <280 lines

# Confirm no broken references (files that SKILL.md now points to should exist)
grep -n "storybook-conventions.md\|react-native-web.md" skills/process-context/SKILL.md
# Verify these files exist at the referenced paths
```

### Step 4: Self-Review

Before submitting evidence, read the trimmed SKILL.md and ask:
- Does it still tell the agent everything needed to operate correctly in phase-aware mode?
- Are the adapter conventions complete (tailwind, shadcn, react-native-paper, storybook)?
- Does it still correctly define the Story Organization hierarchy?

Read the trimmed scaffold.md and ask:
- Can an agent follow this to scaffold a new project without the removed content?
- Are all adapter references pointing to files that exist?
- Is the semantic color enforcement section still present?

---

## Acceptance Criteria

1. `skills/process-context/SKILL.md` is ≤120 lines
2. `skills/process-context/SKILL.md` retains: phase awareness table, adapter conventions, story organization, commands reference
3. `skills/process-context/SKILL.md` removes: full controls convention table, full manifest JSON examples, full polyfill decorator code block
4. `commands/scaffold.md` is ≤280 lines
5. `commands/scaffold.md` retains: gate checks, phase progression logic, semantic color enforcement, step headers
6. `commands/scaffold.md` removes: inline tool config code blocks that duplicate adapter docs
7. All adapter references in trimmed files point to files that exist in `docs/adapters/`

---

## Quality Gates

```bash
wc -l skills/process-context/SKILL.md
# Expected: ≤120

wc -l commands/scaffold.md
# Expected: ≤280

# Phase Awareness table still present in SKILL.md
grep -c "Current Phase\|discover\|scaffold\|atoms\|compose\|integrate" skills/process-context/SKILL.md
# Expected: >5 matches

# Adapter conventions still present in SKILL.md
grep -c "When.*tailwind\|When.*shadcn\|When.*react-native-paper\|When.*storybook" skills/process-context/SKILL.md
# Expected: >3 matches

# Semantic color enforcement still in scaffold.md
grep -n "semantic color\|Semantic color\|semantic-color" commands/scaffold.md
# Expected: at least 1 match

git diff --name-only
# Expected: only skills/process-context/SKILL.md and commands/scaffold.md
```

---

## Deliverables

1. Trimmed `skills/process-context/SKILL.md` (≤120 lines)
2. Trimmed `commands/scaffold.md` (≤280 lines)
3. Evidence: `wc -l` output for both files saved to `.tmp/evidence/PP-004/line-counts.txt`
4. Brief note on what was removed and what was kept (included in evidence bundle)

---

--- END SLICE: PP-004-DEV ---
