<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import MetaStrip from './MetaStrip.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/MetaStrip',
		component: MetaStrip,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						"The hero's muted meta line between two rules, with the source link in magenta; one row at 1440, three rows at 390."
				}
			}
		},
		argTypes: {
			items: { control: 'object', description: 'In order; a string is plain text, { label, href, external } is a TextLink' }
		},
		args: {
			items: [
				'MIT',
				'by Justin Rich',
				{ label: 'View source', href: 'https://github.com/hackerpug-ai/pixel-perfect', external: true },
				'Works in six agents',
				'Frameworks: SvelteKit, React, Expo, SwiftUI, GPUI, Ratatui, and any stack with a docs URL'
			]
		}
	});
</script>

<Story name="Default" />
<!-- The 390 layout (358px content width) at any viewport: the strip wraps to three rows. -->
<Story name="Narrow">
	{#snippet template(args)}
		<div class="max-w-[358px]">
			<MetaStrip {...args} />
		</div>
	{/snippet}
</Story>
