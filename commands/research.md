---
description: "Research UI/UX design patterns, trends, and competitor designs using web search tools"
agent: primary
---

# Design Research

Research UI/UX design patterns, trends, and competitor designs using web search tools. Save findings to a research library that informs the DISCOVER phase and ongoing design decisions.

## Usage

```
/pixel-perfect:research <query> [options]
/pixel-perfect:research --topic <topic> [options]
/pixel-perfect:research --trend <trend-name> [options]
/pixel-perfect:research --competitor <url> [options]
/pixel-perfect:research --libraries <pattern> [options]
/pixel-perfect:research --ecosystem <pattern> [options]
/pixel-perfect:research --styling <style-system> --framework <framework> [--docs <url>] [options]
```

## Arguments

- `<query>`: Free-form search query for design research

## Options

- `--topic <topic>`: Research a specific design topic (e.g., "mobile-navigation", "form-design")
- `--trend <name>`: Research current design trends (e.g., "bento-grids", "glassmorphism")
- `--competitor <url>`: Analyze a competitor's design patterns
- `--libraries <pattern>` or `--ecosystem <pattern>`: Research ecosystem libraries for a UI pattern (e.g., "data-table", "date-picker", "drag-and-drop")
- `--styling <style-system>`: Research the idiomatic **styling conventions** for a style system that has no built-in contract (e.g. "SwiftUI", "Jetpack Compose", "Flutter", "Lipgloss", "Textual", or any "Other" choice from `/pixel-perfect:init`). Synthesizes a styling contract. Requires `--framework`.
- `--docs <url>`: Official documentation URL for the style system (the `tools.style_docs` value recorded at EQUIP time when the user picked "Other"). Strongly preferred — it grounds the contract in the vendor's docs rather than blog posts.
- `--framework <name>`: Filter library results to framework-compatible libraries (inferred from manifest if available); **required** for `--styling`.
- `--max-results <n>`: Maximum library results to return (default: 5)
- `--sources <list>`: Specific sources to use (exa, jina, web)
- `--save`: Save research to design/research/ folder (default: true)
- `--append <file>`: Append to existing research file
- `--no-save`: Display research only, don't save

## Research Sources

The command uses available web search tools in priority order:

| Source | Description | Use For |
|--------|-------------|---------|
| **Exa** | Advanced semantic search | Design articles, case studies, trend analysis |
| **Jina** | Web reading and URL analysis | Extracting patterns from specific URLs |
| **Web Search** | General web search | Broad queries, fallback |

Source availability is detected automatically with graceful fallback.

## Output Location

Research artifacts save to `design/research/` (compatible with the manifest structure):

```
design/
├── manifest.json          # Process state (created by init)
└── research/              # Research artifacts
    ├── INDEX.md           # Catalog of all research
    ├── topics/
    │   ├── mobile-navigation.md
    │   └── form-design.md
    ├── trends/
    │   ├── bento-grids.md
    │   └── glassmorphism.md
    ├── competitors/
    │   └── competitor-name.md
    └── libraries/
        ├── data-table.md
        └── drag-and-drop.md
    └── styling/                  # Researched styling contracts (built-ins live in docs/styling-contracts/)
        ├── swiftui-view-modifiers.md
        └── flutter-material.md
```

## Library Research Mode

Research ecosystem libraries for a specific UI pattern, scored against the vetting rubric in `docs/library-vetting-rubric.md`. Results are saved to `design/research/libraries/` and reused by the Ecosystem Scan (Phase 4b Step 2b of `/pixel-perfect:build`) for 30 days.

### When to Use

- **Before `/pixel-perfect:build`**: Pre-research libraries so the BUILD PLAN has scored recommendations ready
- **During `/pixel-perfect:build`**: The Ecosystem Scan triggers this automatically for complex patterns
- **Independently**: "What's the best React chart library right now?"

### Workflow

```
1. User runs: /pixel-perfect:research --libraries "data-table"

2. Command:
   a. Detects framework from manifest (or --framework flag)
   b. Searches for candidates:
      - "best {framework} data-table library 2026"
      - "{framework} data-table component npm"
      - "data-table library comparison 2026"
   c. For each candidate (up to --max-results):
      - Verifies npm/GitHub existence, downloads, stars
      - Checks recent commits, open/closed issue ratio
      - Applies vetting rubric from docs/library-vetting-rubric.md
      - Scores and ranks
   d. Presents ranked, scored results
   e. Saves to design/research/libraries/data-table.md

3. Output:
   LIBRARY RESEARCH: data-table (React Vite)
   =======================================

   #1 TanStack Table — 8/8 ★ Top pick
      Package: @tanstack/react-table@^8.20.0
      Weekly downloads: 2.1M | Stars: 26K+
      Bundle: ~13KB gzipped (tree-shakeable)
      Last release: 2026-05-15
      License: MIT
      Tradeoffs: Headless — requires UI wrapper. shadcn/ui provides a built-in wrapper.

   #2 AG Grid — 7/8
      Package: ag-grid-react@^32.0.0
      Weekly downloads: 890K | Stars: 12K+
      Bundle: ~200KB gzipped
      Last release: 2026-05-28
      License: MIT (community), Commercial (enterprise)
      Tradeoffs: Heavy bundle. Enterprise features (row grouping, server-side model) need paid license.

   #3 react-data-table-component — 5/8
      Package: react-data-table-component@^7.6.0
      Weekly downloads: 310K | Stars: 2K+
      Bundle: ~28KB gzipped
      Last release: 2025-11-02 (6 months ago)
      License: MIT
      Tradeoffs: Maintenance concern — no release in 6 months. Simpler API than TanStack.

   Saved to: design/research/libraries/data-table.md

4. Saved artifact is reused by the Ecosystem Scan for 30 days.
```

