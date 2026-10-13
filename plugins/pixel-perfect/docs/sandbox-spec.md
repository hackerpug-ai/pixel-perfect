# The Sandbox Spec

A **sandbox** is a component-showcase harness: it catalogs your components by atomic layer and renders each one **in isolation**, themed, so you can browse and verify them. Storybook is *one* implementation of this idea for the web. It is **not** the idea.

pixel-perfect treats the sandbox as a **spec, not a tool**. By default it **builds a sandbox from scratch in your target framework** (see `docs/adapters/custom-sandbox.md`); an off-the-shelf tool (Storybook, `tui-sandbox`) is used only when you ask.

---

## Why a custom sandbox is the default (v6)

The v6 default is **not Storybook**. This was a deliberate architectural choice, not a preference. Here's why:

### 1. Cross-platform reality

pixel-perfect targets **any** framework — React, SvelteKit, React Native, Expo, GPUI (Rust desktop), Ratatui (terminal), SwiftUI, Compose. Storybook only runs in a web browser. That means:

- **React Native / Expo**: Storybook requires `react-native-web` shimming — rendering native components in a browser. This leaks abstractions, breaks native-only APIs, and adds a dependency tree the real app never uses.
- **TUI (Ratatui / Bubbletea / Textual)**: Storybook literally cannot run here. There's no browser. A terminal sandbox must be a terminal app.
- **Desktop (GPUI, SwiftUI)**: Same problem — no browser, no DOM. A sandbox must be a native window.
- **SvelteKit**: Storybook works but requires Svelte-specific adapters (CSF via `@storybook/addon-svelte-csf`), which add setup complexity and occasional rough edges.

A custom sandbox is generated *in the target framework*. A React project gets a React sandbox. A Ratatui project gets a Ratatui sandbox. GPUI gets GPUI. The spec is the same; the implementation matches the platform.

### 2. Agentic generation is cheap

The eight pieces of this spec are small — a registry, a two-pane shell, token codegen, a run command, a catalog capture. An AI agent generates this in ~60 lines of code during scaffold. That's cheaper than:

- Installing Storybook (~200 transitive dependencies)
- Configuring it for a non-standard framework
- Maintaining version compatibility across Storybook upgrades
- Working around addon incompatibilities

When the agent can generate the sandbox, "just use Storybook" is no longer the easy path.

### 3. No shoehorning

Storybook is opinionated about how stories are written (CSF), how they're discovered (file globbing), how they're rendered (iframes), and how they're configured (`.storybook/`). These opinions are great for a React web project. They become constraints everywhere else.

A custom sandbox lets the project use its framework's native patterns — Svelte components in Svelte, SwiftUI previews in Swift, Ratatui widgets in Rust. No adapters, no shims, no impedance mismatch.

### 4. You can still use Storybook

This is not anti-Storybook. If you're building a React web project and want Storybook's ecosystem (addons, Chromatic, visual snapshots), set `"sandbox": "storybook"` in the manifest. The scaffold step installs and configures it. The same seven-piece spec applies — Storybook just implements it with its own machinery.

The point is: **the default should work for every platform**. Storybook doesn't. A generated native sandbox does.

> **This spec is derived from two real, running sandboxes** — not invented:
> - **`../mega-button`** — a from-scratch **GPUI** (Rust desktop/GPU) sandbox (`sandbox/crates/sandbox`, `make sandbox-run`). *Verified: `make sandbox-build` compiles clean.*
> - **`../get-spoke`** — a from-scratch **TUI** (Rust/Ratatui) sandbox (`.tui-storybook/`, `make sandbox`). *Verified: `make sandbox-check` renders the full catalog headless to stdout.*
>
> Two completely different paradigms (GPU windows vs. terminal cells), the **same core pieces** (now eight with catalog capture). That invariance is the spec.

---

## The eight pieces

Every sandbox — in any language/framework — is these eight things. A `custom` sandbox implements all of #1–#6 and **#8** (#7 is recommended); Storybook/`tui-sandbox` implement them too, just with their own machinery.

