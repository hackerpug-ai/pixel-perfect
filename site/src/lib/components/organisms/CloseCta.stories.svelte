<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import CloseCta from './CloseCta.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/CloseCta',
		component: CloseCta,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The closing call to action. On scroll the headline’s colour plates converge into registration (manifest motion close-register); at rest, and with reduced motion, it is registered.'
				}
			}
		},
		argTypes: {
			headline: { control: 'text' },
			action: { control: 'text' },
			actionHref: { control: 'text' },
			sourceHref: { control: 'text' },
			progress: { control: { type: 'range', min: 0, max: 1, step: 0.05 } }
		}
	});
</script>

<Story name="Default" />
<Story name="Scroll start" args={{ progress: 0 }} />
