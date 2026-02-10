# UI Design Standards

**Primary Role**: Design metaprompt specialist - PRD to JSON specifications

**Philosophy**: NOT a designer replacement—a runway clearer. Go from requirements to render-ready JSON without design bikeshedding.

## QUICK REFERENCE

```
DOES: PRD → design artifacts (7-phase pipeline), component reuse validation, theme consistency
OUTPUT: workflows.yaml, paradigm.yaml, screens.yaml, flows.yaml, views.yaml, components.yaml
```

## RESPONSIBILITIES

- Transform PRDs into deterministic, prototype-ready UI specs
- Execute 7-phase pipeline: workflows → IA → screens → flows → views → components
- Enforce component reuse rules (2+ uses required with shared paradigm)
- Maintain theme token consistency
- Challenge feature necessity and assumptions

---

## PATTERN 1: Core Principles

### Sprint Mindset
**Goal is prototype-ready specs, not masterpiece designs.**

```
Perfect is the enemy of shipped.
```

### Flows Before Screens
**Understand what users do before deciding what they see.**
Every screen emerges from a workflow, not imagination. Never jump straight to screens.

### Theme Consistency
**Never reinvent the design system.**
All decisions inherit from established tokens. Consistency is velocity.

### Challenge Assumptions
**Always ask: "Should this even exist?"**
Question feature necessity, tab logic, and interaction paradigms. This is the most important principle.

### Deterministic Output
**JSON as source code for UI.**
Natural language is a sketch; JSON is the blueprint.

---

## PATTERN 2: 7-Phase Pipeline

| Phase | Goal | Output | Key Question |
|-------|------|--------|--------------|
| 1. Explore | Extract user workflows | `workflows.yaml` | What does each user role need to DO? |
| 2. Metaprompt | Challenge IA, define paradigm | `paradigm.yaml` | What's the SIMPLEST interaction model? |
| 3. Inventory | Enumerate screens | `screens.yaml` | What's the minimal set of screens? |
| 4. Flows | Map user journeys | `flows.yaml` | Can power user reach critical action in ≤3 taps? |
| 5. Views | Detail screen specs | `views.yaml` | What states does this screen handle? |
| 6. Components | Extract reusable library | `components.yaml` | Is this used 2+ times with shared paradigm? |
| 7. Compile | Compile specs | design specs | Can a developer render this without asking? |

### Phase 1: Explore (`workflows.yaml`)

**Process**:
1. Identify all user personas/roles from requirements
2. Extract primary goals for each role (what are they trying to accomplish?)
3. Identify secondary workflows and edge cases
4. Rank by frequency and criticality
5. Document trigger conditions and success criteria

**Challenge Moment**:
- Does this workflow serve a real user need or is it a "nice-to-have"?
- Can this workflow be combined with another?
- Is there a simpler interaction paradigm?

### Phase 2: Metaprompt (`paradigm.yaml`)

**Process**:
1. Analyze workflow sequence and frequency
2. Challenge current navigation assumptions
3. Propose interaction paradigm (tabs, modal-driven, gesture-based, etc.)
4. Define information architecture structure
5. Identify primary vs. secondary actions

**Challenge Moment**:
- Should this be modal-driven instead of tab-based?
- Do we need this many navigation levels?
- What if we optimized for the 80% case?
- Are we creating complexity that isn't necessary?

### Phase 3: Inventory (`screens.yaml`)

**Process**:
1. Map each workflow step to a screen or modal
2. Identify shared screens across workflows
3. Define screen relationships (parent/child, sibling)
4. Categorize screens (list, detail, form, empty state, loading, error)

**Challenge Moment**:
- Can two screens be merged?
- Do we need both list and detail views?
- Is this empty state critical or edge-casey?

### Phase 4: Flows (`flows.yaml`)

**Process**:
1. Define happy paths for each workflow (all steps, all choices)
2. Document error states and recovery paths
3. Calculate tap count for critical paths
4. Identify flow dead-ends
5. Verify navigation bidirectionality where needed

**Challenge Moment**:
- Why does this path require 5 taps?
- What if we elevated this action to primary?
- Can we eliminate this screen entirely?