### Research Artifact Format

```markdown
# Library Research: Data Table

**Researched:** 2026-06-04
**Framework:** React (Vite)
**Pattern:** Data Table

## Summary

| # | Library | Score | Package | Downloads/wk | Bundle | License |
|---|---------|-------|---------|-------------|--------|---------|
| 1 | TanStack Table | 8/8 | @tanstack/react-table | 2.1M | ~13KB | MIT |
| 2 | AG Grid | 7/8 | ag-grid-react | 890K | ~200KB | MIT |
| 3 | react-data-table-component | 5/8 | react-data-table-component | 310K | ~28KB | MIT |

## Detailed Scores

### TanStack Table — 8/8 ★ Top Pick

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Maintenance | PASS | Last release 2026-05-15, active commits |
| Popularity | STRONG | 26K+ stars, 2.1M weekly downloads |
| Compatibility | PASS | React 18/19 supported, headless |
| Bundle Size | SMALL | ~13KB gzipped, tree-shakeable by feature |
| Accessibility | YES | ARIA attributes, keyboard nav documented |
| License | COMPATIBLE | MIT |
| Tests | HIGH | 500+ tests in CI |
| Community | ACTIVE | Discord, responsive maintainers |

**Tradeoffs:** Headless — requires UI wrapper. shadcn/ui has a built-in wrapper.

### AG Grid — 7/8

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Maintenance | PASS | Last release 2026-05-28 |
| Popularity | STRONG | 12K+ stars, 890K weekly downloads |
| Compatibility | PASS | React 18/19 supported |
| Bundle Size | LARGE | ~200KB gzipped, not tree-shakeable |
| Accessibility | YES | WCAG 2.1 AA compliant |
| License | COMPATIBLE | MIT (community edition) |
| Tests | HIGH | E2E tests across browsers |
| Community | ACTIVE | Enterprise support available |

**Tradeoffs:** Heavy bundle footprint. Enterprise features need paid license.
```

### Integration with Build Flow

When a BUILD PLAN is generated (Phase 4b), the Ecosystem Scan (Step 2b) uses this same research process. Cached research artifacts in `design/research/libraries/` from the last 30 days are reused — the scan only searches fresh when cached research is stale or absent.

### Fallback Mode

When web search is unavailable, research runs in offline mode using the built-in Category → Library Map from `commands/build.md` Step 2b. Results are marked `"researchMethod": "lookup-table"` and show a warning:

```
Library research ran in offline mode. Recommendations are from the built-in
lookup table and have NOT been verified against the current ecosystem.
Run again when web search is available.
```

## Styling Convention Research Mode

Research the idiomatic **styling conventions** for a style system that has no built-in contract, and synthesize a **styling contract** in the canonical schema (`docs/styling-contracts/README.md`). The contract is what the BUILD phase enforces — so this research is what makes pixel-perfect respect *any* chosen design system in *any* language, even ones it has never seen. Built-in contracts (`docs/styling-contracts/*.md`) are the fast path; this mode is the fallback for everything else (SwiftUI, Compose, Flutter, GPUI, TUI, or any "Other" choice).

Contracts are cached to `design/research/styling/{id}.md` and reused for 30 days (same cache discipline as library research).

### When to Use

- **During `/pixel-perfect:init` EQUIP phase**: when the user selects a style system that has no built-in contract (typically "Other" with a docs URL). INIT calls this mode automatically.
- **Independently**: "What's the idiomatic way to structure styles in SwiftUI?" → produces a reusable contract.

### Inputs

- `<style-system>`: the system name (e.g. "SwiftUI", "Jetpack Compose", "Flutter Material", "Lipgloss", "Textual").
- `--framework <name>` (required): the target framework/language (e.g. `swift`, `kotlin`, `flutter`, `rust-gpui`, `rust-tui`).
- `--docs <url>` (strongly preferred): the official documentation URL. Grounding in vendor docs is what makes a contract trustworthy.

