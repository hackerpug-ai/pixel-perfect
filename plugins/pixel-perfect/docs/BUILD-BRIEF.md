# Component Build Brief

## Why

A component build fails at the hand-off. The orchestrating model paraphrases the designer prompt, drops frame paths, and forgets the rules after context compaction. So the orchestrator never writes a component's assignment, and it never writes a component file itself. `scripts/brief.mjs build` assembles the assignment from files on disk: the packaged designer prompt, the design contract, and the task below, filled from the manifest, the inventory, the frames index, and the rules for the layer being built. The script prints one line that names the file, and the orchestrator passes that line to the child, nothing more.

The task holds only what is specific to one item. A section that does not apply is removed. The script exits 2 if any placeholder is left unfilled.

The rules are split by layer. Every brief gets "Rules for every layer" once. It also gets the rules for its own layer and none of the other three layers' rules. An item that wraps an approved ecosystem library also gets "Rules for a library wrapper". The script finds each rule section by its exact heading, so keep the headings as written. Code fences inside the rule sections are examples; the script copies them as they are.

## The task

```text
You are the designer for one component: <<ITEM_ID>> on platform <<PLATFORM>>.

Pixel Perfect started you with this brief, and it is your whole assignment. The agent prompt above holds your standing rules. The design contract above sets the bar.

## Item

These are the inventory entry's facts. Every state and variant it lists needs a story.

<<ITEM>>

## Frames

These are the pixels to match. Read every image listed.

<<FRAMES>>

## Stack

What you build on. Read every adapter doc listed, before you write.

<<STACK>>

## Files

<<FILES>>

<<COMPOSES>>

<<STATE>>

<<LIBRARY>>

<<RULES>>

## Render

<<RENDER>>

## Gates

<<GATES>>

<<PRIOR_FINDINGS>>

## Steps

1. Read every frame image under Frames. If Frames says no frame shows this item, read the design contract and the theme tokens instead.
2. Scan for reuse before you write a line: the components this brief lists to build on (if it lists any), the library primitive named under Stack, the theme tokens, and the helpers beside your file. Record what you found in notes.
3. Write the component in its file, and its story in its story file. Use realistic fixed data, and show every state and variant the Item lists. Build on the library's primitive. Never re-implement a primitive the library provides.
4. Run every command under Gates. Fix each failure in your own files, then run it again. If a hard-fail gate still fails after your fixes, return status blocked with reason gate-failed, and put the gate's output in notes.
5. Run the command under Render. If Render says no render command is configured, return status blocked with reason no-render-command, and stop.
6. Look at each render the command wrote, and look at its frame beside it. Compare in this order: overall size and proportions; typeface, weight, and size; colour and contrast; borders, radii, and shadows; spacing and alignment; the words; anything missing or extra; anything cut off or wider than the viewport.
7. Fix every difference, and go back to step 4. Make at most three rounds of fix and render. After the third round, list each difference that remains.
8. Return ONE JSON object, and nothing after it:

    {"status": "complete" | "blocked", "item": "<<ITEM_ID>>", "files_written": [], "renders": [{"state": "", "path": ""}], "compared": [{"frame": "", "render": "", "differences_fixed": [], "differences_remaining": []}], "needs": [], "flags": [], "notes": ""}

If status is blocked, add a "reason" string that names what is missing. Report every difference that remains. Never report a match you did not see.
```

## Rules for every layer

### Styling contract

Read the styling contract named under Stack before you write. Treat it as a **hard constraint**, not a suggestion. This is precisely what prevents the drift where a build silently bypasses the declared style system, for example by porting a design source's `<style>` block as a parallel set of global `.atom-*` or `.mol-*` classes.

If the Stack says a styling contract is in force but its file is missing, return `status: blocked` with `reason: contract-missing`. Do not build against an unknown styling basis.

