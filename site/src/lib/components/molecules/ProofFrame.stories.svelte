<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ProofFrame from './ProofFrame.svelte';
	import { asset } from '$app/paths';
	import CopyBlock from './CopyBlock.svelte';
	import SliderHandle from '$lib/components/atoms/SliderHandle.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/ProofFrame',
		component: ProofFrame,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						"The proof slider's comparison pane without its control: hatched design frame, built component clipped in at split, plate labels and registration targets. ProofSlider adds the handle; the social card uses the static pane."
				}
			}
		},
		argTypes: {
			split: { control: { type: 'range', min: 0, max: 100, step: 1 } },
			designLabel: { control: 'text' },
			builtLabel: { control: 'text' }
		},
		args: { split: 50, designLabel: 'DESIGN FRAME', builtLabel: 'BUILT COMPONENT' }
	});

	type Args = { split?: number; designLabel?: string; builtLabel?: string };

	// The real pair from this build: the install card as designed (a 2x crop of the export) and the
	// live component, both at the card's 545px design width.
	const command = 'Install pixel-perfect: fetch and follow https://github.com/hackerpug-ai/pixel-perfect/INSTALL.md';
</script>

{#snippet design()}
	<img src={asset('/proof/install-card-desktop-light.png')} alt="The install card as drawn in the design" width="545" height="121" class="block dark:hidden" />
	<img src={asset('/proof/install-card-desktop-dark.png')} alt="The install card as drawn in the design" width="545" height="121" class="hidden dark:block" />
{/snippet}
{#snippet built()}<div inert class="w-[545px]"><CopyBlock {command} /></div>{/snippet}

{#snippet pane(args: Args)}
	<div class="max-w-155"><ProofFrame {...args} {design} {built} /></div>
{/snippet}
{#snippet withHandle(args: Args)}
	<div class="max-w-155">
		<ProofFrame {...args} {design} {built}>
			{#snippet handle()}
				<SliderHandle split={args.split} />
			{/snippet}
		</ProofFrame>
	</div>
{/snippet}

<Story name="Static" template={pane} />
<Story name="Built side" args={{ split: 0 }} template={pane} />
<Story name="Design side" args={{ split: 100 }} template={pane} />
<Story name="With handle" template={withHandle} />
