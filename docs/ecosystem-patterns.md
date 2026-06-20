# Ecosystem Pattern Map

A reference table of common UI patterns and their historically dominant libraries. This is a **starting point for research**, not a static recommendation. Every entry must be verified via web search at scan time — libraries go stale, and the current best-in-class for each pattern shifts.

Used by: Phase 4b Step 2b of `/pixel-perfect:build` (Ecosystem Scan). Also referenced by `/pixel-perfect:research --libraries`.

---

## Scan Configuration

Set `ecosystemMode` in `design/manifest.json` to control how aggressively the system suggests libraries:

```json
{
  "ecosystemMode": "suggest"
}
```

| Mode | Behavior |
|------|----------|
| `suggest` (default) | Runs the scan during BUILD PLAN. Presents suggestions but **never blocks** the plan on library decisions. User can ignore all suggestions and proceed with custom builds. |
| `off` | Skips the scan entirely. No library suggestions appear. The agent builds everything custom. For projects with zero external dependencies or constrained environments. |
| `required` | Runs the scan and **blocks** the BUILD PLAN until every complex pattern has a resolved library choice (either "use X" or "build custom confirmed"). Forces the library-vs-build decision before any code is written. |

### Per-Category Overrides

Add `librarySuggestions.categories` to tune specific patterns:

```json
{
  "ecosystemMode": "suggest",
  "librarySuggestions": {
    "threshold": 5,
    "categories": {
      "data-table": "suggest",
      "date-picker": "off",
      "drag-and-drop": "required"
    }
  }
}
```

Category-level settings override the global `ecosystemMode` for that specific pattern.

---

## Search Guardrails

When researching libraries, use the **preferred search tools** in the agent's harness. The scan is framework-aware — queries include the project's framework name.

### Search Tool Preference

| Tool | Priority | Use Case |
|------|----------|----------|
| **Default harness search** (built-in WebSearch) | **First** — always available, zero setup | Broad queries, npm/package existence checks, GitHub repository lookups |
| **Jina Reader** (`jina_read_url`) | Use when available | Deep-read npm package pages, GitHub READMEs, library docs for scoring details |
| **Exa** (`exa_web_search_exa`) | Use when available | Semantic design research, finding current alternatives |
| **Firecrawl MCP** (`firecrawl` tools) | Use when available | Scraping changelogs, release pages, and structured data from library sites |

**Fallback rule:** If only the default harness search is available, it's sufficient. The other tools enrich the research but are not required. Always use whatever search tools the harness provides.

**Never assume a tool is available.** Check the agent's available tools before referencing them. If Jina/Exa/Firecrawl MCPs are not provisioned, default harness search handles all queries.

### Query Templates

For every library match, run these searches (framework-aware):

```
# Verify library currency
"{library-name} npm 2026"
"{library-name} maintained status github"

# Find alternatives when table entry is stale
"{library-name} vs alternatives {framework}"
"best {framework} {pattern} library 2026"

# Reputation signals
"{library-name} weekly downloads npm"
"{library-name} github stars"
"{library-name} latest release"
```

---

## Reputational Scoring

Libraries are evaluated on four **reputational signals** — objective, verifiable metrics that indicate library quality without manual review:

| Signal | Source | Threshold |
|--------|--------|-----------|
| **Stars** | GitHub | ≥5,000 = STRONG, ≥1,000 = MODERATE, <1,000 = WEAK |
| **Weekly Downloads** | npm registry | ≥100k = STRONG, ≥20k = MODERATE, <20k = WEAK |
| **Last Release** | npm / GitHub | Within 3 months = ACTIVE, 3-6 months = STABLE, 6-12 months = SLOW, >12 months = STALE |
| **Rating (if applicable)** | npm search / GitHub | ≥4.0 avg = HIGH, 3.0-4.0 = MODERATE, <3.0 = LOW |

These signals feed into the vetting rubric's `maintenance`, `popularity`, and `community` criteria. A library with STRONG downloads + ACTIVE releases + HIGH rating is a top-tier recommendation.

**Signals are directional, not absolute.** A library with low stars but high downloads and active maintenance may be excellent (stars lag downloads). A library with high stars but no recent releases is abandoned (stars are historical).

---

## Category → Pattern Map

Each pattern category maps to historically dominant libraries. These are **starting points** — verify every one with the search guardrails above before recommending.