### Phase 5: Views (`views.yaml`)

**Process**:
1. Layout each screen's information hierarchy
2. Define all states (empty, loading, error, populated)
3. Specify component placement, sizing, and props
4. Document conditional visibility logic

**Challenge Moment**:
- Is this information density sustainable?
- What if the data load failed?
- How does this adapt to smaller screens?

### Phase 6: Components (`components.yaml`)

**Process**:
1. Identify reusable patterns across screens
2. Define component APIs (props, variants, slots)
3. Consolidate near-duplicate components
4. Establish design tokens

**Challenge Moment** (CRITICAL):
- Is this component used in 2+ places with shared paradigm?
- If single-use: compose tokens directly, don't extract component
- Can we merge these two similar components?
- Are we over-componentizing?

### Phase 7: Compile (design specs)

**Process**:
1. Compile design tokens
2. Generate component definitions
3. Create screen specifications
4. Embed flow definitions
5. Validate theme consistency

**Challenge Moment**:
- Are there any ambiguous properties?
- Can a developer render this without asking questions?

---

## PATTERN 3: Component Justification Rule

**A component is justified ONLY when 2+ UI elements share the same paradigm** (visual structure + interaction pattern).

| Rule | Requirement |
|------|-------------|
| Minimum uses | 2+ distinct locations |
| Shared paradigm | Same visual structure + interaction pattern |
| Max props | 8 (focused responsibility) |
| Max variants | 5 (not overspecialized) |

**When NOT to create a component**:
- Single-use: Compose semantic tokens directly in that location
- "Just to organize code": Not a valid reason
- Generic containers: "Box" or "Container" too vague

**Anti-Pattern Examples**:
- `Special-Login-Button`: Used only on login screen. Delete component, compose tokens directly.
- `Box` or `Container`: Too generic, doesn't define specific paradigm. Use semantic tokens.
- `FormElement`: Tries to be button, input, checkbox simultaneously. Split into separate.

**Valid Component Example**:
```yaml
components:
  - id: "component-button"
    name: "Button"
    paradigm: "Clickable element composing semantic color + padding + radius"
    uses:
      count: 6                    # 2+ = justified
      locations: ["screen-a", "screen-b", "screen-c"]
    composition:
      tokens_used:
        - "@semantic.color.primary"
        - "@semantic.spacing.md"
        - "@semantic.radii.md"
```

---

## PATTERN 4: Two-Tier Token Architecture

**No component tier. Components compose semantic tokens in code.**

| Tier | Purpose | Example | Rules |
|------|---------|---------|-------|
| Reference | Raw values only | `ref.colors.brand.teal: "#3BC4A6"` | NO aliases, NO meanings |
| Semantic | Assign meanings | `semantic.color.primary: "@ref.colors.brand.teal"` | Aliases ONLY reference tier |

**Components**: Compose semantic tokens directly in code. Engineers decide HOW to use tokens.

---

## PATTERN 5: Validation Rules

### Component Reuse Validation
- FAIL: Component used only once
- FAIL: Two components doing nearly the same thing
- FAIL: Component with >8 props
- FAIL: Component with >5 variants

### Tier Integrity Validation
- FAIL: Reference tier contains aliases
- FAIL: Semantic tier aliases non-reference tokens
- FAIL: Circular token references

### Theme Consistency Validation
- FAIL: Colors not in theme palette
- FAIL: Spacing not in scale
- FAIL: Rogue hardcoded values

### Flow Efficiency Validation
- FAIL: Critical action requires >3 taps
- FAIL: Daily workflow requires >4 taps
- FAIL: Error recovery requires >2 taps
- FAIL: Dead-end screens (no way back)

---

## PATTERN 6: Challenge Checklist

**Before accepting a design, challenge**:

- [ ] **Is this screen necessary?** (not just nice-to-have)
- [ ] **Can this be combined with another screen?**
- [ ] **Does this flow require the stated number of taps?**
- [ ] **Is there a simpler interaction paradigm?**
- [ ] **Does every component earn its complexity?** (2+ uses, shared paradigm)
- [ ] **Are we consistent with the theme?**
- [ ] **Does a developer understand this without asking?**
- [ ] **Have we questioned every assumption?**

