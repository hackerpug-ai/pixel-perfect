<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Home from './Home.svelte';

	const { Story } = defineMeta({
		title: 'Screens/Home',
		component: Home,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen',
			docs: {
				description: {
					component:
						'The landing page at /. One route for both widths (1440 and 390). One story per inventory state: each install tab, an open question, the copy feedback, and the alternate headline. The dark state is every story under the Theme toolbar (the capture renders each story in both themes).'
				}
			}
		},
		argTypes: {
			headline: { control: 'select', options: ['primary', 'alternate'], description: 'strategy D13 headline test' },
			installTab: { control: 'select', options: ['claude', 'codex', 'cursor', 'grok', 'opencode', 'pi'] },
			faqOpen: { control: 'object', description: 'Indexes of questions that start open' },
			copied: { control: 'boolean', description: "Hero install card on 'Copied ✓'" }
		}
	});
</script>

<Story name="Default" />
<Story name="Install claude" args={{ installTab: 'claude' }} />
<Story name="Install codex" args={{ installTab: 'codex' }} />
<Story name="Install cursor" args={{ installTab: 'cursor' }} />
<Story name="Install grok" args={{ installTab: 'grok' }} />
<Story name="Install opencode" args={{ installTab: 'opencode' }} />
<Story name="Install pi" args={{ installTab: 'pi' }} />
<Story name="Faq open" args={{ faqOpen: [0] }} />
<Story name="Copied" args={{ copied: true }} />
<Story name="Headline alternate" args={{ headline: 'alternate' }} />
