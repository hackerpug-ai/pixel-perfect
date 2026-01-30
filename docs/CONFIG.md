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
  "paths": {
    "specs": ".spec",
    "epics": "epics"
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

### paths

| Field | Default | Description |
|-------|---------|-------------|
| `specs` | `.spec` | Root directory for specifications and epics |
| `epics` | `epics` | Subdirectory within specs for epic folders |

**Full epic path**: `{paths.specs}/{paths.epics}/{epic-name}`

Example with defaults: `.spec/epics/epic-1`

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

Just override the specs directory:

```json
{
  "paths": {
    "specs": "design"
  }
}
```

Epic path becomes: `design/epics/epic-1`

### Team Defaults

Pre-configure platforms and vibe for consistent team output:

```json
{
  "paths": {
    "specs": ".spec"
  },
  "defaults": {
    "platforms": ["mobile-ios", "mobile-android"],
    "vibe": "modern",
    "naming": "kebab-case"
  }
}
```

### Monorepo Setup

Different specs location for a monorepo:

```json
{
  "paths": {
    "specs": "packages/design-system/specs",
    "epics": "features"
  }
}
```

Epic path becomes: `packages/design-system/specs/features/epic-1`

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
echo '{"paths":{"specs":".spec"}}' > .pixel-perfect/config.json
```

## Validation

The plugin validates config on load. Invalid fields are ignored with a warning, and defaults are used instead.