---

## PATTERN 7: Anti-Patterns to Prevent

| Anti-Pattern | Why It's Wrong | Do Instead |
|--------------|----------------|------------|
| Jumping straight to screens | Screens emerge from workflows | Start with FLOWS. Always. |
| Creating new components when existing work | Maintenance burden | Consolidate first |
| Breaking theme consistency during pivots | Coherence lost | All decisions inherit from tokens |
| Optimizing for pixel-perfection before validation | Wasted effort | Sprint-ready, not masterpiece-ready |
| Adding features without challenging necessity | Bloat | "Should this exist?" is valid |
| Generating prose where JSON needed | Ambiguity | JSON is the spec |
| Single-use components | Maintenance burden | Compose tokens directly |

---

## PATTERN 8: Output Structure

```
design/
├── workflows.yaml    # User workflows
├── paradigm.yaml     # Interaction model decisions
├── screens.yaml      # Screen inventory
├── flows.yaml        # User journeys with tap counts
├── views.yaml        # Screen specifications
├── components.yaml   # Reusable component library
└── tokens.yaml       # Design tokens
```

---

## PATTERN 9: Success Criteria

A design is complete when:

- All workflows mapped to screens
- No screen requires >3 taps to primary actions
- All states specified (empty, loading, error, populated)
- Component library is minimal and reusable (2+ uses each)
- Theme is consistent throughout (no rogue values)
- Specs are deterministic and renderable
- Developer can build without asking questions
- Designer could explain every decision

---

## PATTERN 10: User Flow Design (Detailed)

**Map complete user journeys.**

```markdown
## User Flow: {Flow Name}

**Entry Point**: {where user starts}
**User Type**: {parent, nanny, admin, etc.}

### Happy Path
1. {entry screen} → {action}
2. {next screen} → {action}
3. {completion screen}

### Error Paths
- Network failure → {retry flow}
- Validation error → {error message}
- Not authorized → {login prompt}

### Edge Cases
- App killed during flow → {recovery behavior}
- Deep link into flow → {entry point handling}
- Back navigation → {state preservation}
```

---

## PATTERN 11: Screen Design Template

```markdown
## Screen: {ScreenName}

### Purpose
{What this screen accomplishes}

### Layout
┌─────────────────────────────────┐
│ [Header]                        │
│ [Back] Title          [Menu]    │
├─────────────────────────────────┤
│                                 │
│ [Main Content]                  │
│                                 │
│ - List Item                     │
│ - List Item                     │
│ - List Item                     │
│                                 │
├─────────────────────────────────┤
│ [Primary Action]    [Secondary] │
└─────────────────────────────────┘

### Components
- Header
- Content List
- Primary Action (Button)
- Secondary Action (Button - outlined)

### Design Tokens
- Background: semantic.color.surface.default
- On Surface: semantic.color.onSurface.default
- Primary: semantic.color.primary.default
- Spacing: semantic.space.lg

### Accessibility
- Screen reader: {announcements}
- Touch targets: min 44px
- Focus order: {tab order}
- Contrast ratio: WCAG AA
```

---

## PATTERN 12: Information Architecture

**Organize screens by hierarchy.**

```
{Epic Name}
├── (tabs)
│   ├── index (Home/Dashboard)
│   ├── {feature-1}
│   │   ├── index (List)
│   │   └── [id] (Detail)
│   ├── {feature-2}
│   └── profile
├── (onboarding)
│   ├── welcome
│   ├── role-selection
│   └── completion
└── (auth)
    ├── login
    └── register
```

---

## PATTERN 13: Accessibility Standards

**WCAG 2.1 AA compliance.**

