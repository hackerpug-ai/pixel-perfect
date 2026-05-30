# Custom Sandbox (default)

The **default** sandbox adapter. Instead of installing an off-the-shelf tool, it **generates a component browser from scratch in the project's target framework**, implementing the seven pieces of `docs/sandbox-spec.md`. You own it, it's tiny, and it renders the *real* components (no web prototype throwaway).

## Why this is the default (not Storybook)

**Storybook is a web tool.** pixel-perfect builds UI in any framework — React, SvelteKit, React Native, GPUI, Ratatui, SwiftUI. Shoehorning all of those into a browser-based tool means fighting the tool instead of building the product. The agentic model makes custom generation cheap (~60 lines) and Storybook's install/configure/maintain overhead expensive by comparison.

| | Storybook | Custom (this adapter) |
|---|---|---|
| React web | ✅ native fit | ✅ tiny Vite browser, same result |
| SvelteKit | ⚠️ needs adapter | ✅ generated in Svelte |
| React Native | ⚠️ web shimming | ✅ runs on-device |
| Terminal (Ratatui etc.) | ❌ impossible | ✅ terminal-native |
| Desktop (GPUI, SwiftUI) | ❌ impossible | ✅ platform-native |
| Install footprint | ~200 deps | ~0 deps |
| Maintenance | version upgrades, addon compat | you own ~60 lines |

Storybook remains available as an **opt-in** (`tools.sandbox: "storybook"`). The custom sandbox is the default because the default should work for *every* platform without shoehorning.

---

Use an off-the-shelf adapter (`docs/adapters/storybook.md`, `storybook-native.md`, `tui-sandbox.md`) only when the user explicitly asks (`tools.sandbox: "storybook"` etc.).

## Platforms
- all (web-desktop, web-mobile, mobile-ios, mobile-android, desktop, tui) — the sandbox is generated to match the **framework**, not the platform.

## Category
Sandbox (default — selected automatically unless the user requests a named tool)

## Gold-standard references
Two real, runnable sandboxes embody this adapter — read them when generating:
- **GPUI / desktop-GPU (Rust):** `../mega-button/sandbox/` (`crates/sandbox` + `crates/ui-tokens`, `make sandbox-run`).
- **TUI (Rust/Ratatui):** `../get-spoke/.tui-storybook/` (`crates/{tuikit,tui-storybook}`, `make sandbox` / `make sandbox-check`).

---

## Scaffold (per paradigm)

Create a small sandbox project that imports the project's components and renders one at a time. Layout is always: **registry → two-pane shell (nav + preview) → token codegen → run target.**

### Web (React / SvelteKit / Vue / vanilla) — a tiny Vite browser, no Storybook
1. Create `sandbox/` (a Vite entry alongside the app, sharing its component source):
   ```
   sandbox/
     index.html          # mounts the sandbox shell
     main.{tsx,ts}       # two-pane shell: sidebar (by layer) + preview + breadcrumb
     registry.{tsx,ts}   # the story registry (array of {layer,name,render})
     tokens.css          # GENERATED from design/system/tokens/theme.*.json
     gen-tokens.mjs      # codegen script (theme.json → tokens.css)
   ```
2. Add scripts to `package.json`:
   ```json
   { "scripts": {
       "sandbox:tokens": "node sandbox/gen-tokens.mjs",
       "sandbox": "npm run sandbox:tokens && vite --config sandbox/vite.config.ts"
   } }
   ```
3. The shell (`main.tsx`, React example — adapt to the framework) keeps `selected` state, lists `registry` grouped by `layer` in a sidebar, and renders the selected story's `render()` in the preview with a `{layer} / {name}` breadcrumb. ~60 lines.
4. Import `tokens.css` so components render themed.

### Desktop-GPU (GPUI, Rust)
Mirror `../mega-button/sandbox/`: a workspace with a `sandbox` bin crate (`app.rs` = `SandboxApp{stories, selected}` + `render_nav`/`render_preview`; `main.rs` = window + `theme::apply`) and a `ui-tokens` crate (`build.rs` codegen). `make sandbox-run` → `cargo run`.

