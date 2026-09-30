<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PrincipleCard from './PrincipleCard.svelte';

	const { Story } = defineMeta({
		title: 'Components/PrincipleCard',
		component: PrincipleCard,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'One principle in the Why section: a 17px semibold title over a muted 15px paragraph. Four sit in a grid under "Your design survives your codebase."'
				}
			}
		},
		argTypes: {
			title: { control: 'text', description: 'Principle name (h3)' },
			body: { control: 'text', description: 'Muted explanation under the title' }
		},
		args: {
			title: 'Consistency through composability',
			body: "Every screen is assembled from the same parts, so one card can't quietly become four."
		}
	});
</script>

<Story name="Default" />
<Story
	name="Make it real"
	args={{
		title: 'Make it real',
		body: 'No mockup step, no spec format, no throwaway files. The design is the reference, and the code in your repository is the deliverable.'
	}}
/>
<Story
	name="Rapid iteration"
	args={{
		title: 'Rapid iteration',
		body: "Add a screen with one sentence, and it's built from the parts you already have. Change a token and it flows everywhere. Change a component and everything built on it re-checks."
	}}
/>
<Story
	name="Language agnostic"
	args={{
		title: 'Language agnostic',
		body: "Works in whatever UI stack you use. Storybook if you want it, a native sandbox if you don't."
	}}
/>
