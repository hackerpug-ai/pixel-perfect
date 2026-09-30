<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DesignMdCard from './DesignMdCard.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/DesignMdCard',
		component: DesignMdCard,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The generated DESIGN.md as a document sheet: plate label, title, then token and component rows in two mono columns. Example content.'
				}
			}
		},
		argTypes: {
			label: { control: 'text', description: 'Plate label over the document' },
			title: { control: 'text', description: "The document's title line" },
			tokens: { control: 'object', description: 'Token rows: [name, value]' },
			components: { control: 'object', description: 'Component rows: [name, variants or composition]' }
		},
		args: {
			label: 'DESIGN.md · GENERATED · EXAMPLE',
			title: 'design system',
			tokens: [
				['color.ink', '#111316'],
				['color.accent', '#E0007A'],
				['space.4', '16px'],
				['radius.sm', '4px']
			],
			components: [
				['Button', 'primary, secondary'],
				['PlanCard', 'composes Heading, Price, Button'],
				['Header', 'composes Logo, NavLink']
			]
		}
	});
</script>

{#snippet column(args: { label?: string; title?: string; tokens: [string, string][]; components: [string, string][] })}
	<div class="max-w-158">
		<DesignMdCard {...args} />
	</div>
{/snippet}

<Story name="Default" template={column} />