### Workflow

```
1. User (or INIT) runs:
   /pixel-perfect:research --styling "SwiftUI" --framework "swift" \
     --docs "https://developer.apple.com/documentation/swiftui"

2. Command:
   a. Fetch the official docs (--docs URL) with Jina/WebFetch; if no URL, search:
      - "{system} official documentation styling guide"
      - "{system} component styling best practices {year}"
      - "{system} theming design tokens"
      - "{system} style API reference"   (e.g. "SwiftUI ViewModifier reference")
      **JS-rendered docs note:** some vendor doc sites (e.g. developer.apple.com) are
      single-page apps that return only nav chrome to a reader. If the fetched content
      is thin (no API/styling substance), fall back to a renderable authoritative source
      (a screenshot capture tool, or a reputable secondary guide: Hacking with Swift, the
      framework's GitHub README, MDN, etc.) and cite it. Never synthesize from nav chrome.
   b. Extract the five contract facts from the official docs:
      - Emit method   — HOW styles are expressed (utility classes? StyleSheet.create?
                        CSS Modules? view modifiers? modifier chains? style structs?)
      - File placement — colocated vs central; allowed/forbidden locations
      - Token binding  — how design tokens reach a component (CSS vars? theme object?
                         EnvironmentValues? asset catalog? palette struct?)
      - Forbidden patterns — what the official docs discourage (global CSS in a non-CSS
                        system, inline literals, hardcoded colors, central stylesheets)
      - Must-include    — what every styled element MUST do (use the emit mechanism)
   c. Vet the synthesized contract against docs/styling-convention-rubric.md (7 criteria,
      accept at >=6/7; any "no-contradiction" FAIL rejects immediately).
   d. Synthesize the contract in the canonical schema (Markdown + YAML frontmatter + a
      fenced ```json checks block — see docs/styling-contracts/README.md). The checks block
      is JSON (zero-dep gate), with runnable glob+regex detections.
   e. Validate: frontmatter complete; checks JSON parses; every detection regex compiles;
      then PROVE the detections work by running the gate script against a tiny known-good
      sample (idiomatic code → must pass, exit 0) AND a known-bad sample (code that
      violates each forbidden pattern → must flag it, exit 1). An empty-dir load test only
      proves the JSON parses — it does not prove the checks fire or avoid false positives,
      so it is not sufficient. contradiction-check rejects contracts that contradict
      well-known facts (e.g. a "Tailwind" contract that permits global custom-class CSS).
   f. Cache to design/research/styling/{id}.md and return the contract id.

3. Output:
   STYLING CONTRACT RESEARCH: SwiftUI (swift)
   ===========================================

   Sources: developer.apple.com (official), 2 supporting
   Rubric: 7/7 PASS (official-docs ✓, colocation ✓, token-binding ✓,
           forbidden-patterns ✓, framework-idiom ✓, no-contradiction ✓,
           completeness ✓)

   Contract synthesized: design/research/styling/swiftui-view-modifiers.md
     emit: view-modifiers-chaining
     placement: colocated (inline on the view; no .css)
     tokens: EnvironmentValues / asset catalog colors
     forbids: .css/.scss files, hardcoded Color literals, global stylesheets

   Recorded via INIT as: style_contract: "swiftui-view-modifiers"
                         style_contract_source: "researched"
```

### Synthesized Contract Format

Same schema as the built-ins (`docs/styling-contracts/README.md`). Example for an exotic system:

```markdown
---
id: swiftui-view-modifiers
name: SwiftUI View Modifiers
appliesTo:
  platforms: [mobile-ios]
  frameworks: [swift]
  styleSystem: swiftui
  componentLibrary: any
source: researched
canonicalDocs: https://developer.apple.com/documentation/swiftui
lastUpdated: 2026-06-13
---

# SwiftUI View Modifiers — Styling Contract

## Emit method
**How:** `view-modifiers-chaining`
Styles are applied as view modifiers on the view (`.padding()`, `.background()`,
`.foregroundStyle()`, `.font(...)`), composed by chaining.

## File placement
**Rule:** colocated
Modifiers are inline on the view in the same `.swift` file. No `.css`/`.scss`.

## Token binding
**Mechanism:** `environment-values-and-asset-catalog`
Design tokens are `EnvironmentValues` (e.g. `@Environment(\.theme)`) or Asset
Catalog colors (`Color("primary")`); views read them, never literal colors.

## Forbidden patterns
- `.css`/`.scss` files imported into SwiftUI (SwiftUI is not CSS-driven).
- Hardcoded `Color(red:green:blue:)` / `.red` / `.blue` literals — bypass theming.

## Verify checklist
- View styles via modifiers (not CSS, not inline style dictionaries).
- Colors come from the theme/asset catalog, not literals.

