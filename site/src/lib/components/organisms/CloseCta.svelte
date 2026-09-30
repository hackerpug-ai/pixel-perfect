<script lang="ts">
	// The closing call to action (Landing.dc.html:407-411). Motion close-register (manifest.motion):
	// this organism runs the scroll timeline; the headline's colour plates read --p and converge into
	// registration. Reduced motion or no scroll-timeline support: the headline rests registered.
	import Button from '$lib/components/atoms/Button.svelte';
	import PlateText from '$lib/components/atoms/PlateText.svelte';
	import TextLink from '$lib/components/atoms/TextLink.svelte';

	interface Props {
		headline?: string;
		action?: string;
		actionHref?: string;
		sourceHref?: string;
		/** Pins scroll progress (0 to 1) for stories. */
		progress?: number;
	}

	let {
		headline = 'Your next mockup has a system inside it.',
		action = 'Install pixel-perfect',
		actionHref = '#install',
		sourceHref = 'https://github.com/hackerpug-ai/pixel-perfect',
		progress
	}: Props = $props();
</script>

<div>
	<div
		class="mb-7 max-w-225 supports-[animation-timeline:view()]:motion-safe:animate-progress supports-[animation-timeline:view()]:motion-safe:[animation-range:cover_0vh_cover_30vh] supports-[animation-timeline:view()]:motion-safe:[animation-timeline:view()]"
	>
		<PlateText as="h2" text={headline} size="display-lg" stretch={118} motion="scroll" {progress} />
	</div>
	<div class="flex flex-wrap items-center gap-4">
		<Button label={action} href={actionHref} />
		<TextLink href={sourceHref} label="GitHub" external />
	</div>
</div>
