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
						"The demo poster beside the build stats and the wireframe line. Poster and numbers are placeholders ('[n]') until the demo video and the dogfood run."
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
