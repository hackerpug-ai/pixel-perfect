# Textual

Component adapter for Python TUI applications. Textual is a Rapid Application Development framework for building terminal UIs using Python.

## Platforms

- tui (Python-based terminal UI)

## Category

Components

## Scaffold

### Installation

```bash
pip install textual
# or
poetry add textual
# or
uv add textual
```

### Project Structure

Create a component package:

```
components/
  __init__.py
  button.py      # Button widget
  button_test.py # Button tests
```

## Component Structure

Textual uses widget classes with methods:

```python
from textual.widgets import Button
from textual.app import ComposeResult

class CustomButton(Button):
    """Custom button component."""

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        self.border_title = "Custom Button"

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button press."""
            self.app.notify("Button pressed!")

    def compose(self) -> ComposeResult:
        """Compose child widgets."""
        yield from super().compose()
```

## Widget Lifecycle

Textual widgets have a defined lifecycle:

```python
from textual.widget import Widget

class MyWidget(Widget):
    """A custom widget."""

    def on_mount(self) -> None:
        """Called when widget is added to the app."""
        # Initialize state
        self.border_title = "My Widget"

    def on_show(self) -> None:
        """Called when widget becomes visible."""
        pass

    def on_hide(self) -> None:
        """Called when widget is hidden."""
        pass

    def on_resize(self) -> None:
        """Called when widget is resized."""
        # Handle new size
        self.size  # (width, height)
```

## Event Handling

Textual uses event messages for handling interactions:

```python
from textual import on
from textual.widgets import Input, Button

class Form(Widget):
    """Form with input and button."""

    def compose(self) -> ComposeResult:
        yield Input(placeholder="Enter text...")
        yield Button("Submit")

    @on(Input.Submitted, selector="Input")
    def handle_input_submitted(self, event: Input.Submitted) -> None:
        """Handle input submission."""
        text = event.input.value
        self.app.notify(f"Submitted: {text}")

    @on(Button.Pressed, selector="Button")
    def handle_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button press."""
        self.app.notify("Button pressed!")

    async def on_input_changed(self, event: Input.Changed) -> None:
        """Handle input changes."""
        if len(event.value) > 10:
            event.input.border_title = "Too long!"
```

## Built-in Widgets

Textual provides many built-in widgets:

```python
from textual.widgets import (
    Header, Footer,
    Button, Input,
    Label, Static,
    DataTable, ListView,
    ProgressBar,
    Tabs, Content,
    DirectoryTree,
    Log, RichLog,
)
```

### Common Widgets

```python
from textual.app import ComposeResult
from textual.widgets import Header, Footer, Button, Input, Static

class MyApp(App):
    """Application with common widgets."""

    def compose(self) -> ComposeResult:
        yield Header()
        yield Static("Hello, World!", id="output")
        yield Input(placeholder="Type something...")
        yield Button("Submit")
        yield Footer()

    def on_button_pressed(self) -> None:
        output = self.query_one("#output", Static)
        output.update("Button pressed!")
```

## Layout

Textual uses CSS-like layout system:

```python
from textual.containers import Horizontal, Vertical, Container
from textual.widgets import Static

class MyApp(App):
    def compose(self) -> ComposeResult:
        with Horizontal():
            yield Static("Left", id="left")
            yield Vertical():
                yield Static("Top Right", id="top-right")
                yield Static("Bottom Right", id="bottom-right")
```

### Layout Options

```python
# Grid layout
from textual.containers import Grid

with Grid():
    yield Static("1")
    yield Static("2")
    yield Static("3")
    yield Static("4")

# Scrollable container
from textual.containers import ScrollableContainer

with ScrollableContainer():
    for i in range(100):
        yield Static(f"Line {i}")
```

## Styling

Textual uses CSS for styling:

```python
from textual.app import App
from textual.widgets import Static

class MyApp(App):
    CSS = """
    Static {
        background: $panel;
        color: $text;
        padding: 1 2;
    }

    #highlight {
        background: $accent;
        color: $background;
        text-style: bold;
    }

    Button {
        margin: 1 2;
    }

    Button:hover {
        background: $accent;
        text-style: bold;
    }

    Button.-active {
        background: $accent;
        text-style: bold underline;
    }
    """

    def compose(self) -> ComposeResult:
        yield Static("Normal text", id="normal")
        yield Static("Highlighted", id="highlight")
        yield Button("Click me")
```

### CSS Variables

Textual provides built-in CSS variables:

