# Rich

Style adapter for Python TUI applications. Rich provides terminal styling, layout, and formatting capabilities with color, tables, panels, and progress bars.

## Platforms

- tui (Python-based terminal UI)

## Category

Style

## Scaffold

### Installation

```bash
pip install rich
# or
poetry add rich
# or
uv add rich
```

### Project Structure

Create a `theme/` package for styling:

```
theme/
  __init__.py
  colors.py      # Color palette definitions
  styles.py      # Rich style definitions
  theme.py       # Theme configuration
```

## Theme Integration

### Color Definitions

Rich uses color names, hex codes, or RGB values:

```python
# theme/colors.py
from rich.color import Color
from rich.console import Console
from typing import Dict

class ColorPalette:
    """Terminal color palette using Rich's Color system."""

    def __init__(self):
        # Hex colors for truecolor terminals
        self.primary = Color.parse("#6C6C6C")
        self.secondary = Color.parse("#9B9B9B")
        self.accent = Color.parse("#FA7921")
        self.muted = Color.parse("#6E6E6E")
        self.success = Color.parse("#3CB371")
        self.warning = Color.parse("#FFD700")
        self.error = Color.parse("#FF6B6B")
        self.base = Color.parse("#FFFFFF")
        self.surface = Color.parse("#F5F5F5")

        # For terminals without truecolor, use standard color names
        self.fallback = {
            "primary": "blue",
            "success": "green",
            "warning": "yellow",
            "error": "red",
        }

# Default palette
default_palette = ColorPalette()
```

### Style Definitions

Rich uses `Style` objects for text styling:

```python
# theme/styles.py
from rich.style import Style
from rich.text import Text
from theme.colors import ColorPalette

class Styles:
    """Rich style definitions for the app."""

    def __init__(self, palette: ColorPalette):
        self.palette = palette

        # Typography
        self.title = Style(
            color=palette.primary,
            bold=True,
        )

        self.subtitle = Style(
            color=palette.secondary,
            dim=True,
        )

        self.body = Style(
            color=palette.base,
        )

        self.muted = Style(
            color=palette.muted,
            dim=True,
        )

        # Component styles
        self.button = Style(
            color=palette.primary,
            bold=True,
        )

        self.button_active = Style(
            color=palette.accent,
            bold=True,
            reverse=True,
        )

        self.card_border = Style(
            color=palette.muted,
        )

        # Status styles
        self.success = Style(
            color=palette.success,
            bold=True,
        )

        self.warning = Style(
            color=palette.warning,
            bold=True,
        )

        self.error = Style(
            color=palette.error,
            bold=True,
        )

        # Link style
        self.link = Style(
            color=palette.primary,
            underline=True,
        )

    @classmethod
    def from_palette(cls, palette: ColorPalette) -> "Styles":
        return cls(palette)
```

### Console Configuration

Configure the Rich console with theme:

```python
# theme/theme.py
from rich.console import Console
from rich.theme import Theme
from theme.colors import ColorPalette
from theme.styles import Styles

class AppTheme:
    """Application theme configuration."""

    def __init__(self, palette: ColorPalette = None):
        self.palette = palette or ColorPalette()
        self.styles = Styles.from_palette(self.palette)

    def create_console(self, **kwargs) -> Console:
        """Create a Rich Console with theme applied."""
        theme = Theme({
            "title": str(self.styles.title),
            "subtitle": str(self.styles.subtitle),
            "success": str(self.styles.success),
            "warning": str(self.styles.warning),
            "error": str(self.styles.error),
        })

        return Console(
            theme=theme,
            record=True,  # Enable export of terminal content
            **kwargs
        )

# Default theme instance
default_theme = AppTheme()
```

## Component Styling

### Panel (Card-like)

```python
from rich.panel import Panel
from rich.console import Console
from theme import default_theme

console = default_theme.create_console()

panel = Panel(
    "Card content here",
    title="[title]Card Title[/title]",
    border_style="card_border",
    padding=(1, 2),
)

console.print(panel)
```

### Table Styling