From the contract, you MUST:
- **Emit styles via `<emitMethod>`** — e.g. Tailwind utility classes on `className`; colocated `StyleSheet.create`; `import styles from './X.module.css'`. No other mechanism for static styles.
- **Place styles per `<filePlacement.rule>`** — e.g. colocated; never a top-level `styles/` of global CSS.
- **Bind tokens via `<tokenBinding.mechanism>`** — e.g. CSS custom properties → Tailwind theme; theme object → `StyleSheet.create`. The theme flows through the chosen system, not a side channel.

You MUST NOT:
- Use any **forbidden pattern** in the contract's `checks` block (e.g. global custom-class CSS, inline `style={{}}` for static values, hardcoded color literals). These are blocking: the styling gate fails the item on any.
- **Port a design source's `<style>` block verbatim into the project.** A reference frame's source CSS is a *pixel reference only*; translate every style into the contract's emit method. (The gate would block the verbatim port anyway.)

The styling contract governs the **styling mechanism**. What the component is *built on* is governed by the component contract below. Both apply, and neither can catch the other's failure.

### Component contract

If the Stack says no component contract is in force, skip this section. No contract, no constraint, no output. Building every primitive by hand is the correct behavior for a project with no component library.

Otherwise, read the component contract named under Stack and treat it as a **hard constraint**, not a suggestion. This is what prevents the drift where a build declares a component library, has it installed, and then hand-rolls every primitive anyway. That drift passes every styling contract, because styled-but-hand-rolled markup is still correctly styled.

If the Stack says a component contract is in force but its file is missing, return `status: blocked` with `reason: contract-missing`. Do not build against an unknown composition basis.

From the contract, you MUST:
- **Compose the library's primitive** for anything in its inventory. A `vendored` library was copied into the repo by the CLI at scaffold time — those files are the project's primitive layer, already wired to the theme, to variants, and to accessibility. A `package` library is imported from `importRoot`. Either way the library's component is the basis; your item configures it.
- **Check what scaffold installed.** The Stack lists the primitives scaffold pulled. If the primitive you need is not in that list, return it under `needs` and return `status: blocked`. The orchestrator pulls it with the library's CLI. Do not hand-roll a replacement.

You MUST NOT:
- **Re-implement a primitive the library already provides.** Importing `Pressable` and `Text` from `react-native` to build a button, when `components/ui/button.tsx` is sitting in the tree, is the exact defect this contract exists to stop. These are blocking: the component gate fails the item on any.
- **Translate a mockup's DOM structure straight into framework primitives.** A design reference tells you what the component must *look like*; it does not tell you what to build it *on*. Read the target for its visual contract, then express that contract by configuring the library's component — the two are not in tension, and a faithful rebuild on the library's primitive is the deliverable.

The contract's `Free primitives` section is as binding as its ban list: layout and platform primitives (`View`, `ScrollView`, `<div>`, `<span>`) are always yours to use directly. A genuine exception to the ban list is recorded in `tools.component_contract_overrides` as `{ComponentName: "reason"}` — a decision on the record, not an invisible default. The Stack names any override in force.

### Write the component

- Write real component code (`.tsx`, `.vue`, `.svelte`, etc.) in the framework the Stack names.
- Emit styles exactly per the styling contract (above): emit method, file placement, token binding, and no forbidden patterns.
- Compose the component library exactly per the component contract (above): the library's primitive is the basis, and this item configures it rather than re-deriving it. Skip this when no component contract is in force.
- Use theme tokens. Never hardcode a colour, size, space, or radius. The style adapter named under Stack says where the theme file lives.
- Follow the composition patterns in the components adapter named under Stack.

### Story files

Every item gets a story file beside its component. The sandbox adapter named under Stack defines the format. For the `custom` sandbox, add one registry entry in the target language, as `docs/sandbox-spec.md` says. For Storybook, write CSF3.

