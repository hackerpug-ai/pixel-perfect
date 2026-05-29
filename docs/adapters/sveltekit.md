# SvelteKit

Framework adapter for **SvelteKit** web apps. Teaches the framework-specific parts the generic `storybook.md` sandbox adapter does not cover: project structure, how Storybook is initialized for SvelteKit, the Svelte story formats, and how to mock SvelteKit's special modules in isolation.

This is a **framework** adapter — it is loaded (when present) *before* the style/components/sandbox adapters and takes precedence for framework-specific details. The framework-agnostic conventions (sidebar hierarchy, controls/argTypes, token stories, addons) still come from `docs/adapters/storybook.md` and `docs/storybook-conventions.md`.

> **Verified:** the commands and config in this doc were validated against a real SvelteKit + Storybook install (Storybook 10.4.1, Svelte 5, `@storybook/sveltekit`, `@storybook/addon-svelte-csf` 5.x). Storybook moves fast — always use `@latest` for `init` and treat exact version numbers as illustrative.

## Platforms

- web-desktop
- web-mobile

(SvelteKit is web-only. There is no mobile/React-Native variant.)

## Category

Framework (optional adapter — loaded only when `tools.framework` is `sveltekit`)

## Scaffold

### 1. SvelteKit project

If the project is **not** already a SvelteKit app, create one with the Svelte CLI (`sv`):

```bash
# interactive
npx sv create my-app

# non-interactive (TypeScript, minimal template)
npx sv create my-app --template minimal --types ts --install npm
```

This produces Svelte 5 + Vite with `src/lib/` (the `$lib` alias), `src/routes/`, `svelte.config.js`, and `vite.config.ts`. Components are `.svelte` files authored with Svelte 5 runes (`$props()`, `$state()`, `$derived()`).

### 2. Initialize Storybook

```bash
npx storybook@latest init
```

`init` **auto-detects SvelteKit** (`Framework detected: sveltekit`) and:
- installs `@storybook/sveltekit` (the framework package, Vite builder) and `@storybook/addon-svelte-csf` (native Svelte stories), plus `@storybook/addon-a11y`, `@storybook/addon-docs`, and `@chromatic-com/storybook`;
- writes `.storybook/main.ts` and `.storybook/preview.ts`;
- adds `storybook` and `build-storybook` scripts to `package.json`.

There is **no** separate `@storybook/addon-essentials` to install in current Storybook — controls/actions/viewport/docs ship in core + `addon-docs`. Do not hand-install the addons the CLI already added.

### 3. Verify `.storybook/main.ts`

It must reference the SvelteKit framework, include `.svelte` in the stories glob, and load the Svelte CSF addon:

```ts
import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
  addons: [
    '@storybook/addon-svelte-csf',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
  ],
  framework: '@storybook/sveltekit',
};
export default config;
```

> Note the glob is `*.stories.@(js|ts|svelte)` — **no `tsx`/`jsx`**. Svelte stories are either `.stories.svelte` (native) or `.stories.ts` (CSF).

### 4. Remove sample stories

Delete the generated `src/stories/` examples once `npm run storybook` runs, so only project stories remain.

## Story File Convention

Two formats are supported; **both compile and appear in Storybook**. Prefer **native Svelte CSF** for components that use slots/snippets/composition; CSF `.stories.ts` is fine for simple prop-driven atoms.

### Native Svelte CSF — `ComponentName.stories.svelte` (recommended)

```svelte
<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import StatusBadge from './StatusBadge.svelte';

  const { Story } = defineMeta({
    title: 'Components/StatusBadge',
    component: StatusBadge,
    tags: ['autodocs'],
    argTypes: {
      status: { control: 'select', options: ['open', 'in-progress', 'complete'] },
      size: { control: 'select', options: ['sm', 'md', 'lg'] },
      label: { control: 'text' },
    },
    args: { status: 'open', size: 'md' },
  });
</script>

<Story name="Default" />
<Story name="InProgress" args={{ status: 'in-progress' }} />
<Story name="Complete" args={{ status: 'complete', label: 'Done' }} />
```

