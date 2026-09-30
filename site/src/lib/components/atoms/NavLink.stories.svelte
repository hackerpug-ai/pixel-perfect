<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import NavLink from './NavLink.svelte';

	const { Story } = defineMeta({
		title: 'Components/NavLink',
		component: NavLink,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'Site navigation link: 15px ink in the header, or mono caps with a 44px touch target in the mobile section strip; hover draws a 2px magenta rule under the text.'
				}
			}
		},
		argTypes: {
			href: { control: 'text', description: 'Destination (section anchor or URL)' },
			label: { control: 'text', description: 'Link text' },
			external: { control: 'boolean', description: 'Append ↗ (another site)' },
			variant: { control: 'select', options: ['header', 'strip'], description: 'header: desktop nav; strip: mobile section strip' },
			onclick: { action: 'click', description: 'Followed' }
		},
		args: {
			href: '#why',
			label: 'Why',
			external: false,
			variant: 'header',
			onclick: fn()
		}
	});
</script>

<Story name="Default" />
<Story name="External" args={{ href: 'https://github.com/hackerpug-ai/pixel-perfect', label: 'GitHub', external: true }} />
<Story name="Strip" args={{ variant: 'strip' }} />
