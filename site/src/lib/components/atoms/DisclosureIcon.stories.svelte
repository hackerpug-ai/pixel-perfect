<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DisclosureIcon from './DisclosureIcon.svelte';

	const { Story } = defineMeta({
		title: 'Components/DisclosureIcon',
		component: DisclosureIcon,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The FAQ summary glyph: a muted mono "+" when closed, an accent-text minus when open. It is aria-hidden; the summary carries the state, and its `group` hover turns the "+" accent-text.'
				}
			}
		},
		argTypes: {
			open: { control: 'boolean', description: 'The FAQ item is expanded' }
		},
		args: {
			open: false
		}
	});
</script>

<Story name="Default" />
<Story name="Open" args={{ open: true }} />
