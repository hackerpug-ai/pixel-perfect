<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StatGrid from './StatGrid.svelte';

	type Args = { stats: { label: string; value: string }[]; note?: string };

	const { Story } = defineMeta({
		title: 'Molecules/StatGrid',
		component: StatGrid,
		render: template,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						"The Build it stats: five Stats in auto-fit columns under a rule (4 + 1 at 1440, 3 + 2 at 390) and the mono note on where they come from. Values stay '[n]' until the dogfood run is measured."
				}
			}
		},
		argTypes: {
			stats: { control: 'object', description: "The figures, { label, value }; values stay '[n]' until measured" },
			note: { control: 'text', description: 'Mono footnote under the grid; empty hides it' }
		},
		args: {
			stats: [
				{ label: 'Tokens', value: '[n]' },
				{ label: 'Minutes', value: '[n]' },
				{ label: 'Frames', value: '[n]' },
				{ label: 'Gates', value: '[n]' },
				{ label: 'Components', value: '[n]' }
			],
			note: 'Measured at launch from the dogfood build.'
		}
	});
</script>

<!-- The desktop Build it column is 504px wide (frame 03), which auto-fits four columns. -->
{#snippet template(args: Args)}
	<div class="max-w-126">
		<StatGrid {...args} />
	</div>
{/snippet}

<!-- The 390 layout (358px content width) at any viewport: three columns, then two. -->
{#snippet narrow(args: Args)}
	<div class="max-w-[358px]">
		<StatGrid {...args} />
	</div>
{/snippet}

<Story name="Default" />
<Story name="Narrow" template={narrow} />
