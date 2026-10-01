<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import type { ComponentProps } from 'svelte';
	import ProofSlider from './ProofSlider.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/ProofSlider',
		component: ProofSlider,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'Drag (or use arrows, Page Up/Down, Home, End) to compare the design frame with the built component. The split lives in a native range input; its focus is drawn on the handle. The pair is real: the install card as designed beside the live component.'
				}
			}
		},
		argTypes: {
			initialSplit: { control: { type: 'range', min: 0, max: 100, step: 1 } },
			command: { control: 'text' },
			caption: { control: 'text' },
			onsplit: { action: 'split' }
		},
		args: { initialSplit: 50, onsplit: fn() }
	});
</script>

{#snippet frame(args: ComponentProps<typeof ProofSlider>)}
	<div class="max-w-155"><ProofSlider {...args} /></div>
{/snippet}

<Story name="Split 50" template={frame} />
<Story name="Split 0" args={{ initialSplit: 0 }} template={frame} />
<Story name="Split 100" args={{ initialSplit: 100 }} template={frame} />
