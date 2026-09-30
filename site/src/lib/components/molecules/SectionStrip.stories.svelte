<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SectionStrip from './SectionStrip.svelte';

	type Args = { items: { label: string; href: string; external?: boolean }[] };

	const { Story } = defineMeta({
		title: 'Molecules/SectionStrip',
		component: SectionStrip,
		render: template,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen',
			docs: {
				description: {
					component:
						"The phone section nav under the sticky header, styled as a printer's slug line: mono caps links with 44px touch targets, a 1px line under it, scrolling sideways with no visible scrollbar. Shown at 390px only."
				}
			}
		},
		argTypes: {
			items: { control: 'object', description: 'Section links { label, href, external }; labels are set in caps by NavLink' }
		},
		args: {
			items: [
				{ label: 'Why', href: '#why' },
				{ label: 'Build it', href: '#build' },
				{ label: 'Grow it', href: '#grow' },
				{ label: 'Install', href: '#install' },
				{ label: 'FAQ', href: '#faq' },
				{ label: 'GitHub', href: 'https://github.com/hackerpug-ai/pixel-perfect', external: true }
			]
		}
	});
</script>

<!-- A 390px phone canvas: the strip only appears below the md (720px) breakpoint. -->
{#snippet template(args: Args)}
	<div class="max-w-[390px]">
		<SectionStrip {...args} />
	</div>
{/snippet}

<Story name="Default" />
