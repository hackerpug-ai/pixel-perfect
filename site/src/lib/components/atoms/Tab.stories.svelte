<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import Tab from './Tab.svelte';

	const { Story } = defineMeta({
		title: 'Components/Tab',
		component: Tab,
		tags: ['autodocs'],
		render: template,
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'One link-tab of the install tab list: selected is ink, semibold, with a 2px ink rule; unselected is muted and turns ink on hover. Only the selected tab is in the tab order.'
				}
			}
		},
		argTypes: {
			id: { control: 'text', description: 'Element id (the panel is labelled by it)' },
			href: { control: 'text', description: 'Deep link to the panel, #install-{agent}' },
			label: { control: 'text', description: 'Agent name' },
			selected: { control: 'boolean', description: 'The current tab' },
			controls: { control: 'text', description: 'id of the tab panel it controls' },
			onselect: { action: 'select', description: 'Pressed; the tab list selects it' }
		},
		args: {
			id: 'tab-claude',
			href: '#install-claude',
			label: 'Claude Code',
			selected: true,
			controls: '',
			onselect: fn()
		}
	});
</script>

{#snippet template(args: import('svelte').ComponentProps<typeof Tab>)}
	<div role="tablist" aria-label="Agent" class="flex border-b border-line">
		<Tab {...args} />
	</div>
{/snippet}

<Story name="Default" />
<Story name="Unselected" args={{ id: 'tab-codex', href: '#install-codex', label: 'Codex', selected: false }} />
