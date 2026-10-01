<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import InstallSection from './InstallSection.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/InstallSection',
		component: InstallSection,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The one-step installs, the per-agent tabs (arrows, Home, End; #install-{id} links; the choice is remembered), the stability line, and what it touches. One story per agent tab.'
				}
			}
		},
		argTypes: {
			releaseTag: { control: 'text', description: 'The tag the clone commands check out (default: this release)' },
			initialTab: { control: 'select', options: ['claude', 'codex', 'cursor', 'grok', 'opencode', 'pi'] },
			pasteLine: { control: 'text' },
			skillsLine: { control: 'text' },
			agents: { control: 'object' },
			stability: { control: 'text' },
			touches: { control: 'object' },
			scan: { control: 'text', description: 'Third-party scan result; empty leaves the box out' },
			onselect: { action: 'tab selected' }
		},
		args: { onselect: fn() }
	});
</script>

<Story name="Claude" args={{ initialTab: 'claude' }} />
<Story name="Codex" args={{ initialTab: 'codex' }} />
<Story name="Cursor" args={{ initialTab: 'cursor' }} />
<Story name="Grok" args={{ initialTab: 'grok' }} />
<Story name="OpenCode" args={{ initialTab: 'opencode' }} />
<Story name="Pi" args={{ initialTab: 'pi' }} />
<!-- The page leaves the box out until a scan result exists; this story shows the box with the export's own pending text. -->
<Story name="Scan box" args={{ initialTab: 'claude', scan: 'Third-party scan results — pending.' }} />
