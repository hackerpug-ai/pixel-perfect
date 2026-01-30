# claude-code-design

Tech-agnostic UI/UX design workflow plugin for Claude Code. Generate design artifacts from PRDs and produce mockups for any platform.

## Features

- **Platform Agnostic**: Works with React, Flutter, CLI, native apps, or any UI framework
- **Configurable**: Override naming conventions, file extensions, and output paths
- **Complete Workflow**: PRD → Design Artifacts → Specs → Mockups → Review
- **Iterative**: Review loop with status tracking until designs are approved

## Installation

```bash
# From marketplace (when published)
/plugin install claude-code-design

# For development
claude --plugin-dir /path/to/claude-code-design
```

## Quick Start

```bash
# Run full design workflow
/claude-code-design:design .spec/epics/epic-1

# Or step by step
/claude-code-design:plan .spec/epics/epic-1
/claude-code-design:prompts .spec/epics/epic-1
/claude-code-design:mockups .spec/epics/epic-1
/claude-code-design:review .spec/epics/epic-1

# Check progress
/claude-code-design:status .spec/epics/epic-1
```

## Commands

| Command | Description |
|---------|-------------|
| `/claude-code-design:design` | Run full workflow |
| `/claude-code-design:plan` | Generate YAML design artifacts from PRD |
| `/claude-code-design:prompts` | Generate spec files from views.yaml |
| `/claude-code-design:mockups` | Generate visual mockups from specs |
| `/claude-code-design:review` | Review mockups against specs |
| `/claude-code-design:status` | Show workflow progress |

## Output Structure

```
{epic}/design/
├── workflows.yaml          # User journeys
├── paradigm.yaml           # Design patterns
├── screens.yaml            # Screen inventory
├── flows.yaml              # Interaction flows
├── views.yaml              # View specifications
├── components.yaml         # Reusable components
├── tokens.yaml             # Design tokens
├── UX-DESIGN-PLAN.md       # Human summary
├── prompts/
│   ├── {design_key}.spec.json
│   └── manifest.json
├── mocks/
│   ├── {design_key}.mock.html
│   └── DESIGN-REVIEW.md
└── research/
```

## Configuration

Create `.spec/design.config.yaml` to override defaults:

```yaml
extensions:
  spec: ".spec.json"      # Specification file extension
  mock: ".mock.html"      # Mockup file extension

paths:
  specs: "prompts"        # Specs subdirectory
  mocks: "mocks"          # Mocks subdirectory

naming:
  style: "snake_case"     # snake_case | kebab-case | camelCase
```

## Platform Adaptation

Design artifacts are platform-agnostic. Map to your target:

| Artifact | Web/React | Mobile/Flutter | CLI |
|----------|-----------|----------------|-----|
| screens.yaml | Routes/Pages | Screens | Commands |
| components.yaml | Components | Widgets | Formatters |
| tokens.yaml | CSS vars | ThemeData | ANSI colors |
| mocks | HTML | PNG/Figma | ASCII art |

## Documentation

- [Design Conventions](docs/DESIGN-CONVENTIONS.md) - File structure and patterns
- [Design Keys](docs/DESIGN-KEYS.md) - Naming conventions and state management

## Requirements

- Claude Code v1.0.33+
- Epic directory with `PRD.md`

## License

MIT
