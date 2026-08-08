# DaisyUI

CSS class-based component system built on Tailwind CSS. Provides pre-built component classes applied directly to HTML elements — not a React component library.

## Platforms

- web-desktop
- web-mobile

## Category

Components (CSS class-based — not React component imports)

## Scaffold

1. Install DaisyUI as a Tailwind CSS plugin:
   ```bash
   pnpm add -D daisyui@latest
   ```

2. Add to `tailwind.config.js` plugins array:
   ```javascript
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     content: ['./src/**/*.{js,ts,jsx,tsx}'],
     theme: {
       extend: {},
     },
     plugins: [require('daisyui')],
     daisyui: {
       themes: ['light', 'dark', 'cupcake'],  // vibe-derived theme list
     },
   };
   ```

3. DaisyUI does not require a React provider. The theme is set via a `data-theme` attribute:
   ```html
   <html data-theme="light">
   ```
   Or dynamically in React:
   ```tsx
   document.documentElement.setAttribute('data-theme', 'dark');
   ```

4. **Recommended pattern:** Generate thin React wrapper components that apply DaisyUI class names, giving them a proper React API and Storybook controls. DaisyUI classes alone are not React components.

   Example wrapper:
   ```tsx
   type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'link';
   type ButtonSize = 'sm' | 'md' | 'lg';

   interface ButtonProps {
     variant?: ButtonVariant;
     size?: ButtonSize;
     disabled?: boolean;
     children: React.ReactNode;
     onClick?: () => void;
   }

   export function Button({ variant = 'primary', size = 'md', disabled, children, onClick }: ButtonProps) {
     const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
     return (
       <button
         className={`btn btn-${variant} ${sizeClass}`}
         disabled={disabled}
         onClick={onClick}
       >
         {children}
       </button>
     );
   }
   ```

### Project Structure

```
src/
├── components/
│   └── ui/          # React wrappers around DaisyUI classes
└── app/
    └── layout.tsx   # data-theme attribute on root element
```

## Theme Integration

DaisyUI has 35+ built-in themes selectable via `data-theme`. For custom themes:

```javascript
// tailwind.config.js
daisyui: {
  themes: [
    {
      mytheme: {
        'primary': '#007AFF',        // vibe-derived
        'primary-content': '#FFFFFF',
        'secondary': '#5856D6',
        'accent': '#FF9F0A',
        'neutral': '#3D4451',
        'base-100': '#FFFFFF',
        'info': '#0284C7',
        'success': '#16A34A',
        'warning': '#CA8A04',
        'error': '#DC2626',
      },
    },
  ],
},
```

### Vibe-to-Theme Mapping

| Vibe Keyword | DaisyUI Impact |
|-------------|----------------|
| clean / minimal | `light` theme, minimal class usage |
| bold / vibrant | Custom theme with high-saturation `primary` |
| professional | `business` or `corporate` built-in theme |
| playful | `cupcake` or `bumblebee` built-in theme |

## Key Class Patterns

DaisyUI uses CSS class names applied to HTML elements:

| Generic | DaisyUI Classes |
|---------|-----------------|
| Button | `btn btn-primary`, `btn-secondary`, `btn-ghost`, `btn-sm`, `btn-lg` |
| Card | `card`, `card-body`, `card-title`, `card-actions` |
| Badge | `badge badge-primary`, `badge-secondary`, `badge-outline` |
| Input | `input input-bordered`, `input-primary` |
| Select | `select select-bordered` |
| Checkbox | `checkbox checkbox-primary` |
| Toggle | `toggle toggle-primary` |
| Alert | `alert alert-info`, `alert-success`, `alert-warning`, `alert-error` |
| Tabs | `tabs`, `tab`, `tab-active` |
| Navbar | `navbar`, `navbar-start`, `navbar-end` |
| Drawer | `drawer`, `drawer-toggle`, `drawer-content` |
| Modal | `modal`, `modal-box`, `modal-open` |

## Verify

- [ ] DaisyUI CSS classes resolve to correct styles (not unstyled raw HTML)
- [ ] `data-theme` attribute on root element applies the correct color scheme
- [ ] Theme switching (if implemented) updates all component colors correctly
- [ ] React wrapper components expose variant props as Storybook `argTypes` controls
- [ ] Custom theme colors match vibe requirements

## Source URLs

- Official site: https://daisyui.com
- Installation: https://daisyui.com/docs/install/
- Themes: https://daisyui.com/docs/themes/
- Component docs: https://daisyui.com/components/
- GitHub: https://github.com/saadeghi/daisyui
