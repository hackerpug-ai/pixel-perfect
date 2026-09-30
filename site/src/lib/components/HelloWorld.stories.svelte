<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import HelloWorld from './HelloWorld.svelte';

	const { Story } = defineMeta({
		title: 'Components/HelloWorld',
		component: HelloWorld,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'Scaffold reference component. Every prop is wired to a control; it uses only theme tokens. Tab to the button to see the focus style.'
				}
			}
		},
		argTypes: {
			title: { control: 'text', description: 'Display headline (Anybody 800)' },
			subtitle: { control: 'text', description: 'Line under the headline; empty hides it' },
			variant: { control: 'select', options: ['sheet', 'accent'], description: 'Card surface' },
			showSlug: { control: 'boolean', description: 'Show the mono slug line' },
			actionLabel: { control: 'text', description: 'Button label' },
			onaction: { action: 'action', description: 'Button pressed' }
		},
		args: {
			title: 'Ship the system inside it.',
			subtitle: 'One pixel, registered.',
			variant: 'sheet',
			showSlug: true,
			actionLabel: 'Install pixel-perfect',
			onaction: fn()
		}
	});
</script>

<Story name="Default" />
<Story name="Accent" args={{ variant: 'accent' }} />
<Story name="Minimal" args={{ subtitle: '', showSlug: false }} />
