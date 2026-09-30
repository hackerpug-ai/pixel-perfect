<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GrowCard from './GrowCard.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/GrowCard',
		component: GrowCard,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'A rule-topped command card from Grow it: the command, an optional muted qualifier, what it does, and the mono cascade line on refine.'
				}
			}
		},
		argTypes: {
			command: { control: 'text', description: 'The command name' },
			qualifier: { control: 'text', description: "Muted note after the command; empty for add-platform" },
			description: { control: 'text', description: 'What the command does' },
			cascade: { control: 'text', description: "Mono line under the description (refine's 'Cascades into')" }
		},
		args: {
			command: 'evolve',
			qualifier: 'with a new mock',
			description:
				'Sorts each element into reuse, variant, new, promote, or remove, with an orphan sweep for removals. Confirms once. Proves by re-capture.'
		}
	});
</script>

{#snippet column(args: { command: string; qualifier?: string; description: string; cascade?: string })}
	<div class="max-w-132">
		<GrowCard {...args} />
	</div>
{/snippet}

<Story name="Default" template={column} />
<Story
	name="Refine"
	args={{
		command: 'refine',
		qualifier: 'with a token change',
		description: 'Change a token. Every component that uses it updates, and the gates confirm nothing else moved.',
		cascade: 'Cascades into: Button, PlanCard, Header, [n] more'
	}}
	template={column}
/>
<Story
	name="Add platform"
	args={{
		command: 'add-platform',
		qualifier: undefined,
		description: 'The same system on a second platform, built from the same inventory.'
	}}
	template={column}
/>
