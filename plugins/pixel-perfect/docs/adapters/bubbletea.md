# Bubbletea

Component adapter for Go TUI applications. Bubbletea is a powerful framework for building terminal UIs using The Elm Architecture.

## Platforms

- tui (Go-based terminal UI)

## Category

Components

## Scaffold

### Installation

```bash
go get github.com/charmbracelet/bubbletea
go get github.com/charmbracelet/lipgloss
```

### Project Structure

Create a component package:

```
components/
  button.go      # Button model
  button_test.go # Button tests
```

## Component Structure

Bubbletea uses The Elm Architecture with three core concepts:

```go
package components

import (
    "github.com/charmbracelet/bubbletea"
)

// Model holds the component state
type Button struct {
    label   string
    active  bool
    onPress func()
}

// Init initializes the component
func (b Button) Init() tea.Cmd {
    return nil
}

// Update handles messages and updates state
func (b Button) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        if msg.Type == tea.KeyEnter {
            if b.onPress != nil {
                b.onPress()
            }
        }
    }
    return b, nil
}

// View renders the component
func (b Button) View() string {
    if b.active {
        return "› " + b.label
    }
    return "  " + b.label
}
```

## Messages

Messages are how components communicate:

```go
// Built-in messages
type tea.KeyMsg        // Keyboard input
type tea.MouseMsg      // Mouse events
type tea.WindowSizeMsg // Terminal resize

// Custom messages
type ButtonPressedMsg struct {
    ButtonID string
}

type TickMsg time.Time

// Send messages
return func() tea.Msg {
    return TickMsg(time.Now())
}
```

## Commands

Commands return messages asynchronously:

```go
// Tick command
func tick() tea.Cmd {
    return tea.Tick(time.Second, func(t time.Time) tea.Msg {
        return TickMsg(t)
    })
}

// HTTP request command
func fetch(url string) tea.Cmd {
    return func() tea.Msg {
        resp, err := http.Get(url)
        if err != nil {
            return FetchErrorMsg{err}
        }
        return FetchSuccessMsg{resp}
    }
}
```

## Component Composition

Compose components by embedding models:

```go
type Form struct {
    focusIndex int
    inputs     []Input
    button     Button
}

func (f Form) Init() tea.Cmd {
    return nil
}

func (f Form) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    // Update based on focus
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "up", "k":
            if f.focusIndex > 0 {
                f.focusIndex--
            }
        case "down", "j":
            if f.focusIndex < len(f.inputs)-1 {
                f.focusIndex++
            }
        }
    }

    // Update focused child
    var cmd tea.Cmd
    switch f.focusIndex {
    case 0:
        f.inputs[0], cmd = f.inputs[0].Update(msg)
    case 1:
        f.inputs[1], cmd = f.inputs[1].Update(msg)
    case 2:
        f.button, cmd = f.button.Update(msg)
    }

    return f, cmd
}

func (f Form) View() string {
    // Set focus state
    for i := range f.inputs {
        f.inputs[i].focused = (i == f.focusIndex)
    }
    f.button.active = (f.focusIndex == len(f.inputs))

    // Render children
    s := "Form:\n\n"
    for _, input := range f.inputs {
        s += input.View() + "\n"
    }
    s += f.button.View()
    return s
}
```

## State Management

Track component state in the model:

```go
type List struct {
    items    []string
    cursor   int
    selected map[string]struct{}
}

func (l List) Init() tea.Cmd {
    return nil
}

func (l List) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "up", "k":
            if l.cursor > 0 {
                l.cursor--
            }
        case "down", "j":
            if l.cursor < len(l.items)-1 {
                l.cursor++
            }
        case " ":
            l.selected[l.items[l.cursor]] = struct{}{}
        }
    }
    return l, nil
}
```

## Event Handling

### Keyboard Input

```go
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.Type {
        case tea.KeyEnter:
            // Handle Enter
        case tea.KeyCtrlC:
            return m, tea.Quit
        case tea.KeyRunes:
            // Handle character input
            switch string(msg.Runes) {
            case "q":
                return m, tea.Quit
            }
        }
    }
    return m, nil
}
```

