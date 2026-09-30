<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Stat from './Stat.svelte';

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
						"One figure from the Build it stats: a mono label over an Anybody value. Values stay '[n]' until the dogfood run is measured."
				}
			}
		},
		argTypes: {
			label: { control: 'text', description: 'What is counted' },
			value: { control: 'text', description: "Measured value; '[n]' until the dogfood run" }
		},
		args: {
			label: 'Tokens',
			value: '[n]'
		}
	});
</script>

{#snippet template(args: { label: string; value: string })}
	<dl class="m-0">
		<Stat {...args} />
	</dl>
{/snippet}

<Story name="Default" />
