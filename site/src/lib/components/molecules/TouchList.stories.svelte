<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TouchList from './TouchList.svelte';

	type Args = { label: string; items: (string | { code: string; text?: string })[] };

	const { Story } = defineMeta({
		title: 'Molecules/TouchList',
		component: TouchList,
		render: template,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						"One 'What it touches' column in Install: a mono plate label over a bulleted list of what the skill reads, writes or runs. An item can lead with a mono path."
				}
			}
		},
		argTypes: {
			label: { control: 'text', description: 'Plate label as displayed: READS, WRITES or RUNS' },
			items: { control: 'object', description: 'List items; { code, text } leads with a mono InlineCode path' }
		},
		args: {
			label: 'READS',
			items: ['Your design files or URL', 'package.json and the framework config', 'DESIGN.md, if one exists']
		}
	});
</script>

<!-- The desktop columns are 232px wide (frame 05: four auto-fit columns in 1000px, 24px gaps). -->
{#snippet template(args: Args)}
	<div class="max-w-58">
		<TouchList {...args} />
	</div>
{/snippet}

<Story name="Reads" />
<!-- The export's path, which the placeholder register says to correct when the organism is wired. -->
<Story
	name="Writes"
	args={{
		label: 'WRITES',
		items: ['Components in your source tree', 'Sandbox stories', { code: '.pixel-perfect/', text: 'and DESIGN.md' }]
	}}
/>
<Story
	name="Runs"
	args={{ label: 'RUNS', items: ['Your package manager', 'A headless browser, for capture', 'Your existing lint and test scripts'] }}
/>
