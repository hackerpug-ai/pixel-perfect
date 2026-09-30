<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import CopyNextStep from './CopyNextStep.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/CopyNextStep',
		component: CopyNextStep,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: { description: { component: 'The next step under the Install tabs, always shown (decided at B-inv).' } }
		},
		argTypes: { text: { control: 'text' }, command: { control: 'text' } },
		args: { text: 'Next: open a project that has your design and run', command: '/pixel-perfect:init' }
	});
</script>

<Story name="Default" />
