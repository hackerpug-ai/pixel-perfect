<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import PlayButton from './PlayButton.svelte';

	const { Story } = defineMeta({
		title: 'Components/PlayButton',
		component: PlayButton,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The demo video play control: a 56px sheet circle with an ink border and triangle, centred on the hatched poster. A real button named "Play the demo"; hover turns it accent-text, and Tab shows the focus plate.'
				}
			}
		},
		argTypes: {
			label: { control: 'text', description: 'Accessible name (the button has no visible text)' },
			onplay: { action: 'play', description: 'Button pressed; the parent starts the video' }
		},
		args: {
			label: 'Play the demo',
			onplay: fn()
		}
	});
</script>

<Story name="Default" />