## Checks
{...forbiddenPatterns with glob ["**/*.swift"] + regex detecting .css imports
 and Color literal patterns, mustInclude for modifier usage...}
```

### Fail closed — never fabricate

Styling research is **deterministic in its enforcement, probabilistic in its synthesis**. The research/synthesis is LLM work; the validation and the gate are code. If research cannot produce a contract that passes the rubric:

```
⚠ STYLING RESEARCH INCONCLUSIVE — {system} + {framework}

Rubric failures:
  ✗ Official documentation cited — FAIL (no vendor docs reachable)
  ✗ Forbidden patterns present — FAIL (anti-patterns not derivable)

The contract was NOT written. No fabricated defaults were cached.

Options:
  1. Provide a more specific --docs URL and re-run
  2. Author a contract manually in docs/styling-contracts/{id}.md
     (the rubric still applies — vet it before use)
  3. Choose a supported style system from the init menu (has a built-in contract)
  4. Proceed WITHOUT a contract (recorded as style_contract_source: "none",
     style_contract_enforcement: "off" — flagged at every build; non-default)
```

**Never** write a placeholder contract, never cache a sub-threshold contract, and never report success without a rubric-passing artifact on disk. A missing contract is an honest blocker.

### Integration with Init Flow

The EQUIP phase of `/pixel-perfect:init` calls this mode (Step: Resolve Styling Contract) when no built-in matches the chosen (platform, framework, style, components). The returned contract id is recorded in `design/manifest.json` as `tools.style_contract` with `tools.style_contract_source: "researched"`.

## Research Workflow

```
1. User runs: /pixel-perfect:research "mobile bottom navigation patterns"

2. Command:
   - Searches using available tools (Exa, Jina, Web)
   - Aggregates and structures findings
   - Formats as a research artifact

3. Output saved to:
   design/research/topics/mobile-bottom-navigation.md

4. INDEX.md updated with topic name, date, sources, key findings

5. Research informs the build process:
   - DISCOVER phase: vibe selection, reference analysis
   - ATOMS phase: component design patterns
   - COMPOSE phase: screen layout patterns
```

## Research Artifact Format

```markdown
# Mobile Bottom Navigation Patterns

**Researched:** 2026-02-17
**Sources:** Exa, Jina
**Query:** mobile bottom navigation patterns

## Summary

Brief overview of key findings (2-3 sentences).

## Patterns Found

### Pattern 1: [Name]
- **Source:** [URL]
- **Description:** What this pattern is
- **Usage:** Where it's commonly used
- **Platforms:** Which platforms
- **Best for:** When to apply

## Key Insights

1. Numbered takeaways
2. Actionable for design decisions

## References

- [Title](URL) - Brief description

## Last Updated

2026-02-17
```

## INDEX.md Format

```markdown
# Design Research Catalog

Last updated: 2026-02-17

## Topics

| Topic | Date | Sources | Key Findings |
|-------|------|---------|--------------|
| [Mobile Navigation](./topics/mobile-navigation.md) | 2026-02-17 | Exa, Jina | FAB integration, label-free icons |

## Trends

| Trend | Date | Status | Description |
|-------|------|--------|-------------|
| [Bento Grids](./trends/bento-grids.md) | 2026-02-17 | Growing | Asymmetric tile layouts |

## Competitors

| Competitor | Date | Platform | Key Patterns |
|------------|------|----------|--------------|
| [Linear](./competitors/linear-app.md) | 2026-02-17 | Web | Command palette, bento grid |
```

## Examples

### Research a design topic

```
> /pixel-perfect:research --topic "mobile bottom navigation"

Searching for: mobile bottom navigation patterns
Using sources: Exa, Jina

Found 12 relevant sources...

Saved to: design/research/topics/mobile-bottom-navigation.md
Updated INDEX.md

Key findings:
  - FAB integration is standard pattern
  - Label-free icons trending in Android
  - Gesture navigation influencing tab placement
```

### Analyze competitor

```
> /pixel-perfect:research --competitor "https://linear.app"

Analyzing: https://linear.app
Using source: Jina

Extracted patterns:
  - Dark mode default
  - Command palette (Cmd+K) prominent
  - Left sidebar navigation
  - Bento grid dashboard layout

Saved to: design/research/competitors/linear-app.md
```

### Quick research without saving

```
> /pixel-perfect:research "card spacing patterns" --no-save

Quick findings:
  - 8px-16px-24px rhythm
  - Card padding: 16px mobile, 24px desktop
  - Gap between cards: 16px minimum
```

## Best Practices

1. **Research before init** - Inform DISCOVER phase with research findings
2. **Use structured queries** - Include platform + year + specific pattern
3. **Save everything** - Build reusable knowledge base
4. **Include competitor analysis** - Research 2-3 competitors per project
5. **Cross-platform comparison** - Compare patterns across iOS, Android, Web
