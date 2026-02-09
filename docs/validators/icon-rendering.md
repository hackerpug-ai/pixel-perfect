# Icon Rendering Validation

Detect and prevent icon gore - text displayed where icon glyphs should render.

## What is Icon Gore?

Icon gore occurs when an icon element displays raw text instead of the intended glyph. Common causes:

- Missing font files or CDN failures
- Incorrect icon class names
- Typos in icon ligature names
- Using icon name format that doesn't match the library

**Example Gore**:
```html
<!-- User sees "home_icon" text instead of home icon -->
<span class="material-symbols-outlined">home_icon</span>
```

**Correct**:
```html
<!-- User sees the home icon glyph -->
<span class="material-symbols-outlined">home</span>
```

## Detection Rules

### Rule 0: Library Selection

The icon library is determined from `config.yaml`:
1. Check `iconLibrary.name` in config
2. If not set, check `designSystem.name` and use the pairing matrix (`docs/design-systems/README.md`)
3. If neither set, default to Material Symbols for backward compatibility

See `docs/icon-libraries/{library-name}.md` for detailed validation rules per library.

### Rule 1: Text Content Pattern (Library-Aware)

Element has icon-related class but innerText matches invalid patterns. Detection is now **library-aware** — it uses the configured library's naming convention:

```
DETECT IF:
  library = config.iconLibrary.name OR infer from designSystem
  element matches library's selector pattern (see Rule 2 table)
  AND content does NOT match library's valid content format

Example for Lucide:
  element has data-lucide attribute
  AND value contains underscore → likely gore (Lucide uses kebab-case)

Example for Material Symbols:
  element has class material-symbols-*
  AND innerText matches /^[a-z][a-z0-9_]+$/
  AND innerText NOT IN known_material_ligatures
```

**Invalid patterns** (likely gore):
- `home_icon` (snake_case with _icon suffix)
- `arrow-back-icon` (kebab-case with -icon suffix)
- `HomeIcon` (PascalCase)
- `settingsGear` (camelCase compound)

**Valid ligatures** (not gore):
- `home` (Material Symbols)
- `arrow_back` (Material Symbols uses underscores)
- `settings` (single word)
- `chevron-right` (Lucide uses kebab-case)

### Rule 2: Class-Library Mismatch (Extended)

Icon class/selector doesn't match content format. Now covers all supported libraries:

| Library | Expected Selector | Valid Content Pattern | Naming Convention |
|---------|-------------------|----------------------|-------------------|
| Material Symbols | `.material-symbols-*` | `home`, `arrow_back` | underscore ligatures |
| Lucide | `[data-lucide]` | `home`, `arrow-left` | kebab-case |
| Heroicons | SVG with paths | SVG child elements | kebab-case |
| Phosphor | `.ph`, `.ph-bold`, `.ph-fill` | `ph-house`, `ph-arrow-left` | kebab-case with `ph-` prefix |
| Tabler | `.ti` | `ti-home`, `ti-arrow-left` | kebab-case with `ti-` prefix |
| Font Awesome | `.fa-solid`, `.fa-regular` | `fa-house`, `fa-user` | kebab-case with `fa-` prefix |
| Ionicons | `ion-icon[name]` | `home`, `arrow-back` | kebab-case |
| Feather | `[data-feather]` | `home`, `arrow-left` | kebab-case |
| Remix | `.ri-*` | `ri-home-line`, `ri-arrow-left-line` | kebab-case with `ri-` prefix |
| Bootstrap Icons | `.bi` | `bi-house`, `bi-arrow-left` | kebab-case with `bi-` prefix |
| Ant Design Icons | `.anticon` | SVG child elements | component-based |

**Cross-library contamination:** If config says `iconLibrary: lucide` but mockup uses `material-symbols-outlined` class, flag as library mismatch.

### Rule 3: Empty or Error SVGs

```
DETECT IF:
  element is SVG
  AND (element.children.length === 0 OR element has class "error", "missing")
```

### Rule 4: Fallback Characters

Font icon showing Unicode replacement character or box:

```
DETECT IF:
  element.innerText contains "\uFFFD" (replacement character)
  OR element.innerText contains "\u25A1" (white square)
```

## Icon Libraries Reference

### Material Symbols

**Class**: `material-symbols-outlined`, `material-symbols-rounded`, `material-symbols-sharp`

**Content format**: Ligature names with underscores
```html
<span class="material-symbols-outlined">home</span>
<span class="material-symbols-outlined">arrow_back</span>
<span class="material-symbols-outlined">shopping_cart</span>
```

**Common gore patterns**:
- `home_icon` → should be `home`
- `arrowBack` → should be `arrow_back`
- `ShoppingCart` → should be `shopping_cart`

### Lucide

**Class**: `lucide`, `lucide-*`

