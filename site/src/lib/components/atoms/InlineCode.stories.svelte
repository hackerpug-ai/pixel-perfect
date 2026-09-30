<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import InlineCode from './InlineCode.svelte';

	const { Story } = defineMeta({
		title: 'Components/InlineCode',
		component: InlineCode,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'A mono run: inline in prose, a block command line, a wrapping copyable command, or the mono word inside a heading.'
				}
			}
		},
		argTypes: {
			text: { control: 'text', description: 'The code' },
			variant: {
				control: 'select',
				options: ['inline', 'block', 'command', 'heading'],
				description: 'inline: in prose · block: own line · command: wraps anywhere · heading: 19px mono'
			},
			size: {
				control: 'select',
				options: [undefined, 13, 13.5, 14],
				description: 'px; defaults to 14 for block and 13.5 otherwise (heading is always 19)'
			},
			tone: { control: 'select', options: ['inherit', 'ink', 'muted'], description: 'Colour: inherit the prose, or ink / muted' }
		},
		args: {
			text: '/pixel-perfect:init',
			variant: 'inline',
			tone: 'ink'
		}
	});
</script>

<Story name="Default">
	{#snippet template(args)}
		<p class="m-0 text-ui text-muted">Next: open a project that has your design and run <InlineCode {...args} />.</p>
	{/snippet}
</Story>
<Story name="In muted prose" args={{ text: 'evolve', size: 14, tone: 'inherit' }}>
	{#snippet template(args)}
		<p class="m-0 max-w-160 text-ui text-muted">
			Run <InlineCode {...args} /> with the new mock. Each element is sorted into reuse, variant, new, promote, or remove, you
			confirm once, and a re-capture shows exactly which components moved.
		</p>
	{/snippet}
</Story>
<Story name="Block" args={{ text: '/pixel-perfect:init my designs are in design/deck.html', variant: 'block' }} />
<Story name="Command" args={{ text: 'Install pixel-perfect: fetch and follow https://github.com/hackerpug-ai/pixel-perfect/INSTALL.md', variant: 'command' }}>
	{#snippet template(args)}
		<div class="max-w-80">
			<InlineCode {...args} />
		</div>
	{/snippet}
</Story>
<Story name="Heading" args={{ text: 'DESIGN.md', variant: 'heading', tone: 'inherit' }} />
