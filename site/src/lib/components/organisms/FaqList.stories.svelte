<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import FaqList from './FaqList.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/FaqList',
		component: FaqList,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: { description: { component: 'The questions, each a native details between rules; several can be open.' } }
		},
		argTypes: {
			items: { control: 'object' },
			open: { control: 'object', description: 'Indexes of items that start open' }
		}
	});
</script>

<Story name="All closed" />
<Story name="Some open" args={{ open: [1, 2] }} />
