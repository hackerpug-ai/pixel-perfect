<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SlugLine from './SlugLine.svelte';

	const { Story } = defineMeta({
		title: 'Components/SlugLine',
		component: SlugLine,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						"A printer's slug line in mono caps: the proof sheet's job line (version and date come from the release) or the social card's agent line."
				}
			}
		},
		argTypes: {
			variant: {
				control: 'select',
				options: ['job', 'agent'],
				description: 'job: 12px job line (hero). agent: 14px agent line (social card)'
			},
			version: { control: 'text', description: 'Job line: release version' },
			date: { control: 'text', description: 'Job line: release date' },
			agents: { control: 'object', description: "Agent line: the agents after 'AN AGENT SKILL'" }
		},
		args: {
			variant: 'job',
			version: 'V9',
			date: '2026-09-29',
			agents: ['CLAUDE CODE', 'CODEX', 'CURSOR', 'GROK', 'OPENCODE', 'PI']
		}
	});
</script>

<Story name="Default" />
<Story name="Agent" args={{ variant: 'agent' }} />
