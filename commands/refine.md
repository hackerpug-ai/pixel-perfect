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

- `<directory>`: Directory to refine. Defaults to current directory.
- `[feedback]`: Optional free-form feedback text. If provided, auto-detects affected sections.

## Refine Requires Existing Design

Refine modifies existing artifacts. At minimum, `design/config.yaml` must exist in the target (or parent).

## Scope Resolution

If no target specified, use current directory.

## Dependency Check

**BEFORE refining**, verify:

```
CHECK: design/config.yaml or design/design.config.yaml exists in {target} or parent?
  NO  → Run /pixel-perfect:init first (can't refine what doesn't exist)
  YES → Proceed
```

Refine detects which artifacts exist and only allows refinement of those.

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

**When parent directories have artifacts**, sections are annotated:

```
? Which areas need refinement? (multi-select)
  [ ] Requirements & Scope - Update PRD interpretation
  [ ] Platforms - Change target devices
  [ ] Design Vibe - Adjust aesthetic direction
  [ ] Workflows - Modify user journeys
  [ ] Screens - Add/remove/modify screens
  [ ] Flows - Adjust interaction flows
  [ ] Views - Refine view specifications
  [ ] Components - Update component definitions [inherited from parent/design/]
  [ ] Tokens - Modify design tokens [inherited from parent/design/]
```
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

## Artifact Invalidation and Archival

When plan-level artifacts (paradigm, tokens, components, flows, views, screens) are modified during refinement, downstream artifacts that depend on them become stale. Refine handles this with archival and invalidation.

### Refinement Scope

At the start of refine, determine the scope:

```
? What level of refinement?
  > Plan-level - Modify YAML artifacts (tokens, components, flows, views, etc.)
    Mock-level - Regenerate mockups only (keep all plan artifacts as-is)
```

**Plan-level refinement** triggers the archival flow below.
**Mock-level refinement** skips archival and goes straight to mock regeneration.

### Archival Flow

When plan-level artifacts are modified, the following happens BEFORE regeneration:

1. **Identify downstream artifacts** that depend on what changed (using the dependency graph from `docs/GENERATION-SEQUENCE.md`)

2. **Archive affected downstream artifacts** to `{directory}/design/archived/{timestamp}/`:
   ```
   design/archived/2025-02-08T14-30-00/
   ├── prompts/
   │   ├── login.spec.json
   │   └── dashboard.spec.json
   ├── mocks/
   │   ├── login.mock.html
   │   └── dashboard.mock.html
   └── ARCHIVE-MANIFEST.md
   ```

3. **Create ARCHIVE-MANIFEST.md** in the archive folder:
   ```markdown
   # Archive Manifest

   **Archived:** 2025-02-08T14:30:00Z
   **Reason:** Plan-level refinement of tokens.yaml, components.yaml
   **Trigger:** /pixel-perfect:refine

   ## What Changed (Upstream)
   - tokens.yaml - Primary color changed from #3b82f6 to #0d9488
   - components.yaml - Button variants updated

   ## What Was Archived (Downstream)
   - prompts/login.spec.json
   - prompts/dashboard.spec.json
   - mocks/login.mock.html
   - mocks/dashboard.mock.html

   ## Recovery
   To restore these artifacts, copy them back from this archive folder.
   ```

4. **Remove archived files from active locations** (design/prompts/, design/mocks/)

5. **Nudge user to regenerate:**
   ```
   Archived 4 downstream artifacts to design/archived/2025-02-08T14-30-00/

   ? Regenerate now or later?
     > Regenerate now (runs prompts → mocks for affected keys)
       Later (run /pixel-perfect:prompts and /pixel-perfect:mockups when ready)
   ```

### Dependency Map for Archival

| Modified Artifact | Archives |
|-------------------|----------|
| paradigm.yaml | ALL downstream (tokens through mocks) |
| tokens.yaml | affected prompts + mocks |
| components.yaml | affected views, prompts, mocks |
| flows.yaml | affected views, prompts, mocks |
| workflows.yaml | affected views, prompts, mocks |
| views.yaml | affected prompts + mocks only |
| screens.yaml | affected prompts + mocks only |

### Options

- `--no-archive`: Skip archival (destructive overwrite of downstream artifacts in place)

### Updated Summary Display

The refinement summary now includes archival information:

```
═══════════════════════════════════════════════════════════
REFINEMENT SUMMARY
═══════════════════════════════════════════════════════════

Tokens:
  - Change primary blue to warmer teal

Affected downstream artifacts (will be archived):
  - prompts/login.spec.json → archived, then regenerated
  - prompts/dashboard.spec.json → archived, then regenerated
  - mocks/login.mock.html → archived, then regenerated
  - mocks/dashboard.mock.html → archived, then regenerated

Archive location: design/archived/2025-02-08T14-30-00/

═══════════════════════════════════════════════════════════
```

---

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
| designSystem | "design system", "shadcn", "material", "chakra", "ant design", "radix", "daisyui", "mantine" |
| iconLibrary | "icon", "icon library", "lucide", "heroicons", "phosphor", "tabler", "font awesome" |

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
    level: "plan"                    # "plan" or "mock"
    sections:
      - tokens
      - flows
    feedback:
      tokens: "Change primary blue to teal #0d9488"
      flows: "Add forgot password flow"
    archived:                         # Only present for plan-level refinements
      path: "design/archived/2025-01-30T14-30-00/"
      files:
        - prompts/login.spec.json
        - prompts/forgot_password.spec.json
        - mocks/login.mock.html
        - mocks/forgot_password.mock.html
    tasks_executed:
      - tokens.yaml
      - flows.yaml
      - views.yaml
      - prompts/login.spec.json
      - prompts/forgot_password.spec.json
      - mocks/login.mock.html
      - mocks/forgot_password.mock.html
```
