<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SliderHandle from './SliderHandle.svelte';

	const { Story } = defineMeta({
		title: 'Components/SliderHandle',
		component: SliderHandle,
		tags: ['autodocs'],
		render: template,
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The proof slider handle: a 28px sheet circle with a magenta rim and ◂▸, centred on the split and clamped so the whole circle stays inside the pane; it shows the range input’s keyboard focus.'
				}
			}
		},
		argTypes: {
			split: { control: { type: 'range', min: 0, max: 100, step: 1 }, description: 'Split position, 0-100 (% from the left)' },
			focused: { control: 'boolean', description: "The slider's range input has keyboard focus" }
		},
		args: {
			split: 50,
			focused: false
		}
	});
</script>

{#snippet template(args: import('svelte').ComponentProps<typeof SliderHandle>)}
	<div class="relative h-40 w-80 border border-line bg-sheet">
		<SliderHandle {...args} />
	</div>
{/snippet}

<Story name="Default" />
<Story name="Focused" args={{ focused: true }} />
<Story name="Start" args={{ split: 0 }} />
<Story name="End" args={{ split: 100 }} />
