# Ink

Component adapter for JavaScript/TypeScript TUI applications. Ink provides React components for terminal UIs using Yoga for layout and ANSI for rendering.

## Platforms

- tui (Node/Bun-based terminal UI)

## Category

Components

## Scaffold

### Installation

```bash
npm install ink react
# or
bun add ink react
# or
pnpm add ink react
```

### Project Structure

Create a component directory:

```
components/
  index.tsx      # Component exports
  button.tsx     # Button component
  button.test.ts # Button tests
```

## Component Structure

Ink uses React components for terminal UI:

```typescript
import React from 'react';
import { Text, Box } from 'ink';

interface ButtonProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Button({ label, active = false }: ButtonProps) {
  return (
    <Box>
      <Text bold={active}>
        {active ? '› ' : '  '}{label}
      </Text>
    </Box>
  );
}
```

## Hooks

Ink provides terminal-specific hooks:

```typescript
import {
  useInput,
  useApp,
  useStdoutDimensions,
  useFocus,
} from 'ink';

function InputComponent() {
  const [value, setValue] = React.useState('');

  // Handle keyboard input
  useInput((input, key) => {
    if (key.enter) {
      submit(value);
    } else if (key.ctrl && input === 'c') {
      exit();
    } else {
      setValue(value + input);
    }
  });

  // Exit the app
  const { exit } = useApp();

  // Get terminal dimensions
  const [columns, rows] = useStdoutDimensions();

  // Focus management
  const { isFocused } = useFocus();

  return <Text>{value}</Text>;
}
```

### useInput

Handle keyboard input:

```typescript
useInput((input, key) => {
  // key: { return: boolean, escape: boolean, ctrl: boolean,
  //        shift: boolean, meta: boolean, up/down/left/right/tab,
  //        backspace: boolean, delete: boolean, enter: boolean }

  if (key.return) {
    handleSubmit();
  }

  if (key.ctrl && input === 'c') {
    exit();
  }

  if (key.up) {
    moveUp();
  }
});
```

### useFocus

Manage focus for keyboard navigation:

```typescript
import { useFocus } from 'ink';

function Option() {
  const { isFocused, focus } = useFocus();

  return (
    <Text dim={!isFocused}>
      {isFocused ? '› ' : '  '}Option
    </Text>
  );
}

// In parent component
import { useFocusManager } from 'ink';

function Menu() {
  const { focusNext, focusPrevious } = useFocusManager();

  useInput((_, key) => {
    if (key.downArrow) focusNext();
    if (key.upArrow) focusPrevious();
  });

  return (
    <Box flexDirection="column">
      <Option focused={true} />
      <Option />
      <Option />
    </Box>
  );
}
```

### useStdoutDimensions

Get terminal size for responsive layouts:

```typescript
function Responsive() {
  const [columns] = useStdoutDimensions();

  return (
    <Box width={columns && columns > 80 ? 60 : 40}>
      Content adapts to width
    </Box>
  );
}
```

## Component Composition

Compose components like React:

```typescript
function Form() {
  return (
    <Box flexDirection="column" gap={1}>
      <Input label="Name" />
      <Input label="Email" />
      <Button label="Submit" />
    </Box>
  );
}
```

## Layout

Ink uses Yoga for Flexbox-like layout:

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

## State Management

Use React state:

```typescript
import { useState, useEffect } from 'react';
import { Text } from 'ink';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <Text>Count: {count}</Text>;
}
```

## Event Handling

### Custom Events

```typescript
interface ButtonProps {
  onPress: () => void;
  label: string;
}

function Button({ onPress, label }: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onPress}
    >
      <Text bold={isHovered}>
        {label}
      </Text>
    </Box>
  );
}
```

### Keyboard Shortcuts

```typescript
function App() {
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
    if (key.tab) {
      // Handle tab
    }
  });

  return <Component />;
}
```

## Rendering

### render()

Mount an Ink component:

```typescript
import { render } from 'ink';

function App() {
  return <Text>Hello World</Text>;
}

render(<App />);
```

### waitUntilExit()

Wait for app to finish:

```typescript
const { unmount, waitUntilExit } = render(<App />);

// Later
unmount();
await waitUntilExit();
```

## Styling

Styles are typically handled through theme (see `ink-styles.md` adapter):

```typescript
import { Text, Box } from 'ink';
import { useTheme } from '../theme';

function Button({ label }: { label: string }) {
  const { styles } = useTheme();

  return (
    <Box borderStyle="single" borderColor={styles.card.hex()}>
      <Text color={styles.button.hex()} bold>
        {label}
      </Text>
    </Box>
  );
}
```

## Verify

### Component Check

- Component is a function or class
- Props are typed with TypeScript interface
- No side effects in render (use useEffect)
- Styles use theme, not hardcoded values
- Components are composable

### Test Example

```typescript
import { render } from 'ink-testing-library';
import { Button } from './button';

test('renders button label', () => {
  const { lastFrame } = render(<Button label="Click me" />);
  expect(lastFrame()).toContain('Click me');
});

test('handles press event', async () => {
  const onPress = jest.fn();
  const { lastFrame } = render(
    <Button label="Click me" onPress={onPress} />
  );

  // Simulate key press
  await lastFrame().stdin.write('\r'); // Enter key

  expect(onPress).toHaveBeenCalled();
});
```

### Story

Create `stories/components/button.story.ts`:

```typescript
import type { StoryMeta, Story } from 'tui-sandbox';

export default {
  title: 'Components/Button',
  adapter: 'bun',
} satisfies StoryMeta;

export const basic: Story = {
  mount: {
    command: 'bun',
    args: ['run', 'scripts/show-button.tsx'],
  },
};
```

Create `scripts/show-button.tsx`:

```typescript
#!/usr/bin/env bun
import { render } from 'ink';
import { Button } from '../components';

render(<Button label="Click me" />);
```

## Common Patterns

### Selectable List

```typescript
import { useState, useInput } from 'react';
import { Text, Box } from 'ink';

interface ListProps {
  items: string[];
  onSelect: (item: string) => void;
}

function SelectList({ items, onSelect }: ListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(i => Math.min(items.length - 1, i + 1));
    }
    if (key.return) {
      onSelect(items[selectedIndex]);
    }
  });

  return (
    <Box flexDirection="column">
      {items.map((item, index) => (
        <Text key={item}>
          {index === selectedIndex ? '› ' : '  '}{item}
        </Text>
      ))}
    </Box>
  );
}
```

### Async Loading

```typescript
import { useState, useEffect } from 'react';
import { Text } from 'ink';

function DataLoader() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [data, setData] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setStatus('loading');
      const result = await fetchData();
      setData(result);
      setStatus('done');
    }

    load();
  }, []);

  if (status === 'loading') {
    return <Text>Loading...</Text>;
  }

  if (status === 'done') {
    return <Text>Data: {data}</Text>;
  }

  return <Text>Idle</Text>;
}
```

### Confirmation Dialog

```typescript
import { useState } from 'react';
import { Text, Box } from 'ink';

function Confirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Box flexDirection="column">
      <Text>Are you sure?</Text>
      <Box>
        <Text dim={!confirmed}>[Y] Yes  </Text>
        <Text dim={confirmed}>[N] No</Text>
      </Box>
    </Box>
  );
}
```

## Resources

- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Ink Examples](https://github.com/vadimdemedes/ink/tree/master/examples)
- [ink-testing-library](https://github.com/cameron-rowland/ink-testing-library)
