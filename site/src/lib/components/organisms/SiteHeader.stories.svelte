<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import SiteHeader from './SiteHeader.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/SiteHeader',
		component: SiteHeader,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen',
			docs: {
				description: {
					component:
						'The sticky header. Below 720px it becomes the designed phone header (lockup, mono Install link, dot-only toggle) with the section strip under it. Its theme scenarios follow the Theme toolbar (the toggle writes data-theme on <html>); the phone layout is captured by the 390px platform.'
				}
			}
		},
		argTypes: {
			links: { control: 'object', description: 'Header links (the phone strip shows them in caps)' },
			ontoggle: { action: 'theme toggled' }
		},
		args: { ontoggle: fn() }
	});
</script>

<Story name="Default" />
