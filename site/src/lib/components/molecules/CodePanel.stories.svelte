<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import CodePanel from './CodePanel.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/CodePanel',
		component: CodePanel,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'An example-output panel beside each Build it step: dark in both themes, a file-name header, syntax-coloured lines. The content shown is the design export\'s placeholder output until the real run replaces it.'
				}
			}
		},
		argTypes: { title: { control: 'text' }, label: { control: 'text' }, lines: { control: 'object' } },
		args: {
			title: '.pixel-perfect/manifest.yaml',
			label: 'Example output',
			lines: [
				[['key', 'source'], ['plain', ': '], ['value', 'design/deck.html']],
				[['key', 'frames'], ['plain', ': 12']],
				[['key', 'framework'], ['plain', ': '], ['value', 'sveltekit'], ['plain', '   '], ['comment', '# detected from package.json']],
				[['key', 'sandbox'], ['plain', ': '], ['value', 'storybook']],
				[['key', 'layers'], ['plain', ': [tokens, atoms, molecules, organisms, screens]']]
			]
		}
	});
</script>

<Story name="Yaml" />
<Story
	name="Terminal"
	args={{
		title: 'terminal',
		lines: [
			[['success', 'created'], ['plain', '  src/lib/ui/tokens.css']],
			[['success', 'created'], ['plain', '  .storybook/main.ts']],
			[['success', 'created'], ['plain', '  src/stories/tokens/Color.stories.svelte']],
			[['success', 'created'], ['plain', '  src/stories/tokens/Type.stories.svelte']],
			[['comment', 'sandbox'], ['plain', '  http://localhost:6006']]
		]
	}}
/>
<Story
	name="Status"
	args={{
		title: 'status',
		lines: [
			[['plain', 'tokens      built     '], ['success', 'gate passed'], ['plain', '   [n] frames']],
			[['plain', 'atoms       built     '], ['success', 'gate passed'], ['plain', '   [n] frames']],
			[['plain', 'molecules   built     '], ['success', 'gate passed'], ['plain', '   [n] frames']],
			[['plain', 'organisms   '], ['value', 'building']],
			[['plain', 'screens     '], ['comment', 'waiting']]
		]
	}}
/>
