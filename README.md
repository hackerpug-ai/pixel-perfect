# claude-code-design

A Claude Code plugin for tech-agnostic UI/UX design workflows. Transform product requirements into structured design artifacts and HTML mockups that serve as blueprints for AI-assisted implementation.

---

## Why HTML Mockups?

Picture this: You've just finished designing your next app. It's gorgeous. The UX makes sense. Surely in the age of AI you can go from design to prototype with the click of a button...

Except that's never how it turns out. The AI gives you a component that kind of looks right if you squint—hardcoded colors, magic numbers everywhere, and structural logic that suggests the AI was having an existential crisis mid-generation.

**Here's the insight that changes everything:** AI doesn't *see* your designs the way you do. When an AI looks at a screenshot, it's processing pixels—reverse-engineering intent from a grid of colors. It's working backwards from the finished painting to guess what brushstrokes made it.

But give that same AI *text*—structured, semantic text like HTML—and suddenly it's not guessing. It's reading the blueprint directly.

### What HTML Encodes That Screenshots Don't

| Aspect | Screenshot | HTML |
|--------|------------|------|
| **Structure** | Implied | Explicit parent-child relationships |
| **Hierarchy** | Visual guess | Semantic heading levels |
| **Semantics** | Unknown | Button vs div-pretending-to-be-button |
| **Spacing** | Pixel estimation | Padding, margin, flex gap explicitly defined |
| **Relationships** | Ambiguous | Icon inside button vs next to it |

A screenshot is a photograph. HTML is the blueprint. You wouldn't ask a contractor to build your house from a photograph of someone else's house—you'd give them architectural drawings.

### The Translation Advantage

When Claude reads HTML like this:

```html
<!-- Bottom Controls Pattern -->
<div class="flex items-center justify-center gap-6 p-4">
  <button class="flex size-14 items-center justify-center rounded-full">
    <span class="material-symbols-outlined">photo_library</span>
  </button>
  <button class="flex size-20 items-center justify-center rounded-full border-4">
    <div class="size-16 rounded-full bg-white"></div>
  </button>
  <button class="relative flex size-14 items-center justify-center">
    <span class="material-symbols-outlined">stacks</span>
    <div class="absolute -left-1 -top-1 h-6 w-6 rounded-full bg-primary">3</div>
  </button>
</div>
```

It *knows*:
- Three-button layout with specific gap spacing
- Button sizing hierarchy: capture button (size-20) dominates utility buttons (size-14)
- Icon-only buttons using Material Symbols
- A notification badge positioned absolutely on the stack button
- Flex layouts with explicit gaps and padding

From a screenshot, it would have to *guess* all of this.

---

## What is claude-code-design?

This plugin provides a structured workflow for turning product requirements into implementable designs:

```
PRD.md → Design Artifacts (YAML) → Specifications (JSON) → Mockups (HTML) → Review
```

### Core Concept

Instead of jumping from requirements to code, this plugin creates an intermediate **design layer**:

1. **Ideation**: Break down PRD into user workflows, screens, and flows
2. **Paradigm Research**: Study existing patterns and design systems
3. **Structured Artifacts**: Generate YAML files defining every aspect of the design
4. **HTML Blueprints**: Create mockups that Claude can read as implementation specs
5. **Review Loop**: Iterate until designs meet quality standards

The HTML mockups become your **Rosetta Stone**—the bridge between "that looks nice" and "that actually works."

---

## Quick Start

### Installation

```bash
# For development/testing
claude --plugin-dir /path/to/claude-code-design

# From marketplace (when published)
/plugin install claude-code-design
```

### Basic Usage

```bash
# Ensure you have a PRD
cat .spec/epics/epic-1/PRD.md

# Run full design workflow
/claude-code-design:design .spec/epics/epic-1

# Check progress anytime
/claude-code-design:status .spec/epics/epic-1
```

### Step-by-Step Usage

```bash
# 1. Generate design artifacts from PRD
/claude-code-design:plan .spec/epics/epic-1

# 2. Create specification files from views.yaml
/claude-code-design:prompts .spec/epics/epic-1

# 3. Generate HTML mockups
/claude-code-design:mockups .spec/epics/epic-1

# 4. Review mockups against specs
/claude-code-design:review .spec/epics/epic-1
```

