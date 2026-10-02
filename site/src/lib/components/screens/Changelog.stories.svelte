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
						"The release notes at /changelog, read from the repository's CHANGELOG.md at build time: SiteHeader, the title, then one ruled section per release led by its version pill (newest filled, older outlined) and date, then a plate-labelled list per group, then SiteFooter. One route for both widths (1440 and 390). The dark state is the story under the Theme toolbar (the capture renders it in both themes)."
				}
			}
		},
		argTypes: {
			releases: { control: 'object', description: "Releases, newest first; defaults to CHANGELOG.md, parsed at build time" }
		}
	});
</script>

<Story name="Default" />
