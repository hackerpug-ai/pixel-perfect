<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import FaqItem from './FaqItem.svelte';

	type Args = { question: string; answer: string | (string | { code: string })[]; open?: boolean };

	const { Story } = defineMeta({
		title: 'Molecules/FaqItem',
		component: FaqItem,
		render: template,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'One FAQ row: a native details between rules. It owns its open state (the prop sets where it starts); open shows the answer at once and turns the + into an accent-text minus. Several can be open.'
				}
			}
		},
		argTypes: {
			question: { control: 'text', description: 'The summary line' },
			answer: { control: 'object', description: 'Answer text, or parts where { code } renders an InlineCode run' },
			open: { control: 'boolean', description: 'Initial state; the item owns it after that' }
		},
		args: {
			question: 'What happens when the design changes?',
			answer: [
				'Run ',
				{ code: 'evolve' },
				' with the new mock. Each element is sorted into reuse, variant, new, promote, or remove, you confirm once, and a re-capture shows exactly which components moved.'
			],
			open: false
		}
	});
</script>

<!-- The desktop FAQ column is 757px wide (frame 06); the list's top rule is the organism's, drawn here for context.
     Keyed on `open` so the control remounts the item: the prop is only its starting state. -->
{#snippet template(args: Args)}
	<div class="max-w-[757px] border-t border-line">
		{#key args.open}
			<FaqItem {...args} />
		{/key}
	</div>
{/snippet}

<Story name="Closed" />
<Story name="Open" args={{ open: true }} />
