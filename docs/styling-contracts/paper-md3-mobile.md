---
id: paper-md3-mobile
name: React Native Paper (Mobile)
appliesTo:
  platforms: [mobile-ios, mobile-android]
  frameworks: [react-native, expo]
  styleSystem: paper
  componentLibrary: paper
source: builtin
canonicalDocs: https://callstack.github.io/react-native-paper/docs/guides/theming
lastUpdated: 2026-06-13
---

# React Native Paper (Mobile) — Styling Contract

Styling with React Native Paper is **theme-driven**: prefer Paper's MD3 components (`Button`, `Card`, `Surface`, `Text`, …) which consume the MD3 theme automatically, and for any custom layout use a colocated `StyleSheet.create` that references the **Paper MD3 theme** (`theme.colors.*`, `theme.roundness`, etc.) obtained via `useTheme()`. There are no hardcoded colors, no central shared stylesheets, and no inline object literals for static values. Design tokens *are* the MD3 theme object.

Paper's value is its MD3 theme. The drift to avoid is ignoring the theme — hardcoding colors, or building a parallel central stylesheet instead of composing Paper components + a colocated themed `StyleSheet`.

## Emit method

**How:** `paper-components-plus-themed-stylesheet`

Use Paper components for MD3-styled primitives; use `useTheme()` + a colocated `StyleSheet.create` for custom layout, referencing `theme.colors.*`.

```tsx
// ✓ correct
import { Button, Card, Text } from "react-native-paper";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

export function StatusBadge({ label }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap(theme)}>
      <Text style={{ color: theme.colors.primary }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: (theme) => ({
    paddingHorizontal: theme.spacing?.[3] ?? 12,
    paddingVertical: 8,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.elevation.level1,
  }),
});
```

```tsx
// ✗ wrong — hardcoded color, ignores theme
<View style={{ backgroundColor: "#2563eb", padding: 16 }}>…

// ✗ wrong — central shared stylesheet
import { shared } from "@/styles/shared";
<View style={shared.badge}>…
```

> The dynamic `style={{ color: theme.colors.primary }}` above is allowed — it binds to the theme, not a literal. The forbidden case is inline **static literal** values.

## File placement

**Rule:** `colocated`

Paper components compose; custom `StyleSheet.create` lives in the component file. No `src/styles/**` exporting shared stylesheets.

- **Allowed:** `src/components/**/*.{tsx,ts}`, `src/screens/**/*.{tsx,ts}`.
- **Forbidden:** `src/styles/**/*.{ts,tsx,js,jsx}`, `styles/**/*` exporting `StyleSheet.create`.

## Token binding

**Mechanism:** `paper-md3-theme-object`

The MD3 theme (provided by `<PaperProvider theme={…}>`) is the token source. Access via `useTheme()`; reference `theme.colors.*`, `theme.roundness`, `theme.fonts.*`. The theme is the only source of color/shape/typography truth.

## Forbidden patterns

- **Hardcoded color/shape literals** — `#rrggbb`, `#rgb`, named colors, or fixed `borderRadius` numbers used as theme values. *Rationale:* ignores the MD3 theme and breaks light/dark seeding; reference `theme.colors.*` / `theme.roundness`.
- **Central/shared stylesheet files** — `src/styles/**` exporting `StyleSheet.create`. *Rationale:* bypasses the MD3 theme and component isolation.
- **Inline static `style={{}}` literals** for static layout/color. *Rationale:* bypasses the theme; use a colocated themed `StyleSheet`. (Inline `{ color: theme.colors.x }` binding to the theme is allowed.)

## Verify checklist (component level)

- Component uses Paper MD3 components where a primitive exists (`Button`, `Card`, `Text`, …).
- Custom layout uses `useTheme()` + a colocated `StyleSheet.create` referencing `theme.colors.*`.
- No hardcoded colors or fixed radii — all from the theme.
- Dark mode works automatically via the MD3 theme.

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "central-stylesheet-file",
      "mode": "content",
      "glob": ["src/styles/**/*.{ts,tsx,js,jsx}", "styles/**/*.{ts,tsx,js,jsx}"],
      "regex": "StyleSheet\\.create",
      "rationale": "A stylesheet exported from a central styles/ folder bypasses the MD3 theme and component isolation."
    },
    {
      "id": "inline-static-style-literal",
      "mode": "content",
      "glob": ["src/**/*.{tsx,jsx}"],
      "regex": "style=\\{\\{[^}]*(#[0-9a-fA-F]{3,8}|'(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey)'|backgroundColor\\s*:\\s*'|background\\s*:\\s*')[^}]*\\}",
      "rationale": "Inline style={{}} with a hardcoded color/shape literal ignores the MD3 theme; use useTheme() + a colocated themed StyleSheet."
    },
    {
      "id": "hardcoded-color-literals",
      "mode": "content",
      "glob": ["src/**/*.{tsx,jsx,ts}"],
      "regex": "#[0-9a-fA-F]{6}\\b|#[0-9a-fA-F]{3}\\b|'(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey)'",
      "rationale": "Hardcoded colors bypass the MD3 theme and break light/dark seeding; reference theme.colors.*."
    }
  ],
  "mustInclude": []
}
```
