<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StepsTimeline from './StepsTimeline.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/StepsTimeline',
		component: StepsTimeline,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The four Build it steps, each with its example output, on a rail. On scroll the rail fills and each step brightens as it is reached (build-rail); at rest, and with reduced motion, the rail is full.'
				}
			}
		},
		argTypes: {
			steps: { control: 'object' },
			progress: { control: { type: 'range', min: 0, max: 1, step: 0.05 }, description: 'Pins rail progress for stories' }
		}
	});
</script>

<Story name="Complete" />
<Story name="Scroll start" args={{ progress: 0 }} />
<Story name="Halfway" args={{ progress: 0.5 }} />
