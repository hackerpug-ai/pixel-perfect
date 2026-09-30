<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DesignMdPromo from './DesignMdPromo.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/DesignMdPromo',
		component: DesignMdPromo,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: { description: { component: 'The DESIGN.md row: subhead, lede and install CTA beside the generated document (example).' } }
		},
		argTypes: {
			lede: { control: 'text' },
			action: { control: 'text' },
			actionHref: { control: 'text' },
			tokens: { control: 'object' },
			components: { control: 'object' }
		}
	});
</script>

<Story name="Default" />
