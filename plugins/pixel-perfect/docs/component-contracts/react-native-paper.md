---
id: react-native-paper
name: React Native Paper
appliesTo:
  platforms: [mobile-ios, mobile-android]
  frameworks: [react-native, expo]
  componentLibrary: react-native-paper
distribution: package
importRoot: "react-native-paper"
source: builtin
canonicalDocs: https://callstack.github.io/react-native-paper/
lastUpdated: 2026-08-08
---

# React Native Paper — Component Contract

Paper is a **package-import** library: components are imported from `react-native-paper`, not vendored into the repo. `PaperProvider` supplies an MD3 theme through context, and every Paper component reads its colors, typography, and elevation from it.

A project component therefore **imports its text and interactive primitives from `react-native-paper`**. A raw `Text` from `react-native` renders outside the MD3 type scale and outside the theme entirely — it will not follow a theme switch, and it silently diverges from every other label in the app.

## Compose method

**How:** `import-from-package`

```tsx
// ✓ correct
import { Button, Text } from "react-native-paper";

export function SubmitAction({ label, ...rest }) {
  return <Button mode="contained" {...rest}>{label}</Button>;
}
```

```tsx
// ✗ wrong — outside the MD3 theme
import { Pressable, Text } from "react-native";

export function SubmitAction({ label, ...rest }) {
  return (
    <Pressable style={{ padding: 12 }} {...rest}>
      <Text>{label}</Text>
    </Pressable>
  );
}
```

## Package inventory

The primitives this contract enforces are Paper's core, present in every version:

| Raw primitive | Paper replacement |
|---|---|
| `Text` | `Text` from `react-native-paper` (MD3 `variant` prop) |
| `TextInput` | `TextInput` from `react-native-paper` |
| `Pressable`, `TouchableOpacity`, `TouchableHighlight` | `Button`, `IconButton`, or `TouchableRipple` |
| `Button` (RN's built-in) | `Button` from `react-native-paper` |

Paper also ships `Card`, `Chip`, `Switch`, `Checkbox`, `RadioButton`, `Dialog`, `Menu`, `Snackbar`, `FAB`, and `Appbar`. Prefer them over hand-built equivalents; they are not gate-enforced because there is no raw primitive that unambiguously stands in for them.

## Free primitives

`View`, `ScrollView`, `FlatList`, `SectionList`, `SafeAreaView`, `KeyboardAvoidingView`, `TouchableWithoutFeedback` (the `Keyboard.dismiss` idiom), `Platform`, `Dimensions`, `Animated`, `useWindowDimensions`, `StyleSheet`, and every type-only import.

Note there is **no vendored `ui/` layer** to exclude here — Paper is imported from the package. If the project wraps Paper behind its own primitive directory, add that directory to `component_contract_overrides` so the wrappers themselves may import raw primitives.

## Forbidden patterns

- **Raw primitive outside the theme** — importing `Text`, `TextInput`, `Pressable`, `TouchableOpacity`, `TouchableHighlight`, or `Button` from `react-native` in a project component. *Rationale:* renders outside the MD3 theme and type scale, will not follow a theme switch, and diverges from every other control in the app.

## Verify checklist (component level)

- Text and interactive primitives are imported from `react-native-paper`.
- Text uses an MD3 `variant` rather than an ad-hoc font size.
- Colors come from `useTheme()`, not from literals.
- The component renders correctly under both light and dark MD3 themes.

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "raw-primitive-outside-theme",
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
        "**/*.stories.*",
        "**/*.test.*",
        "**/*.spec.*"
      ],
      "regex": "import\\s*\\{[^}]*\\b(?:Button|Pressable|Text|TextInput|TouchableHighlight|TouchableOpacity)\\b[^}]*\\}\\s*from\\s*['\"]react-native['\"]",
      "rationale": "react-native-paper provides a themed equivalent for this primitive. The raw react-native version renders outside the MD3 theme and type scale, will not follow a theme switch, and diverges from every other control in the app. Import it from react-native-paper instead."
    }
  ]
}
```
