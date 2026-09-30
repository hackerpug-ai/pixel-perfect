<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LayerStack from './LayerStack.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/LayerStack',
		component: LayerStack,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'Fig. 1: one mockup separated into five plates. On load the stack tilts from flat; on scroll the plates spread and the labels open. At rest, and with reduced motion, it is half separated. Hidden below 720px.'
				}
			}
		},
		argTypes: {
			caption: { control: 'text' },
			progress: { control: { type: 'range', min: 0, max: 1, step: 0.05 }, description: 'Pins separation for stories' }
		}
	});
</script>

<Story name="Resting" />
<Story name="Scroll start" args={{ progress: 0 }} />
<Story name="Separated" args={{ progress: 1 }} />
