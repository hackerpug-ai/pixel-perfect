# SLICE-PP-002-DEV: Fix Version Staleness and status.md Mobile Sandbox

---

## Metadata

SLICE-ID: PP-002
ROLE: Dev
STATUS: BLOCKED (waiting for PP-001-DEV merge)
PRIORITY: HIGH
EFFORT: XS
TYPE: bugfix
EVIDENCE_TIER: T3
PARENT_SLICE: PP-002
DEPENDS_ON: PP-001-DEV
CONTEXT_SCOPE: SLICE
TASK_LIST_ID: PP-002-DEV

---

## Context Scope (HIERARCHICAL CONTEXT POLICY)

**Your context scope: SLICE**

### You Receive:
- This slice definition (full document)
- Git diff of PP-001 (the prior merge that touched init.md)
- Relevant codebase content for this slice

### You Do NOT Receive:
- PP-001-QA feedback
- Other slice details
- Conversation history from prior sessions

---

## Dev Environment

**Model:** Claude Sonnet 4.6
**Environment:** Claude Code CLI
**MCP Servers Available:** None required
**Major Tools Available:** Read, Edit, Grep

---

## Scope

**Finding #3 — Version staleness:** Commands display "v4.0" but the plugin is at v4.3.1. The version string appears in `commands/status.md` (2 occurrences) and `skills/process-context/SKILL.md` (1 occurrence). The manifest `"version"` field in `commands/init.md` also shows `"4.0"`.

**Finding #4 — Wrong sandbox in status.md sample:** The status.md sample output shows a mobile project (Expo + NativeWind + React Native Paper) but lists `Sandbox: Storybook (adapter: storybook.md, web-only via react-native-web)`. For a mobile React Native project, the sandbox is `Storybook Native` via `storybook-native.md`, NOT the web storybook adapter.

---

## WRITE-ALLOWED

- `commands/status.md` — Update version string (×2) and fix sandbox sample
- `skills/process-context/SKILL.md` — Update version string (×1)
- `commands/init.md` — Update manifest `"version"` field in example outputs

---

## WRITE-PROHIBITED

- `commands/build.md`
- `commands/verify.md`
- `commands/scaffold.md`
- Any docs/ files

---

## Implementation Steps

### Step 1: Fix Version Strings in status.md

Read `commands/status.md`. Find the two occurrences of `pixel-perfect v4.0`:

1. In the "Sample Output" section header: `pixel-perfect v4.0 — Project Status`
2. In the "No Manifest Found" section: `pixel-perfect v4.0 — Project Status`

Change both to: `pixel-perfect v4.3.1 — Project Status`

### Step 2: Fix Wrong Sandbox in status.md Sample

In the "Sample Output" section, the Tools block currently reads:

```
Tools:
  Framework:  Expo
  Style:      NativeWind        (adapter: tailwind.md)
  Components: React Native Paper (adapter: react-native-paper.md)
  Sandbox:    Storybook          (adapter: storybook.md, web-only via react-native-web)
```

This is a mobile project (Expo). The sandbox for mobile projects is Storybook Native, not Storybook Web. Update to:

```
Tools:
  Framework:  Expo
  Style:      NativeWind          (adapter: tailwind.md)
  Components: React Native Paper  (adapter: react-native-paper.md)
  Sandbox:    Storybook Native    (adapter: storybook-native.md)
```

### Step 3: Fix Version String in SKILL.md

Read `skills/process-context/SKILL.md`. Find:
```
pixel-perfect v4.0
```

Change to:
```
pixel-perfect v4.3.1
```

### Step 4: Fix Manifest Version in init.md

Read `commands/init.md`. Find the manifest output examples showing `"version": "4.0"`.

Update all occurrences of `"version": "4.0"` to `"version": "4.3.1"` in the manifest JSON examples.

Note: If PP-001's changes to init.md introduced any whitespace drift around the manifest examples, be careful to match the surrounding context precisely.

### Step 5: Verify

```bash
# No v4.0 strings remain in any command or skill file
grep -rn "v4\.0\|\"version\": \"4\.0\"" commands/ skills/

# storybook.md (web) not shown for mobile projects in status.md
grep -n "storybook\.md" commands/status.md
```

Expected: Zero occurrences of `v4.0` in all listed files. `storybook.md` appears only in web example context (not in mobile sample output).

---

## Acceptance Criteria

1. `commands/status.md` shows `pixel-perfect v4.3.1` in both sample headers
2. `commands/status.md` mobile Tools block shows `Storybook Native (adapter: storybook-native.md)`
3. `skills/process-context/SKILL.md` shows `pixel-perfect v4.3.1`
4. `commands/init.md` manifest examples show `"version": "4.3.1"`
5. Zero occurrences of `v4.0` or `"version": "4.0"` anywhere in `commands/` or `skills/`
6. No other content in any file was modified

---

## Quality Gates

```bash
grep -rn "v4\.0" commands/ skills/ | wc -l
# Expected: 0

grep -rn "\"version\": \"4\.0\"" commands/ | wc -l
# Expected: 0

grep -n "storybook-native\.md" commands/status.md
# Expected: at least 1 match (the fixed sandbox line)
```

---

## Deliverables

1. Edited `commands/status.md`
2. Edited `skills/process-context/SKILL.md`
3. Edited `commands/init.md`
4. Evidence: `grep -rn "v4\.0" commands/ skills/` output showing 0 matches saved to `.tmp/evidence/PP-002/after-grep.txt`

---

--- END SLICE: PP-002-DEV ---
