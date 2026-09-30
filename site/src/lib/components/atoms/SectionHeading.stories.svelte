<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SectionHeading from './SectionHeading.svelte';
	import InlineCode from './InlineCode.svelte';

	const { Story } = defineMeta({
		title: 'Components/SectionHeading',
		component: SectionHeading,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The plain Anybody display heading the landing repeats: section titles, the statement line, and the DESIGN.md subhead.'
				}
			}
		},
		argTypes: {
			text: { control: 'text', description: 'Heading text (ignored when children are passed)' },
			variant: {
				control: 'select',
				options: ['section', 'statement', 'subhead'],
				description: 'section: 800 wdth 115 display-md · statement: 700 wdth 110 display-sm · subhead: 700 wdth 110 22px'
			},
			as: { control: 'select', options: [undefined, 'h2', 'h3', 'p'], description: 'Element; defaults to h2, p, h3 by variant' },
			children: { control: false, description: 'Rich content (for example an InlineCode run); replaces text' }
		},
		args: {
			text: 'Designs die in translation.',
			variant: 'section'
		}
	});
</script>

<Story name="Default" />
<Story name="Statement" args={{ text: 'Your design survives your codebase.', variant: 'statement' }} />
<Story name="Subhead" args={{ variant: 'subhead' }}>
	{#snippet template(args)}
		<SectionHeading {...args}>It writes a <InlineCode text="DESIGN.md" variant="heading" /> too.</SectionHeading>
	{/snippet}
</Story>
