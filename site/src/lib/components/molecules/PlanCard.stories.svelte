<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';
	import PlanCard from './PlanCard.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/PlanCard',
		component: PlanCard,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The example pricing card: approved (the system card), drifted (off-system overrides with four proofreader marks that pop in on scroll), and frame-side (the design pane copy). Placeholder content until strategy T21 supplies real pairs.'
				}
			}
		},
		argTypes: {
			label: { control: 'text' },
			price: { control: 'text' },
			period: { control: 'text' },
			features: { control: 'text' },
			action: { control: 'text' },
			variant: { control: 'select', options: ['approved', 'drifted', 'frame-side'] },
			progress: { control: { type: 'range', min: 0, max: 1, step: 0.05 }, description: 'Pins scroll progress for drifted' }
		},
		args: {
			label: 'TEAM PLAN',
			price: '$24',
			period: '/ month',
			features: 'Unlimited projects · 5 seats · Priority support',
			action: 'Choose plan',
			variant: 'approved'
		}
	});
</script>

{#snippet template(args: ComponentProps<typeof PlanCard>)}
	<div class="max-w-80 p-4"><PlanCard {...args} /></div>
{/snippet}

<Story name="Approved" {template} />
<Story name="Drifted" args={{ variant: 'drifted' }} {template} />
<Story name="Drifted scroll start" args={{ variant: 'drifted', progress: 0 }} {template} />
<Story name="Frame side" args={{ variant: 'frame-side' }} {template} />
