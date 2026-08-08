---
id: rn-stylesheet-mobile
name: React Native StyleSheet (Mobile)
appliesTo:
  platforms: [mobile-ios, mobile-android]
  frameworks: [react-native, expo]
  styleSystem: stylesheet
  componentLibrary: any
source: builtin
canonicalDocs: https://reactnative.dev/docs/stylesheet
lastUpdated: 2026-06-13
---

# React Native StyleSheet (Mobile) — Styling Contract

Styles are defined with **`StyleSheet.create({ … })` colocated in the same file as the component** that uses them, and applied via the `style` prop. There is no shared/global stylesheet file imported across components, and no inline object literals for static values. Design tokens reach components through a theme object (`theme.colors.*`, `theme.spacing.*`) referenced inside the `StyleSheet.create` call.

Colocation is the convention: a component and its styles live and move together. Pulling styles into a central `src/styles/` file breaks component isolation, defeats `StyleSheet`'s referential-equality optimizations, and severs the token binding.

## Emit method

**How:** `stylesheet-create-colocated`

Define styles in the component file via `StyleSheet.create`, then reference them by key on the `style` prop.

```tsx
// ✓ correct — colocated StyleSheet.create
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function StatusBadge({ label }: { label: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radii.sm,
  },
  label: {
    color: theme.colors.primaryForeground,
    fontSize: theme.fontSizes.sm,
    fontWeight: "600",
  },
});
```

```tsx
// ✗ wrong — global styles imported across components
import { sharedStyles } from "@/styles/shared";   // forbidden central stylesheet
<View style={sharedStyles.card}>…

// ✗ wrong — inline literal for static values
<View style={{ flex: 1, padding: 16, backgroundColor: "#2563eb" }}>…
```

> Inline `style={[…]}` arrays are fine for **merging** a colocated style with a genuinely dynamic value (e.g. `style={[styles.card, { opacity: fadeAnim }]}`); the rule forbids inline literals for *static* layout/color/spacing.

## File placement

**Rule:** `colocated`

The `StyleSheet.create` call lives in the same file as its component. Components may live under `src/components/**`, `src/screens/**`, or feature folders. There is **no** `src/styles/**` or `styles/**` exporting stylesheets for components to import.

- **Allowed:** `src/components/**/*.{tsx,ts}`, `src/screens/**/*.{tsx,ts}`, `src/app/**/*.{tsx,ts}`.
- **Forbidden:** `src/styles/**/*.{ts,tsx,js}`, `styles/**/*` exporting `StyleSheet.create` objects; `.css`/`.scss` (not used by React Native).

## Token binding

**Mechanism:** `theme-object-to-stylesheet`

Design tokens live in a theme module (`src/theme/theme.ts` — colors, spacing scale, radii, font sizes, shadows). `StyleSheet.create` references the theme object directly so the theme is the only source of color/spacing truth.

```ts
// access pattern
const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing[4],
    borderRadius: theme.radii.md,
  },
});
```

## Forbidden patterns

- **Central/shared stylesheet files** — a module under `src/styles/` (or `styles/`) exporting `StyleSheet.create` objects imported by components. *Rationale:* breaks component isolation and `StyleSheet` identity optimization; severs colocated token binding.
- **Inline static style literals** — `style={{ … }}` objects for static layout/color/spacing. *Rationale:* bypasses `StyleSheet` optimization and the theme; use a colocated `StyleSheet.create` key. (Dynamic computed values merged via `style={[base, dynamic]}` are allowed.)
- **Hardcoded color literals** — `#rrggbb`, `#rgb`, or named colors (`'blue'`) inline. *Rationale:* breaks theme consistency and dark/seeded theming; reference `theme.colors.*`.

## Verify checklist (component level)

- Component defines its styles via a colocated `StyleSheet.create`.
- Colors reference the theme object (`theme.colors.primary`) not literals.
- Spacing uses the theme spacing scale (`theme.spacing[4]`) not arbitrary pixel values.
- `style={{ … }}` inline literals appear only for truly dynamic values, merged onto a colocated base style.

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "central-stylesheet-file",
      "mode": "content",
      "glob": ["src/styles/**/*.{ts,tsx,js,jsx}", "styles/**/*.{ts,tsx,js,jsx}"],
      "regex": "StyleSheet\\.create",
      "rationale": "A stylesheet exported from a central styles/ folder breaks component isolation; StyleSheet.create must be colocated with the component that uses it."
    },
    {
      "id": "inline-static-style-literal",
      "mode": "content",
      "glob": ["src/**/*.{tsx,jsx}"],
      "regex": "style=\\{\\{[^}]*(flex|padding|margin|backgroundColor|background|color|fontSize|borderRadius):",
      "rationale": "Inline style={{}} literals for static layout/color/spacing bypass StyleSheet.create and the theme; use a colocated style key."
    },
    {
      "id": "hardcoded-color-literals",
      "mode": "content",
      "glob": ["src/**/*.{tsx,jsx,ts}"],
      "regex": "#[0-9a-fA-F]{6}\\b|#[0-9a-fA-F]{3}\\b|'(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey)'",
      "rationale": "Hardcoded colors bypass the theme and break dark/seeded theming; reference theme.colors.*."
    }
  ],
  "mustInclude": [
    {
      "id": "stylesheet-create-usage",
      "glob": ["src/components/**/*.{tsx,jsx}", "src/screens/**/*.{tsx,jsx}"],
      "exclude": ["**/index.{ts,tsx,js,jsx}", "**/*.stories.*", "**/*.test.*", "**/*.spec.*"],
      "regex": "StyleSheet\\.create",
      "description": "Every project component/screen defines its styles via a colocated StyleSheet.create."
    }
  ]
}
```
