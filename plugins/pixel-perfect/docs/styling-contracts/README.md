# Styling Contracts

A **styling contract** is the canonical, machine-checked statement of *how styles must be expressed* for a chosen (platform × framework × style system × component library) combination. It is the single artifact that closes the gap between *declaring* a style system at EQUIP time and actually *emitting* components in that system at BUILD time.

> **Why this exists.** Before styling contracts, pixel-perfect recorded `tools.style = "tailwind"` in the manifest but never enforced *how* styles were written. Left to "follow adapter conventions," the build could — and once did (the `fabrio` project) — invent a parallel global-CSS system (custom `.atom-*` / `.mol-*` classes ported verbatim from HTML mockup `<style>` blocks into a `styles/` folder), bypassing the declared Tailwind system entirely. A styling contract makes the idiomatic structure explicit and a **deterministic verify gate** blocks any drift. See `workflows/build.md` Phase 5 Step 2c.

## Mental model

```
EQUIP (init)                         BUILD                                      GATE
────────────                         ─────                                      ────
choose style system  ──►  resolve contract  ──►  load contract as hard rule  ──►  verify-styling-contract
   (tailwind, …)           (built-in |            (emit method, file                  (blocks the layer on any
                             researched |           placement, forbidden                  forbidden pattern)
                             manual)                patterns) — never port mockup CSS
```

- **Built-in contracts** (this folder) are pre-researched, curated contracts for the common init-menu choices. They are the fast path.
- **Researched contracts** (`design/research/styling/{id}.md`) are synthesized live by `pixel-perfect:research --styling` for systems not in the menu (SwiftUI, Compose, Flutter, GPUI, TUI, …), vetted against `docs/styling-convention-rubric.md`, and cached for 30 days.
- **Manual contracts** are authored by hand into this folder by advanced users.

BUILD cannot tell the three sources apart — they share one schema and one gate.

## Contract file format

One Markdown file per contract. YAML frontmatter carries identity + provenance; the body carries human/LLM-readable rules; a fenced ```` ```yaml checks ```` block carries the machine-runnable detections the gate executes.

### Frontmatter

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique contract id, kebab-case (matches the filename). |
| `name` | string | Human-readable name. |
| `appliesTo.platforms` | string[] | `web-desktop`, `web-mobile`, `mobile-ios`, `mobile-android`. |
| `appliesTo.frameworks` | string[] | `react`, `nextjs`, `vite`, `sveltekit`, `react-native`, `expo`, `swift`, `kotlin`, `flutter`, `rust-gpui`, `rust-tui`, … |
| `appliesTo.styleSystem` | string | `tailwind`, `css-modules`, `nativewind`, `stylesheet`, `shadcn`, `paper`, `swiftui`, … |
| `appliesTo.componentLibrary` | string | `any`, `shadcn`, `paper`, `none`, … |
| `source` | string | `builtin` \| `researched` \| `manual`. |
| `canonicalDocs` | url | Official documentation the contract is grounded in. |
| `lastUpdated` | date | YYYY-MM-DD. Triggers a staleness nudge when old (see Staleness below). |

### Body sections

- **Emit method** — *how* styles are expressed (`how` slug + description + concrete examples). This is what BUILD must do.
- **File placement** — where styles live (`rule`: `colocated` | `central` | `hybrid`; allowed/forbidden locations).
- **Token binding** — how design tokens reach components (the mechanism + access pattern). Ensures the theme flows through the chosen system, not a side channel.
- **Forbidden patterns** — the anti-patterns, each with a rationale. These become blocking gate checks.
- **Verify checklist** — the human-readable component/screen checks (promoted from the adapter "Verify" sections). Advisory; the gate enforces the `checks` block.

### The `checks` block (machine-runnable)

The gate (`scripts/verify-styling-contract.mjs`) parses this fenced block and runs the detections deterministically. The block is **JSON** (not YAML) so the gate can `JSON.parse` it with **zero dependencies** — the script must run inside arbitrary user projects where no YAML library is guaranteed. It is the only ```` ```json ```` fence in a contract file, which is how the gate locates it. Regex values follow standard JSON escaping (each `\` becomes `\\`). Two kinds of checks:

**`forbiddenPatterns[]`** — block the layer when matched.

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Stable id for the violation report. |
| `mode` | no | `content` (default — scan files for `regex`) or `exists` (any file matching `glob` is a violation). |
| `glob` | yes | Array of glob patterns scoping the search (relative to the project source root). |
| `exclude` | no | Array of glob patterns to exclude from the scan. |
| `regex` | yes (mode `content`) | ECMAScript regex string; any matching **line** is a violation. |
| `rationale` | yes | One sentence — shown in the report and used for override decisions. |

**`mustInclude[]`** — block when a scoped file lacks the expected content.

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Stable id. |
| `glob` | yes | Files that must satisfy the check. |
| `exclude` | no | Globs to exclude (barrel files, stories, tests). |
| `regex` | yes | Must appear in **every** non-excluded file matching `glob`. |
| `description` | yes | One sentence. |

> Glob syntax is Node `minimatch`-compatible (`**` for any depth); minimatch is vendored by the gate script so it is also zero-dependency. `regex` is matched per-line (first match per line is enough). Keep checks **high-signal, low-false-positive** — prefer scoped globs over repo-wide scans.

## How the gate runs (determinism)

The contract's `checks` block is the single source of truth. The BUILD gate executes it via `scripts/verify-styling-contract.mjs <contract-path> <source-root>`:

- exit `0` + JSON report `{"violations":[],"passed":[...]}` → layer proceeds.
- exit `1` + report listing every violation (file, line, pattern id, rationale) → **layer blocks** until fixed or a per-component override is recorded in the manifest (`tools.style_contract_overrides`).

Non-Node targets run the equivalent `grep`/`glob` commands directly (the build command documents the fallback). The LLM only formats the report and suggests fixes — the pass/fail decision is deterministic.

## Authoring a manual contract

1. Copy `tailwind-web.md` as a template.
2. Fill the frontmatter (`source: manual`, `canonicalDocs`, `lastUpdated`).
3. Write the body sections from the official docs of the system.
4. Write the `checks` block. Run `node scripts/verify-styling-contract.mjs docs/styling-contracts/<id>.md <sample-source>` against a known-good and a known-bad source to confirm the checks fire correctly (real execution — do not assume).
5. Validate the frontmatter against the schema above.

## Staleness

Style systems evolve (e.g. Tailwind v3 → v4). Built-ins carry `lastUpdated`. When a built-in is older than ~90 days, INIT nudges: "Built-in contract `<id>` was last reviewed `<date>`. Re-run `pixel-perfect:research --styling` to refresh?" Re-research writes to `design/research/styling/` (it does not overwrite the shipped built-in).

## Index of built-in contracts

| Contract | Platform | Style system | File |
|----------|----------|--------------|------|
| Tailwind CSS (Web) | web | tailwind | `tailwind-web.md` |
| shadcn/ui + Tailwind (Web) | web | tailwind + shadcn | `shadcn-tailwind-web.md` |
| CSS Modules (Web) | web | css-modules | `css-modules-web.md` |
| NativeWind (Mobile) | mobile | nativewind | `nativewind-mobile.md` |
| React Native StyleSheet (Mobile) | mobile | stylesheet | `rn-stylesheet-mobile.md` |
| React Native Paper (Mobile) | mobile | paper | `paper-md3-mobile.md` |
