# Ink Styles

Style adapter for JavaScript/TypeScript TUI applications using Ink. Ink provides React-like component rendering to terminal with CSS-in-JS styling.

## Platforms

- tui (Node/Bun-based terminal UI)

## Category

Style

## Scaffold

### Installation

```bash
npm install ink
# or
bun add ink
# or
pnpm add ink
```

### Project Structure

Create a `theme/` directory for styling:

```
theme/
  colors.ts      # Color palette definitions
  styles.ts      # Ink style definitions
  index.ts       # Theme exports
```

## Theme Integration

### Color Definitions

Ink uses `color` module for terminal colors:

```typescript
// theme/colors.ts
import { color } from 'ink';

export type ColorHex = `#${string}`;

export interface ColorPalette {
  primary: ColorHex;
  secondary: ColorHex;
  accent: ColorHex;
  muted: ColorHex;
  success: ColorHex;
  warning: ColorHex;
  error: ColorHex;
  base: ColorHex;
  surface: ColorHex;
}

export const defaultPalette: ColorPalette = {
  primary: '#6C6C6C',
  secondary: '#9B9B9B',
  accent: '#FA7921',
  muted: '#6E6E6E',
  success: '#3CB371',
  warning: '#FFD700',
  error: '#FF6B6B',
  base: '#FFFFFF',
  surface: '#F5F5F5',
};

// Dark mode palette
export const darkPalette: ColorPalette = {
  primary: '#E0E0E0',
  secondary: '#B0B0B0',
  accent: '#FF9F1A',
  muted: '#A0A0A0',
  success: '#4ADE80',
  warning: '#FDE047',
  error: '#F87171',
  base: '#FFFFFF',
  surface: '#1A1A1A',
};
```

### Style Definitions

Ink uses the `color` module for text coloring:

```typescript
// theme/styles.ts
import { color, Color } from 'ink';
import type { ColorPalette } from './colors';

export interface Styles {
  // Typography
  title: Color;
  subtitle: Color;
  body: Color;
  muted: Color;

  // Component styles
  button: Color;
  buttonActive: Color;
  card: Color;

  // Status
  success: Color;
  warning: Color;
  error: Color;
}

export function createStyles(palette: ColorPalette): Styles {
  return {
    // Typography
    title: color.hex(palette.primary).bold,
    subtitle: color.hex(palette.secondary).dim,
    body: color.hex(palette.base),
    muted: color.hex(palette.muted).dim,

    // Component styles
    button: color.hex(palette.primary),
    buttonActive: color.hex(palette.accent).bold,
    card: color.hex(palette.muted),

    // Status
    success: color.hex(palette.success),
    warning: color.hex(palette.warning),
    error: color.hex(palette.error).bold,
  };
}

// Export default styles
export const styles = createStyles(defaultPalette);
```

### Theme Provider

Create a theme context for React components:

```typescript
// theme/index.ts
import { createContext, useContext } from 'react';
import type { ColorPalette, Styles } from './styles';