- Show every state the Item lists, in a story of its own.
- Use realistic mock data.
- The story title uses the prefix for this item's layer, given in that layer's rules below.
- Include `parameters.docs.description` for auto-generated docs.
- **ALL props MUST be exposed to the sandbox's controls** (Storybook `argTypes`; or rendered as labeled variants in a `custom` sandbox).
- Controls use the appropriate type for each prop:
  - `select` for enums / union types
  - `boolean` for flags
  - `text` for strings
  - `number` for numeric values
  - `color` for color values

**Framework story format.** The story file's language, extension, and imports follow the framework adapter named under Stack. The React example is under "Rules for atoms". For **SvelteKit**, write `StatusBadge.stories.svelte` using native Svelte CSF (`defineMeta` + `<Story>` from `@storybook/addon-svelte-csf`), or `StatusBadge.stories.ts` importing `Meta`/`StoryObj` from `@storybook/svelte`. The `argTypes`/`args`/controls conventions are identical across frameworks. See the framework adapter and `docs/storybook-conventions.md`.

**React Native polyfill decorator.** For React Native projects rendering in web Storybook, add a polyfill decorator to the story preview, or to individual stories, where RN primitives need web shimming:

```tsx
// .storybook/preview.tsx — global decorator for RN-in-web
import { View, Text } from 'react-native-web';

const withRNWeb: Decorator = (Story) => (
  <View style={{ padding: 16 }}>
    <Story />
  </View>
);

export const decorators = [withRNWeb];
```

### Gates

Run each gate command under Gates after your files are written. Under `hard-fail`, any non-zero exit blocks the item: fix your own files and run the command again. Under `warn`, list the violations in notes and carry on. Under `off`, the gate is not run.

If a gate command cannot run on this platform, for example a non-Node target, or its script path cannot be resolved, run the contract's `checks` block detections yourself with grep or glob against the project root. Apply the same pass and fail rule. The decision is deterministic either way.

The styling gate and the component gate are independent, and both must pass. A styling pass says nothing about composition: hand-rolled markup with correct utility classes passes every styling contract.

## Rules for atoms

- **Story title MUST use `Components/` prefix** (e.g., `title: 'Components/StatusBadge'`).
- **Library primitive.** If the Item sets `library_primitive`, configure that primitive from the component library. Do not create a new one.
- **Craft.** Take typography, colour hierarchy, and motion from the craft guidance in your agent prompt. Do not invent a second design system.
- **Argument types.** Every prop gets a control. The example shows the control types for a badge:

```tsx
// StatusBadge.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  parameters: {
    docs: {
      description: {
        component: 'Colored badge indicating job status. Supports open, in-progress, and complete states with semantic color mapping.',
      },
    },
  },
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['open', 'in-progress', 'complete'],
      description: 'Current status of the job',
    },
    label: {
      control: { type: 'text' },
      description: 'Override the default label text',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Badge size variant',
    },
    pulsing: {
      control: { type: 'boolean' },
      description: 'Whether the badge pulses to draw attention',
    },
  },
  args: {
    status: 'open',
    size: 'md',
    pulsing: false,
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Default: Story = {};

export const InProgress: Story = {
  args: { status: 'in-progress', pulsing: true },
};

export const Complete: Story = {
  args: { status: 'complete' },
};
```

**Aesthetic check.** Before you return, confirm:
- The component uses the project font pairing.
- Colour usage follows the vibe's hierarchy, not arbitrary choices.
- Interactive components have intentional motion, not default browser transitions.
- Spacing uses the theme scale.

**What a correct atom is.** Check each point before you return:
- The component file and its story file exist at the paths under Files.
- Compilation succeeds: no type errors and no import errors. Use the project's own compile or type-check command.
- The component renders in the sandbox, in isolation, under its layer (see Render).
- All props are exposed to the sandbox's controls or variants.
- Every gate under Gates passes.
- If Frames names frames for this item, the rendered component matches their structure, tokens, and states.

## Rules for molecules

