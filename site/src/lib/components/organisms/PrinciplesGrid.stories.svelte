<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PrinciplesGrid from './PrinciplesGrid.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/PrinciplesGrid',
		component: PrinciplesGrid,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: { description: { component: 'The statement line and the four principles: four columns at 1440, one at 390.' } }
		},
		argTypes: { statement: { control: 'text' }, principles: { control: 'object' } }
	});
</script>

<Story name="Default" />
