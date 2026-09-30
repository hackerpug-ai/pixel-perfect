<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import VersionPill from './VersionPill.svelte';

	const { Story } = defineMeta({
		title: 'Components/VersionPill',
		component: VersionPill,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component: 'Release pill from the changelog mock: the newest release filled with the accent, older ones outlined.'
				}
			}
		},
		argTypes: {
			label: { control: 'text', description: 'Version' },
			variant: { control: 'select', options: ['filled', 'outline'], description: 'filled: newest release · outline: older' }
		},
		args: {
			label: 'v9.1',
			variant: 'filled'
		}
	});
</script>

<Story name="Default" />
<Story name="Outline" args={{ label: 'v9.0', variant: 'outline' }} />