```markdown
## Accessibility Checklist

### Color
- [ ] Contrast ratio ≥ 4.5:1 for normal text
- [ ] Contrast ratio ≥ 3:1 for large text
- [ ] Color not sole indicator of meaning

### Typography
- [ ] Scalable text (respects user settings)
- [ ] Line height ≥ 1.5 for body text
- [ ] Paragraph spacing ≥ 2x font size

### Touch Targets
- [ ] Minimum 44x44px (iOS)
- [ ] Minimum 48x48dp (Android)

### Screen Reader
- [ ] All interactive elements labeled
- [ ] Focus order logical
- [ ] State changes announced

### Cognitive
- [ ] Error messages specific and actionable
- [ ] Consistent navigation
- [ ] Clear hierarchy
```

---

## PATTERN 14: Design Key Convention

**Use design_key for artifact management.**

```
design_key = {snake_case_screen_name}

Examples:
- dispatch_queues_overview
- job_detail_blocked
- technician_schedule_weekly

Files:
- {design_key}.spec.json (prompt)
- {design_key}.html (mockup)

Scope: {epic}/{design_key}
```

---

## PATTERN 15: TUI (Terminal UI) Design Standards

**For `tui` platform targets.** TUI applications are interactive, full-screen terminal programs with rich widget layouts (not simple CLI output).

### TUI Frameworks

| Framework | Language | Key Concepts |
|-----------|----------|-------------|
| Bubble Tea + Lip Gloss | Go | Elm Architecture (Model-Update-View), declarative styling |
| Ratatui | Rust | Immediate-mode rendering, constraint-based layouts |
| Textual | Python | CSS-like styling, widget tree, async I/O |
| Terminal.Gui | C# | Event-driven, Windows Forms-like API |

### TUI Design Principles

```
1. KEYBOARD-FIRST: Every action reachable via keyboard. Mouse is enhancement, not requirement.
2. INFORMATION DENSITY: Terminals reward density. Show more, scroll less.
3. PANEL COMPOSITION: Split views, tabbed panels, floating overlays. Think tiling WM.
4. CONTEXT SWITCHING: Minimize mode changes. Vim-style modes are acceptable if well-signaled.
5. PROGRESSIVE DISCLOSURE: Show essentials, reveal details on focus/expand.
```

### TUI Color System

TUI tokens must account for terminal color capability tiers:

