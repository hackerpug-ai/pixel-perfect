# Lipgloss

Style adapter for Go TUI applications. Lipgloss is a terminal styling library for Bubbletea that provides color, spacing, borders, and layout utilities.

## Platforms

- tui (Go-based terminal UI)

## Category

Style

## Scaffold

### Installation

```bash
go get github.com/charmbracelet/lipgloss
```

### Project Structure

Create a `theme/` package for styling:

```
theme/
  colors.go      # Color palette definitions
  styles.go      # Lipgloss style definitions
  theme.go       # Theme struct and renderer
```

## Theme Integration

### Color Definitions

Define colors using Lipgloss's `Color` type:

```go
package theme

import "github.com/charmbracelet/lipgloss"

// Colors defines the terminal color palette
type Colors struct {
    Primary   lipgloss.Color
    Secondary lipgloss.Color
    Accent    lipgloss.Color
    Muted     lipgloss.Color
    Success   lipgloss.Color
    Warning   lipgloss.Color
    Error     lipgloss.Color
    Base      lipgloss.Color
    Surface   lipgloss.Color
}

// Default color palette
var DefaultColors = Colors{
    Primary:   lipgloss.Color("#6C6C6C"),
    Secondary: lipgloss.Color("#9B9B9B"),
    Accent:    lipgloss.Color("#FA7921"),
    Muted:     lipgloss.Color("#6E6E6E"),
    Success:   lipgloss.Color("#3CB371"),
    Warning:   lipgloss.Color("#FFD700"),
    Error:     lipgloss.Color("#FF6B6B"),
    Base:      lipgloss.Color("#FFFFFF"),
    Surface:   lipgloss.Color("#F5F5F5"),
}
```

### Style Definitions

Create reusable styles using Lipgloss's builder pattern:

```go
package theme

import (
    "github.com/charmbracelet/lipgloss"
    "github.com/charmbracelet/lipgloss/list"
)

// Styles contains all Lipgloss styles for the app
type Styles struct {
    // Base styles
    Base      lipgloss.Style
    App       lipgloss.Style

    // Typography
    Title     lipgloss.Style
    Subtitle  lipgloss.Style
    Body      lipgloss.Style
    Muted     lipgloss.Style

    // Components
    Button    lipgloss.Style
    ButtonActive lipgloss.Style
    Card      lipgloss.Style
    Border    lipgloss.Style

    // Status
    Success   lipgloss.Style
    Warning   lipgloss.Style
    Error     lipgloss.Style
}

// NewStyles creates a style set from the color palette
func NewStyles(colors Colors) *Styles {
    s := &Styles{}

    // Base styles
    s.Base = lipgloss.NewStyle().
        Foreground(colors.Base).
        Background(colors.Surface)

    s.App = lipgloss.NewStyle().
        Padding(1, 2)

    // Typography
    s.Title = lipgloss.NewStyle().
        Foreground(colors.Primary).
        Bold(true).
        MarginBottom(1)

    s.Subtitle = lipgloss.NewStyle().
        Foreground(colors.Secondary).
        MarginBottom(1)

    s.Body = lipgloss.NewStyle().
        Foreground(colors.Base).
        MaxWidth(80)

    s.Muted = lipgloss.NewStyle().
        Foreground(colors.Muted)

    // Components
    s.Button = lipgloss.NewStyle().
        Foreground(colors.Primary).
        Padding(0, 2).
        Border(lipgloss.RoundedBorder(), false, false, false, false)

    s.ButtonActive = s.Button.Copy().
        Foreground(colors.Accent).
        Bold(true)

    s.Card = lipgloss.NewStyle().
        Border(lipgloss.NormalBorder()).
        BorderForeground(colors.Muted).
        Padding(1)

    // Status
    s.Success = lipgloss.NewStyle().
        Foreground(colors.Success)

    s.Warning = lipgloss.NewStyle().
        Foreground(colors.Warning)

    s.Error = lipgloss.NewStyle().
        Foreground(colors.Error)

    return s
}
```

### Spacing Scale

Lipgloss uses numeric values for padding/margin. Define a scale:

```go
const (
    SpacerXs = 1
    SpacerSm = 2
    SpacerMd = 3
    SpacerLg = 4
    SpacerXl = 5
)

// Apply to styles
s.Body = lipgloss.NewStyle().
    Padding(SpacerSm, SpacerMd)
```

