# Radix UI

Unstyled, accessible UI primitive components for React. Provides low-level building blocks with correct keyboard navigation, focus management, and ARIA semantics — all visual styling is applied by your style system.

## Platforms

- web-desktop
- web-mobile

## Category

Components (unstyled accessible primitives)

## Scaffold

Radix UI is a collection of individually published packages — there is no monolithic install and no global provider. Install only the primitives your project needs:

```bash
# Install individual primitives as needed
pnpm add @radix-ui/react-dialog
pnpm add @radix-ui/react-dropdown-menu
pnpm add @radix-ui/react-select
pnpm add @radix-ui/react-popover
pnpm add @radix-ui/react-tooltip
pnpm add @radix-ui/react-switch
pnpm add @radix-ui/react-checkbox
pnpm add @radix-ui/react-tabs
pnpm add @radix-ui/react-accordion
```

**Import pattern:** Radix primitives use namespace imports:

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Select from '@radix-ui/react-select';
```

No provider or theme setup required. Create a hello-world using `Dialog` to verify correct accessibility behavior.

### Project Structure

```
src/
├── components/
│   └── ui/          # Styled wrappers around Radix primitives
│       ├── dialog.tsx    # Dialog.Root + Dialog.Overlay + Dialog.Content + styling
│       ├── dropdown.tsx
│       └── select.tsx
└── styles/          # CSS Modules, Tailwind, or CSS-in-JS applied to Radix elements
```

## Theme Integration

Radix UI has no built-in theme. All visual styling is applied via the project's existing style system. Radix elements accept `className` and `style` props:

```tsx
// With Tailwind CSS
import * as Dialog from '@radix-ui/react-dialog';

export function MyDialog({ open, onOpenChange, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**Key pattern:** Wrap each Radix primitive in a project-specific component that applies styling. This is how shadcn/ui is built — it wraps Radix primitives with Tailwind utility classes.

### Storybook Setup

No decorator required. Radix components work in Storybook without a global provider:

```tsx
import type { Preview } from '@storybook/react';

const preview: Preview = {
  decorators: [],
};

export default preview;
```

## Key Components

| Generic | Radix UI Package | Import |
|---------|------------------|--------|
| Dialog / Modal | `@radix-ui/react-dialog` | `import * as Dialog from '@radix-ui/react-dialog'` |
| Dropdown Menu | `@radix-ui/react-dropdown-menu` | `import * as DropdownMenu from ...` |
| Select | `@radix-ui/react-select` | `import * as Select from ...` |
| Popover | `@radix-ui/react-popover` | `import * as Popover from ...` |
| Tooltip | `@radix-ui/react-tooltip` | `import * as Tooltip from ...` |
| Switch | `@radix-ui/react-switch` | `import { Switch } from ...` |
| Checkbox | `@radix-ui/react-checkbox` | `import { Checkbox } from ...` |
| Slider | `@radix-ui/react-slider` | `import { Slider, Range, Thumb } from ...` |
| Tabs | `@radix-ui/react-tabs` | `import * as Tabs from ...` |
| Accordion | `@radix-ui/react-accordion` | `import * as Accordion from ...` |
| HoverCard | `@radix-ui/react-hover-card` | `import * as HoverCard from ...` |

## Verify

- [ ] Components are accessible: keyboard navigation (Tab, Enter, Space, Escape), correct focus trap
- [ ] ARIA attributes present and correct (inspect with browser accessibility tools or axe)
- [ ] All visual styling comes from project style system — no Radix default styles leaking
- [ ] Namespace import pattern used (`import * as Dialog`) — not named imports
- [ ] TypeScript types from Radix resolve without errors

## Source URLs

- Official site: https://www.radix-ui.com
- Primitives overview: https://www.radix-ui.com/primitives/docs/overview/introduction
- Component docs: https://www.radix-ui.com/primitives/docs/components/dialog
- GitHub: https://github.com/radix-ui/primitives
