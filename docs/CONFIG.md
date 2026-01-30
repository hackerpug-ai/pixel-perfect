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
