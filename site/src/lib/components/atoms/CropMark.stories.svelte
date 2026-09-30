<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import CropMark from './CropMark.svelte';

	const { Story } = defineMeta({
		title: 'Components/CropMark',
		component: CropMark,
		tags: ['autodocs'],
		render: template,
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'An L-shaped crop mark at one corner of a positioned parent, as around the hero proof sheet and the social card. Decorative (aria-hidden).'
				}
			}
		},
		argTypes: {
			corner: {
				control: 'select',
				options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
				description: 'Corner of the positioned parent'
			},
			size: {
				control: 'select',
				options: ['hero', 'social'],
				description: 'hero: 16px mark, 12px inset. social: 20px mark, 20px inset'
			}
		},
		args: {
			corner: 'top-left',
			size: 'hero'
		}
	});
</script>

<!-- The mark is absolutely placed, so each story gives it a positioned sheet to sit on. -->
{#snippet template(args: { corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; size?: 'hero' | 'social' })}
	<div class="relative h-32 w-60 bg-paper">
		<CropMark {...args} />
	</div>
{/snippet}

<Story name="Default" />
<Story name="Top right" args={{ corner: 'top-right' }} />
<Story name="Bottom left" args={{ corner: 'bottom-left' }} />
<Story name="Bottom right" args={{ corner: 'bottom-right' }} />
<Story name="Social" args={{ size: 'social' }} />
