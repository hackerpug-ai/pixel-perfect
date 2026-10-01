<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import CodePanel from './CodePanel.svelte';
	import { excerpts } from '$lib/run';

	const { Story } = defineMeta({
		title: 'Molecules/CodePanel',
		component: CodePanel,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'An example-output panel beside each Build it step: dark in both themes, a file-name header, syntax-coloured lines. The stories show this site\'s own build: its manifest, the files the scaffold created, and its status.'
				}
			}
		},
		argTypes: { title: { control: 'text' }, label: { control: 'text' }, lines: { control: 'object' } },
		args: {
			title: 'design/manifest.json (excerpt)',
			label: "This site's build",
			lines: excerpts.manifest
		}
	});
</script>

<Story name="Yaml" />
<Story
	name="Terminal"
	args={{
		title: 'terminal',
		lines: [
			[['success', 'created'], ['plain', '  src/app.css']],
			[['success', 'created'], ['plain', '  .storybook/main.ts']],
			[['success', 'created'], ['plain', '  src/lib/design-system/Colors.stories.svelte']],
			[['success', 'created'], ['plain', '  src/lib/design-system/Typography.stories.svelte']],
			[['comment', 'sandbox'], ['plain', '  http://localhost:6006']]
		]
	}}
/>
<Story
	name="Status"
	args={{
		title: 'status',
		lines: excerpts.status
	}}
/>
