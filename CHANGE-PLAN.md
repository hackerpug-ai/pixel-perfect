# Change Plan: Add Design Research Command and Config Schema Validation

## Summary

Add a new `/pixel-perfect:research` command for UI/UX design research using web search tools (Exa, Jina). Create a JSON schema for config validation that validates on plugin install.

## Change Type

**MINOR** - New backward-compatible functionality (new command, new schema file)

## Current Version

1.5.0

## New Version

1.6.0

## Affected Files

| File | Change | Description |
|------|--------|-------------|
| `commands/research.md` | add | New command for design research |
| `schemas/config.schema.json` | add | JSON schema for config validation |
| `README.md` | modify | Add research command to command list |
| `docs/CONFIG.md` | modify | Add schema reference and research config section |
| `.claude-plugin/plugin.json` | modify | Bump version to 1.6.0 |
| `.claude-plugin/marketplace.json` | modify | Bump version to 1.6.0 |

## Implementation Tasks

- [x] Create `commands/research.md` with:
  - Command usage and arguments
  - Research sources configuration
  - Artifact storage in `{specRoot}/design-research/`
  - Integration with web search tools (Exa, Jina)
  - Examples and output format

- [x] Create `schemas/config.schema.json` with:
  - Full JSON Schema for `.pixel-perfect/config.json`
  - All existing fields: version, specRoot, designSystem, defaults, extensions
  - New `designResearch` section for research destination config
  - Validation rules for each field

- [x] Add design research config to config schema:
  - `designResearch.enabled` (boolean, default: false)
  - `designResearch.path` (string, default: "design-research")
  - `designResearch.sources` (array of research sources)
  - `designResearch.defaultTopics` (array of default research topics)

- [x] Update `docs/CONFIG.md`:
  - Add section on Design Research configuration
  - Add reference to config.schema.json
  - Document validation on install

- [x] Update `README.md`:
  - Add research command to command pipeline table
  - Add research command section with usage
  - Update quick start to show optional research step

- [x] Create design-research folder structure:
  - `{specRoot}/design-research/`
  - `{specRoot}/design-research/topics/` (research by topic)
  - `{specRoot}/design-research/trends/` (trend research)
  - `{specRoot}/design-research/competitors/` (competitor analysis)
  - `{specRoot}/design-research/INDEX.md` (catalog of all research)

## New Command Specification

### /pixel-perfect:research

**Usage:**
```
/pixel-perfect:research <query> [options]
/pixel-perfect:research --topic <topic> [options]
/pixel-perfect:research --trend <trend-name> [options]
```

**Arguments:**
- `<query>`: Free-form search query for design research

**Options:**
- `--topic <topic>`: Research a specific design topic (e.g., "mobile-navigation", "form-design")
- `--trend <name>`: Research current design trends (e.g., "bento-grids", "glassmorphism")
- `--sources <list>`: Specific sources to use (exa, jina, web)
- `--save`: Save research to design-research folder
- `--append <file>`: Append to existing research file

**Research sources:**
- Exa: Advanced semantic search for design content
- Jina: Web reading and URL analysis
- Web search: General web search fallback

**Output:**
- Saves to `{specRoot}/design-research/topics/{topic}.md` (for --topic)
- Saves to `{specRoot}/design-research/trends/{trend}.md` (for --trend)
- Updates `{specRoot}/design-research/INDEX.md` catalog

## Config Schema Structure

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Pixel Perfect Configuration",
  "type": "object",
  "required": ["version"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$",
      "description": "Config schema version"
    },
    "specRoot": {
      "type": "string",
      "description": "Root directory to search for targets"
    },
    "designSystem": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "path": { "type": "string" },
        "artifacts": {
          "type": "array",
          "items": { "enum": ["paradigm", "tokens", "components"] }
        }
      }
    },
    "designResearch": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": false },
        "path": { "type": "string", "default": "design-research" },
        "sources": {
          "type": "array",
          "items": { "enum": ["exa", "jina", "web"] },
          "default": ["exa", "jina"]
        },
        "defaultTopics": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "defaults": {
      "type": "object",
      "properties": {
        "platforms": {
          "type": "array",
          "items": {
            "enum": ["mobile-ios", "mobile-android", "web-desktop", "web-mobile", "desktop-app", "cli", "tablet"]
          }
        },
        "vibe": {
          "enum": ["minimal", "modern", "playful", "corporate", "bold", "technical", "elegant", null]
        },
        "naming": {
          "enum": ["snake_case", "kebab-case", "camelCase"]
        }
      }
    },
    "extensions": {
      "type": "object",
      "properties": {
        "spec": { "type": "string", "default": ".spec.json" },
        "mock": { "type": "string", "default": ".mock.html" }
      }
    }
  }
}
```

## Design Research Workflow

```
1. User runs: /pixel-perfect:research "mobile bottom navigation patterns 2025"

2. Command:
   - Reads config for research sources
   - Searches using available tools (Exa, Jina)
   - Aggregates findings

3. Output saved to:
   {specRoot}/design-research/topics/mobile-bottom-navigation.md

4. INDEX.md updated with:
   - Topic name
   - Date researched
   - Sources used
   - Key findings summary

5. Research available for plan phase:
   - Plan command checks design-research/ for relevant topics
   - Incorporates findings into paradigm.yaml
```

## Design Research Artifact Format

```markdown
# Mobile Bottom Navigation Patterns

**Researched:** 2025-02-01
**Sources:** Exa, Jina, Web Search
**Query:** mobile bottom navigation patterns 2025

## Summary

Brief overview of key findings...

## Patterns Found

### Pattern 1: Floating Action Button Integration
- Source: [URL]
- Description: ...
- Usage: Popular in productivity apps
- Platforms: iOS, Android

### Pattern 2: Label-Free Icons
- Source: [URL]
- Description: ...
- Usage: Emerging trend
- Platforms: Primarily Android

## References

- [Article Title](URL) - Key insights
- [Case Study](URL) - Real-world examples

## Related Topics

- Mobile navigation hierarchies
- Gesture-based navigation
- Tab bar alternatives
```

## Required: Version Bump

- [x] Update `.claude-plugin/plugin.json` version to 1.6.0
- [x] Update `.claude-plugin/marketplace.json` metadata.version to 1.6.0
- [x] Update `.claude-plugin/marketplace.json` plugins[0].version to 1.6.0

## Required: Test Updates

- [ ] Create/update tests in `/tests/` for:
  - Research command execution with various sources
  - Config schema validation against valid/invalid configs
  - Design research artifact creation and INDEX.md updates
  - Research integration with plan phase
  - Config validation on plugin install

## New Folder Structure

```
project-root/
├── .pixel-perfect/
│   ├── config.json          (validated against schema)
│   └── config.schema.json   (NEW - schema definition)
├── .spec/
│   ├── design-system/       (existing)
│   └── design-research/     (NEW)
│       ├── INDEX.md         (catalog of all research)
│       ├── topics/          (research by topic)
│       │   ├── mobile-navigation.md
│       │   └── form-design.md
│       ├── trends/          (trend research)
│       │   ├── bento-grids.md
│       │   └── glassmorphism.md
│       └── competitors/     (competitor analysis)
│           └── competitor-name.md
└── specs/epics/
    └── epic-1/design/       (existing)
```
