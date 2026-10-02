<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ReleaseEntry from './ReleaseEntry.svelte';
	import { releases } from '$lib/changelog';

	type Args = { version: string; date: string; groups: { heading: string; items: string[] }[]; latest?: boolean };

	function release(version: string) {
		const found = releases.find((r) => r.version === version);
		if (!found) throw new Error(`CHANGELOG.md has no release ${version}`);
		return found;
	}

	const { Story } = defineMeta({
		title: 'Molecules/ReleaseEntry',
		component: ReleaseEntry,
		render: template,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'One release on the Changelog page: the version pill and date in the margin (stacked above the changes below 720px), then each group of changes as a plate label over a bulleted list. The newest release has a filled pill, older ones an outline. Backticked runs render as InlineCode, **bold** as strong.'
				}
			}
		},
		argTypes: {
			version: { control: 'text', description: 'Version as written in CHANGELOG.md, without the v' },
			date: { control: 'text', description: 'Release date, YYYY-MM-DD' },
			groups: { control: 'object', description: 'Groups in file order: { heading, items }; items keep `code`, **bold** and *em*' },
			latest: { control: 'boolean', description: 'Newest release: filled pill · otherwise outline' }
		},
		// Two real past releases from CHANGELOG.md, picked by version: a published release does not
		// change, so the goldens hold still between releases. 9.1.0 is short; 9.0.0 has three groups
		// and bold runs. A missing version throws rather than render an empty story.
		args: { ...release('9.1.0'), latest: true }
	});
</script>

<!-- The page's content frame is 1200px (max-w-page); the entry is shown at that width. pt-8 matches
     the margin slug's sticky offset (top-8), so the canvas shows the entry at rest, not stuck. -->
{#snippet template(args: Args)}
	<div class="max-w-page pt-8">
		<ReleaseEntry {...args} />
	</div>
{/snippet}

<Story name="Default" />
<Story name="Older" args={{ ...release('9.0.0'), latest: false }} />
