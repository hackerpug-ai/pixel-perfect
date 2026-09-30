<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ColorStrip from './ColorStrip.svelte';

	const { Story } = defineMeta({
		title: 'Components/ColorStrip',
		component: ColorStrip,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The colour control strip: cyan, magenta, yellow and ink plates, then each at 50%. Tints follow the theme. Decorative (aria-hidden).'
				}
			}
		},
		argTypes: {
			size: {
				control: 'select',
				options: ['hero', 'sheet'],
				description: 'hero: 16x10 swatches (hero slug line). sheet: 20x14 swatches'
			}
		},
		args: {
			size: 'hero'
		}
	});
</script>

<Story name="Default" />
<Story name="Sheet" args={{ size: 'sheet' }} />
