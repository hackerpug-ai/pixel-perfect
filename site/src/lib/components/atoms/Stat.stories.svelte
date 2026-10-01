<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Stat from './Stat.svelte';
	import { stats } from '$lib/run';

	const { Story } = defineMeta({
		title: 'Components/Stat',
		component: Stat,
		render: template,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						"One figure from the Build it stats: a mono label over an Anybody value. The values are this site's own build (run.json)."
				}
			}
		},
		argTypes: {
			label: { control: 'text', description: 'What is counted' },
			value: { control: 'text', description: 'Measured value' }
		},
		args: {
			label: stats[0].label,
			value: stats[0].value
		}
	});
</script>

{#snippet template(args: { label: string; value: string })}
	<dl class="m-0">
		<Stat {...args} />
	</dl>
{/snippet}

<Story name="Default" />