### TUI (Ratatui, Rust)
Mirror `../get-spoke/.tui-storybook/`: a `tuikit` primitives crate + a `tui-storybook` bin (`registry/`, `app.rs`, `ui/{navigator,preview,footer}.rs`, `event.rs`, `selfcheck.rs`). `make sandbox` (interactive) + `make sandbox-check` (headless `--check` → stdout).

### Native-mobile (SwiftUI / Compose)
A `Sandbox` build target/scheme: a `List` of stories grouped by layer → a `NavigationStack`/detail that renders the component in isolation (SwiftUI `#Preview` catalog or a dedicated sandbox app target; Compose `@Preview` gallery / a sandbox activity).

---

## Token Codegen (the design↔code bridge)

Generate target-language tokens from `design/system/tokens/theme.{light,dark}.json`. Components reference these; never hardcode.

- **Web** — `gen-tokens.mjs` reads the theme JSON and emits CSS custom properties:
  ```js
  // sandbox/gen-tokens.mjs — theme.dark.json → tokens.css (:root + [data-theme=light])
  import { readFileSync, writeFileSync } from "node:fs";
  const dark = JSON.parse(readFileSync("design/system/tokens/theme.dark.json","utf8"));
  const toVars = (obj, prefix="") => Object.entries(obj).flatMap(([k,v]) =>
    typeof v === "object" ? toVars(v, `${prefix}${k}-`) : [`  --${prefix}${k}: ${v};`]);
  writeFileSync("sandbox/tokens.css", `:root{\n${toVars(dark).join("\n")}\n}\n`);
  ```
  Components use `var(--surface-desktop)` etc. (or feed the same vars into Tailwind).
- **GPUI (Rust)** — a `build.rs` that parses the JSON and writes `tokens.rs` constants + `hex()/rgba()` helpers (see `../mega-button/sandbox/crates/ui-tokens/build.rs`); `cargo:rerun-if-changed` on the JSON.
- **TUI (Rust)** — map tokens to a `Palette` struct of `Rgb(...)`, resolved per color mode (see `../get-spoke/.tui-storybook/crates/tuikit/src/theme/palettes.rs`).
- **Native-mobile** — codegen a `Tokens` enum/struct (Swift/Kotlin) or an asset catalog from the JSON.

## Story Registry

One explicit list, tagged by layer (`Tokens·Atoms·Molecules·Organisms·Views`):
- **Web:** `export const stories = [{ layer:"Atoms", name:"Button", render: () => <Button …/>, target:"design/system/atoms/button/dark.png" }, …]`.
- **Rust (GPUI/TUI):** a `Vec<StoryEntry>` / `RegistryBuilder.group(...).story(...)` (see refs).
Adding a component = adding one registry line (the build command does this — see `scaffold.md`/`build.md`).

## Navigator (two-pane)
Left: sections per layer with their stories (click / keyboard-select). Right: breadcrumb `{layer} / {name}` + the selected story rendered in isolation (Views at natural size). Selection updates → preview re-renders. Keep it ~1 file.

## Run
- Web: `npm run sandbox` (dev server). Rust: `make sandbox-run` / `make sandbox`. Mobile: the Sandbox scheme/target.
- Provide a **headless check** where feasible (TUI `--check`; web: a build + a smoke render) for CI parity.

## Verify (the minimum bar — see `docs/sandbox-spec.md`)
- Each built component is **registered under its layer** and **renders in isolation**.
- The catalog is **navigable** with a `{layer}/{name}` breadcrumb.
- Tokens are **codegenned from `theme.*.json`** — no hardcoded colors/spacing in components.
- One **run command** launches it; each story names its **pixel-target** (`design/system/.../dark.png`).

## When to use a named tool instead
If the user asks for Storybook (web), on-device Storybook (mobile), or `tsbx` (TUI), set `tools.sandbox` accordingly and follow that adapter. The custom sandbox is the default because it's small, framework-native, and renders the real components.
