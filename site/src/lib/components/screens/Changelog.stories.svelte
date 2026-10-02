<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Changelog from './Changelog.svelte';

	const { Story } = defineMeta({
		title: 'Screens/Changelog',
		component: Changelog,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen',
			docs: {
				description: {
					component:
						'The changelog page at /changelog, added by evolve. One story. The dark state is this story under the Theme toolbar.'
				}
			}
		}
	});
</script>

<Story name="Default" />
