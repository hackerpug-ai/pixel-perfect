<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import TextLink from './TextLink.svelte';

	const { Story } = defineMeta({
		title: 'Components/TextLink',
		component: TextLink,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'Magenta-ink underlined link that turns ink on hover; external links carry a trailing ↗.'
				}
			}
		},
		argTypes: {
			href: { control: 'text', description: 'Destination URL' },
			label: { control: 'text', description: 'Link text' },
			external: { control: 'boolean', description: 'Append ↗ (another site)' },
			variant: { control: 'select', options: ['ui', 'small', 'mono'], description: 'ui 15px, small 14px, mono 13px Plex Mono' },
			onclick: { action: 'click', description: 'Followed' }
		},
		args: {
			href: '#install',
			label: "Prefer your agent's own commands? See every install option.",
			external: false,
			variant: 'small',
			onclick: fn()
		}
	});
</script>

<Story name="Default" />
<Story name="External" args={{ href: 'https://github.com/hackerpug-ai/pixel-perfect', label: 'View source', external: true, variant: 'ui' }} />
<Story name="Footer" args={{ href: 'https://github.com/hackerpug-ai/pixel-perfect/blob/main/CHANGELOG.md', label: 'Changelog' }} />
<Story name="Mono" args={{ label: 'Install', variant: 'mono' }} />