```python
from rich.table import Table
from rich.console import Console
from theme import default_theme

console = default_theme.create_console()

table = Table(
    title="[title]Data Table[/title]",
    border_style="card_border",
    header_style="title",
    row_styles=["body", "muted"],
)

table.add_column("Name", style="body")
table.add_column("Value", style="success")
table.add_column("Status", style="warning")

console.print(table)
```

### Progress Bar

```python
from rich.progress import Progress, BarColumn, TextColumn
from rich.console import Console
from theme import default_theme

console = default_theme.create_console()

with Progress(
    TextColumn("[progress.description]{task.description}"),
    BarColumn(bar_width=None),
    console=console,
) as progress:
    task = progress.add_task("[body]Processing...[/body]", total=100)
    for i in range(100):
        progress.update(task, advance=1)
```

### Syntax Highlighting

```python
from rich.syntax import Syntax
from rich.console import Console
from theme import default_theme

console = default_theme.create_console()

code = Syntax(
    "print('Hello, World!')",
    "python",
    theme="monokai",  # Built-in pygments theme
    line_numbers=True,
)

console.print(code)
```

## Layout

Rich provides layout primitives:

```python
from rich.columns import Columns
from rich.rows import Rows
from rich.console import Console

console = Console()

# Horizontal layout (columns)
panels = [
    Panel("Left"),
    Panel("Center"),
    Panel("Right"),
]
console.print(Columns(panels, equal=True))

# Vertical layout (rows)
console.print(Rows(panels))
```

## Spacing

Rich uses padding in panels and margins in console:

```python
from rich.panel import Panel

# Padding: (top, right, bottom, left)
panel = Panel(
    "Content",
    padding=(1, 2),      # 1 row vertical, 2 columns horizontal
    padding=(1, 2, 1, 2) # Explicit all sides
)

# Console adds margin around content
console = Console(width=80)
console.print(panel)  # Auto-centered in 80 columns
```

## Markdown Rendering

Rich supports Markdown with theme:

```python
from rich.markdown import Markdown
from rich.console import Console
from theme import default_theme

console = default_theme.create_console()

markdown = Markdown("""
# Title

**Bold** and *italic* text.

- List item 1
- List item 2
""")

console.print(markdown)
```

## Verify

### Style Check

- All colors defined in `theme/colors.py`
- All styles defined in `theme/styles.py`
- No hardcoded colors in component files
- Components use `theme.*` not inline `Style()` calls

### Theme Story

Create `stories/design-system/colors.story.ts`:

```typescript
export default {
  title: "Design System/Colors",
  adapter: "bun",  # Python runs via bun/Node adapter
} satisfies StoryMeta;

export const palette: Story = {
  mount: {
    command: "python",
    args: ["-m", "theme.colors"],
    env: { PYTHONPATH: "." },
  },
};
```

Create `theme/colors.py` with CLI mode:

```python
# theme/colors.py
import sys
from rich.console import Console
from . import default_theme

def main():
    console = default_theme.create_console()

    console.print("[success]Success message[/success]")
    console.print("[warning]Warning message[/warning]")
    console.print("[error]Error message[/error]")
    console.print("[title]Title text[/title]")
    console.print("[muted]Muted text[/muted]")

if __name__ == "__main__":
    main()
```

### Visual Check

- Colors render correctly in terminal
- Panel borders display as expected
- Tables format properly
- Text is readable (contrast check)

## Dark Mode

Rich supports terminal background detection:

```python
import os
from theme.colors import ColorPalette

def detect_theme() -> ColorPalette:
    """Detect terminal color scheme."""
    # Check COLORFGBG environment variable
    colorfgbg = os.environ.get("COLORFGBG", "")
    if colorfgbg:
        bg = colorfgbg.split(";")[-1]
        if int(bg) < 8:  # Dark background
            return dark_palette

    # Check for terminal-specific indicators
    if os.environ.get("TERM_PROGRAM") == "iTerm.app":
        # iTerm2 has theme detection
        pass

    return default_palette
```

## Resources

- [Rich Documentation](https://rich.readthedocs.io/)
- [Rich GitHub](https://github.com/Textualize/rich)
- [Textual Docs](https://textual.textualize.io/) (Rich's sister project for TUI)
