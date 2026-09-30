<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import ThemeToggle from './ThemeToggle.svelte';

	const { Story } = defineMeta({
		title: 'Components/ThemeToggle',
		component: ThemeToggle,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'Header theme switch that names the theme it switches to, with a dot in the current ink; at 720px and below it is the dot alone in a 40×40 square.'
				}
			}
		},
		argTypes: {
			theme: { control: 'select', options: ['light', 'dark'], description: 'The current theme; the button offers the other one' },
			iconOnly: { control: 'select', options: ['mobile', 'always', 'never'], description: 'When the word is visually hidden: at 720px and below, always, or never' },
			ontoggle: { action: 'toggle', description: 'Pressed; the page switches data-theme and saves it' }
		},
		args: {
			theme: 'light',
			iconOnly: 'mobile',
			ontoggle: fn()
		}
	});
</script>

<Story name="Default" />
<Story name="Dark theme" args={{ theme: 'dark' }} />
<Story name="Icon only" args={{ iconOnly: 'always' }} />
