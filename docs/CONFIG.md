# Project Configuration

pixel-perfect uses a project-level configuration file to customize defaults. **Most configuration is now directory-scoped via `design/config.yaml` files.**

## Location

```
your-project/
└── .pixel-perfect/
    └── config.json          # Global defaults only (optional)
```

**Note:** Most configuration now happens in `design/config.yaml` files within each directory. The `.pixel-perfect/config.json` file is optional and only provides project-wide defaults.

## Configuration Schema

```json
{
  "version": "2.0",
  "defaults": {
    "platforms": [],
    "vibe": null,
    "naming": "snake_case"
  },
  "extensions": {
    "spec": ".spec.json",
    "mock": ".mock.html"
  },
  "designResearch": {
    "enabled": false,
    "path": "design-research",
    "sources": ["exa", "jina"],
    "defaultTopics": []
  }
}
```

## Fields

### defaults

| Field | Default | Description |
|-------|---------|-------------|
| `platforms` | `[]` | Pre-selected platforms (skips multi-select if set) |
| `vibe` | `null` | Default design vibe (skips vibe question if set) |
| `naming` | `snake_case` | Design key naming style: `snake_case`, `kebab-case`, `camelCase` |

**Platform values:**
- `mobile-ios`
- `mobile-android`
- `web-desktop`
- `web-mobile`
- `desktop-app`
- `cli`
- `tui`
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

### designResearch

Optional configuration for the design research feature.

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `false` | Enable design research feature |
| `path` | `"design-research"` | Path to research folder |
| `sources` | `["exa", "jina"]` | Available search sources |
| `defaultTopics` | `[]` | Default topics to research on init |

### designSystem

Optional design system selection. When set, informs token generation, component naming, CDN links in mockups, and review validation. See `docs/design-systems/` for reference docs.

| Field | Default | Description |
|-------|---------|-------------|
| `name` | `null` | Design system name |
| `version` | `null` | Specific version (optional) |

**Supported design systems:**
- `shadcn-ui` - Radix-based components with Tailwind CSS
- `material-design-3` - Google's Material Design system
- `chakra-ui` - React component library with theme system
- `ant-design` - Enterprise-level UI design language
- `radix-ui` - Unstyled accessible primitives
- `headless-ui` - Unstyled accessible components by Tailwind Labs
- `daisyui` - Tailwind CSS component library
- `park-ui` - Ark UI + Panda CSS component library
- `mantine` - Full-featured React component library
- `custom` - No specific system, uses general patterns

### iconLibrary

Optional icon library selection. Auto-selected when a design system is chosen, or manually specified. See `docs/icon-libraries/` for reference docs.

| Field | Default | Description |
|-------|---------|-------------|
| `name` | `null` | Icon library name |
| `autoSelected` | `false` | Whether auto-selected from design system pairing |

**Supported icon libraries:** `lucide`, `material-symbols`, `heroicons`, `phosphor`, `tabler`, `remix`, `font-awesome`, `ionicons`, `feather`, `ant-design-icons`, `bootstrap-icons`

### mockups

Optional mockup generation settings. Controls device frame behavior and display options.

| Field | Default | Description |
|-------|---------|-------------|
| `deviceFrame` | `false` | Enable device frames for mockups |
| `terminal` | `{}` | Terminal dimensions for CLI/TUI frames |

**Device frame types by platform:**
- `mobile-ios` → iPhone frame (390 × 844, 9:19.5 ratio)
- `mobile-android` → Android phone frame (360 × 800, 9:20 ratio)
- `tablet-ios` → iPad frame (1024 × 1367, 3:4 ratio)
- `tablet-android` → Android tablet frame (800 × 1067, 3:4 ratio)
- `web-mobile` → Mobile browser frame (375 × 667, 9:16 ratio)
- `web-desktop` → Desktop browser frame (1920 × 1080, 16:9 ratio)
- `cli` → Terminal window frame (customizable)
- `tui` → Terminal emulator frame (customizable)

**Terminal configuration:**
```yaml
mockups:
  deviceFrame: true
  terminal:
    width: 120      # Terminal columns
    height: 36      # Terminal rows
    font: "Fira Code" # Monospace font family
```

## Directory-Scoped Configuration (ESLint-Style)

**Primary configuration happens in `design/config.yaml` files:**

```
project/
├── .pixel-perfect/
│   └── config.json          # Global defaults (optional)
├── design/
│   └── config.yaml           # Project-level settings
└── features/
    └── auth/
        └── design/
            └── config.yaml   # Feature-level overrides
```

