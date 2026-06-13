---
id: nativewind-mobile
name: NativeWind (Mobile)
appliesTo:
  platforms: [mobile-ios, mobile-android]
  frameworks: [react-native, expo]
  styleSystem: nativewind
  componentLibrary: any
source: builtin
canonicalDocs: https://www.nativewind.dev/getting-started/introduction
lastUpdated: 2026-06-13
---

# NativeWind (Mobile) — Styling Contract

NativeWind brings Tailwind's utility-class model to React Native: styles are expressed as **Tailwind utility classes on the `className` prop** of React Native primitives (`View`, `Text`, `Pressable`, …). There are no central `StyleSheet` files and no inline object literals for static values. Design tokens reach components through the Tailwind theme (mapped via NativeWind) and are consumed as utilities (`bg-primary`, `text-foreground`).

This is the Tailwind contract adapted for React Native. The drift to avoid is the same as web Tailwind — a parallel global `StyleSheet`/CSS system of custom classes — plus the RN-specific habit of inline `style={{}}` literals.

## Emit method

**How:** `utility-classes-via-className`

Apply Tailwind utilities through `className` on RN primitives. Merge with `cn()` when conditional.

```tsx
// ✓ correct
import { View, Text, Pressable } from "react-native";

export function StatusBadge({ label, active }) {
  return (
    <View className={cn("flex-row items-center gap-2 rounded-md px-3 py-2", active && "bg-primary")}>
      <Text className="text-primary-foreground text-sm font-semibold">{label}</Text>
    </View>
  );
}
```

```tsx
// ✗ wrong — central stylesheet
import { shared } from "@/styles/shared";
<View style={shared.badge}>…

// ✗ wrong — inline static literal
<View style={{ flex: 1, padding: 16, backgroundColor: "#2563eb" }}>…
```

## File placement

**Rule:** `colocated`

Styles live inline on elements via `className`. There is no `src/styles/**` exporting stylesheets for components to import. Components live under `src/components/**`, `src/screens/**`, `src/app/**`.

- **Allowed:** `src/components/**/*.{tsx,ts}`, `src/screens/**/*.{tsx,ts}`, `src/app/**/*.{tsx,ts}`.
- **Forbidden:** `src/styles/**/*.{ts,tsx,js,jsx}`, `styles/**/*` exporting `StyleSheet.create`.

## Token binding

**Mechanism:** `tailwind-theme-via-nativewind`

Design tokens are defined in the Tailwind config / `@theme` and surfaced as utilities by NativeWind. Components reference utilities, never raw values.

```ts
// tailwind.config.ts — tokens become utilities NativeWind understands
// bg-primary, text-primary-foreground, etc.
```

```tsx
<View className="bg-primary text-primary-foreground rounded-md">…
```

## Forbidden patterns

- **Central/shared stylesheet files** — a module under `src/styles/` exporting `StyleSheet.create` objects. *Rationale:* recreates a parallel styling system that bypasses NativeWind utilities and the theme.
- **Inline static `style={{}}` literals** for static layout/color/spacing. *Rationale:* bypasses NativeWind utilities and the theme; use `className`. (Dynamic computed values merged via `style={[…]}` are allowed.)
- **Hardcoded color literals** — `#rrggbb` / `#rgb` / named colors inline. *Rationale:* breaks theme consistency; reference token utilities.

## Verify checklist (component level)

- Component applies styles via `className` utilities (not `StyleSheet` or inline literals).
- Colors reference token utilities (`bg-primary`) not hardcoded values.
- Spacing uses the Tailwind scale, not arbitrary pixel values.
- Dark-mode / platform variants applied where relevant.

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "central-stylesheet-file",
      "mode": "content",
      "glob": ["src/styles/**/*.{ts,tsx,js,jsx}", "styles/**/*.{ts,tsx,js,jsx}"],
      "regex": "StyleSheet\\.create",
      "rationale": "A stylesheet exported from a central styles/ folder bypasses NativeWind utilities and recreates a parallel styling system."
    },
    {
      "id": "inline-static-style-literal",
      "mode": "content",
      "glob": ["src/**/*.{tsx,jsx}"],
      "regex": "style=\\{\\{[^}]*(flex|padding|margin|backgroundColor|background|color|fontSize|borderRadius):",
      "rationale": "Inline style={{}} literals for static values bypass NativeWind utilities and the theme; use className."
    },
    {
      "id": "hardcoded-color-literals",
      "mode": "content",
      "glob": ["src/**/*.{tsx,jsx,ts}"],
      "regex": "#[0-9a-fA-F]{6}\\b|#[0-9a-fA-F]{3}\\b|'(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey)'",
      "rationale": "Hardcoded colors bypass the theme and break dark/seeded theming; use token utilities."
    }
  ],
  "mustInclude": [
    {
      "id": "utility-class-usage",
      "glob": ["src/components/**/*.{tsx,jsx}", "src/screens/**/*.{tsx,jsx}"],
      "exclude": ["**/index.{ts,tsx,js,jsx}", "**/*.stories.*", "**/*.test.*", "**/*.spec.*"],
      "regex": "className=",
      "description": "Every project component/screen references className with NativeWind utilities."
    }
  ]
}
```
