# Project Configuration

pixel-perfect uses a project-level configuration file to customize paths and defaults.

## Location

```
your-project/
└── .pixel-perfect/
    ├── config.json          # Your configuration
    └── config.schema.json   # Schema for validation (included with plugin)
```

**Schema Validation:** When the plugin is installed, it validates `config.json` against `config.schema.json`. Invalid configurations will show warnings with specific field errors.

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

### designResearch

Optional configuration for the design research feature that enables UI/UX pattern and trend research.

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `false` | Enable design research feature |
| `path` | `"design-research"` | Path to research folder (relative to `specRoot`) |
| `sources` | `["exa", "jina"]` | Available search sources |
| `defaultTopics` | `[]` | Default topics to research on init |

**Research sources:**
- `exa` - Advanced semantic search for design content
- `jina` - Web reading and URL analysis
- `web` - General web search fallback

**Folder structure created:**
```
{specRoot}/{designResearch.path}/
├── INDEX.md              # Catalog of all research
├── topics/               # Research by design topic
├── trends/               # Trend research
└── competitors/          # Competitor analysis
```

See `/pixel-perfect:research` command for usage.

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

### Design Research Enabled

Enable design research for pattern and trend discovery:

```json
{
  "specRoot": ".",
  "designResearch": {
    "enabled": true,
    "path": "design-research",
    "sources": ["exa", "jina"],
    "defaultTopics": [
      "mobile-navigation",
      "form-design",
      "onboarding"
    ]
  }
}
```

### Full Configuration

All features enabled:

```json
{
  "version": "1.5",
  "specRoot": ".",
  "designSystem": {
    "enabled": true,
    "path": "design-system",
    "artifacts": ["paradigm", "tokens", "components"]
  },
  "designResearch": {
    "enabled": true,
    "path": "design-research",
    "sources": ["exa", "jina"],
    "defaultTopics": ["mobile-navigation", "form-design"]
  },
  "defaults": {
    "platforms": ["mobile-ios", "web-desktop"],
    "vibe": "modern",
    "naming": "snake_case"
  },
  "extensions": {
    "spec": ".spec.json",
    "mock": ".mock.html"
  }
}
```

## Cascading Resolution Order

When running commands, pixel-perfect resolves configuration using a **cascading inheritance model** (most specific wins):

### Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│ PROJECT LEVEL                                                       │
│ .pixel-perfect/config.json                                         │
│    ↓                                                                │
│ designSystem.enabled = true                                        │
│    ↓                                                                │
│ {specRoot}/{designSystem.path}/                                    │
│   ├─ paradigm.yaml                                                 │
│   ├─ tokens.yaml                                                   │
│   └─ components.yaml                                               │
└─────────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ EPIC LEVEL (OPTIONAL when design system exists)                     │
│ {epic}/design/design.config.yaml                                   │
│   (only needs to specify overrides, not full config)                │
└─────────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│ SUB-EPIC LEVEL (OPTIONAL)                                           │
│ {epic}/sprints/{sub-epic}/design/design.config.yaml                │
│   (inherits from epic, only specifies sub-epic overrides)           │
└─────────────────────────────────────────────────────────────────────┘
```

### Resolution Order (for any config value)

1. **Most specific local config** (deepest nested folder with config)
2. **Parent epic config** (if exists and nested)
3. **Project design system** (if enabled and artifact exists)
4. **Project config** (`.pixel-perfect/config.json`)
5. **Built-in defaults** (lowest priority)

### AI Agent Read Order

When agents need to read configs, they should follow this sequence:

1. **Search upward** from working directory for `design.config.yaml`
2. **Read all configs** found in the "cascade path"
3. **Merge with "most specific wins" rule**
4. **Report** the effective config and cascade path to user

### Terminology

| Term | Definition |
|------|------------|
| **base config** | Highest level config (project/design-system) |
| **overriding config** | More specific config that modifies base |
| **effective config** | Final merged result after cascading |
| **cascade path** | Ordered list of configs read to produce effective config |
| **inherit** | Use value from higher-level config when not specified locally |
| **override** | Replace higher-level value with local value |

### Example: Cascading in Action

**Project config** (`.pixel-perfect/config.json`):
```json
{
  "defaults": {
    "platforms": ["responsive-web"],
    "vibe": "minimal",
    "naming": "snake_case"
  }
}
```

**Design system tokens** (`.spec/design-system/tokens.yaml`):
```yaml
colors:
  primary: "#2563eb"
  secondary: "#64748b"
```

**Epic config** (`epic-1/design/design.config.yaml`):
```yaml
# Only override what's different
platforms:
  - mobile-ios  # Override: project has responsive-web
vibe:
  primary: "playful"  # Override: project has minimal
# naming, tokens inherit from design system
```

**Sub-epic config** (`epic-1/sprints/feature-a/design/design.config.yaml`):
```yaml
# Could add more specific overrides
# If empty, fully inherits from epic-1
```

**Effective config for `feature-a`:**
- platforms: `mobile-ios` (from epic-1)
- vibe: `playful` (from epic-1)
- naming: `snake_case` (from project)
- tokens: from design system (`.spec/design-system/tokens.yaml`)

## Merge Confirmation Workflow

When promoting or merging configs/artifacts from lower to higher levels, the system shows exactly what will be overwritten:

```
Merging epic-1/design/ into .spec/design-system/...

Cascade path analyzed:
  Base: .pixel-perfect/config.json
  Design system: .spec/design-system/
  Epic: epic-1/design/design.config.yaml

The following will be OVERWRITTEN:

  platforms:
    Project: [responsive-web]
    Epic:    [mobile-ios, mobile-android]
    → WILL OVERWRITE

  tokens.colors.primary:
    Project: "#2563eb"
    Epic:    "#0d9488"
    → WILL OVERWRITE

? How would you like to proceed?
  > Review each change individually
    Accept all epic changes
    Reject all changes (keep project)
    Cancel
```

### Individual Change Options

For each conflicting value, users can:

| Option | Behavior |
|--------|----------|
| **Use epic value** | Overwrite project with epic value |
| **Keep project value** | Skip this change, keep project value |
| **Merge both** | For arrays/objects, combine both values |
| **Custom value** | Enter a different value manually |

## Command Resolution Order

The complete resolution order including command-line arguments:

1. **Command-line arguments** (highest priority)
2. **Sub-epic config** (`{epic}/sprints/{sub}/design/design.config.yaml`)
3. **Epic config** (`{epic}/design/design.config.yaml`)
4. **Project design system** (`{specRoot}/{designSystem.path}/`)
5. **Project config** (`.pixel-perfect/config.json`)
6. **Built-in defaults** (lowest priority)

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
