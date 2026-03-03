# Adapters

Adapters teach the AI how to scaffold, build, and verify components for specific tools. They are **reference documents**, not executable code.

## How Adapters Work

When a project runs `/pixel-perfect:init`, the user selects tools for two categories (sandbox is always Storybook):

| Category | What It Does | Examples |
|----------|-------------|----------|
| **Style** | Visual styling system | Tailwind CSS, NativeWind |
| **Components** | UI component library | shadcn/ui, React Native Paper |
| **Sandbox** | Isolated dev/preview environment | Storybook (always) |

Each selection maps to an adapter doc in this directory. The AI loads the relevant adapter docs and follows their guidance during scaffold, build, and verify phases.

## Composition Model

Adapters compose by category. A project uses **one adapter per category**, and they stack:

```
Web project:     tailwind (style) + shadcn (components) + storybook (sandbox)
Mobile project:  tailwind/nativewind (style) + react-native-paper (components) + storybook-native (sandbox)
Minimal project: generic (process enforcement only) + storybook (sandbox)
```

**Sandbox Selection is Automatic (Not a User Choice):**

| Platform | Sandbox Adapter |
|----------|-----------------|
| `mobile-ios`, `mobile-android` | `storybook-native` (on-device preview) |
| `web-desktop`, `web-mobile` | `storybook` (browser-based preview) |

The init command automatically selects the appropriate sandbox based on the target platform. This is **not presented as a user choice**.

When multiple adapters are active, the AI reads all of them and applies guidance from each in its respective domain. Style adapters control theming. Component adapters control component structure. The sandbox adapter controls preview and verification.

## Adapter Doc Format

Each adapter follows this structure:

- **Platforms** - Which platforms this adapter serves
- **Category** - style, components, sandbox, or polyfill
- **Scaffold** - Installation and configuration steps
- **Theme Integration** - How to connect the project vibe/theme to this tool
- **Verify** - What to check at component level and screen level
- **Sandbox** - Dev server command, preview setup

## Available Adapters

| Adapter | Category | Platforms |
|---------|----------|-----------|
| [Tailwind](tailwind.md) | style | web, mobile (via NativeWind) |
| [shadcn/ui](shadcn.md) | components | web |
| [React Native Paper](react-native-paper.md) | components | mobile-ios, mobile-android |
| [React Native Reusables](react-native-reusables.md) | components | mobile-ios, mobile-android |
| [Storybook](storybook.md) | sandbox | web, mobile (via react-native-web) |
| [Storybook Native](storybook-native.md) | sandbox | mobile-ios, mobile-android (on-device) |
| [React Native Web](react-native-web.md) | polyfill | mobile (for web Storybook only) |
| [Generic](generic.md) | fallback | all |

## Generic Fallback

When no specific adapter is selected (or the user's tools aren't covered), the **generic** adapter applies. It enforces the pixel-perfect process (phases, gates, manifest tracking) without tool-specific guidance. The AI uses its general knowledge of the chosen tools instead.
