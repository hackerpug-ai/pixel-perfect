<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ThreadRow from './ThreadRow.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/ThreadRow',
		component: ThreadRow,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'One line of the evolve thread: a YOU or AGENT label, then the command or the reply. Backticked runs in a reply render as inline code; the thread passes the rest of the reply as children.'
				}
			}
		},
		argTypes: {
			speaker: { control: 'select', options: ['you', 'agent'], description: 'you: a command · agent: a prose reply' },
			text: { control: 'text', description: 'The command, or the reply with `code` in backticks' }
		},
		args: {
			speaker: 'you',
			text: '/pixel-perfect:evolve "add a changelog page"'
		}
	});
</script>

{#snippet sheet(args: { speaker: 'you' | 'agent'; text: string })}
	<div class="max-w-158 rounded-md border border-line bg-sheet p-5">
		<ThreadRow {...args} />
	</div>
{/snippet}

<Story name="Default" template={sheet} />
<Story name="Agent" args={{ speaker: 'agent', text: 'Built `screens/Changelog` from existing parts.' }} template={sheet} />