| Pattern Category | When It Triggers | Historically Dominant Libraries |
|---|---|---|
| **Data Table / Data Grid** | Component renders rows/columns with sorting, filtering, pagination, or selection | TanStack Table, AG Grid, react-data-table-component |
| **Chart / Data Visualization** | Component renders charts, graphs, sparklines, or analytics | Recharts, Chart.js, Nivo, Victory, D3 |
| **Date Picker / Calendar** | Component involves date selection, date ranges, or calendar views | react-datepicker, react-day-picker, @mui/x-date-pickers |
| **Rich Text / WYSIWYG Editor** | Component is a text editor with formatting controls | TipTap, Slate.js, ProseMirror, Lexical |
| **Command Palette** | Component is a Cmd+K / Spotlight-style quick-action overlay | cmdk, kbar |
| **Drag and Drop** | Component involves reordering, kanban boards, or sortable lists | @dnd-kit, Pragmatic drag-and-drop |
| **Carousel / Slider** | Component is an image or content carousel | Embla Carousel, Swiper, react-slick |
| **Form Validation** | Multiple form components or complex form state | React Hook Form, Formik, Conform |
| **Infinite Scroll / Virtualized List** | Component renders large lists with scroll-based loading | TanStack Virtual, react-window, react-virtuoso |
| **Maps / Geospatial** | Component renders a map or location picker | Mapbox GL, Leaflet, react-map-gl |
| **File Upload / Dropzone** | Component handles file selection, drag-to-upload, progress | react-dropzone, uppy, filepond |
| **Toast / Notification System** | Component manages ephemeral notification stack | react-hot-toast, sonner, notistack |
| **Modals / Dialogs (complex)** | Multi-step wizards, nested dialogs, or complex overlay stacks | Component library usually handles this; flag only if need exceeds it |
| **Animation / Motion** | Complex orchestrated animations or gesture-driven interactions | Framer Motion, react-spring, Motion One |
| **Headless UI Primitives** | Component needs accessible interaction patterns without opinionated styling | Radix UI, Headless UI, Zag.js, Ark UI, React Aria |
| **State Management (complex)** | Organism needs cross-component or cross-screen state coordination | Zustand, Jotai, Valtio, Legend State |
| **CSS-in-JS** | Project needs runtime style composition or dynamic theming | Panda CSS, Vanilla Extract, StyleX, Pigment CSS |
| **Component Testing** | Test infrastructure for isolated component verification | Testing Library, Vitest, Playwright, Cypress |
| **Icons** | Project needs a consistent icon set | Lucide, Phosphor, Heroicons, Tabler Icons, Material Symbols |
| **AI Chat Surface** | Component renders streamed LLM output, chat transcript, reasoning disclosure, or tool-call results | ai-elements (shadcn registry), @assistant-ui/react, @chatscope/chat-ui-kit-react |
| **Streaming Markdown** | Component renders token-by-token LLM output as incremental markdown | streamdown (+ @streamdown/{cjk,code,math,mermaid} plugins), react-markdown + remark-gfm |
| **Code Syntax Highlighting** | Component renders source code with language-aware coloring | shiki, starry-night, prism-react-renderer, highlight.js |
| **Chat Autoscroll** | Chat surface needs stick-to-bottom + programmatic scroll + "scroll to bottom" button | use-stick-to-bottom, react-scroll-to-bottom |

> **AI chat pattern details:** When the AI Chat Surface pattern triggers, **always consult [`docs/ai-chat-patterns.md`](ai-chat-patterns.md)** before recommending a library. That doc covers 16 replicable patterns (compound components, streaming markdown, reasoning lifecycle, tool-call rendering, shimmer loading, etc.) that apply regardless of whether a library is chosen. The library is the starting point; the patterns are the contract.

> **This is not exhaustive.** When a planned component doesn't match a known category but *feels* complex (many states, accessibility requirements, cross-browser edge cases), err on the side of searching. The agent should use the search guardrails above to discover if an ecosystem library exists.

### Stale-Library Detection

Some libraries in the table are historically dominant but now unmaintained. The scan detects these by checking the **Last Release** signal during research:

- `react-beautiful-dnd` — **STALE** (>12 months). Replace with `@dnd-kit` or `Pragmatic drag-and-drop`.
- The scan automatically searches for replacements when a library is marked STALE.

---

## How the Scan Uses This

1. **Read config:** Check `manifest.ecosystemMode`. If `off`, skip entirely.
2. **Read the table:** Match planned components against the categories above.
3. **Check existing tools:** If the component adapter already provides this (e.g., shadcn/ui wraps TanStack Table), no recommendation needed.
4. **Search with guardrails:** Use available harness search tools to verify each match.
   - Query: `"best {framework} {pattern} library 2026"`
   - Verify reputational signals: stars, downloads, last release date, rating.
5. **Apply the rubric:** Score each candidate with `docs/library-vetting-rubric.md`.
6. **Present ranked results:** Show top 2-3 candidates with scores and tradeoffs.
7. **User chooses:** Accept top recommendation, choose alternative, or build custom.

### When `ecosystemMode: "suggest"`
The scan runs, recommends, but **does not block** — user can ignore all and proceed.

### When `ecosystemMode: "required"`
The scan runs and **blocks** the BUILD PLAN until every complex pattern has a resolved decision. The agent cannot write code until libraries are chosen (or custom builds are explicitly confirmed).

### When `ecosystemMode: "off"`
The scan is skipped. The BUILD PLAN proceeds directly to custom builds. No library suggestions appear anywhere.

---

## Framework-Aware Search

Queries include the project's framework. The same pattern maps to different libraries depending on the framework:

| Pattern | React | Svelte | SwiftUI | TUI (Bubbletea) |
|---------|-------|--------|---------|-----------------|
| Data Table | TanStack Table | TanStack Table (headless) | SwiftUI Table | N/A (terminal table rendering) |
| Date Picker | react-day-picker | @internationalized/date | DatePicker | N/A (text input) |
| Drag and Drop | @dnd-kit | @dnd-kit (headless) | N/A | N/A |

**The agent must search framework-specifically.** A React table library is irrelevant for a Svelte project. The scan query includes the framework name.

---

## Caching Policy

- **No cross-project caching.** Each project's manifest records its own library decisions. No global database of recommended libraries.
- **Research date is for auditing, not caching.** The `researchDate` field in `ecosystemLibs` records when a library was evaluated. It does not make the recommendation automatically reusable.
- **Re-verify on every build** (when `ecosystemMode: "required"` or the library was researched >30 days ago). Stale research is re-searched.
- **Pre-research artifacts** (`design/research/libraries/{pattern}.md`) from `/pixel-perfect:research --libraries` are reused for 30 days — then re-searched.
- **No libraries are cached that aren't in the project.** The manifest records decisions, not dependencies. Nothing is installed until the user says "use this."

---

## References

- `docs/library-vetting-rubric.md` — 8-criteria scoring rubric
- `commands/build.md` — Phase 4b Step 2b (Ecosystem Scan)
- `commands/research.md` — Standalone library research command
