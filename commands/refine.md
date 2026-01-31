---
description: "Refine design artifacts with structured feedback collection and smart task sequencing"
---

# Design Refine

Collect structured refinement feedback and intelligently re-run affected design phases.

## Usage

```
/pixel-perfect:refine <target> [feedback]
```

## Arguments

- `<target>`: Epic or feature to refine. Supports smart path resolution.
- `[feedback]`: Optional free-form feedback text. If provided, auto-detects affected sections.

## Refine Requires Existing Design

Refine modifies existing artifacts. At minimum, init must be complete.

## Scope Resolution

If no target specified, find the nearest `design/` directory or `design.config.yaml` from current location.

## Dependency Check

**BEFORE doing anything else**, verify prerequisites for the scoped directory:

```
CHECK: {target}/design/design.config.yaml exists?
  NO  → Run /pixel-perfect:init first (can't refine what doesn't exist)
  YES → Proceed to global design check

CHECK: designSystem.enabled in design.config.yaml?
  YES → Load global artifact resolution map
        Mark artifacts as GLOBAL or EPIC in selection UI
  NO  → All artifacts are EPIC (local)
```

Refine will detect which artifacts exist and only allow refinement of those.

## Global Design Awareness

When global design is enabled, refine distinguishes between:
- **GLOBAL artifacts** - Shared across epics (paradigm, tokens, components)
- **EPIC artifacts** - Specific to this epic (flows, workflows, views, screens)

Refinements to global artifacts affect all epics using them.

## Workflow

### Mode 1: Smart Detection (feedback provided)

```
/pixel-perfect:refine epic-1 "The color palette feels too muted, and the login flow is missing a forgot password option"
```

Analyzes feedback text to detect affected sections:
- "color palette" → tokens
- "login flow" + "forgot password" → flows, screens, views

Presents detected sections for confirmation before proceeding.

### Mode 2: Interactive Selection (no feedback)

```
/pixel-perfect:refine epic-1
```

Shows multi-select of refinable sections:

```
? Which areas need refinement? (multi-select)
  [ ] Requirements & Scope - Update PRD interpretation
  [ ] Platforms - Change target devices
  [ ] Design Vibe - Adjust aesthetic direction
  [ ] Workflows - Modify user journeys
  [ ] Screens - Add/remove/modify screens
  [ ] Flows - Adjust interaction flows
  [ ] Views - Refine view specifications
  [ ] Components - Update component definitions
  [ ] Tokens - Modify design tokens (colors, spacing, etc.)
  [ ] Mockups - Regenerate specific mockups
```

**When global design is enabled**, sections are annotated:

```
? Which areas need refinement? (multi-select)
  [ ] Requirements & Scope - Update PRD interpretation
  [ ] Platforms - Change target devices
  [ ] Design Vibe - Adjust aesthetic direction
  [ ] Workflows - Modify user journeys
  [ ] Screens - Add/remove/modify screens
  [ ] Flows - Adjust interaction flows
  [ ] Views - Refine view specifications
  [ ] Components - Update component definitions [GLOBAL]
  [ ] Tokens - Modify design tokens [GLOBAL]
  [ ] Paradigm - Design patterns & principles [GLOBAL]
  [ ] Mockups - Regenerate specific mockups
```

### Global Artifact Warning

When a GLOBAL artifact is selected, show impact warning:

```
⚠️  You selected GLOBAL artifacts.

Changes to these artifacts affect ALL epics using the global design system:
  • tokens.yaml (used by: epic-1, epic-2, epic-3)
  • components.yaml (used by: epic-1, epic-2, epic-3)

? How would you like to proceed?
  > Refine globally - Update /design/tokens.yaml (affects all epics)
    Create epic override - Copy to epic-1/design/tokens.yaml (this epic only)
    Cancel - Don't modify these artifacts
```

**If "Create epic override" selected:**
- Copies global artifact to `{epic}/design/`
- Future plan runs will use epic override instead of global
- Only this epic is affected

### Feedback Collection

For each selected section, prompt for free-form feedback:

```
? What changes are needed for Tokens?
  > The primary blue (#2563eb) feels too corporate. Want something warmer,
    maybe a teal. Also increase the base spacing from 4px to 8px.

? What changes are needed for Flows?
  > Add forgot password flow branching from login. Also need an onboarding
    flow for first-time users.
```

### Summary & Confirmation

After collecting all feedback, display summary:

```
═══════════════════════════════════════════════════════════
REFINEMENT SUMMARY
═══════════════════════════════════════════════════════════

Tokens:
  - Change primary blue to warmer teal
  - Increase base spacing from 4px to 8px

Flows:
  - Add forgot password flow from login
  - Add first-time user onboarding flow

Affected downstream artifacts:
  - components.yaml (uses tokens)
  - views.yaml (uses updated flows)
  - prompts/*.spec.json (regenerate affected)
  - mocks/*.mock.html (regenerate affected)

═══════════════════════════════════════════════════════════

? How would you like to proceed?
  > Confirm - Execute refinement tasks
    Modify - Edit a section
    Reject - Cancel refinement
```

