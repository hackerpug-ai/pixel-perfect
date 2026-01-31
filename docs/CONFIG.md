# Project Configuration

pixel-perfect uses a project-level configuration file to customize paths and defaults.

## Location

```
your-project/
└── .pixel-perfect/
    └── config.json
```

## Configuration Schema

```json
{
  "version": "1.0",
  "specRoot": ".",
  "designSystem": {
    "enabled": false,
    "path": "design",
    "artifacts": ["paradigm", "tokens", "components"]
  },
  "defaults": {
    "platforms": [],
    "vibe": null,
    "naming": "snake_case"
  },
  "extensions": {
    "spec": ".spec.json",
    "mock": ".mock.html"
  }
}
```

## Fields

### specRoot

| Field | Default | Description |
|-------|---------|-------------|
| `specRoot` | `.` (project root) | Root directory to search for targets |

**How it works:** When you run `/pixel-perfect:design lunch-menu`, the plugin searches from `specRoot` recursively to find a folder named `lunch-menu`.

**Examples:**
- Default (`"."`): Searches entire project for the folder
- `".spec"`: Only searches within `.spec/` directory
- `"packages/design"`: Only searches within that subdirectory

### defaults

| Field | Default | Description |
|-------|---------|-------------|
| `platforms` | `[]` | Pre-selected platforms for preplanning (skips multi-select if set) |
| `vibe` | `null` | Default design vibe (skips vibe question if set) |
| `naming` | `snake_case` | Design key naming style: `snake_case`, `kebab-case`, `camelCase` |

**Platform values:**
- `mobile-ios`
- `mobile-android`
- `web-desktop`
- `web-mobile`
- `desktop-app`
- `cli`
- `tablet`

**Vibe values:**
- `minimal`
- `modern`
- `playful`
- `corporate`
- `bold`
- `technical`
- `elegant`

### extensions

| Field | Default | Description |
|-------|---------|-------------|
| `spec` | `.spec.json` | File extension for specification files |
| `mock` | `.mock.html` | File extension for mockup files |

### designSystem

Optional configuration for a global/project-level design system that persists across epics.

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `false` | Enable global design system |
| `path` | `"design"` | Path to global design folder (relative to project root) |
| `artifacts` | `["paradigm", "tokens", "components"]` | Which artifacts to use from global library |

**How it works:** When enabled, the plan phase checks for existing artifacts in the global design folder. If found, those artifacts are used instead of generating new ones for each epic.

**Artifact values:**
- `paradigm` - Design patterns, principles, references
- `tokens` - Design tokens (colors, spacing, typography)
- `components` - Reusable component definitions

**Note:** Epic-specific artifacts (`flows`, `workflows`, `views`, `screens`) are always generated per-epic since they derive from epic requirements.

**Resolution order for artifacts:**
1. Epic override exists (`{epic}/design/{artifact}.yaml`) → use epic version
2. Global artifact enabled AND exists → use global version
3. Neither → generate in epic

## Examples

### Minimal Config

Limit search to a specific directory:

```json
{
  "specRoot": ".spec"
}
```

Now `/pixel-perfect:design epic-1` only searches within `.spec/`.

### Team Defaults

Pre-configure platforms and vibe for consistent team output:

```json
{
  "specRoot": ".",
  "defaults": {
    "platforms": ["mobile-ios", "mobile-android"],
    "vibe": "modern",
    "naming": "kebab-case"
  }
}
```

### Monorepo Setup

Limit search to a specific package:

```json
{
  "specRoot": "packages/design-system/specs"
}
```

Now `/pixel-perfect:design feature-1` only searches within that package.

### Custom Extensions

Use different file extensions:

```json
{
  "extensions": {
    "spec": ".design.json",
    "mock": ".preview.html"
  }
}
```

### Global Design System

Share foundation artifacts (paradigm, tokens, components) across all epics:

```json
{
  "specRoot": ".",
  "designSystem": {
    "enabled": true,
    "path": "design",
    "artifacts": ["paradigm", "tokens", "components"]
  }
}
```

This creates the structure:
```
project-root/
├── design/                  # Global design system
│   ├── paradigm.yaml
│   ├── tokens.yaml
│   └── components.yaml
└── specs/epics/
    └── epic-1/design/       # Epic-specific only
        ├── flows.yaml
        ├── views.yaml
        └── screens.yaml
```

When you run `/pixel-perfect:plan epic-1`, it will:
- Use global `paradigm.yaml`, `tokens.yaml`, `components.yaml`
- Generate epic-specific `flows.yaml`, `workflows.yaml`, `views.yaml`, `screens.yaml`

### Custom Global Design Path

Store global design in a different location:

```json
{
  "designSystem": {
    "enabled": true,
    "path": ".design-system/shared"
  }
}
```

### Partial Global Design

Only share tokens globally, generate other artifacts per-epic:

```json
{
  "designSystem": {
    "enabled": true,
    "path": "design",
    "artifacts": ["tokens"]
  }
}
```

## Resolution Order

When running commands, pixel-perfect resolves configuration in this order:

1. **Command-line arguments** (highest priority)
2. **Epic-level config** (`{epic}/design/design.config.yaml`)
3. **Project-level config** (`.pixel-perfect/config.json`)
4. **Built-in defaults** (lowest priority)

## Creating Config

Run the design command and the init phase will offer to create the config:

```bash
/pixel-perfect:design my-epic
```

Or create manually:

```bash
mkdir -p .pixel-perfect
echo '{"specRoot":"."}' > .pixel-perfect/config.json
```

## Validation

The plugin validates config on load. Invalid fields are ignored with a warning, and defaults are used instead.
