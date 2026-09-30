<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ProofFrame from './ProofFrame.svelte';
	import PlanCard from './PlanCard.svelte';
	import SliderHandle from '$lib/components/atoms/SliderHandle.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/ProofFrame',
		component: ProofFrame,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						"The proof slider's comparison pane without its control: hatched design frame, built component clipped in at split, plate labels and registration targets. ProofSlider adds the handle; the social card uses the static pane."
				}
			}
		},
		argTypes: {
			split: { control: { type: 'range', min: 0, max: 100, step: 1 } },
			designLabel: { control: 'text' },
			builtLabel: { control: 'text' }
		},
		args: { split: 50, designLabel: 'DESIGN FRAME', builtLabel: 'BUILT COMPONENT' }
	});

	type Args = { split?: number; designLabel?: string; builtLabel?: string };

	const card = {
		label: 'TEAM PLAN',
		price: '$24',
		period: '/ month',
		features: 'Unlimited projects · 5 seats · Priority support',
		action: 'Choose plan'
	};
</script>

{#snippet design()}<div class="w-[calc(min(300px,70%)_+_34px)]"><PlanCard {...card} variant="frame-side" /></div>{/snippet}
{#snippet built()}<div class="w-[calc(min(300px,70%)_+_34px)]"><PlanCard {...card} /></div>{/snippet}

{#snippet pane(args: Args)}
	<div class="max-w-155"><ProofFrame {...args} {design} {built} /></div>
{/snippet}
{#snippet withHandle(args: Args)}
	<div class="max-w-155">
		<ProofFrame {...args} {design} {built}>
			{#snippet handle()}
				<div aria-hidden="true" class="absolute inset-y-0 left-(--split) w-0.5 -translate-x-px bg-accent"></div>
				<SliderHandle split={args.split} />
			{/snippet}
		</ProofFrame>
	</div>
{/snippet}

<Story name="Static" template={pane} />
<Story name="Built side" args={{ split: 0 }} template={pane} />
<Story name="Design side" args={{ split: 100 }} template={pane} />
<Story name="With handle" template={withHandle} />
