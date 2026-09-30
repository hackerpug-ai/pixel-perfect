<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Logo from './Logo.svelte';

	const { Story } = defineMeta({
		title: 'Components/Logo',
		component: Logo,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The P mark family (strategy D5): mark A with the Anybody wordmark in the header and social card, mark C alone in the footer. Each mark swaps its light and dark artwork with the theme.'
				}
			}
		},
		argTypes: {
			variant: {
				control: 'select',
				options: ['header', 'footer'],
				description: 'header: mark A, stacked plates (28px). footer: mark C, registered P (24px)'
			},
			showWordmark: { control: 'boolean', description: 'Show the pixel▬perfect wordmark beside the mark' },
			href: { control: 'text', description: 'Link target; empty renders the lockup as plain content' }
		},
		args: {
			variant: 'header',
			showWordmark: true,
			href: ''
		}
	});
</script>

<Story name="Default" />
<Story name="Header link" args={{ href: '#top' }} />
<Story name="Footer mark" args={{ variant: 'footer', showWordmark: false }} />
