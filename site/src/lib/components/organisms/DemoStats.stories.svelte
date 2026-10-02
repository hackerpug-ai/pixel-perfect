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
						"The recorded demo beside the build stats (this site's own build) and the wireframe line. Play starts the recorded run."
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
