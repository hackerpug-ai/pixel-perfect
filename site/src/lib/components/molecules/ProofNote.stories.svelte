<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';
	import ProofNote from './ProofNote.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/ProofNote',
		component: ProofNote,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: { description: { component: 'A numbered note explaining one proofreader mark. A list item: the host renders the <ol>.' } }
		},
		argTypes: {
			number: { control: { type: 'number', min: 1, max: 4 } },
			text: { control: 'text', description: 'Backticked runs render as code' }
		},
		args: { number: 1, text: 'Padding 20 instead of 16.' }
	});
</script>

{#snippet template(args: ComponentProps<typeof ProofNote>)}
	<ol class="m-0 list-none p-0"><ProofNote {...args} /></ol>
{/snippet}

<Story name="Default" {template} />
<Story name="Invented gray" args={{ number: 2, text: 'An invented gray, `#8A8F96`, not in the tokens.' }} {template} />
<Story name="Fifth button" args={{ number: 3, text: 'A fifth button style.' }} {template} />
<Story name="Radius" args={{ number: 4, text: 'Border radius 5 instead of 4.' }} {template} />
