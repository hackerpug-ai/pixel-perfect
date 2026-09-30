<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ScanBox from './ScanBox.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/ScanBox',
		component: ScanBox,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: { description: { component: 'The dashed third-party scan box in Install. Placeholder text until strategy T18 supplies scan results.' } }
		},
		argTypes: { label: { control: 'text' }, text: { control: 'text' } },
		args: { label: 'SECURITY SCAN', text: 'Third-party scan results — pending.' }
	});
</script>

<Story name="Default" />
