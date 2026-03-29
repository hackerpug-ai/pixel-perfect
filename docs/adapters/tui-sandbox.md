# tui-sandbox

Sandbox adapter for isolated TUI component development and verification. tui-sandbox provides a Storybook-like experience for terminal UI components with frame capture, keyboard simulation, and ANSI processing.

## Platforms

- tui (full interactive terminal UI)
- cli (formatted command-line output)

**TUI projects render in the terminal using ANSI escape sequences.** Components are spawned as subprocesses with stdin/stdout pipes, and frames are captured for visual verification.

## Category

Sandbox (always selected for TUI/CLI platforms — not a user choice)

## Scaffold

### Installation

1. Install tui-sandbox as a dev dependency:
   ```bash
   npm install --save-dev tui-sandbox
   # or
   bun add -d tui-sandbox
   ```

2. Initialize project structure:
   ```bash
   npx tsbx init --stories "./stories/**/*.story.ts"
   ```

This creates:
- `.tsbx/settings.json` - Project configuration
- `stories/` - Example stories directory (or your specified pattern)
- Updated `package.json` with tsbx scripts

### Configuration

Create or update `.tsbx/settings.json`:
```json
{
  "stories": ["stories/**/*.story.ts"],
  "terminal": {
    "cols": 80,
    "rows": 24
  }
}
```

Add scripts to `package.json`:
```json
{
  "scripts": {
    "dev": "tsbx dev",
    "test": "tsbx run",
    "test:watch": "tsbx run --watch"
  }
}
```

## Story File Convention

TUI stories use a different format than Storybook CSF3. They are TypeScript modules with:

- **Default export**: Story metadata (`StoryMeta`)
- **Named exports**: Story variants (`Story`)

### Story Structure

```typescript
// stories/button.story.ts
import type { StoryMeta, Story } from "tui-sandbox";

// Default export: Metadata
export default {
  title: "Components/Button",        // Sidebar hierarchy
  adapter: "go",                      // "go" for gum/Go tools, "bun" for generic
  description: "Button component tests",
  terminal: { cols: 80, rows: 24 },   // Optional terminal dimensions
} satisfies StoryMeta;

// Named exports: Story variants
export const basic: Story = {
  mount: {                            // Declarative approach
    command: "gum",
    args: ["choose", "Option A", "Option B"],
    env: { CUSTOM_VAR: "value" },
  },
};

export const interactive: Story = {
  run: async (sandbox) => {           // Imperative approach
    const handle = await sandbox.mount("demo", "gum", ["input"]);
    await sandbox.type("Hello World");
    await sandbox.sendKey("demo", "Enter");
  },
};
```

### Story Organization

Stories use the same hierarchy prefixes as Storybook:

```
Design System/          ← Token reference stories (scaffold phase)
  Colors
  Typography
  Spacing
Components/             ← Atomic components (atoms phase)
  StatusBadge
  JobCard
  ActionButton
Screens/                ← Composed screens (compose phase)
  TodayFeed
  JobDetail
```

### Adapter Types

| Adapter | Use Case | Example Tools |
|---------|----------|---------------|
| `go` | Go-based CLI tools | gum, Bubbletea apps |
| `bun` | Any Node/Bun process | Ink apps, Node scripts |

## Theme Integration

TUI theming differs from web - colors are terminal ANSI codes, not CSS variables.

### Terminal Color Mapping

Most TUI frameworks use 256-color or truecolor (24-bit) ANSI escape sequences:

```typescript
// ANSI color codes for truecolor
const color = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;

// Example: red text
console.log(`${color(255, 0, 0)}Error message\x1b[0m`);
```

### Framework-Specific Theming

**Lipgloss (Go):**
```go
var primaryStyle = lipgloss.NewStyle().
    Forecolor(lipgloss.Color("#6C6C6C")).
    Background(lipgloss.Color("#E0E0E0"))
```

**Rich (Python):**
```python
from rich.color import Color
from rich.style import Style

primary_style = Style(color="#6C6C6C", bgcolor="#E0E0E0")
```

**Ink (JS):**
```typescript
import { color } from 'ink';

const primaryStyle = color.hex('#6C6C6C');
```

### Design Token Stories

During scaffold, generate TUI-specific token stories:

| Story | Content |
|-------|---------|
| `Design System/Colors` | Color swatches with ANSI escape codes |
| `Design System/Typography` | Font scale if supported by terminal |
| `Design System/Spacing` | Padding/margin visual examples |
| `Design System/Borders` | Border style examples (single, double, rounded) |

Example color story:
```typescript
export default {
  title: "Design System/Colors",
  adapter: "bun",
} satisfies StoryMeta;

export const palette: Story = {
  mount: {
    command: "echo",
    args: [
      "\\x1b[38;2;255;99;71mPrimary\\x1b[0m",
      "\\x1b[38;2;60;179;113mSuccess\\x1b[0m",
      "\\x1b[38;2;255;206;86mWarning\\x1b[0m"
    ],
  },
};
```

## Verify

### Component Level

- Story file exists in `stories/` directory
- `npm run dev` starts tui-sandbox without errors
- Component renders in terminal preview
- Story uses correct hierarchy prefix (`Components/` or `Screens/`)
- Terminal dimensions are appropriate for component

### Token Level

- Token stories exist under `Design System/` group
- Color swatches render with correct ANSI codes
- Border styles display correctly
- Spacing examples show visual differences

### Screen Level

- Screen-level story exists with realistic data
- All composed atoms render within the screen story
- Keyboard interactions work (sendKey, type)
- Frame capture shows expected output

### Automated Testing

Use tui-sandbox's test harness for automated verification:

```typescript
import { createTestHarness, stripAnsi } from "tui-sandbox";

test("button component renders", async () => {
  const harness = createTestHarness({ cols: 80, rows: 24 });
  const handle = await harness.mount("button", "gum", ["choose", "A", "B"]);

  // Wait for render
  await handle.waitFor("A");

  // Check output (stripped of ANSI)
  expect(handle.getPlainText()).toContain("A");

  await harness.cleanup();
});
```

### Custom Matchers

tui-sandbox provides custom matchers for TUI testing:

```typescript
import { setupMatchers } from "tui-sandbox";
setupMatchers();

// Text content (ANSI-stripped)
expect(output).toContainText("Success");

// Regex match against raw ANSI
expect(output).toMatchFrame(/Status: \d+/);

// Check for cursor indicators
expect(output).toHaveSelection("Selected item");

// Check for checkbox indicators
expect(output).toHaveChecked("Checked item");
```

## Sandbox

### Dev Server

```bash
npm run dev              # Launches tui-sandbox TUI browser
# or
tsbx dev
```

**Interactive Controls:**
- `↑/↓` or `j/k`: Navigate stories
- `Enter`: Focus preview pane
- `Escape`: Return to navigation
- `q`: Quit

### Test Runner

```bash
npm run test             # Run all stories as tests
# or
tsbx run
```

### Frame Capture

tui-sandbox captures terminal output frames for visual regression:

```typescript
const frames = sandbox.getFrames("component-id");
const lastFrame = sandbox.getLastFrame("component-id");

// Wait for stable frame
await sandbox.waitForFrame("component-id", 1000);
```

### ANSI Utilities

```typescript
import {
  stripAnsi,           // Remove ANSI codes
  containsText,        // Search in stripped text
  matchesPattern,      // Regex match
  extractBetween,      // Extract text between delimiters
  getVisibleLines,     // Get last N lines
} from "tui-sandbox";
```

## Terminal Constraints

**IMPORTANT**: TUI components have constraints that web components don't:

1. **No true PTY in Bun**: Uses stdin/stdout pipes, not pseudo-terminals
2. **Fixed dimensions**: Terminal size must be set before mounting
3. **No resize events**: Components cannot respond to SIGWINCH
4. **Limited input**: Keyboard only (no mouse in most terminals)
5. **Color limitations**: Some terminals don't support truecolor

Design your components with these constraints in mind.

## Verification Command

```bash
tsbx run                    # Run all stories as tests
tsbx run --grep "Button"    # Run specific stories
tsbx run --timeout 10000    # Set per-story timeout
```