- **Story title MUST use `Molecules/` prefix** (e.g., `title: 'Molecules/JobRow'`).
- Compose 2–3 atoms. Do **not** re-implement atom internals.
- Accept props that delegate to the constituent atoms.
- Use the same style system and theme tokens as the atoms.
- File location: `src/molecules/MoleculeName.tsx` (or the framework equivalent). The Files section names the exact path.
- Show the molecule in realistic context with all variant combinations.
- Wire every molecule-level prop to an `argTypes` control.
- **For stateful molecules:** include a named story export for EVERY declared state scenario (see Declared state). Each scenario exercises one specific internal state configuration.
- **State.** Read the state patterns doc named under Declared state, and apply the pattern for this framework (useState, $state, @State, Entity, Model+Update, etc.). Atoms are never stateful; a state need at the atom level belongs in the molecule.

**State scenario example** (a stateful molecule with four scenarios):

```tsx
// SearchBar.stories.tsx — stateful molecule with 4 scenarios
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/test';
import { SearchBar } from './SearchBar';

const meta: Meta<typeof SearchBar> = {
  title: 'Molecules/SearchBar',
  component: SearchBar,
  parameters: {
    docs: {
      description: {
        component: 'Search input with debounced query and suggestion dropdown.',
      },
    },
  },
  argTypes: {
    placeholder: { control: { type: 'text' } },
    onSearch: { action: 'searched' },
  },
  args: {
    placeholder: 'Search jobs...',
  },
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Empty: Story = {};

export const Typing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');
    await userEvent.type(input, 'hva');
  },
};

export const ResultsVisible: Story = {
  args: {
    initialQuery: 'hvac',
    suggestions: mockSuggestions,
  },
};

export const NoResults: Story = {
  args: {
    initialQuery: 'xyz',
    suggestions: [],
  },
};

export const Error: Story = {
  args: {
    initialQuery: 'hvac',
    error: 'Search failed. Try again.',
  },
};
```

For non-React frameworks, follow the state patterns doc for the equivalent pattern:
- **Svelte**: pass initial values via props; use component args to set up `$state()`.
- **Bubbletea**: initialize model instances to target state values.
- **GPUI**: create Entity instances with specific initial values.
- **Textual**: set `reactive` initial values in story setup.
- **Ink**: same as React (Ink uses React hooks).

**Stateless molecule example:**

```tsx
// JobRow.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { JobRow } from './JobRow';

const meta: Meta<typeof JobRow> = {
  title: 'Molecules/JobRow',
  component: JobRow,
  parameters: {
    docs: {
      description: {
        component: 'Job summary row combining status badge and date chip. Used on feed and list screens.',
      },
    },
  },
  argTypes: {
    status: { control: { type: 'select' }, options: ['open', 'in-progress', 'complete'] },
    date: { control: { type: 'text' } },
    jobTitle: { control: { type: 'text' } },
  },
  args: {
    status: 'open',
    date: 'Today, 9:00 AM',
    jobTitle: 'Annual HVAC Service',
  },
};

export default meta;
type Story = StoryObj<typeof JobRow>;

export const Default: Story = {};
export const InProgress: Story = { args: { status: 'in-progress' } };
export const Complete: Story = { args: { status: 'complete' } };
```

**What a correct molecule is.** Check each point before you return:
- The molecule renders without errors.
- Its constituent atoms are composed, not re-implemented.
- It is registered in the sandbox under the `Molecules/` layer.
- Every prop is wired to an argTypes control.
- Every declared state scenario has its named story export.
- Every gate under Gates passes.

## Rules for organisms

- **Story title MUST use `Organisms/` prefix** (e.g., `title: 'Organisms/DataTable'`).
- Compose molecules and atoms. Do **not** re-implement their internals.
- Manage the declared internal state with the framework-appropriate pattern from the state patterns doc named under Declared state.
- Accept props for configuration and callback events (onSortChange, onRowSelect, etc.).
- Use theme tokens. Compose the component library per the component contract rather than re-deriving its primitives.
- File location: `src/organisms/OrganismName.tsx` (or the framework equivalent). The Files section names the exact path.
- Include a named story export for EVERY declared state scenario (see Declared state).
- Wire every organism-level prop to an `argTypes` control.
- Show realistic data, not minimal stubs.
- Follow the same state scenario story pattern as molecules (see "Rules for molecules").

