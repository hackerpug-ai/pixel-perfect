---
name: design-keys
description: "[REFERENCE ONLY] Design key patterns and artifact management - extends DESIGN-CONVENTIONS.md"
invokable: false
---

# Design Keys

**Reference document** extending `DESIGN-CONVENTIONS.md` with detailed key patterns.

---

## QUICK REFERENCE

```
USED BY: design-plan, design-mockup, design-review, ui-implement, ui-plan
PURPOSE: Consistent artifact identification across design workflow
OUTPUT: Predictable file paths and state management
```

---

## PATTERN 1: Design Key Format

```typescript
// Definition
type DesignKey = string   // filename stem without extensions
type EpicScope = string   // epic directory path

// Pattern
const key: DesignKey = "{design_key}"           // e.g., "user_profile"
const scope: EpicScope = "{epic}/{design_key}"  // e.g., "epic-1/user_profile"

// Extraction (strips configured extensions)
function extractDesignKey(filename: string, config: DesignConfig): DesignKey {
  const extensions = [config.extensions.spec, config.extensions.mock]
  let key = filename
  for (const ext of extensions) {
    key = key.replace(new RegExp(`${ext}$`), '')
  }
  return normalizeKey(key, config.naming.style)
}

// Normalization by style
function normalizeKey(input: string, style: NamingStyle): DesignKey {
  switch (style) {
    case 'snake_case':  return input.toLowerCase().replace(/[-\s]+/g, '_')
    case 'kebab-case':  return input.toLowerCase().replace(/[_\s]+/g, '-')
    case 'camelCase':   return toCamelCase(input)
  }
}
```

**Display Names** (any style → Title Case):
```typescript
function displayName(key: DesignKey): string {
  return key
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Examples (any naming style)
displayName("user_profile")     // → "User Profile"
displayName("user-profile")     // → "User Profile"
displayName("orderSummary")     // → "Order Summary"
```

---

## PATTERN 2: File Structure Mapping

All design files derive from the design_key using project config:

```
{epic}/design/
├── {paths.specs}/
│   ├── {design_key}{extensions.spec}    # Specification file
│   └── manifest.json                     # All specs index
├── {paths.mocks}/
│   ├── {design_key}{extensions.mock}    # Visual mockup
│   └── DESIGN-REVIEW.md                  # Review status
└── [YAML artifacts at root]

State: .spec/state.db (via skill-state)
```

**Path Resolution**:
```typescript
interface DesignConfig {
  extensions: { spec: string; mock: string }
  paths: { specs: string; mocks: string }
  naming: { style: 'snake_case' | 'kebab-case' | 'camelCase' }
}

// Defaults (when no .spec/design.config.yaml)
const defaults: DesignConfig = {
  extensions: { spec: '.spec.json', mock: '.mock.html' },
  paths: { specs: 'prompts', mocks: 'mocks' },
  naming: { style: 'snake_case' }
}

function getPaths(epic: string, key: DesignKey, config = defaults) {
  return {
    spec: `${epic}/design/${config.paths.specs}/${key}${config.extensions.spec}`,
    mock: `${epic}/design/${config.paths.mocks}/${key}${config.extensions.mock}`,
  }
}
```

---

## PATTERN 3: Uniqueness and Scope

```
RULES:
  • design_key MUST be unique within an epic
  • design_key MAY repeat across epics (different scope)
  • Full identifier: {epic}/{design_key} is globally unique

EXAMPLES:
  ✅ ALLOWED:
     epic-1/user_profile
     epic-2/user_profile    (same key, different epic)

  ❌ NOT ALLOWED:
     epic-1/user_profile
     epic-1/user_profile    (duplicate within epic)
```

---

## PATTERN 4: Naming Guidelines

```
GOOD (semantic, descriptive):
  • user_profile            # Clear entity
  • order_detail            # Clear purpose
  • settings_notifications  # Scoped to section
  • item_list_empty         # Includes state variant

AVOID:
  • screen1                 # Non-descriptive
  • new_design              # Temporary name
  • profile_v2              # Version in name (use state)
  • mockup_3                # Numbered, not semantic
```

---

## PATTERN 5: Status Model

Single `status` field for workflow state:

```typescript
type DesignStatus =
  | 'pending'       // Awaiting review (new or revised)
  | 'in_progress'   // Currently being reviewed
  | 'approved'      // Passed review (terminal)
  | 'needs_work'    // Failed review, needs revision
  | 'failed'        // Error occurred

const transitions: Record<DesignStatus, DesignStatus[]> = {
  pending:     ['in_progress'],
  in_progress: ['approved', 'needs_work'],
  needs_work:  ['pending'],
  approved:    [],               // Terminal
  failed:      [],               // Terminal
}
```

**State Storage**:
```sql
-- Schema
id:       design-review:{epic}:{design_key}
skill:    design-review
context:  {epic}:{design_key}
status:   pending | in_progress | approved | needs_work | failed
metadata: { reviewed_at, reviewers: {...} }

-- Queries
SELECT * FROM skill_state WHERE id LIKE 'design-review:{epic}:%' AND status = 'needs_work';
SELECT * FROM skill_state WHERE id LIKE 'design-review:{epic}:%' AND status = 'pending';
SELECT * FROM skill_state WHERE id LIKE 'design-review:{epic}:%' AND status = 'approved';
```

---

## PATTERN 6: Cross-Skill Integration

| Skill | Uses design_key for |
|-------|---------------------|
| `design-plan` | Generates YAML entries keyed by design_key |
| `design-prompt-json` | Creates spec files from views.yaml |
| `design-mockup` | Outputs mock files |
| `design-review` | Reviews by design_key, updates status |
| `ui-implement` | Implements from mock files |
| `ui-plan` | Plans components from design artifacts |

---

## IMPLEMENTATION CHECKLIST

When creating or managing design artifacts:

- [ ] design_key follows configured naming style
- [ ] design_key is semantic and descriptive
- [ ] design_key is unique within epic
- [ ] File paths use configured extensions
- [ ] Status field set correctly
- [ ] manifest.json updated with new entries
- [ ] DESIGN-REVIEW.md includes entry

---

## RELATED DOCS

- `brain/docs/DESIGN-CONVENTIONS.md` - Core conventions and config schema
- `brain/docs/ui-design-standards/README.md` - Visual standards
- `brain/docs/skill-state/README.md` - State management patterns
