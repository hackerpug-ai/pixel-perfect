<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';
	import EvolveThread from './EvolveThread.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/EvolveThread',
		component: EvolveThread,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The recorded evolve thread: the command, the reply with its change summary, and the Changelog page it built. On scroll the page assembles (grow-assemble); at rest it is assembled. This thread is the recorded run.'
				}
			}
		},
		argTypes: {
			command: { control: 'text' },
			reply: { control: 'text', description: 'Code in backticks' },
			summary: { control: 'object' },
			versions: { control: 'object' },
			caption: { control: 'text' },
			progress: { control: { type: 'range', min: 0, max: 1, step: 0.05 }, description: 'Pins assembly progress for stories' }
		}
	});
</script>

<!-- Grow it gives the thread the wider (1.2fr) of two columns. -->
{#snippet column(args: ComponentProps<typeof EvolveThread>)}
	<div class="max-w-160"><EvolveThread {...args} /></div>
{/snippet}

<Story name="Assembled" template={column} />
<Story name="Scroll start" args={{ progress: 0 }} template={column} />
