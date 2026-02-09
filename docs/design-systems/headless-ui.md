# Headless UI

## Overview

- **CSS Framework:** Unstyled (headless) — designed for Tailwind CSS but works with any styling
- **Component Pattern:** Unstyled logic components; data attributes for state-driven styling; accessibility-first
- **Official Icon Library:** None official; Heroicons recommended (by Tailwind Labs, same creators)
- **Theming Approach:** No theming system; users implement via Tailwind classes or custom CSS with data attributes
- **Maintained by:** Tailwind Labs

## Token Conventions

Headless UI is completely unstyled — no default tokens. Tokens come from the styling system (typically Tailwind):

```yaml
tokens:
  colors:
    # No built-in colors. Use Tailwind's default palette or project-specific values.
    # Recommended: define semantic roles that map to Tailwind color classes
    format: "Tailwind color classes or hex"
    roles: [primary, secondary, background, foreground, muted, border]
  spacing:
    unit: "4px"
    scale: "Tailwind default spacing scale"
  typography:
    fontFamily: "Inter, system-ui, sans-serif"
  borderRadius:
    # Use Tailwind's default radius scale
    scale: { sm: "0.125rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem" }
```

Fetch Tailwind defaults: see Source URLs below.

## Component Names

| Generic | Headless UI | Notes |
|---------|------------|-------|
| Button | Button | Basic button with focus management |
| Dialog / Modal | Dialog | with DialogPanel, DialogTitle |
| Select / Listbox | Listbox | with ListboxButton, ListboxOptions |
| Combobox | Combobox | with ComboboxInput, ComboboxOptions |
| Dropdown | Menu | with MenuButton, MenuItems |
| Popover | Popover | with PopoverButton, PopoverPanel |
| Toggle | Switch | with SwitchGroup, SwitchLabel |
| Radio | RadioGroup | with RadioGroupOption |
| Tabs | TabGroup | with TabList, Tab, TabPanels |
| Disclosure | Disclosure | (accordion-like) with DisclosureButton, DisclosurePanel |
| Transition | Transition | Animated mount/unmount |

Note: Headless UI has a focused set of ~10 components. For components not listed, implement manually.

## Mockup CDN Links

```html
<script src="https://cdn.tailwindcss.com"></script>

<!-- Heroicons (recommended by Tailwind Labs) -->
<!-- Heroicons are SVG-based; for mockups use inline SVG or approximate with Lucide -->
<script src="https://unpkg.com/lucide@latest"></script>
```

Note: Heroicons don't have a font-based CDN. For HTML mockups, use Lucide as a CDN-friendly alternative with similar icon names.

## Class Patterns

Headless UI uses Tailwind with data attribute modifiers:

```html
<!-- Listbox (Select) -->
<div>
  <button class="w-full rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
    Selected value
  </button>
  <div class="mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
    <div class="cursor-pointer select-none py-2 pl-10 pr-4 data-[focus]:bg-blue-100 data-[selected]:font-semibold">
      Option 1
    </div>
  </div>
</div>

<!-- Switch -->
<button class="relative inline-flex h-6 w-11 items-center rounded-full data-[checked]:bg-blue-600 bg-gray-200">
  <span class="inline-block h-4 w-4 transform rounded-full bg-white transition data-[checked]:translate-x-6 translate-x-1"></span>
</button>

<!-- Dialog -->
<div class="fixed inset-0 bg-black/30" aria-hidden="true"></div>
<div class="fixed inset-0 flex items-center justify-center p-4">
  <div class="mx-auto max-w-sm rounded bg-white p-6 shadow-xl">
    Dialog content
  </div>
</div>
```

Key patterns:
- Data attribute modifiers: `data-[focus]:*`, `data-[selected]:*`, `data-[checked]:*`, `data-[active]:*`
- Tailwind utility classes for all styling
- Transition classes for animations
- No custom CSS classes from the library itself

## Review Checklist

- [ ] Tailwind CSS loaded
- [ ] Uses data attribute modifiers for interactive states (`data-[focus]:`, `data-[checked]:`, etc.)
- [ ] Heroicons or Lucide used for icons
- [ ] Dialog uses overlay + centered panel pattern
- [ ] Listbox/Select follows Headless UI dropdown pattern
- [ ] Switch uses pill-shaped toggle pattern
- [ ] Focus styles use `ring-2` pattern (Tailwind)
- [ ] Transitions use opacity/transform for enter/leave states
- [ ] No pre-styled component library classes mixed in
- [ ] Accessible markup (ARIA attributes present)

## Source URLs

- Official site: https://headlessui.com
- Components list: https://headlessui.com/react/menu
- Tailwind CSS defaults: https://tailwindcss.com/docs/theme
- Heroicons: https://heroicons.com
- Tailwind UI (styled examples): https://tailwindui.com
