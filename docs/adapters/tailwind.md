# Tailwind CSS

Style adapter for utility-first CSS styling.

## Platforms

- web-desktop
- web-mobile
- mobile-ios (via NativeWind)
- mobile-android (via NativeWind)

## Category

Style

## Scaffold

### Web
1. Install: `npm install -D tailwindcss @tailwindcss/postcss postcss`
2. Add PostCSS config or verify framework integration (Next.js, Vite, etc.)
3. Create/update the main CSS entry point with `@import "tailwindcss";`
4. Generate theme configuration from project vibe (see Theme Integration)
5. Verify: create a test element with Tailwind classes, confirm styles apply

### React Native (NativeWind)
1. Install: `npm install nativewind tailwindcss`
2. Install babel preset: `npm install -D @babel/preset-react`
3. Configure `tailwind.config.ts` with content paths for `.tsx` files
4. Set up `nativewind-env.d.ts` for type support
5. Configure `babel.config.js` with NativeWind preset
6. Verify: create a test `<View className="bg-blue-500">` to confirm styles apply

### Configuration File
Create `tailwind.config.ts` at project root with theme values derived from the project vibe.

## Theme Integration

Map the project vibe from `design/manifest.json` to Tailwind's theme configuration:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { /* vibe-derived palette */ },
        secondary: { /* vibe-derived palette */ },
        accent: { /* vibe-derived palette */ },
      },
      fontFamily: {
        sans: ['/* vibe-derived font */'],
        mono: ['/* vibe-derived font */'],
      },
      borderRadius: {
        DEFAULT: '/* vibe-derived: sharp=2px, rounded=8px, pill=9999px */',
      },
      spacing: {
        // Use default Tailwind spacing unless vibe requires custom scale
      },
    },
  },
  plugins: [],
};

export default config;
```

### Vibe-to-Config Mapping

| Vibe Keyword | Tailwind Impact |
|-------------|----------------|
| clean / minimal | Neutral palette, generous spacing, `rounded-sm` or `rounded` |
| bold / vibrant | Saturated primaries, tighter spacing, `rounded-lg` |
| professional | Slate/zinc neutrals, standard spacing, `rounded-md` |
| playful | Multi-hue palette, varied spacing, `rounded-full` on accents |
| high-contrast | Light bg + dark text maximized, thick borders, high saturation |

### CSS Custom Properties Bridge
For interop with component libraries (shadcn, etc.), export theme values as CSS custom properties:

```css
@theme {
  --color-primary: /* value */;
  --color-secondary: /* value */;
  --color-accent: /* value */;
  --radius-default: /* value */;
}
```

## Verify

### Component Level
- Component uses Tailwind utility classes (not inline styles or raw CSS)
- Colors reference theme tokens (`text-primary`, `bg-secondary`) not arbitrary values (`text-[#ff0000]`)
- Spacing uses Tailwind scale (`p-4`, `gap-6`) not arbitrary values
- Responsive variants are applied where needed (`sm:`, `md:`, `lg:`)
- Dark mode variants present if project supports dark mode (`dark:`)

### Screen Level
- Layout uses Tailwind's flexbox/grid utilities consistently
- Screen respects breakpoint system (no hardcoded pixel widths)
- Typography follows the configured font scale
- Container/max-width strategy is consistent across screens

## Sandbox

Tailwind does not provide its own sandbox. Pair with Storybook (sandbox adapter) or the framework's dev server.

```bash
# Verify Tailwind is processing correctly
npx tailwindcss --help    # confirm CLI available
```

For debugging, use Tailwind's `@apply` sparingly and prefer utility classes directly in markup.
