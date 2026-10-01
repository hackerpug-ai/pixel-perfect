<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PlateText from './PlateText.svelte';

	const { Story } = defineMeta({
		title: 'Components/PlateText',
		component: PlateText,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'Display text with three aria-hidden colour-plate copies that register on load (hero), on scroll (close, driven by the parent through --p), or stay offset (social card); with reduced motion only the ink shows.'
				}
			}
		},
		argTypes: {
			text: { control: 'text', description: 'The headline (the ink text, read by screen readers)' },
			lead: { control: 'text', description: 'Muted lead line above the plated text; empty hides it' },
			as: { control: 'select', options: ['h1', 'h2', 'p'], description: 'Element' },
			size: {
				control: 'select',
				options: ['display-xl', 'display-alt', 'display-lg', 'display-md', 'display-sm', 'social'],
				description: 'Display type token'
			},
			stretch: { control: 'select', options: [100, 105, 110, 115, 118], description: 'Anybody width (%)' },
			motion: {
				control: 'select',
				options: ['load', 'scroll', 'static'],
				description: 'load: registers once on load · scroll: reads --p from the parent · static: permanently offset'
			},
			progress: {
				control: { type: 'range', min: 0, max: 1, step: 0.05 },
				description: 'Scroll mode only: pins --p (0 offset, 1 registered) for stories'
			}
		},
		args: {
			text: 'Ship the system inside it.',
			lead: 'Your mockup is a picture.',
			as: 'h1',
			size: 'display-xl',
			stretch: 118,
			motion: 'load'
		}
	});
</script>

<Story name="Default" />
<Story
	name="Hero alternate"
	args={{ text: 'Turn a mockup into a design system your agent keeps building on.', lead: '', size: 'display-alt' }}
/>
<Story
	name="Close"
	args={{ text: 'Your next mockup has a system inside it.', lead: '', as: 'h2', size: 'display-lg', motion: 'scroll' }}
/>
<Story
	name="Close scroll start"
	args={{ text: 'Your next mockup has a system inside it.', lead: '', as: 'h2', size: 'display-lg', motion: 'scroll', progress: 0 }}
/>
<Story name="Social" args={{ motion: 'static', size: 'social' }} />