### Mouse Input

Enable mouse in program options:

```go
p := tea.NewProgram(
    initialModel,
    tea.WithMouseCellMotion(),
)

// Handle mouse events
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.MouseMsg:
        x, y := msg.X, msg.Y
        if msg.Button == tea.MouseButtonLeft {
            // Handle click
        }
    }
    return m, nil
}
```

### Window Resize

```go
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.WindowSizeMsg:
        m.width = msg.Width
        m.height = msg.Height
    }
    return m, nil
}
```

## Styling with Lipgloss

Use Lipgloss for styling (see `lipgloss.md` adapter):

```go
import (
    "github.com/charmbracelet/lipgloss"
    "github.com/yourapp/theme"
)

type Button struct {
    label  string
    active bool
    styles *theme.Styles
}

func (b Button) View() string {
    if b.active {
        return b.styles.ButtonActive.Render(b.label)
    }
    return b.styles.Button.Render(b.label)
}
```

## Verify

### Component Check

- Component implements `Init() tea.Cmd`
- Component implements `Update(tea.Msg) (tea.Model, tea.Cmd)`
- Component implements `View() string`
- No side effects in `View()` method
- State updates return new model, don't mutate in place

### Test Example

```go
func TestButton(t *testing.T) {
    pressed := false
    model := Button{
        label: "Click me",
        onPress: func() { pressed = true },
    }

    // Test Init
    cmd := model.Init()
    assert.Nil(t, cmd)

    // Test Update
    msg := tea.KeyMsg{Type: tea.KeyEnter}
    newModel, cmd := model.Update(msg)
    assert.True(t, pressed)

    // Test View
    assert.Contains(t, model.View(), "Click me")
}
```

### Story

Create `stories/components/button.story.ts`:

```typescript
export default {
  title: "Components/Button",
  adapter: "go",
} satisfies StoryMeta;

export const basic: Story = {
  mount: {
    command: "go",
    args: ["run", "./cmd/button/main.go"],
  },
};
```

Create `cmd/button/main.go`:

```go
package main

import (
    "github.com/charmbracelet/bubbletea"
    "github.com/yourapp/components"
)

func main() {
    p := tea.NewProgram(
        components.Button{Label: "Click me"},
        tea.WithAltScreen(),
    )
    if _, err := p.Run(); err != nil {
        panic(err)
    }
}
```

## Common Patterns

### Navigation List

```go
type List struct {
    cursor  int
    items   []string
    chosen  string
}

func (m List) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "up", "k":
            if m.cursor > 0 {
                m.cursor--
            }
        case "down", "j":
            if m.cursor < len(m.items)-1 {
                m.cursor++
            }
        case "enter":
            m.chosen = m.items[m.cursor]
            return m, tea.Quit
        }
    }
    return m, nil
}

func (m List) View() string {
    s := "What should we buy at the market?\n\n"
    for i, item := range m.items {
        cursor := " "
        if m.cursor == i {
            cursor = "›"
        }
        s += fmt.Sprintf("%s %s\n", cursor, item)
    }
    return s
}
```

### Async Loading

```go
type loadingModel struct {
    loading  bool
    status   string
    quitting bool
}

type statusMsg string
type tickMsg time.Time

func (m loadingModel) Init() tea.Cmd {
    return tick()
}

func tick() tea.Cmd {
    return tea.Tick(time.Second, func(t time.Time) tea.Msg {
        return tickMsg(t)
    })
}

func (m loadingModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tickMsg:
        m.loading = !m.loading
        return m, tick()
    case tea.KeyMsg:
        switch msg.String() {
        case "q", "ctrl+c":
            m.quitting = true
            return m, tea.Quit
        }
    }
    return m, nil
}
```

## Resources

- [Bubbletea GitHub](https://github.com/charmbracelet/bubbletea)
- [Bubbletea Examples](https://github.com/charmbracelet/bubbletea/tree/master/examples)
- [Charm Tutorials](https://charm.sh/tutorials/)