```css
/* Colors */
$primary
$secondary
$warning
$error
$success
$accent
$panel
$background
$foreground
$text

/* Spacing */
$spacing (unit)

/* Borders */
$border (subtitle, thick, double, rounded, heavy)
```

## State Management

Use reactive variables for state:

```python
from textual.reactive import reactive
from textual.widgets import Static

class Counter(Widget):
    """A counter widget."""

    count = reactive(0)

    def watch_count(self, old_count: int, new_count: int) -> None:
        """Called when count changes."""
        self.border_title = f"Count: {new_count}"

    def increment(self) -> None:
        """Increment the counter."""
        self.count += 1

    def compose(self) -> ComposeResult:
        yield Static(str(self.count), id="counter")

    def on_mount(self) -> None:
        """Update display when count changes."""
        self.count = self.count  # Trigger watch
```

## Data Binding

Bind widgets to data sources:

```python
from textual.widgets import DataTable

class TableApp(App):
    """App with data table."""

    def compose(self) -> ComposeResult:
        yield DataTable()

    def on_mount(self) -> None:
        table = self.query_one(DataTable)
        table.add_columns("Name", "Age", "City")
        table.add_row("Alice", "30", "NYC")
        table.add_row("Bob", "25", "LA")
        table.add_row("Charlie", "35", "SF")

        table.cursor_type = "row"
        table.zebra_stripes = True
```

## Async Operations

Textual supports async operations:

```python
import asyncio
from textual.app import App, ComposeResult
from textual.widgets import Button, ProgressBar

class AsyncApp(App):
    """App with async operations."""

    def compose(self) -> ComposeResult:
        yield Button("Start Task", id="start")
        yield ProgressBar(show_eta=False, id="progress")

    async def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button press."""
        progress = self.query_one("#progress", ProgressBar)
        event.button.disabled = True

        for i in range(100):
            await asyncio.sleep(0.05)
            progress.advance(0)

        event.button.disabled = False
```

## Verify

### Component Check

- Widget extends `Widget` or built-in widget class
- `compose()` method yields child widgets
- Event handlers use `@on()` decorator or `on_*()` methods
- No blocking operations in event handlers (use async)
- Styling in CSS, not inline styles

### Test Example

```python
import pytest
from textual.app import App
from textual.widgets import Button

class TestApp(App):
    def compose(self):
        yield Button("Click me", id="btn")

async def test_button_press():
    app = TestApp()
    async with app.run_test() as pilot:
        button = app.query_one("#btn", Button)

        # Simulate button press
        await pilot.click(Button)

        # Check state
        assert button.label == "Click me"
```

### Story

Create `stories/components/button.story.ts`:

```typescript
export default {
  title: "Components/Button",
  adapter: "bun",  # Python runs via bun/Node adapter
} satisfies StoryMeta;

export const basic: Story = {
  mount: {
    command: "python",
    args: ["-m", "components.button"],
    env: { PYTHONPATH: "." },
  },
};
```

Create `components/button.py` with CLI mode:

```python
from textual.app import App
from textual.widgets import Button

class ButtonDemo(App):
    def compose(self):
        yield Button("Click me!")

if __name__ == "__main__":
    app = ButtonDemo()
    app.run()
```

## Common Patterns

### Form Input

```python
from textual.app import App, ComposeResult
from textual.widgets import Input, Button, Static

class FormApp(App):
    """Simple form app."""

    def compose(self) -> ComposeResult:
        yield Input(placeholder="Name", id="name")
        yield Input(placeholder="Email", id="email", password=True)
        yield Button("Submit", id="submit")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        name = self.query_one("#name", Input).value
        email = self.query_one("#email", Input).value

        self.notify(f"Submitted: {name} <{email}>")
```

### Navigation Tabs

```python
from textual.app import App, ComposeResult
from textual.widgets import Tabs, Content, Static

class TabsApp(App):
    """App with tab navigation."""

    def compose(self) -> ComposeResult:
        yield Tabs("Tab 1", "Tab 2", "Tab 3")
        yield Content(Static("Content 1", id="content-1"))

    def on_tabs_tab_activated(self, event: Tabs.TabActivated) -> None:
        content = self.query_one(Content)
        content.remove_children()
        content.mount(Static(f"Content {event.tab_index + 1}"))
```

## Resources

- [Textual Documentation](https://textual.textualize.io/)
- [Textual GitHub](https://github.com/Textualize/textual)
- [Textual Widget Gallery](https://textual.textualize.io/widget_gallery/)
- [Textual Guide](https://textual.textualize.io/guide/)
