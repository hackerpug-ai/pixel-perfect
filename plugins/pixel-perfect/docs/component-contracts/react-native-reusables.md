---
id: react-native-reusables
name: React Native Reusables
appliesTo:
  platforms: [mobile-ios, mobile-android, web-mobile]
  frameworks: [react-native, expo]
  componentLibrary: react-native-reusables
distribution: vendored
importRoot: "@/components/ui"
source: builtin
canonicalDocs: https://reactnativereusables.com/docs
lastUpdated: 2026-08-08
---

# React Native Reusables — Component Contract

React Native Reusables is a **copy-in** library. `npx @react-native-reusables/cli@latest add …` writes real source files into `components/ui/`, which the project then owns. Those files are not a dependency to be referenced — they are the project's primitive layer, already wired to the theme, to `TextClassContext`, to `cva` variants, and to the accessibility props RNR ships.

A project component therefore **composes `@/components/ui/*`**. Reaching past it to `react-native` for `Text` or `Pressable` rebuilds a component the project already owns, in a second style, with none of that wiring.

## Compose method

**How:** `compose-vendored-ui-layer`

```tsx
// ✓ correct — the atom is a themed configuration of the vendored primitive
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export function PillButton({ children, variant = "quiet", ...rest }) {
  return (
    <Button variant={variant === "primary" ? "default" : "outline"} className="rounded-none" {...rest}>
      <Text className="font-sans-semibold">{children}</Text>
    </Button>
  );
}
```

```tsx
// ✗ wrong — re-implements ui/button from raw primitives
import { Pressable, Text } from "react-native";

export function PillButton({ children, ...rest }) {
  return (
    <Pressable className="flex-row items-center justify-center border" {...rest}>
      <Text className="text-center">{children}</Text>
    </Pressable>
  );
}
```

Both versions pass every styling contract in the repo — they use `className`, they bind tokens, they hardcode nothing. That is precisely why this contract exists.

## Vendored inventory

Whatever the CLI pulled lives in `components/ui/` and is recorded at `manifest.platforms[p].scaffold.components[]`. The primitives this contract enforces are the ones present in every RNR install:

| Raw primitive | Vendored replacement |
|---|---|
| `Text` | `@/components/ui/text` — carries `TextClassContext`, so nested text inherits |
| `TextInput` | `@/components/ui/input`, `@/components/ui/textarea` |
| `Pressable`, `TouchableOpacity`, `TouchableHighlight` | `@/components/ui/button` |
| `Button` (RN's built-in) | `@/components/ui/button` |

If a component you need was not pulled, pull it — `npx @react-native-reusables/cli@latest add switch` — rather than hand-rolling it. If the project deliberately banned it, record that in the build rules and take an override.

**Deliberately not enforced yet:** `Switch` and `Modal`. RNR has equivalents (`switch`, `dialog`) but they are not in the default pull set, so banning them would fire on projects that never installed them. Revisit once this gate has run against real projects — a check that fires on correct code is worse than no check.

## Free primitives

The project reaches for these directly, always. They are structure and platform surface, not components RNR replaces:

`View`, `ScrollView`, `FlatList`, `SectionList`, `SafeAreaView`, `KeyboardAvoidingView`, `TouchableWithoutFeedback` (the `Keyboard.dismiss` wrapper idiom), `Platform`, `Dimensions`, `Animated`, `useWindowDimensions`, and every type-only import (`import type { PressableProps } from "react-native"` is fine — it re-implements nothing).

## Forbidden patterns

- **Raw primitive re-implementation** — importing `Text`, `TextInput`, `Pressable`, `TouchableOpacity`, `TouchableHighlight`, or `Button` from `react-native` in a project component. *Rationale:* rebuilds a component the project already owns in `components/ui/`, losing `TextClassContext` inheritance, `cva` variants, and RNR's accessibility wiring.
- **Bypassing the vendored wrapper** — importing `@rn-primitives/*` directly outside `components/ui/`. *Rationale:* RNR's `ui/` layer is the project's wrapper over those primitives; going direct skips the theming and prop contract the wrapper establishes.

`components/ui/**` is excluded from both. Those files legitimately import raw `react-native` and `@rn-primitives/*` — that is their job.

**`@rn-primitives/portal` and `@rn-primitives/types` are exempt** from the second check. RNR vendors no wrapper for either, and its own required setup mounts `PortalHost` from the package directly in the root layout (`docs/adapters/react-native-reusables.md:113`). An earlier draft of this contract flagged that line — blocking the library's documented installation is exactly the false positive that makes a gate ignorable.

## Verify checklist (component level)

- The component imports its interactive and text primitives from `@/components/ui/*`.
- Text is rendered through the vendored `Text`, so `TextClassContext` cascades.
- Variants are expressed by configuring the vendored component, not by re-deriving its styles.
- A primitive the project genuinely needs and does not have was pulled with the CLI, not hand-rolled.

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "raw-primitive-reimplementation",
      "mode": "file",
      "glob": [
        "components/**/*.{tsx,jsx}",
        "src/components/**/*.{tsx,jsx}",
        "app/**/*.{tsx,jsx}",
        "src/app/**/*.{tsx,jsx}",
        "screens/**/*.{tsx,jsx}",
        "src/screens/**/*.{tsx,jsx}"
      ],
      "exclude": [
        "**/ui/**",
        "**/*.stories.*",
        "**/*.test.*",
        "**/*.spec.*"
      ],
      "regex": "import\\s*\\{[^}]*\\b(?:Button|Pressable|Text|TextInput|TouchableHighlight|TouchableOpacity)\\b[^}]*\\}\\s*from\\s*['\"]react-native['\"]",
      "rationale": "react-native-reusables vendored these into @/components/ui/*. Importing the raw react-native primitive rebuilds a component the project already owns and drops TextClassContext, cva variants, and RNR's accessibility wiring. Compose the vendored component instead, or pull it with the CLI if it is missing."
    },
    {
      "id": "rn-primitives-direct-import",
      "mode": "content",
      "glob": [
        "components/**/*.{tsx,jsx,ts}",
        "src/components/**/*.{tsx,jsx,ts}",
        "app/**/*.{tsx,jsx,ts}",
        "src/app/**/*.{tsx,jsx,ts}",
        "screens/**/*.{tsx,jsx,ts}",
        "src/screens/**/*.{tsx,jsx,ts}"
      ],
      "exclude": [
        "**/ui/**",
        "**/*.stories.*",
        "**/*.test.*",
        "**/*.spec.*"
      ],
      "regex": "from\\s*['\"]@rn-primitives/(?!portal\\b|types\\b)",
      "rationale": "The components/ui layer is the project's wrapper over @rn-primitives. Importing the primitive directly in a project component skips that wrapper's theming and prop contract. (portal and types are exempt: RNR vendors no wrapper for them and its own setup mounts PortalHost from @rn-primitives/portal directly.)"
    }
  ]
}
```