**Config resolution order:**
1. `{directory}/design/config.yaml`
2. `{directory}/design/design.config.yaml` (backward compatibility)
3. Parent directories (search upward)
4. `.pixel-perfect/config.json` (global defaults)

### Config File Format

`{directory}/design/config.yaml`:

```yaml
version: "2.0"
created: "2025-02-01"

# Requirements source
requirements:
  path: "PRD.md"

# Target platforms
platforms:
  - responsive-web

# Design aesthetic
vibe:
  primary: "modern"
  description: "Clean, contemporary design"

# Design system (optional)
designSystem:
  name: "shadcn-ui"

# Icon library (auto-selected from design system, or by vibe)
iconLibrary:
  name: "lucide"
  autoSelected: true
```

**Child configs only need to specify overrides:**

```yaml
# features/auth/design/config.yaml
version: "2.0"

# Override only platforms, inherit vibe from parent
platforms:
  - mobile-ios
  - mobile-android
```

## Examples

### Minimal Config (Global Defaults)

```json
{
  "version": "2.0",
  "defaults": {
    "platforms": ["web-desktop"],
    "vibe": "modern"
  }
}
```

### With Design Research

```json
{
  "version": "2.0",
  "designResearch": {
    "enabled": true,
    "path": "design-research",
    "sources": ["exa", "jina"],
    "defaultTopics": ["mobile-navigation", "form-design"]
  }
}
```

## Creating Config

Run the design command and the init phase will offer to create the config:

```bash
# In any directory
/pixel-perfect:init

# Or target specific directory
/pixel-perfect:init features/auth
```

Or create manually:

```bash
mkdir -p design
echo 'platforms: [web]' > design/config.yaml
```

## Promoting Artifacts (Child → Parent)

When you've created design artifacts in a child directory that would be useful for parent directories or siblings, you can **promote** them by moving the artifact files upward.

### When to Promote

Promote artifacts when:
- A component designed for a specific feature should be project-wide
- Tokens or colors defined for one epic apply to the whole project
- Paradigm patterns discovered in one context are universally applicable

### Promotion Process

**Recommended: Use the merge command**

```bash
# Promotes tokens, components, paradigm from child to parent
/pixel-perfect:merge features/auth

# Shows plan, confirms, then executes
```

The `/pixel-perfect:merge` command:
- Detects all promotable artifacts
- Shows what will move and what will stay
- Warns about conflicts
- **Always asks for confirmation before merging**

See [commands/merge.md](../commands/merge.md) for full documentation.

**Manual promotion (if you prefer):**

```bash
# Before: tokens.yaml only exists in child
features/auth/design/tokens.yaml  # Child-specific tokens

# After: Move to parent, siblings inherit
project/design/tokens.yaml         # Now available to all features/
```

**Manual steps:**
1. Move the artifact file to the parent directory's `design/` folder
2. Remove the file from the child directory (now inherits from parent)
3. Run `/pixel-perfect:plan` on affected directories to pick up changes

### What Can Be Promoted

| Artifact | Promotable | Notes |
|----------|------------|-------|
| `tokens.yaml` | ✅ Yes | Colors, spacing, typography - commonly shared |
| `components.yaml` | ✅ Yes | Reusable components |
| `paradigm.yaml` | ✅ Yes | Design patterns and principles |
| `workflows.yaml | ⚠️ Rare | Usually feature-specific |
| `screens.yaml` | ❌ No | Always directory-specific |
| `flows.yaml` | ❌ No | Always directory-specific |
| `views.yaml` | ❌ No | Always directory-specific |

### Selective Override (Partial Promotion)

Sometimes you want to share *most* of an artifact but override specific values. Keep the parent artifact and add only the overrides in the child:

```yaml
# parent/design/tokens.yaml (shared by all)
colors:
  primary: "#3b82f6"
  secondary: "#64748b"
  danger: "#ef4444"

# features/auth/design/tokens.yaml (overrides only)
extends: ../design/tokens.yaml  # Reference parent
colors:
  primary: "#8b5cf6"  # Override primary for auth only
```

### Detecting Inheritance

Use `/pixel-perfect:status` to see what artifacts are local vs inherited:

```
Design Status: features/auth
=====================

Artifacts:
  [x] config.yaml (local)
  [x] workflows.yaml (local)
  [x] screens.yaml (local)
  [ ] paradigm.yaml [inherited from ../../design/]
  [ ] tokens.yaml [inherited from ../../design/]
  [ ] components.yaml [inherited from ../../design/]
```
