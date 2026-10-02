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
						"The changelog page at /changelog: a bar linking home and to Install, the page title, then every release in the repository's CHANGELOG.md (read at build time), newest first, and the footer. One route for both widths (1440 and 390). The dark state is the story under the Theme toolbar (the capture renders it in both themes)."
				}
			}
		},
		argTypes: {
			releases: { control: 'object', description: "Releases, newest first; defaults to CHANGELOG.md, parsed at build time" }
		}
	});
</script>

<Story name="Default" />