**What a correct organism is.** Check each point before you return:
- The organism renders without errors.
- Its constituent molecules and atoms are composed, not re-implemented.
- Every gate under Gates passes.
- It is registered in the sandbox under the `Organisms/` layer.
- Every declared state scenario has a named story export.
- Every prop is wired to an argTypes control.

## Rules for screens

- **Story title MUST use `Screens/` prefix** (e.g., `title: 'Screens/TodayFeed'`).
- Compose atoms into a complete layout. Compose the molecules and organisms the Composes section lists, and do not re-implement them.
- Use theme spacing and layout tokens.
- Follow platform conventions: `ScrollView` for mobile, flex layouts for web, and so on.
- Apply the craft guidance in your agent prompt for intentional visual hierarchy, considered negative space, and eye-flow. Do not invent a second design system.
- **Target (fidelity precedence).** The Frames section names the reference frames for this screen's states. They govern the pixels. If Frames says no frame shows this screen, the screen's wireframe is the structural target: `design/wireframes/` in the project, if a file for this screen exists there. Match its layout, information architecture, and regions. If both exist, the frames govern pixels and the wireframe still informs structure.
- **More than one state.** If the Item or the States section lists more than one state, own the internal state that switches between them, using the framework's state pattern from the state patterns doc. The screen must be **drivable into any listed state**, so each renders as its own story. Wire whatever override or controlled mechanism the framework and adapter favor. The prop shape, naming, and precedence are your implementation choice. In the real app the screen uses its own internal state; the sandbox stories drive it into each named state.
- Write one named story per entry in the screen's states list, each driving the screen into that state. A single-state screen has just a Default story.
- Use realistic mock data.
- **Set the viewport to match the target platform** in story parameters. For **web-desktop** projects, use standard desktop viewports. For **mobile** projects (mobile-ios, mobile-android, web-mobile), set a mobile breakpoint so screens render at realistic dimensions.

The example drives the screen into each state through story args. The exact mechanism is the adapter's choice.

```tsx
// TodayFeed.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { TodayFeed } from './TodayFeed';

const meta: Meta<typeof TodayFeed> = {
  title: 'Screens/TodayFeed',
  component: TodayFeed,
  parameters: {
    docs: {
      description: {
        component: 'Main dashboard showing today\'s scheduled jobs with status overview and quick actions.',
      },
    },
    // Match target platform viewport
    viewport: {
      defaultViewport: 'mobile1',  // for mobile projects
    },
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof TodayFeed>;

export const Default: Story = {
  args: {
    jobs: mockJobs,
  },
};

export const Empty: Story = {
  args: {
    jobs: [],
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};
```

**Aesthetic check.** Before you return, confirm:
- The layout has intentional hierarchy, not uniform spacing.
- Visual flow guides attention to the primary content.
- Negative space is deliberate, not leftover.
- Component arrangement creates rhythm.

**What a correct screen is.** Check each point before you return:
- The screen renders without errors.
- Every listed atom is used correctly.
- The layout responds to viewport changes, where that applies.
- No hardcoded spacing or colours. Everything comes from the theme.
- Every gate under Gates passes.
- The layout matches its target: structure, spacing rhythm, and responsive behavior. Pixels too, when the target is a rendered frame.
- Every listed state has its own story.

## Rules for a library wrapper

This item wraps an approved ecosystem library. The package is already installed. Build a wrapper component that wraps the library's API and applies:
- The project's theme tokens (colors, spacing, typography).
- The adapter conventions. Follow the same patterns as hand-built components.
- Any domain-specific props or defaults the spec requires.

The wrapper is the item. It has the same story file, controls, and manifest entry as any other item. The library is an implementation detail, not a leaky abstraction.