interface Theme {
  palette: ColorPalette;
  styles: Styles;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  palette,
  styles,
  children,
}: {
  palette: ColorPalette;
  styles: Styles;
  children: React.ReactNode;
}) {
  return (
    <ThemeContext.Provider value={{ palette, styles }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return theme;
}
```

## Component Styling

### Text Styling

```typescript
import { Text } from 'ink';
import { useTheme } from '../theme';

function Title({ children }: { children: string }) {
  const { styles } = useTheme();
  return <Text color={styles.title}>{children}</Text>;
}

function Subtitle({ children }: { children: string }) {
  const { styles } = useTheme();
  return <Text color={styles.subtitle}>{children}</Text>;
}
```

### Box Component

Ink uses `Box` for layout (like `div` in web):

```typescript
import { Box, Text } from 'ink';
import { useTheme } from '../theme';

interface CardProps {
  title: string;
  children: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
  const { styles } = useTheme();

  return (
    <Box
      borderStyle="single"
      borderColor={styles.card.hex()}
      padding={1}
      flexDirection="column"
    >
      <Text bold color={styles.title.hex()}>
        {title}
      </Text>
      <Box marginTop={1}>{children}</Box>
    </Box>
  );
}
```

### Button Component

```typescript
import { Box, Text } from 'ink';
import { useTheme } from '../theme';

interface ButtonProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Button({ label, active = false }: ButtonProps) {
  const { styles } = useTheme();
  const buttonStyle = active ? styles.buttonActive : styles.button;

  return (
    <Box>
      <Text
        color={buttonStyle.hex()}
        bold={active}
      >
        {active ? '› ' : '  '}{label}
      </Text>
    </Box>
  );
}
```

## Layout

Ink uses Flexbox-like layout via `Box`:

```typescript
import { Box } from 'ink';

// Horizontal layout
<Box flexDirection="row">
  <Box>Left</Box>
  <Box>Center</Box>
  <Box>Right</Box>
</Box>

// Vertical layout (default)
<Box flexDirection="column">
  <Box>Top</Box>
  <Box>Middle</Box>
  <Box>Bottom</Box>
</Box>

// Alignment
<Box
  justifyContent="center"  // main axis
  alignItems="center"      // cross axis
  flexGrow={1}
>
  Centered content
</Box>
```

## Spacing

Ink uses numeric values for spacing:

```typescript
import { Box } from 'ink';

// Padding
<Box padding={1}>          // All sides
<Box paddingX={2}>         // Horizontal only
<Box paddingY={1}>         // Vertical only
<Box paddingTop={1}        // Individual sides
       paddingBottom={1}
       paddingLeft={2}
       paddingRight={2}>

// Margin (gap between elements)
<Box flexDirection="column" gap={1}>
  <Box>Item 1</Box>
  <Box>Item 2</Box>
</Box>

// Width/Height
<Box width={40} height={10}>
  Fixed size
</Box>

// Grow/shrink
<Box flexGrow={1}>        // Take available space
<Box flexShrink={0}>      // Don't shrink
```

## Border Styles

Ink supports various border styles:

```typescript
import { Box } from 'ink';

<Box borderStyle="single">  // ┌─┐│
<Box borderStyle="double">  // ╔═╗║
<Box borderStyle="round">   // ╭─╮│
<Box borderStyle="bold">    // ┏━┓┃
<Box borderStyle="classic"> // + -+|

// Custom border characters
<Box borderStyle={{
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
}}>
```

## Responsive Design

Ink provides terminal dimensions via hooks:

```typescript
import { useStdoutDimensions } from 'ink';

function ResponsiveComponent() {
  const [columns, rows] = useStdoutDimensions();

  return (
    <Box width={columns && columns > 80 ? 60 : 40}>
      Content adapts to terminal width
    </Box>
  );
}
```

## Verify

### Style Check

- All colors defined in `theme/colors.ts`
- All styles defined in `theme/styles.ts`
- No hardcoded colors (e.g., `#FF0000`) in component files
- Components use `useTheme()` hook for styles
- Styles are type-safe (using `Color` type)

### Theme Story

Create `stories/design-system/colors.story.ts`:

```typescript
import type { StoryMeta, Story } from 'tui-sandbox';

export default {
  title: 'Design System/Colors',
  adapter: 'bun',
} satisfies StoryMeta;

export const palette: Story = {
  mount: {
    command: 'bun',
    args: ['run', 'scripts/show-colors.ts'],
  },
};
```

Create `scripts/show-colors.ts`:

```typescript
#!/usr/bin/env bun
import { render } from 'ink';
import { ThemeProvider, styles } from '../theme';

function ColorDemo() {
  return (
    <ThemeProvider palette={defaultPalette} styles={styles}>
      <Box flexDirection="column">
        <Text color={styles.success.hex()}>Success message</Text>
        <Text color={styles.warning.hex()}>Warning message</Text>
        <Text color={styles.error.hex()}>Error message</Text>
        <Text color={styles.title.hex()}>Title text</Text>
        <Text color={styles.muted.hex()}>Muted text</Text>
      </Box>
    </ThemeProvider>
  );
}

render(<ColorDemo />);
```

### Visual Check

- Colors render correctly in terminal
- Borders display as expected
- Spacing is consistent
- Text is readable (contrast check)

## Dark Mode

Detect terminal background and switch palette:

```typescript
import { useEffect, useState } from 'react';
import { useApp } from 'ink';
import type { ColorPalette } from './colors';

function usePalette(): ColorPalette {
  const { exit } = useApp();
  const [palette, setPalette] = useState(defaultPalette);

  useEffect(() => {
    // Check for dark mode indicators
    const colorFgBg = process.env.COLORFGBG;
    if (colorFgBg) {
      const bg = parseInt(colorFgBg.split(';').pop() || '0', 10);
      if (bg < 8) {
        setPalette(darkPalette);
      }
    }
  }, []);

  return palette;
}
```

## ANSI Escapes

Ink handles ANSI escapes automatically, but you can also use them:

```typescript
import { text } from 'ink';

// Direct ANSI (not recommended - use styles instead)
<Text>\x1b[31mRed text\x1b[0m</Text>

// Preferred: use styles
<Text color="red">Red text</Text>
<Text color="#FF0000">Red text</Text>
```

## Resources

- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Ink Examples](https://github.com/vadimdemedes/ink/tree/master/examples)
- [Box Component Docs](https://github.com/vadimdemedes/ink#box)
