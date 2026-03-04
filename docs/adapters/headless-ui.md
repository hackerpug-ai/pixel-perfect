# Headless UI

Unstyled, fully accessible UI components for React. Handles behavior, keyboard navigation, focus management, and ARIA attributes — all visual styling is your responsibility.

## Platforms

- web-desktop
- web-mobile

## Category

Components (unstyled — requires separate style system)

## Scaffold

1. Install:
   ```bash
   pnpm add @headlessui/react
   ```

2. No provider or theme configuration needed — Headless UI has no global context.

3. Pair with a style system. Headless UI is intentionally framework-agnostic for styling. All visual design comes from the project's existing style adapter (see `tailwind.md` or CSS Modules):
   ```tsx
   import { Dialog } from '@headlessui/react';

   function MyDialog({ open, onClose }) {
     return (
       <Dialog open={open} onClose={onClose}>
         <Dialog.Panel className="fixed inset-0 bg-white rounded-xl shadow-xl p-6">
           <Dialog.Title className="text-lg font-semibold text-gray-900">
             Confirm action
           </Dialog.Title>
           {/* content */}
         </Dialog.Panel>
       </Dialog>
     );
   }
   ```

4. Create a hello-world component using a Headless UI `Dialog` to verify correct behavior (focus trap, keyboard close, ARIA roles).

### Project Structure

```
src/
├── components/
│   └── ui/          # Headless UI + styling wrappers
└── styles/          # Tailwind classes or CSS Modules applied to Headless UI
```

## Theme Integration

None — Headless UI has no built-in theme. All visual styling is applied via the project's existing style system:

- **With Tailwind:** Apply utility classes directly to Headless UI component elements
- **With CSS Modules:** Write `.module.css` files targeting each component's element
- **With styled-components/Emotion:** Wrap Headless UI elements in styled components

AI must supply all visual styling. Headless UI provides only behavior and accessibility.

### Storybook Setup

No decorator required. Headless UI components work in Storybook without a provider:

```tsx
import type { Preview } from '@storybook/react';
// No special Headless UI setup needed

const preview: Preview = {
  decorators: [],
};

export default preview;
```

## Key Components

| Generic | Headless UI | Notes |
|---------|-------------|-------|
| Dialog / Modal | `Dialog` | Full focus trap + keyboard close |
| Disclosure | `Disclosure` | Accordion-style show/hide |
| Listbox | `Listbox` | Accessible select/dropdown |
| Menu | `Menu` | Dropdown menu with keyboard nav |
| Popover | `Popover` | Floating panel |
| Radio Group | `RadioGroup` | Accessible radio buttons |
| Switch | `Switch` | Toggle with ARIA |
| Tab | `Tab` | Tab interface with keyboard nav |
| Transition | `Transition` | CSS-class-driven enter/leave animations |
| Combobox | `Combobox` | Autocomplete/combo input |

## Verify

- [ ] Components render without any default browser styling (no Headless UI visual defaults)
- [ ] All visual styling comes from project style system (Tailwind classes, CSS Modules, etc.)
- [ ] Keyboard navigation works: Tab focus, Enter/Space to activate, Escape to close
- [ ] Focus is trapped correctly inside dialogs and modals
- [ ] ARIA attributes present and correct (inspect with browser accessibility tools)
- [ ] Storybook stories show component in all open/closed/interactive states

## Source URLs

- Official site: https://headlessui.com
- Dialog docs: https://headlessui.com/react/dialog
- Listbox docs: https://headlessui.com/react/listbox
- GitHub: https://github.com/tailwindlabs/headlessui
