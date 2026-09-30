<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';
	import Hero from './Hero.svelte';
	import ProofSlider from './ProofSlider.svelte';
	import LayerStack from './LayerStack.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/Hero',
		component: Hero,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen',
			docs: {
				description: {
					component:
						'The hero: slug line, plate headline (load motion), lede and install stack, meta strip, and a figure row that Home fills with ProofSlider and LayerStack (shown here the same way). One column at 720px and below.'
				}
			}
		},
		argTypes: {
			headline: { control: 'select', options: ['primary', 'alternate'], description: 'strategy D13 headline test' },
			version: { control: 'text' },
			date: { control: 'text' },
			harnesses: { control: 'text' },
			lede: { control: 'text' },
			pasteLine: { control: 'text' },
			skillsLine: { control: 'text' },
			meta: { control: 'object' }
		},
		args: { headline: 'primary', version: 'V9', date: '2026-09-29' }
	});
</script>

{#snippet page(args: ComponentProps<typeof Hero>)}
	<div>
		<Hero {...args}>
			{#snippet figures()}<ProofSlider /><LayerStack />{/snippet}
		</Hero>
	</div>
{/snippet}

<Story name="Default" template={page} />
<Story name="Headline alternate" args={{ headline: 'alternate' }} template={page} />
