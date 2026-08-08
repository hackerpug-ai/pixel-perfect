---
id: mantine
name: Mantine
appliesTo:
  platforms: [web-desktop, web-mobile]
  frameworks: [react, nextjs, vite]
  componentLibrary: mantine
distribution: package
importRoot: "@mantine/core"
source: builtin
canonicalDocs: https://mantine.dev/getting-started/
lastUpdated: 2026-08-08
---

# Mantine — Component Contract

Mantine is a **package-import** library: components come from `@mantine/core`, not from vendored source. `MantineProvider` supplies the theme, and every Mantine component reads its colors, spacing, radius, and focus ring from it.

A project component therefore **imports its interactive primitives from `@mantine/core`**. A bare `<button>` renders outside the theme — no focus ring, no color scheme, no `size`/`variant` system, and no dark-mode response.

## Compose method

**How:** `import-from-package`

```tsx
// ✓ correct
import { Button, TextInput } from "@mantine/core";

export function SearchAction({ value, onChange, onSubmit }) {
  return (
    <>
      <TextInput value={value} onChange={onChange} placeholder="Search" />
      <Button variant="filled" onClick={onSubmit}>Go</Button>
    </>
  );
}
```

```tsx
// ✗ wrong — outside the theme
export function SearchAction({ value, onChange, onSubmit }) {
  return (
    <>
      <input value={value} onChange={onChange} placeholder="Search" />
      <button onClick={onSubmit}>Go</button>
    </>
  );
}
```

## Package inventory

| Raw element | Mantine replacement |
|---|---|
| `<button>` | `Button`, `ActionIcon`, `UnstyledButton` |
| `<input>` | `TextInput`, `NumberInput`, `PasswordInput` |
| `<textarea>` | `Textarea` |
| `<select>` | `Select`, `NativeSelect` |

`UnstyledButton` is the intended escape hatch for a genuinely custom control — it keeps the theme's focus ring and event handling while dropping the visual styling. Reach for it before reaching for `<button>`.

Mantine also ships `Modal`, `Card`, `Badge`, `Menu`, `Tabs`, `Tooltip`, `Notification`, and a full layout set. Prefer them over hand-built equivalents; they are not gate-enforced because there is no raw element that unambiguously stands in for them.

## Free primitives

`<div>`, `<span>`, `<p>`, `<section>`, `<nav>`, `<ul>`, `<li>`, `<a>`, headings, `<img>`, `<svg>`, `<form>`, `<label>`. Structure and text, not components Mantine replaces. (Mantine's `Box`, `Group`, and `Stack` are preferred for layout, but plain elements are not a violation.)

## Forbidden patterns

- **Raw interactive element** — a bare `<button>`, `<input>`, `<textarea>`, or `<select>` in a project component. *Rationale:* renders outside the Mantine theme — no focus ring, no color scheme, no size/variant system, no dark-mode response. Use the Mantine component, or `UnstyledButton` when the control is genuinely custom.

## Verify checklist (component level)

- Interactive elements come from `@mantine/core`.
- Custom controls use `UnstyledButton` rather than a bare `<button>`.
- Colors and spacing come from theme props or `useMantineTheme()`, not literals.
- The component renders correctly under both color schemes.

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "raw-interactive-element",
      "mode": "content",
      "glob": [
        "components/**/*.{tsx,jsx}",
        "src/components/**/*.{tsx,jsx}",
        "app/**/*.{tsx,jsx}",
        "src/app/**/*.{tsx,jsx}",
        "pages/**/*.{tsx,jsx}",
        "src/pages/**/*.{tsx,jsx}"
      ],
      "exclude": [
        "**/*.stories.*",
        "**/*.test.*",
        "**/*.spec.*"
      ],
      "regex": "<(?:button|input|textarea|select)[\\s/>]",
      "rationale": "Mantine provides a themed equivalent for this element. A bare HTML tag renders outside the theme — no focus ring, no color scheme, no size/variant system, no dark-mode response. Use the Mantine component, or UnstyledButton when the control is genuinely custom."
    }
  ]
}
```