### Border Styles

Lipgloss provides built-in border styles:

```go
import "github.com/charmbracelet/lipgloss"

// Available borders
lipgloss.NormalBorder()    // ┌─┐│
lipgloss.RoundedBorder()   // ╭─╮│
lipgloss.DoubleBorder()    // ╔═╗║
lipgloss.ThickBorder()     // ┏━┓┃
lipgloss.HiddenBorder()    // no border

// Custom border
customBorder := lipgloss.Border{
    Top:    "─",
    Bottom: "─",
    Left:   "│",
    Right:  "│",
}
```

## Component Styling

### Button Example

```go
package components

import (
    "github.com/charmbracelet/bubbletea"
    "github.com/charmbracelet/lipgloss"
    "github.com/yourapp/theme"
)

type Button struct {
    styles  *theme.Styles
    label   string
    active  bool
}

func (b Button) View() string {
    if b.active {
        return b.styles.ButtonActive.Render(b.label)
    }
    return b.styles.Button.Render(b.label)
}
```

### Card Example

```go
type Card struct {
    styles *theme.Styles
    title  string
    body   string
}

func (c Card) View() string {
    return c.styles.Card.Render(
        lipgloss.JoinVertical(
            lipgloss.Left,
            c.styles.Title.Render(c.title),
            c.styles.Body.Render(c.body),
        ),
    )
}
```

## Layout

Lipgloss provides utilities for terminal layouts:

```go
import "github.com/charmbracelet/lipgloss"

// Horizontal alignment
lipgloss.JoinHorizontal(lipgloss.Top, leftView, rightView)
lipgloss.JoinHorizontal(lipgloss.Center, leftView, centerView, rightView)
lipgloss.JoinHorizontal(lipgloss.Bottom, leftView, bottomView)

// Vertical alignment
lipgloss.JoinVertical(lipgloss.Left, topView, bottomView)
lipgloss.JoinVertical(lipgloss.Center, topView, middleView, bottomView)
lipgloss.JoinVertical(lipgloss.Right, topView, bottomView)

// Place elements
lipgloss.Place(width, height, lipgloss.Center, lipgloss.Center, content)
```

## Responsive Design

Terminal size can be accessed via Bubbletea's window size messages:

```go
type Model struct {
    width  int
    height int
    styles *theme.Styles
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.WindowSizeMsg:
        m.width = msg.Width
        m.height = msg.Height

        // Adjust styles for terminal size
        if m.width < 80 {
            m.styles.Body = m.styles.Body.MaxWidth(m.width - 4)
        }
    }
    return m, nil
}
```

## Verify

### Style Check

- All colors defined in `theme/colors.go`
- All styles defined in `theme/styles.go`
- No hardcoded colors in component files
- Components use `styles.*` not `lipgloss.NewStyle()` inline

### Theme Story

Create `stories/design-system/colors.story.ts`:

```typescript
export default {
  title: "Design System/Colors",
  adapter: "go",
} satisfies StoryMeta;

export const palette: Story = {
  mount: {
    command: "go",
    args: ["run", "./cmd/colors/main.go"],
  },
};
```

Create `cmd/colors/main.go` to render color swatches:

```go
package main

import (
    "fmt"
    "github.com/yourapp/theme"
)

func main() {
    styles := theme.NewStyles(theme.DefaultColors)

    fmt.Println(styles.Success.Render("Success"))
    fmt.Println(styles.Warning.Render("Warning"))
    fmt.Println(styles.Error.Render("Error"))
}
```

### Visual Check

- Colors render correctly in terminal
- Borders display as expected
- Spacing is consistent
- Text is readable (contrast check)

## Dark Mode

Lipgloss supports terminal background detection:

```go
import (
    "github.com/charmbracelet/lipgloss"
    "github.com/charmbracelet/lipgloss/whitelist"
)

// Detect terminal background
hasDarkBackground := lipgloss.HasDarkBackground()

// Select appropriate palette
var colors theme.Colors
if hasDarkBackground {
    colors = theme.DarkColors
} else {
    colors = theme.LightColors
}
```

## Resources

- [Lipgloss GitHub](https://github.com/charmbracelet/lipgloss)
- [Bubbletea docs](https://github.com/charmbracelet/bubbletea)
- [Charm Glossary](https://charm.sh/glossary/)
