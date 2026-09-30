<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StepCard from './StepCard.svelte';

	const steps = {
		init: {
			step: 1,
			title: 'READ THE DESIGN',
			command: '/pixel-perfect:init my designs are in design/deck.html',
			description: 'Finds the frames, detects your framework, writes the manifest.',
			threshold: -0.1
		},
		scaffold: {
			step: 2,
			title: 'SCAFFOLD THE SANDBOX',
			command: '/pixel-perfect:scaffold',
			description: 'A component browser in your framework, with the token stories already in it.',
			threshold: 0.2
		},
		build: {
			step: 3,
			title: 'BUILD THE LAYERS',
			command: '/pixel-perfect:build',
			description:
				'Writes the inventory first. Every item names the frames that justify it and the parts it composes. Then it builds, bottom layer first.',
			threshold: 0.45
		},
		status: {
			step: 4,
			title: 'CHECK THE PROOF',
			command: '/pixel-perfect:status',
			description:
				'A gate is a check of one layer against its frames. It runs once per layer, so the next layer starts from parts that already match.',
			threshold: 0.7
		}
	};

	const { Story } = defineMeta({
		title: 'Molecules/StepCard',
		component: StepCard,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'One step of the Build it timeline: STEP label, command and description. It reads the timeline\'s scroll progress and brightens from 50% as the rail passes its threshold; at rest it is fully opaque.'
				}
			}
		},
		argTypes: {
			step: { control: 'number', description: 'Step number, 1 to 4' },
			title: { control: 'text', description: 'Step name, as displayed (caps)' },
			command: { control: 'text', description: 'The command the step runs' },
			description: { control: 'text', description: 'What the command does' },
			threshold: {
				control: { type: 'number', step: 0.05 },
				description: 'Rail progress where the step brightens: -0.10, 0.20, 0.45, 0.70 for steps 1 to 4'
			},
			progress: {
				control: { type: 'range', min: 0, max: 1, step: 0.01 },
				description: 'Pins scroll progress; unset rests at 1 (end state)'
			}
		},
		args: steps.init
	});
</script>

{#snippet column(args: { step: number; title: string; command: string; description: string; threshold: number; progress?: number })}
	<div class="max-w-123">
		<StepCard {...args} />
	</div>
{/snippet}

<Story name="Default" template={column} />
<Story name="Step 2 scaffold" args={steps.scaffold} template={column} />
<Story name="Step 3 build" args={steps.build} template={column} />
<Story name="Step 4 status" args={steps.status} template={column} />
<Story name="Rail not reached" args={{ ...steps.status, progress: 0 }} template={column} />