**If "Modify" selected:**
```
? Which section do you want to modify?
  > Tokens
    Flows

? What changes are needed for Tokens? (current: "Change primary blue...")
  > [user can edit their previous input]
```

Returns to summary after modification.

### Task Sequencing

When confirmed, tasks are queued with dependency-aware ordering.

**Relative ordering, not mandatory steps.** Only run what's needed, but maintain this order:

```
config → UX plan → paradigm → tokens → components → flows/workflows → views/screens → prompts → mocks
```

See `docs/GENERATION-SEQUENCE.md` for full details.

**Examples:**

| What Changed | Tasks Run (in order) |
|--------------|----------------------|
| tokens only | tokens → components → prompts → mocks |
| components only | components → flows → views → prompts → mocks |
| views only | views → prompts → mocks |
| flows + tokens | tokens → components → flows → views → prompts → mocks |

**Smart Cascade:**
- Skip unchanged artifacts
- **Review** downstream artifacts for compliance with upstream changes
- **Regenerate** only when review finds issues or visual output changes
- Prompt user if reviews find opportunities to apply new standards

See `docs/GENERATION-SEQUENCE.md` for review vs regenerate guidance.

## Section Detection Keywords

Used for smart detection when feedback text is provided:

| Section | Keywords |
|---------|----------|
| requirements | "feature", "requirement", "user need", "scope", "add", "remove", "missing" |
| platforms | "mobile", "desktop", "tablet", "iOS", "Android", "web", "device" |
| vibe | "vibe", "aesthetic", "feel", "mood", "style", "brand", "look" |
| workflows | "workflow", "journey", "user flow", "task", "process" |
| screens | "screen", "page", "view", "add screen", "remove screen" |
| flows | "flow", "navigation", "transition", "step", "sequence" |
| views | "layout", "arrangement", "structure", "view" |
| components | "component", "button", "input", "card", "widget", "element" |
| tokens | "color", "spacing", "font", "typography", "size", "shadow", "border" |
| mockups | "mockup", "visual", "preview", "regenerate" |

## Examples

### Quick refinement with smart detection
```
/pixel-perfect:refine epic-1 "Need a dark mode option and the buttons feel too small"
```
→ Detects: tokens (dark mode, colors), components (buttons), mockups

### Interactive multi-section refinement
```
/pixel-perfect:refine epic-1

? Which areas need refinement?
  [x] Flows
  [x] Screens
  [ ] ...

? What changes for Flows?
  > Add password reset flow

? What changes for Screens?
  > Add password reset screen, remove the deprecated settings screen

[Summary displayed]

? Proceed?
  > Confirm

Queuing tasks:
  1. Update screens.yaml (add password_reset, remove settings)
  2. Update flows.yaml (add password_reset_flow)
  3. Update views.yaml (affected views)
  4. Regenerate prompts/password_reset.spec.json
  5. Generate mocks/password_reset.mock.html
  6. Remove mocks/settings.mock.html

Executing...
```

### Modify during confirmation
```
[Summary displayed]

? Proceed?
  > Modify

? Which section?
  > Tokens

? What changes for Tokens? (current: "Make blue warmer")
  > Make blue warmer, specifically #0d9488. Keep the spacing as-is.

[Updated summary displayed]

? Proceed?
  > Confirm
```

### Refining global artifacts
```
/pixel-perfect:refine epic-1

? Which areas need refinement?
  [x] Tokens [GLOBAL]
  [x] Flows
  [ ] ...

⚠️  You selected GLOBAL artifacts.

Changes to tokens.yaml affect ALL epics using the global design system:
  • epic-1 (current)
  • epic-2
  • epic-3

? How would you like to proceed?
  > Refine globally - Update /design/tokens.yaml

? What changes for Tokens?
  > Add dark mode color variants

? What changes for Flows?
  > Add onboarding flow

[Summary with cascade info]

Global artifacts to update:
  → /design/tokens.yaml

Epic artifacts to update:
  → epic-1/design/flows.yaml
  → epic-1/design/views.yaml

Downstream impact on other epics:
  ⚠ epic-2: Will use updated tokens on next plan/refine
  ⚠ epic-3: Will use updated tokens on next plan/refine

? Proceed?
  > Confirm
```

### Creating an epic override instead
```
? How would you like to proceed?
  > Create epic override - Copy to epic-1/design/tokens.yaml

Copying /design/tokens.yaml → epic-1/design/tokens.yaml
Future plan runs for epic-1 will use the local override.

? What changes for Tokens?
  > Add dark mode variants for this epic only
```

## Output

Updates `{epic}/design/refine-history.yaml` with refinement log:

```yaml
refinements:
  - date: "2025-01-30T14:30:00Z"
    sections:
      - tokens
      - flows
    feedback:
      tokens: "Change primary blue to teal #0d9488"
      flows: "Add forgot password flow"
    tasks_executed:
      - tokens.yaml
      - flows.yaml
      - views.yaml
      - prompts/login.spec.json
      - prompts/forgot_password.spec.json
      - mocks/login.mock.html
      - mocks/forgot_password.mock.html
```
