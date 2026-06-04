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

The seven pieces of this spec are small — a registry, a two-pane shell, token codegen, a run command. An AI agent generates this in ~60 lines of code during scaffold. That's cheaper than:

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
> Two completely different paradigms (GPU windows vs. terminal cells), the **same seven pieces**. That invariance is the spec.

---

## The seven pieces

Every sandbox — in any language/framework — is these seven things. A `custom` sandbox implements all of #1–#6 (#7 is recommended); Storybook/`tui-sandbox` implement them too, just with their own machinery.

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

### 5. One run command (+ optional headless check)
A single command launches the browser, encoded in a `Makefile`/script target.

- **GPUI**: `make sandbox-run` → `cd sandbox && cargo run` (opens a window).
- **TUI**: `make sandbox` → `cargo run --bin tui-storybook`; **`make sandbox-check`** → `… -- --check` renders to a `TestBackend` and prints the catalog to stdout (CI/headless parity).
- **Web (custom)**: `npm run sandbox` → a dev server. **Storybook**: `storybook dev -p 6006`.

### 6. Design ↔ code mapping (the pixel-target)
Each story names the design mock it was built to match, as a comment/annotation. The HTML/PNG in `design/system/` is the **spec**; the component code is the **real thing**.

- Both refs: `//! Target: design/system/atoms/button/dark.png` atop each story file.
- `design/system/{layer}/{name}/{dark,light}.{html,png}` is the pixel reference; the sandbox story renders the live component beside (or against) it.

### 7. Variants × states in one story (recommended)
A story shows a component's variants and states **together** (a static catalog), so isolation doubles as visual coverage.

- GPUI `atom_status_dot::story` renders all 5 statuses × sizes × hollow in labeled cells.
- TUI registers `Meter · 8/12`, `· 14/14 ok`, `· 2/10 bad`, `· 0/6 empty`, `· no label` as sibling stories.
- Optional: per-story **snapshots** (get-spoke `tests/snapshots.rs` via `insta` + `TestBackend`) for regression.

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

---

## Storybook is one implementation

| Spec piece | custom (default) | Storybook | tui-sandbox |
|---|---|---|---|
| 1 Registry | array/module of `{layer,name,render}` in the target lang | CSF `.stories.*` (auto-glob; `title` = layer) | `.story.ts` `StoryMeta`/`Story` |
| 2 Isolation | preview pane / render root | iframe per story | terminal frame |
| 3 Two-pane nav | hand-built sidebar+preview | Storybook UI | `tsbx` TUI |
| 4 Token codegen | build.rs / Palette / CSS vars | CSS vars in `preview` | tokens module |
| 5 Run | `make sandbox` / `npm run sandbox` | `storybook dev` | `tsbx dev` |
| 6 Pixel-target | `//! Target:` ref | story `parameters` / comment | story note |

A `custom` sandbox is small — a registry + a two-pane shell + token codegen + a run target. That's why building it from scratch (in any framework) is cheap, and why pixel-perfect makes it the **default**.

---

## The minimum bar

A sandbox is "done" for a pixel-perfect project when:
- [ ] Every built component is **registered** under its layer (#1) and **renders in isolation** (#2).
- [ ] The catalog is **navigable** with a layer/name breadcrumb (#3).
- [ ] Tokens are **codegenned from `theme.*.json`**; no hardcoded colors/spacing in components (#4).
- [ ] One **run command** launches it (#5); a headless **check** exists if the platform supports it.
- [ ] Each story names its **pixel-target** (#6).

`docs/adapters/custom-sandbox.md` is the recipe to generate this from scratch per target framework. `docs/adapters/storybook.md` / `tui-sandbox.md` are opt-in implementations chosen via `tools.sandbox`.