> **v8 note.** Pieces #1–#7 are unchanged from v6/v7. **Piece #8 (catalog capture)** is the load-bearing substrate for drift detection, blast radius, and the `evolve` capability. Headless check (#5) and per-story snapshots (#7) are no longer optional where the platform can produce a structural artifact — they feed #8.

### 1. Story registry (explicit, layer-keyed)
A flat, explicitly-built catalog of stories, each tagged with its atomic **layer** (`Tokens · Atoms · Molecules · Organisms · Views`). No auto-discovery magic — one place lists every story.

- **GPUI** (`sandbox/crates/sandbox/src/stories/mod.rs`): `StoryEntry { section: StorySection, name: String, render: fn() -> Div }` collected by `all_stories() -> Vec<StoryEntry>`.
- **TUI** (`.tui-storybook/crates/tui-storybook/src/stories/mod.rs`): `register_all()` → `RegistryBuilder.group("Atoms", |g| g.story("Meter · 8 of 12", Meter::new(8,12)…))`.
- **Web (custom)**: an array `[{ layer, name, render }]` (or a tiny module per layer). **Storybook**: CSF `.stories.*` auto-globbed (`title: 'Components/…'` carries the layer).

### 2. Isolated render at a canonical size
The selected story renders **alone**, at a deterministic size, independent of the container. Views render at natural/full size (scroll, don't squish).

- **GPUI** (`app.rs`): `(entry.render)()` in a preview pane; Views get a both-axes scroll canvas (`flex_shrink_0`), others vertical-only.
- **TUI** (`ui/preview.rs`): renders at a fixed `story.content_width` (default 80 cols), clamped to the pane.
- **Web/Storybook**: each story in its own render root / iframe.

### 3. Navigable two-pane catalog
Left = nav grouped by layer (clickable or keyboard tree, expand/collapse). Right = preview with a `{Layer} / {Name}` breadcrumb. Selecting a story re-renders the preview.

- **GPUI** `render_nav` + `render_preview` (220px sidebar + flex preview, 1px token divider).
- **TUI** `ui/{navigator,preview,footer}.rs` — 30-col nav + preview + footer keymap; `j/k` move, `⏎` expand, `g` jump group.
- Verified live (get-spoke `--check`): `┌ stories ┐ ▾ Atoms … │ Atoms / Meter · 8 of 12 — info` with the meter rendered beside the list.

### 4. Token bridge (codegen from the design system)
Design tokens live in `design/system/tokens/theme.*.json`. The sandbox turns them into **target-language constants** at build time; components reference those, never hardcoded values. This is the design↔code bridge — change the JSON, the whole UI re-themes.

- **GPUI** (`ui-tokens/build.rs`): parses `theme.dark.json` → emits `tokens.rs` (`pub mod surface { pub const DESKTOP: u32 = 0x0A0B0D; }`, plus `hex(u32)->Hsla` / `rgba(u32)->Hsla`); `cargo:rerun-if-changed` on the JSON. Components: `bg(hex(tokens::surface::RAIL))`.
- **TUI** (`tuikit/src/theme/palettes.rs`): tokens → a `Palette` struct of `Rgb(...)`; `Theme` resolves `Tone` → `Color` per mode (TrueColor / Ansi16 / NoColor). Components: `ctx.theme.style(Tone::Info)`.
- **Web (custom)**: `theme.*.json` → CSS custom properties (`:root{--surface-page:#…}`) or a typed tokens module. **Storybook**: same CSS vars, imported in `preview`.

Theme is applied **once** (GPUI `theme::apply(cx)`) or threaded as render context (TUI `RenderCtx{theme}`), enabling **live theme/palette switching** (get-spoke `p` cycles warm→slate→earth without re-instantiating components).

### 5. One run command (+ headless check)
A single command launches the browser, encoded in a `Makefile`/script target. A **headless check** is required when the platform can produce a structural render (it is the input to piece #8).

- **GPUI**: `make sandbox-run` → `cd sandbox && cargo run` (opens a window).
- **TUI**: `make sandbox` → `cargo run --bin tui-storybook`; **`make sandbox-check`** → `… -- --check` renders to a `TestBackend` and prints the catalog to stdout (CI/headless parity).
- **Web (custom)**: `npm run sandbox` → a dev server; **`npm run sandbox:capture`** → headless structural dump per story (see #8). **Storybook**: `storybook dev -p 6006` + a capture script that walks stories.

### 6. Design ↔ code mapping (the pixel-target)
Each story names the design frame it was built to match, as a comment/annotation. The frames under `design/reference/` (rendered by build Phase 4a and indexed by `design/inventory.json`) are the **spec**; the component code is the **real thing**.

- One ref: `//! Target: design/reference/cockpit-dc/01.png` atop each story file — the frame the inventory's `appears_on` names for that entity.
- `design/reference/{slug}/{NN}.png` is the pixel reference; the sandbox story renders the live component beside (or against) it.

### 7. Variants × states in one story (recommended)
A story shows a component's variants and states **together** (a static catalog), so isolation doubles as visual coverage.

- GPUI `atom_status_dot::story` renders all 5 statuses × sizes × hollow in labeled cells.
- TUI registers `Meter · 8/12`, `· 14/14 ok`, `· 2/10 bad`, `· 0/6 empty`, `· no label` as sibling stories.
- Per-story **snapshots** (get-spoke `tests/snapshots.rs` via `insta` + `TestBackend`) feed piece #8 when the platform has no separate capture command.

### 8. Catalog capture (required — durable truth)
The sandbox emits a **deterministic structural artifact per story**, headless, from one command, and a **PNG beside it**. Structural artifacts are committed as goldens under `design/goldens/{platform}/{layer}/{name}/{state}.{ext}`. Everything else — drift, blast radius, dead inventory, the composition mutation check — is a diff against them.

This is the mechanism that makes the design system *living*: the real rendered system is the source of truth, not a hand-maintained dependency graph or a stored `stale` flag.

#### Capture medium per platform

The contract is identical everywhere; the medium follows the platform. Pixels are required beside the structural artifact. A terminal UI declares its exemption in the manifest.

| Platform | Structural artifact (authoritative gate) | Pixel evidence (required beside it) |
|---|---|---|
| Web (custom / Storybook) | normalized serialized DOM | PNG via headless Chrome |
| TUI (Ratatui / Bubbletea / Textual) | `TestBackend` text buffer — exact, no tolerance | none: `capture.pixels: "none"` with `capture.pixels_reason` |
| Native mobile (Expo / SwiftUI / Compose) | view-tree dump | simulator screenshot |
| GPUI / desktop | element-tree dump | window screenshot |

The **structural** artifact is the gate for drift. The **image** is required evidence for fidelity review: the gate checks that it exists, that it is a real image, that it is not blank, and that it fits the declared viewport. A platform that can produce neither declares the degradation explicitly. It never silently passes.

#### Pixel rules

- Every captured story needs a sibling `{state}.png`. A missing PNG fails the gate and names the story.
- The PNG must be a well-formed chunk stream: IHDR first, at least one IDAT, IEND last. A file without pixel data fails. Corrupt or truncated compressed data fails with the reason, never with an uncaught error.
- The gate decodes colour types 0 (grey), 2 (RGB), 3 (palette), 4 (grey + alpha) and 6 (RGBA), at bit depths 8 and 16, non-interlaced. Any other PNG is a violation (`undecodable-png`): "cannot verify this image; write a non-interlaced 8- or 16-bit PNG". The gate never passes an image it did not read.
- An image is blank when it is narrower or shorter than 8 pixels, or when fewer than 64 pixels differ from its most common colour (`blank-png`: "render shows almost nothing").
- When the manifest declares `capture.viewport` as `"WxH"`, a PNG wider than `W × capture.scale` (scale defaults to 1) fails with "render is wider than the viewport". A render that overflows its viewport is a finding, not a screenshot detail.
- Pixels are required by default. A platform that renders pixels must declare `capture.viewport`; without it the gate exits 2 and says how to fix it.
- The exemption is explicit: `capture.pixels: "none"` plus a non-empty `capture.pixels_reason`. `"none"` without a reason is a config error (exit 2). Every mode prints `PIXELS NOT REQUIRED: <reason>` on stderr, and `receipt.json` records `pixels` and the reason.
- PNGs never become goldens.

#### Empty and duplicate rules

- A structural artifact that is empty or whitespace-only after normalization fails.
- Identical bodies (same hash) for stories of two **different** components on one platform fail. The usual cause is a wrapper-only capture: a dialog or sheet that renders outside the captured root. Each group is listed.
- Identical bodies across states of the **same** component are reported under `duplicates` and do not fail.
- When two or more platforms have goldens, the report gives `identicalAcrossPlatforms`: how many golden keys are byte-identical between each pair. This is informational.

#### Receipts

`--baseline` and `--accept` write `{goldens}/receipt.json`, one entry per golden: its hash, its extension, the mode that wrote it, and, when the manifest item names a `file` or `story`, the sha256 of each. No timestamps, so diffs stay quiet. The write is atomic.

- `--check` fails any golden that has no receipt entry, or whose hash differs from its receipt (`unreceipted`): "golden was not written by --baseline or --accept". A golden copied in by hand is refused.
- A missing `receipt.json` beside existing goldens fails `--check`. The message says to run `--check` to see drift, then `--baseline`.
- `--audit` reads goldens, receipts and sources and runs **no capture**. It reports unreceipted goldens, empty goldens, cross-component duplicate groups, and receipted sources edited after their golden was written (`staleSources`).
- A manifest source path that does not exist blocks `--baseline` (exit 2). A receipt cannot pin a file that is not there.

#### Capture command environment

`verify-catalog.mjs` runs the capture command with these variables:

| Variable | Set when | Meaning |
|---|---|---|
| `PIXEL_PERFECT_CAPTURE_OUT` | always | The staging directory the command writes to |
| `PIXEL_PERFECT_CAPTURE_LAYER` | `--layer <L>` is given | Restrict the capture to layer `<L>` |
| `PIXEL_PERFECT_CAPTURE_ONLY` | `--only <layer>/<Name>` is given | Restrict the capture to one story's states |

A command may ignore the last two and capture everything. The script still keeps only what the run asked for. `--out <dir>` sets the staging directory for one run, so rendering one story does not wipe the main staging folder. `--out` may not name the project root.

#### Staging, timeout and tamper rules

- The staging folder is deleted before each capture. So `--out` and `capture.staging` are accepted only when, after `realpath`, they lie inside `design/.captures/` or the system temporary directory. A symbolic link on the path, the filesystem root, the project root, anything containing `design/`, and anything overlapping the goldens are refused with exit 2 before anything is deleted.
- `--only <layer>/<Name>` is valid only with `--render`.
- A story state has one structural artifact. Two files for one state are a config error. A PNG is found by its extension in any case (`.png`, `.PNG`). A file with any other extension is listed under `ignoredFiles` and never rewritten.
- `capture.timeout_ms` bounds the capture command (default 600000). A timeout is exit 2.
- The capture command may write only to its staging folder. The gate hashes `design/manifest.json`, `design/inventory.json`, the goldens and `receipt.json` before and after it runs. A change is exit 2: "the capture command modified gate inputs".

#### Determinism requirements

Capture is worthless if it is noisy. The generated capture command must:

- disable animation and transitions, and settle before capture;
- use fixed mock data (no `Math.random`, no `Date.now` in fixtures — story fixtures are already required to be realistic; they must also be constant);
- normalize volatile output before writing: framework-generated ids, hash-suffixed class names, absolute paths, timestamps;
- render at the story's canonical size (piece #2), and write the PNG at that size.

#### Plugin gate script

```
node {plugin}/scripts/verify-catalog.mjs <mode> <project-root> [options]

  --baseline            capture → gate → write goldens and receipts (after a layer is approved)
  --check               capture → gate → diff vs goldens; unreceipted goldens; non-zero on unreviewed drift
  --accept <glob>       promote drifted captures to goldens (intentional change)
  --render              capture → pixel gate → print structural and PNG paths; writes no goldens
  --audit               read goldens, receipts and sources; runs no capture
  --blast <name>        perturb <name>, report which stories move        (downstream)
  --reach <name...>     report which live roots each name reaches         (upstream)
  --composes            check each composing item's source names what it composes

  options: --platform <id>  --layer <layer>  --only <layer>/<Name>  --out <dir>  --json
```

Exit codes match `verify-styling-contract.mjs`: `0` pass, `1` drift or violations, `2` config/usage error, `3` vacuous scan (zero stories captured — never a pass).

Manifest per platform records the capture *decision*, not derivables:

```json
"capture": {
  "command": "npm run sandbox:capture",
  "medium": "dom+png",
  "goldens": "design/goldens/web-desktop",
  "viewport": "390x844",
  "scale": 1,
  "captured_at": "2026-08-11T00:00:00Z"
}
```

A terminal UI declares its exemption instead of a PNG:

```json
"capture": {
  "command": "npm run sandbox:capture",
  "medium": "text",
  "pixels": "none",
  "pixels_reason": "terminal UI: the TestBackend text buffer is the render"
}
```

#### Composition mutation check

A molecule that *claims* to compose `StatusBadge` but re-implemented its internals will not move when `StatusBadge` moves. So: perturb an atom (`--blast StatusBadge`), re-capture, and assert its declared dependents changed. A dependent that does not move is not composing — it is a copy.

A compiled stack cannot be checked this way. A comment-only perturbation does not change a compiled render, so `--blast` reports a `note` and zero moved stories. Use `--composes` on those stacks. It reads each composing item's source with comments removed, and it requires every composed name to appear there as an identifier. Known limit: a component reached only through a re-export under another name is not seen.

### State Scenarios for Molecules, Organisms, and Screens

For components with declared internal state (`state.declared` in the manifest), each declared state **scenario** must have its own story entry — not just prop combinations, but distinct internal state configurations that exercise the component's behavior.

**Screens** carry a `states` list (a route + its named states — see `docs/state-patterns.md`) rather than a `state.declared` block. The rule is the same: **each state in a screen's `states` list gets its own story**, driving the screen into that state for visual review. A screen collapsed from N route-variants therefore keeps all N states viewable as N sibling stories under one `Screens/{name}` entry — no coverage is lost. *How* the screen is driven into each state (override/controlled props, the precedence rule, prop names) is an implementation/adapter detail, not prescribed here.

**What a state scenario covers:**
- A specific combination of internal state values
- The visual/behavioral output that results from those values
- Any state transitions that are relevant (e.g., typing → results appearing)

**Example (SearchBar molecule with 4 declared scenarios):**
```
Stories:
  - Empty           → query='', isFocused=false, showSuggestions=false
  - Typing          → query='hva', isFocused=true, showSuggestions=true
  - NoResults       → query='xyz', results=[], showSuggestions=true
  - Error           → query='hva', error='Search failed'
```

Each scenario gets its own story entry in the catalog — not a single play-through sequence. The sandbox must render each scenario independently for visual review.

**For TUI frameworks:** Create separate model instances initialized to the target state values. Register each as its own story entry.
**For GPUI:** Create Entity instances with specific initial values. Register each as its own story entry.

### AI Chat State Scenarios

AI chat components (conversational surfaces, reasoning panels, tool-call displays, streaming markdown renderers) carry a specialized state matrix. **When the BUILD PLAN detects an AI chat surface** (per [`ecosystem-patterns.md`](ecosystem-patterns.md) → "AI Chat Surface"), the sandbox must cover these states as separate stories. See [`ai-chat-patterns.md`](ai-chat-patterns.md) for the underlying patterns.

| State | When to use | Required for |
|---|---|---|
| `default` | Populated message list, scrolled to bottom | Conversation, Message |
| `empty` | No messages / welcome state | Conversation, PromptInput |
| `streaming` | Assistant message actively streaming (mock token arrival) | Conversation, Message, MessageResponse, Reasoning |
| `error` | Error banner visible | Conversation, Tool |
| `tool-running` | Tool-call in `input-available` state | Tool |
| `tool-complete` | Tool-call in `output-available` state | Tool |
| `reasoning-open` | Reasoning panel expanded during stream | Reasoning |
| `reasoning-closed` | Reasoning panel collapsed after stream | Reasoning |
| `loading` | Pre-stream / initial (Shimmer visible) | Reasoning, Plan, Task |

**Mock fixtures:** Provide a `__mocks__/chat-fixtures.ts` exporting typed message arrays per state. For React/TypeScript projects, type against the `ai` package's `UIMessage`:

```tsx
// __mocks__/chat-fixtures.ts
import type { UIMessage } from "ai";

export const messagesDefault: UIMessage[] = [
  { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
  { id: "2", role: "assistant", parts: [{ type: "text", text: "Hi there!" }] },
];

export const messagesStreaming: UIMessage[] = [
  { id: "1", role: "user", parts: [{ type: "text", text: "Write a function" }] },
  { id: "2", role: "assistant", parts: [{ type: "text", text: "Here's a function that" }] }, // partial
];

export const messagesWithError: UIMessage[] = [
  // ...previous messages...
  { id: "3", role: "assistant", parts: [{ type: "error", errorText: "Rate limit exceeded" }] },
];

// ...etc for each state
```

**Streaming simulation:** The `streaming` state story must visibly animate token arrival. Use a test helper that appends tokens to the last message on an interval:

```tsx
// __mocks__/use-streaming-mock.ts
export function useStreamingMock(fullText: string, intervalMs = 50) {
  const [text, setText] = useState("");
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i >= fullText.length) clearInterval(timer);
      else setText(fullText.slice(0, ++i));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [fullText]);
  return text;
}
```

---

## Storybook is one implementation

| Spec piece | custom (default) | Storybook | tui-sandbox |
|---|---|---|---|
| 1 Registry | array/module of `{layer,name,render}` in the target lang | CSF `.stories.*` (auto-glob; `title` = layer) | `.story.ts` `StoryMeta`/`Story` |
| 2 Isolation | preview pane / render root | iframe per story | terminal frame |
| 3 Two-pane nav | hand-built sidebar+preview | Storybook UI | `tsbx` TUI |
| 4 Token codegen | build.rs / Palette / CSS vars | CSS vars in `preview` | tokens module |
| 5 Run + headless | `npm run sandbox` + `sandbox:capture` | `storybook dev` + capture walk | `tsbx dev` + check |
| 6 Pixel-target | `//! Target:` ref | story `parameters` / comment | story note |
| 8 Catalog capture | structural dump → `design/goldens/…` | same goldens layout | `TestBackend` text goldens |

A `custom` sandbox is small — a registry + a two-pane shell + token codegen + a run target + a capture command. That's why building it from scratch (in any framework) is cheap, and why pixel-perfect makes it the **default**.

---

## The minimum bar

A sandbox is "done" for a pixel-perfect project when:
- [ ] Every built component is **registered** under its layer (#1) and **renders in isolation** (#2).
- [ ] The catalog is **navigable** with a layer/name breadcrumb (#3).
- [ ] Tokens are **codegenned from `theme.*.json`**; no hardcoded colors/spacing in components (#4).
- [ ] One **run command** launches it (#5); a headless **check** exists when the platform can produce structure.
- [ ] Each story names its **pixel-target** (#6).
- [ ] A **catalog capture** command exists (#8); `verify-catalog.mjs --baseline` has written at least the hello-world golden; `--check` is the drift gate.

`docs/adapters/custom-sandbox.md` is the recipe to generate this from scratch per target framework. `docs/adapters/storybook.md` / `tui-sandbox.md` are opt-in implementations chosen via `tools.sandbox`.