**Content format**: Kebab-case or rendered via React/Vue component
```html
<i class="lucide lucide-home"></i>
<svg class="lucide lucide-arrow-left">...</svg>
```

**Common gore patterns**:
- Empty `<i>` element with only class
- SVG without child paths

### Heroicons

**Class**: Via React/Vue components or direct SVG

**Content format**: Rendered SVG with paths
```html
<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24">
  <path d="M..." />
</svg>
```

**Common gore patterns**:
- SVG with no `<path>` children
- SVG with `display: none` on all children

### Phosphor Icons

**Class**: `ph`, `ph-bold`, `ph-fill`, `ph-duotone`, `ph-thin`, `ph-light`

**Content format**: CSS class-based
```html
<i class="ph ph-house"></i>
<i class="ph-bold ph-arrow-left"></i>
```

**Common gore patterns**:
- Missing `ph` base class
- Using wrong weight class
- Incorrect icon name format

### Tabler Icons

**Class**: `ti ti-{icon-name}`

**Content format**: CSS class-based
```html
<i class="ti ti-home"></i>
<i class="ti ti-arrow-left"></i>
```

**Common gore patterns**:
- Missing `ti` base class
- Using camelCase instead of kebab-case

### Font Awesome

**Class**: `fa-solid fa-{icon-name}`, `fa-regular fa-{icon-name}`, `fa-brands fa-{icon-name}`

**Content format**: CSS class-based
```html
<i class="fa-solid fa-house"></i>
<i class="fa-regular fa-user"></i>
```

**Common gore patterns**:
- Missing weight class (fa-solid, fa-regular)
- Using old `fa fa-` prefix format (v4 syntax)

### Ionicons

**Content format**: Web component
```html
<ion-icon name="home"></ion-icon>
<ion-icon name="arrow-back"></ion-icon>
```

**Common gore patterns**:
- Missing Ionicons script in `<head>`
- Using non-existent icon names

### Feather Icons

**Content format**: Data attribute (similar to Lucide, which is a Feather fork)
```html
<i data-feather="home"></i>
<i data-feather="arrow-left"></i>
```

**Common gore patterns**:
- Missing `feather.replace()` initialization call
- Using underscore names instead of kebab-case

### Remix Icons

**Class**: `ri-{icon-name}-line`, `ri-{icon-name}-fill`

**Content format**: CSS class-based
```html
<i class="ri-home-line"></i>
<i class="ri-arrow-left-line"></i>
```

**Common gore patterns**:
- Missing `-line` or `-fill` suffix
- Using wrong icon name format

### Bootstrap Icons

**Class**: `bi bi-{icon-name}`

**Content format**: CSS class-based
```html
<i class="bi bi-house"></i>
<i class="bi bi-arrow-left"></i>
```

**Common gore patterns**:
- Missing `bi` base class
- Using Font Awesome naming conventions

### Ant Design Icons

**Content format**: Web component or SVG
```html
<span class="anticon anticon-home"><svg>...</svg></span>
```

**Common gore patterns**:
- SVG without child paths
- Missing `anticon` class prefix

## Size Consistency

Icons should use consistent sizing from design tokens:

| Size Token | Pixels | Use Case |
|------------|--------|----------|
| `icon-sm` | 16px | Inline text, badges |
| `icon-md` | 20px | Buttons, inputs |
| `icon-lg` | 24px | Navigation, primary actions |
| `icon-xl` | 32px | Empty states, features |

**Detect size inconsistency**:
```
FOR EACH icon_name IN extracted_patterns.icons:
  sizes = unique(icon_name.sizes)
  IF sizes.length > 1:
    REPORT: "Icon '{icon_name}' has inconsistent sizes: {sizes}"
```

## Validation Output

```json
{
  "icon_check": {
    "total_icons": 24,
    "rendered_correctly": 22,
    "potential_gore": [
      {
        "element": "<span class='material-symbols-outlined'>home_icon</span>",
        "expected": "home",
        "found_text": "home_icon",
        "mockup": "profile_view",
        "fix": "Change 'home_icon' to 'home'"
      }
    ],
    "size_inconsistencies": [
      {
        "icon": "search",
        "expected_size": "24px",
        "found": "20px",
        "mockups": ["dashboard_main", "settings"]
      }
    ],
    "library_mismatches": [
      {
        "icon": "settings",
        "expected_library": "material-symbols",
        "found": "lucide",
        "mockup": "profile_view"
      }
    ]
  }
}
```

## Prevention Checklist

- [ ] Use exact ligature names from icon library documentation
- [ ] Verify icon font/SVG sprite is loaded in mockup
- [ ] Use consistent icon library across all mockups
- [ ] Define approved icon list in `tokens.yaml`
- [ ] Use consistent sizes from token scale