---

## Commands

### /claude-code-design:design

Run the complete design workflow.

**Usage:**
```
/claude-code-design:design <epic-path> [options]
```

**Options:**
- `--skip-plan` - Use existing YAML artifacts
- `--skip-prompts` - Use existing spec files
- `--skip-mockups` - Use existing mockups
- `--review-only` - Only run review phase

### /claude-code-design:plan

Generate design artifacts from PRD.

**Usage:**
```
/claude-code-design:plan <epic-path> [options]
```

**Options:**
- `--foundation` - Generate only foundation artifacts (workflows, paradigm, screens)
- `--continue` - Continue with detail artifacts (flows, views, components, tokens)
- `--research <scope>` - Paradigm research: `codebase`, `web`, or `both`
- `--skip-research` - Skip paradigm research

**Output Phases:**

| Phase | Artifact | Purpose |
|-------|----------|---------|
| 1 | workflows.yaml | User journeys and task flows |
| 2 | paradigm.yaml | Design patterns, principles, references |
| 3 | screens.yaml | Screen inventory with hierarchy |
| 4 | flows.yaml | Interaction flows between screens |
| 5 | views.yaml | Detailed view specifications |
| 6 | components.yaml | Reusable component definitions |
| 7 | tokens.yaml | Design tokens (colors, spacing, typography) |
| Summary | UX-DESIGN-PLAN.md | Human-readable design overview |

### /claude-code-design:prompts

Generate specification files from design artifacts.

**Usage:**
```
/claude-code-design:prompts <epic-path> [--key <design_key>] [--force]
```

### /claude-code-design:mockups

Generate HTML mockups from specifications.

**Usage:**
```
/claude-code-design:mockups <epic-path> [--key <design_key>] [--force]
```

### /claude-code-design:review

Review mockups against specifications.

**Usage:**
```
/claude-code-design:review <epic-path> [options]
```

**Options:**
- `--key <design_key>` - Review single mockup
- `--all` - Review all mockups regardless of status
- `--continue` - Continue from last position
- `--reset` - Reset all statuses to pending

### /claude-code-design:status

Show workflow progress and next steps.

**Usage:**
```
/claude-code-design:status <epic-path>
```

---

## Output Structure

```
{epic}/design/
├── workflows.yaml          # User journeys and task flows
├── paradigm.yaml           # Design patterns and references
├── screens.yaml            # Screen inventory
├── flows.yaml              # Interaction flows
├── views.yaml              # View specifications
├── components.yaml         # Component definitions
├── tokens.yaml             # Design tokens
├── UX-DESIGN-PLAN.md       # Human summary
│
├── prompts/                # Specification files
│   ├── {design_key}.spec.json
│   └── manifest.json
│
├── mocks/                  # HTML mockups
│   ├── {design_key}.mock.html
│   └── DESIGN-REVIEW.md
│
└── research/               # Paradigm research
```

---

## Configuration

Create `.spec/design.config.yaml` to override defaults:

```yaml
# File extensions
extensions:
  spec: ".spec.json"      # default
  mock: ".mock.html"      # default

# Output paths
paths:
  specs: "prompts"        # default
  mocks: "mocks"          # default

# Naming conventions
naming:
  style: "snake_case"     # snake_case | kebab-case | camelCase
```

---

## Philosophy

### 1. Design Reference, Not Code Conversion

❌ **Wrong approach:**
```
"Convert this HTML to React Native"
```

✅ **Right approach:**
```
"Use this HTML as a DESIGN REFERENCE for building in React Native"
```

The HTML shows what the design *represents*, not a recipe to follow blindly. This gives you native implementations instead of web code wearing a platform costume.

### 2. Structure Implies Purpose

When Claude reads a camera interface HTML with a large capture button, utility buttons, and a badge counter, it doesn't just see "buttons." It infers:

- This is a primary workflow (camera is the main action)
- Users might capture multiple items (hence the counter)
- Quick access to gallery matters (utility button present)
- Users need guidance (overlay visible)

That inference leads to better code—buttons that work together in a coherent system.

