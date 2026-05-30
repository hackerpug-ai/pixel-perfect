# Adapters

Adapters teach the AI how to scaffold, build, and verify components for specific tools. They are **reference documents**, not executable code.

## How Adapters Work

When a project runs `/pixel-perfect:init`, the user selects tools across these categories (the **sandbox** defaults to a **custom** native component browser — see `docs/sandbox-spec.md`):

| Category | What It Does | Examples |
|----------|-------------|----------|
| **Framework** | App framework — loaded only when an adapter exists | SvelteKit (React / Next.js / Vite use the default path) |
| **Style** | Visual styling system | Tailwind CSS, NativeWind |
| **Components** | UI component library | shadcn/ui, shadcn-svelte, React Native Paper |
| **Sandbox** | Isolated component browser | **custom (default)**, Storybook, tui-sandbox |

The **framework** adapter is optional: it is loaded only when `docs/adapters/{framework}.md` exists (e.g. `sveltekit`). React / Next.js / Vite have no framework adapter — their setup is the default React path inside `storybook.md`.

Each selection maps to an adapter doc in this directory. The AI loads the relevant adapter docs and follows their guidance during scaffold, build, and verify phases.

## Composition Model

Adapters compose by category. A project uses **one adapter per category**, and they stack:

```
Web project:     [{framework}] + {style} + {components} + {sandbox: custom*}
Mobile project:  {style} + {components} + {sandbox: custom*}
Minimal project: generic (process enforcement only) + {sandbox: custom*}
```

`*` the **sandbox** defaults to `custom` (a native browser generated per `docs/sandbox-spec.md` via `custom-sandbox.md`); set `tools.sandbox` to `storybook` / `storybook-native` / `tui-sandbox` to use an off-the-shelf tool instead.

`[{framework}]` is bracketed because it is optional — loaded only when an adapter exists for the chosen framework (e.g. `sveltekit`). A framework adapter, when present, is applied **first**: it governs project structure, Storybook initialization, and story format; the style/components/sandbox adapters layer on top.

Style and component adapters are loaded based on user selection during init. If a style framework is detected in `package.json` (e.g., `nativewind`, `tailwindcss`, `tamagui`), that framework is suggested rather than presenting a blank choice.

**Sandbox Defaults to `custom` (a Native Browser):**

The default sandbox is `custom` — generated from scratch in the project's framework per `docs/sandbox-spec.md` (adapter: `custom-sandbox.md`). It is **not** tied to a platform; it matches the framework, renders the real components, and needs nothing extra installed. Off-the-shelf adapters are opt-in:

| `tools.sandbox` | Adapter | When |
|-----------------|---------|------|
| `custom` (default) | `custom-sandbox` | any framework — native, from-scratch |
| `storybook` | `storybook` | user asks (web) |
| `storybook-native` | `storybook-native` | user asks (mobile, on-device) |
| `tui-sandbox` | `tui-sandbox` | terminal UIs |

When multiple adapters are active, the AI reads all of them and applies guidance from each in its respective domain. Style adapters control theming. Component adapters control component structure. The sandbox adapter controls preview and verification.

## Adapter Doc Format

Each adapter follows this structure:

- **Platforms** - Which platforms this adapter serves
- **Category** - framework, style, components, or sandbox
- **Scaffold** - Installation and configuration steps
- **Theme Integration** - How to connect the project vibe/theme to this tool
- **Verify** - What to check at component level and screen level
- **Sandbox** - Dev server command, preview setup

## Available Adapters

| Adapter | Category | Platforms |
|---------|----------|-----------|
| [SvelteKit](sveltekit.md) | framework | web |
| [Tailwind](tailwind.md) | style | web, mobile (via NativeWind) |
| [shadcn/ui](shadcn.md) | components | web |
| [shadcn-svelte](shadcn-svelte.md) | components | web (SvelteKit) |
| [Bits UI](bits-ui.md) | components | web (Svelte) |
| [Skeleton](skeleton.md) | components | web (Svelte) |
| [React Native Paper](react-native-paper.md) | components | mobile-ios, mobile-android |
| [React Native Reusables](react-native-reusables.md) | components | mobile-ios, mobile-android |
| [Custom Sandbox](custom-sandbox.md) | sandbox (**default**) | all |
| [Storybook](storybook.md) | sandbox (opt-in) | web |
| [Storybook Native](storybook-native.md) | sandbox (opt-in) | mobile |
| [tui-sandbox](tui-sandbox.md) | sandbox (opt-in) | tui, cli |
| [Lipgloss](lipgloss.md) | style | tui (Go) |
| [Rich](rich.md) | style | tui (Python) |
| [Ink Styles](ink-styles.md) | style | tui (JS/TS) |
| [Bubbletea](bubbletea.md) | components | tui (Go) |
| [Textual](textual.md) | components | tui (Python) |
| [Ink](ink.md) | components | tui (JS/TS) |
| [Generic](generic.md) | fallback | all |

## Generic Fallback

When no specific adapter is selected (or the user's tools aren't covered), the **generic** adapter applies. It enforces the pixel-perfect process (phases, gates, manifest tracking) without tool-specific guidance. The AI uses its general knowledge of the chosen tools instead.
