<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import Button from './Button.svelte';

	const copyLabels = ['Copy', 'Copied ✓', 'Selected'];

	const { Story } = defineMeta({
		title: 'Components/Button',
		component: Button,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'Action button: primary ink, secondary outline, or the small copy button on code panels; it renders a link when given an href, and holds a 9ch minimum width so Copy, Copied ✓ and Selected swap without moving anything.'
				}
			}
		},
		argTypes: {
			label: { control: 'text', description: 'Button text; a copy button passes Copy, Copied ✓ or Selected' },
			reserve: { control: 'object', description: 'Every label the button can switch to; it keeps the width of the widest' },
			variant: { control: 'select', options: ['primary', 'secondary', 'code'], description: 'primary ink fill, secondary outline, code: on a code panel' },
			size: { control: 'select', options: ['lg', 'md', 'sm'], description: 'lg CTA 15px, md copy 14px, sm card 13px (ignored by code)' },
			href: { control: 'text', description: 'Renders an <a> to this URL; empty renders a <button>' },
			onclick: { action: 'click', description: 'Pressed' }
		},
		args: {
			label: 'Install pixel-perfect',
			reserve: [],
			variant: 'primary',
			size: 'lg',
			href: '',
			onclick: fn()
		}
	});
</script>

<Story name="Default" args={{ href: '#install' }} />
<Story name="Secondary" args={{ variant: 'secondary', label: 'See it build', href: '#build' }} />
<Story name="Secondary compact" args={{ variant: 'secondary', size: 'md', label: 'See it build', href: '#build' }} />
<Story name="Copy" args={{ size: 'md', label: 'Copy', reserve: copyLabels }} />
<Story name="Copied" args={{ size: 'md', label: 'Copied ✓', reserve: copyLabels }} />
<Story name="Selected" args={{ size: 'md', label: 'Selected', reserve: copyLabels }} />
<Story name="Secondary copy" args={{ variant: 'secondary', size: 'md', label: 'Copy', reserve: copyLabels }} />
<Story name="Card" args={{ size: 'sm', label: 'Choose plan' }}>
	{#snippet template(args)}
		<div class="flex w-67 flex-col">
			<Button {...args} />
		</div>
	{/snippet}
</Story>
<Story name="Code" args={{ variant: 'code', label: 'Copy', reserve: copyLabels }}>
	{#snippet template(args)}
		<div class="inline-flex rounded-md bg-code-bg px-3.5 py-2.5">
			<Button {...args} />
		</div>
	{/snippet}
</Story>
<Story name="Code copied" args={{ variant: 'code', label: 'Copied ✓', reserve: copyLabels }}>
	{#snippet template(args)}
		<div class="inline-flex rounded-md bg-code-bg px-3.5 py-2.5">
			<Button {...args} />
		</div>
	{/snippet}
</Story>
