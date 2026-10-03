<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import DemoStats from './DemoStats.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/DemoStats',
		component: DemoStats,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						"The terminal recording beside the build stats (this site's own build) and the wireframe line. It loops by itself once scrolled into view; with reduced motion it waits for Play, which is the state the catalog captures."
				}
			}
		},
		argTypes: {
			posterLabel: { control: 'text' },
			caption: { control: 'text' },
			stats: { control: 'object' },
			statsNote: { control: 'text' },
			onplay: { action: 'play' }
		},
		args: { onplay: fn() }
	});
</script>

<Story name="Default" />
