<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import CopyBlock from './CopyBlock.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/CopyBlock',
		component: CopyBlock,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'A copyable command: card (the paste-to-agent line with its helper) or row (a bare command). Copy shows "Copied ✓" for 2 seconds, or "Selected" when the browser blocks the clipboard, without moving anything, and announces it to screen readers.'
				}
			}
		},
		argTypes: {
			command: { control: 'text' },
			variant: { control: 'select', options: ['card', 'row'] },
			helper: { control: 'text' },
			initialFeedback: { control: 'select', options: [null, 'copied', 'selected'] },
			oncopy: { action: 'copied' }
		},
		args: {
			command: 'Install pixel-perfect: fetch and follow https://github.com/hackerpug-ai/pixel-perfect/INSTALL.md',
			variant: 'card',
			helper: 'Paste into any of the six agents.',
			initialFeedback: null,
			oncopy: fn()
		}
	});
</script>

<Story name="Card" />
<Story name="Card copied" args={{ initialFeedback: 'copied' }} />
<Story name="Card selected" args={{ initialFeedback: 'selected' }} />
<Story name="Row" args={{ variant: 'row', command: 'npx skills add hackerpug-ai/pixel-perfect' }} />
<Story name="Row copied" args={{ variant: 'row', command: 'npx skills add hackerpug-ai/pixel-perfect', initialFeedback: 'copied' }} />