- Use `<script module lang="ts">` (Svelte 5 module context) — **not** `<script context="module">`.
- For callback/event args, import `fn` from `storybook/test` (note: `storybook/test`, not `@storybook/test`): `args: { onclick: fn() }`.
- For composition, use a snippet template:
  ```svelte
  {#snippet template(args)}
    <StatusBadge {...args}>child content</StatusBadge>
  {/snippet}
  <Story name="WithChildren" args={{ status: 'open' }} {template} />
  ```

### CSF — `ComponentName.stories.ts`

```ts
import type { Meta, StoryObj } from '@storybook/svelte';
import StatusBadge from './StatusBadge.svelte';

const meta = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: { control: 'select', options: ['open', 'in-progress', 'complete'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    label: { control: 'text' },
  },
  args: { status: 'open', size: 'md' },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Complete: Story = { args: { status: 'complete' } };
```

Types come from `@storybook/svelte` (a dependency of `@storybook/sveltekit`, so it resolves without an extra install). `argTypes`, controls, and `tags: ['autodocs']` work exactly as on React.

### Organization & controls

Follow `docs/storybook-conventions.md`: titles use the `Design System/` · `Components/` · `Molecules/` · `Screens/` prefixes, and **every prop is wired to an `argTypes` control**. These conventions are framework-agnostic.

## SvelteKit Module Mocking

SvelteKit's virtual modules don't work in isolation. `@storybook/sveltekit` mocks them through `parameters.sveltekit_experimental` (set per story or globally in `preview.ts`). The `$lib` alias resolves automatically.

```ts
parameters: {
  sveltekit_experimental: {
    stores: {
      page: { url: new URL('http://localhost/'), params: {} },
      navigating: null,
      updated: false,
    },
    navigation: {
      goto: () => {},        // logs to Actions unless overridden
    },
    forms: { enhance: () => {} },
  },
}
```

| Module | Status |
|--------|--------|
| `$lib`, `$app/paths`, `$app/environment`, `$env/static/public` | auto-resolved / supported |
| `$app/navigation`, `$app/stores`, `$app/state`, `$app/forms` | mock via `sveltekit_experimental` (experimental) |
| `$env/*private*`, `$service-worker`, server `load`/`+page.server.ts` | **not** available in isolation — provide data via `args`/`page.data` |

Components that depend on server `load` data should accept that data as **props** so stories can pass it directly — this also makes them cleaner pixel-perfect atoms.

## Theme Integration

Configure `.storybook/preview.ts` to load the project's global styles so every story is themed:

```ts
import type { Preview } from '@storybook/sveltekit';
import '../src/app.css'; // Tailwind / global tokens

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};
export default preview;
```

- **Tailwind / shadcn-svelte / Skeleton**: import the global stylesheet (`app.css`) that defines the theme CSS variables. See `docs/adapters/{components}.md`.
- **Dark mode**: toggle a `data-theme="dark"` attribute (or the project's theme class) via a global decorator.
- Theme **values** come from the style/components adapters (and from `design/theme-seed.json` when a `design-deconstruct` run produced one — see `commands/scaffold.md` Step 4).

## Verify

### Component Level
- Story file exists alongside the `.svelte` component (`*.stories.svelte` or `*.stories.ts`)
- `npm run storybook` starts without errors (port 6006)
- Component renders in Storybook without console errors
- **All props have `argTypes` controls**
- Component responds to controls; autodocs (`tags: ['autodocs']`) generates a Docs page
- Story uses the correct hierarchy prefix

### Build Gate
- `npm run build-storybook` completes successfully (compiles every story headlessly — this is the CI-safe verification that all stories are valid)

### Screen Level
- Screen story renders with realistic mock data and responds to viewport resizing
- SvelteKit data is supplied via props/`sveltekit_experimental`, not real server loads

## Sandbox

### Dev Server
```bash
npm run storybook          # storybook dev -p 6006
```

### Build / Verify
```bash
npm run build-storybook    # storybook build → storybook-static/
```

### Notes
- Builder is **Vite** (the only builder for `@storybook/sveltekit`). No Webpack path.
- Svelte 5 runes are fully supported in both story formats.
- `@storybook/addon-svelte-csf` is community-maintained but bundled by `init`; its `defineMeta`/`<Story>` API is the current (v5+) form — older `<Meta>`/`<Template>` examples are deprecated.
