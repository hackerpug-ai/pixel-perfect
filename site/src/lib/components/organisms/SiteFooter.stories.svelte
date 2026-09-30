<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SiteFooter from './SiteFooter.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/SiteFooter',
		component: SiteFooter,
		tags: ['autodocs'],
		parameters: { layout: 'padded', docs: { description: { component: 'The page footer: licence, changelog and upgrade links, and mark C.' } } },
		argTypes: { licence: { control: 'text' }, links: { control: 'object' } }
	});
</script>

<Story name="Default" />