### 3. Platform Agnostic, Context Specific

The design artifacts are platform-agnostic. Your implementation context determines the translation:

| Artifact | Web/React | Mobile/Flutter | CLI |
|----------|-----------|----------------|-----|
| screens.yaml | Routes/Pages | Screens | Commands |
| components.yaml | Components | Widgets | Formatters |
| tokens.yaml | CSS variables | ThemeData | ANSI colors |
| flows.yaml | Navigation | Navigator | Menu flow |
| mocks | HTML preview | HTML → reference | ASCII art |

### 4. Iteration Over Perfection

Don't aim for perfect on first try. The review loop exists because:

- First drafts reveal misunderstandings
- Each iteration sharpens intent
- "Needs work" status is data, not failure

---

## Best Practices

### Do: Use Descriptive Design Keys

✅ `camera_capture_flow`
✅ `document_list_view`
✅ `settings_notifications`

❌ `design-v3-final-REAL-use-this-one`
❌ `screen1`
❌ `new_mockup`

### Do: Provide Framework Context

When implementing from mockups, load your workspace rules, design system docs, and component library references. You wouldn't hire a contractor and not tell them where the electrical panel is.

### Do: Budget Time for Polish

Aim for:
- ✅ Structurally sound (hierarchy matches)
- ✅ Visually close (looks like the design)
- ✅ Semantically appropriate (uses right components)

Don't aim for:
- ❌ Exact pixel measurements
- ❌ Zero manual refinement
- ❌ Perfect on first try

### Don't: Use HTML for Complex Interactions

HTML excels at:
- ✅ Layouts and hierarchy
- ✅ Visual styling
- ✅ Component structure
- ✅ Basic interactions

HTML cannot express:
- ❌ Complex gestures (pinch-zoom, swipe-to-delete)
- ❌ Animation choreography
- ❌ State machines
- ❌ Performance optimizations

For those, describe the interaction in prose alongside the mockup.

---

## When to Use This

**Good for:**
- New screens with clear visual hierarchy
- Standard UI building blocks (cards, lists, forms)
- Multi-step flows (wizards, onboarding)
- Consistent design systems
- Teams wanting design-to-code traceability

**Not good for:**
- Complex animations requiring timing curves
- Custom gesture handlers
- Performance-critical rendering
- Highly stateful interactions (describe in prose instead)

---

## The Assembly Line

When everything clicks:

```
Product Idea
    ↓ (ideation)
Clear Flows + User Stories
    ↓ (/claude-code-design:plan)
Structured Design Artifacts (YAML)
    ↓ (/claude-code-design:prompts)
Specification Files (JSON)
    ↓ (/claude-code-design:mockups)
HTML Design Blueprints
    ↓ (/claude-code-design:review)
Approved Designs
    ↓ (implementation with context)
Working Code
    ↓ (your polish + refinement)
Shipped Feature
```

**Real-world example timeline:**
- PRD writing: 30 minutes
- Design planning: 15 minutes
- Mockup generation: 10 minutes
- Review iteration: 20 minutes
- **Total design phase: ~1.5 hours**

Without structured design artifacts, you'd spend 4-6 hours in back-and-forth between vague requirements and implementation attempts.

---

## Documentation

- [Design Conventions](docs/DESIGN-CONVENTIONS.md) - File structure, configuration, YAML schemas
- [Design Keys](docs/DESIGN-KEYS.md) - Naming patterns, status model, cross-skill integration

---

## Requirements

- Claude Code v1.0.33+
- Epic directory with `PRD.md`

---

## License

MIT

---

## Learn More

- [From Stitch to Ship: How HTML Becomes Your Design Blueprint](https://hackerpug.ghost.io/from-stitch-to-ship-how-html-becomes-your-design-blueprint-for-ai-coding/) - The philosophy behind HTML-as-blueprint
- [Claude Code Plugins Documentation](https://code.claude.com/docs/en/plugins) - Official plugin development guide

---

*This plugin embodies a simple truth: meet your AI tools where they are. Claude thinks in code and context. Give it HTML blueprints and framework rules, and spend the time you save on the parts of building software that only a human can do.*
