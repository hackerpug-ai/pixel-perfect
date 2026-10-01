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
						'The landing page at /. One route for both widths (1440 and 390). One story per inventory state: each install tab, an open question, the copy feedback, and the alternate headline. The dark state is every story under the Theme toolbar (the capture renders each story in both themes); Phone opens at the web-mobile width (390).'
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
<!-- web-mobile's review story: opens at the phone preset in the sandbox (the capture renders every story at
     each platform's own width, so this one's catalog snapshots match Default). -->
<Story name="Phone" globals={{ viewport: { value: 'phone', isRotated: false } }} />
