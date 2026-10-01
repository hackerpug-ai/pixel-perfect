<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import CommandRow from './CommandRow.svelte';
	import { release } from '$lib/run';

	const { Story } = defineMeta({
		title: 'Molecules/CommandRow',
		component: CommandRow,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: { description: { component: 'One install command on a dark code panel, with the same copy feedback as CopyBlock.' } }
		},
		argTypes: {
			command: { control: 'text' },
			initialFeedback: { control: 'select', options: [null, 'copied', 'selected'] },
			oncopy: { action: 'copied' }
		},
		args: { command: '/plugin marketplace add hackerpug-ai/pixel-perfect', initialFeedback: null, oncopy: fn() }
	});
</script>

<Story name="Default" />
<Story name="Copied" args={{ initialFeedback: 'copied' }} />
<Story name="Selected" args={{ initialFeedback: 'selected' }} />
<Story
	name="Long command"
	args={{ command: `git clone --branch ${release.tag} https://github.com/hackerpug-ai/pixel-perfect .pixel-perfect` }}
/>
