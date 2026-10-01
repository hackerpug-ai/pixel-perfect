<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SocialCard from './SocialCard.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/SocialCard',
		component: SocialCard,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen',
			docs: {
				description: {
					component:
						'The 1200x630 social image, rendered to og.png at build. Light only: it stays light under the dark theme. The slider shows the real pair: the install card as designed beside the live component.'
				}
			}
		},
		argTypes: {
			lead: { control: 'text' },
			headline: { control: 'text' },
			agents: { control: 'object' },
			command: { control: 'text' }
		}
	});
</script>

<Story name="Default" />