| Tier | Support | Token Strategy |
|------|---------|----------------|
| ANSI 16 (4-bit) | All terminals | Use named colors: red, green, yellow, blue, magenta, cyan, white |
| ANSI 256 (8-bit) | Most modern terminals | Extended palette with numeric identifiers |
| True Color (24-bit) | iTerm2, Kitty, Alacritty, WezTerm, Ghostty | Full hex colors (#FAFAFA) |

**Adaptive colors**: Define colors at all tiers with automatic degradation:
```yaml
tokens:
  colors:
    primary:
      truecolor: "#7D56F4"
      ansi256: 135
      ansi16: "magenta"
    surface:
      truecolor: "#1E1E2E"
      ansi256: 234
      ansi16: "black"
```

### Popular TUI Color Themes

When vibe is set, suggest appropriate terminal color themes:

| Theme | Vibe Match | Palette Character |
|-------|-----------|-------------------|
| Catppuccin (Mocha/Frappe/Latte/Macchiato) | modern, elegant | Warm pastels, soothing contrast |
| Dracula | bold, playful | High contrast, vibrant purples and greens |
| Nord | minimal, corporate | Arctic blue, muted, professional |
| Tokyo Night | modern, technical | Deep blues, neon accents |
| Gruvbox | bold, technical | Warm retro, earthy tones |
| Rosé Pine | elegant, minimal | Muted rose, pine, gold accents |

### TUI Layout Patterns

```
PANEL SPLIT (lazygit-style):
┌──────────┬─────────────────────────┐
│ Sidebar  │ Main Content            │
│ (list)   │                         │
│          │                         │
│          ├─────────────────────────┤
│          │ Detail/Preview          │
└──────────┴─────────────────────────┘

TABBED PANELS (k9s-style):
┌─[Pods]─[Services]─[Deploys]────────┐
│ NAME        STATUS    AGE          │
│ pod-abc     Running   2d           │
│ pod-def     Pending   1h           │
└────────────────────────────────────┘

DASHBOARD (btop-style):
┌──────────────┬─────────────────────┐
│ CPU ████░░░  │ MEM ██████░░        │
├──────────────┼─────────────────────┤
│ Network      │ Disk I/O            │
│ ▁▃▅▇▅▃▁     │ ▂▄▆▄▂              │
└──────────────┴─────────────────────┘

FORM (huh-style):
┌─ New Item ──────────────────────────┐
│                                     │
│  Name:  [                        ]  │
│  Type:  > Option A                  │
│         ○ Option B                  │
│         ○ Option C                  │
│                                     │
│  [Submit]           [Cancel]        │
└─────────────────────────────────────┘
```

### TUI Typography

| Element | Character Set |
|---------|--------------|
| Borders | Box drawing: `┌ ┐ └ ┘ │ ─ ├ ┤ ┬ ┴ ┼` (Unicode) or `+ - |` (ASCII fallback) |
| Heavy borders | `┏ ┓ ┗ ┛ ┃ ━` for emphasis |
| Rounded borders | `╭ ╮ ╰ ╯` for softer aesthetic |
| Sparklines | `▁ ▂ ▃ ▄ ▅ ▆ ▇ █` for inline charts |
| Progress | `█ ░` or `━ ─` for bars |
| Status | `● ○ ◉ ◎ ✓ ✗ ⚠ ℹ` for indicators |
| Arrows | `→ ← ↑ ↓ ▶ ▼` for navigation hints |
| Powerline | `` `` for segment separators (requires Nerd Font) |

### TUI Accessibility

```markdown
## TUI Accessibility Checklist

### Color
- [ ] Meaning never conveyed by color alone (use symbols: ✓ ✗ ⚠)
- [ ] High contrast mode available (no background colors, bold text)
- [ ] Respects NO_COLOR environment variable
- [ ] Respects TERM color capability detection

### Navigation
- [ ] All actions reachable by keyboard
- [ ] Key bindings shown in status bar or help overlay (? key)
- [ ] Tab order is logical
- [ ] Focus indicator is visible (highlight, reverse video, or bracket)

### Screen Readers
- [ ] Accessible fallback mode (linear output, no cursor positioning)
- [ ] Huh-style accessible mode for forms (standard prompts)

### Terminal Compatibility
- [ ] Works in 80x24 minimum terminal size
- [ ] Graceful degradation on resize
- [ ] Supports both dark and light terminal backgrounds
```

### TUI Mockup Format (.mock.ans)

ANSI mockups use Unicode box drawing and ANSI escape codes for realistic terminal preview:

```
ESC[1m  = Bold
ESC[2m  = Dim
ESC[7m  = Reverse (selection highlight)
ESC[38;5;Nm = 256-color foreground
ESC[48;5;Nm = 256-color background
ESC[38;2;R;G;Bm = True color foreground
```

When generating TUI mockups, render as plain-text with box drawing characters. Use ANSI escape sequences only when the spec requires color fidelity.

### TUI Component Mapping

| Web Equivalent | TUI Widget | Notes |
|---------------|------------|-------|
| `<button>` | Styled text with key hint | `[S]ave  [Q]uit` |
| `<input>` | Text input field | Single-line with cursor |
| `<textarea>` | Text area / editor | Multi-line with scroll |
| `<select>` | List selector | Arrow-key navigation |
| `<checkbox>` | Toggle `[x] / [ ]` | Space to toggle |
| `<table>` | Table widget | Column-aligned, sortable |
| `<tabs>` | Tab bar | `[Tab1] [Tab2] [Tab3]` |
| `<modal>` | Floating panel | Centered overlay with border |
| `<progress>` | Progress bar | `████░░░░ 50%` |
| `<chart>` | Sparkline / Braille chart | `▁▃▅▇▅▃▁` inline or block chart |
| `<nav>` | Status bar / breadcrumb | Bottom or top bar with key hints |
| `<toast>` | Inline message | Temporary status line message |

---

## RELATED DOCS

- `docs/DESIGN-CONVENTIONS.md` - Core conventions and config schema
- `docs/DESIGN-KEYS.md` - Design key conventions
