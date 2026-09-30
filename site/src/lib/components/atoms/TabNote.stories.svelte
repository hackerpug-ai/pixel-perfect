<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TabNote from './TabNote.svelte';

	const { Story } = defineMeta({
		title: 'Components/TabNote',
		component: TabNote,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The line under an install tab\'s commands. A note is a plain 15px line; a warning is a 14px line led by a mono accent-text "Note" label.'
				}
			}
		},
		argTypes: {
			variant: { control: 'select', options: ['note', 'warning'], description: 'Plain note or labelled warning' },
			text: { control: 'text', description: 'The note or warning copy' }
		},
		args: {
			variant: 'note',
			text: 'Then reload the window.'
		}
	});
</script>

<Story name="Default" />
<Story name="Warning" args={{ variant: 'warning', text: "Copy, don't symlink. Cursor fails on symlinked plugins." }} />
<Story
	name="Codex warning"
	args={{
		variant: 'warning',
		text: 'Two enabled sources create duplicate $pixel-perfect:* namespaces. Remove pixel-perfect@personal first.'
	}}
/>
<Story name="Grok note" args={{ text: "Then enable it in Grok's /plugins view." }} />
