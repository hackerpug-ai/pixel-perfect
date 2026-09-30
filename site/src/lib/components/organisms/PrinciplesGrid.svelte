<script lang="ts">
	// The four principles under the statement line (Landing.dc.html:215-222): four columns at 1440,
	// one at 390 (auto-fit, 250px minimum). Home sets the space above it.
	import PrincipleCard from '$lib/components/atoms/PrincipleCard.svelte';
	import SectionHeading from '$lib/components/atoms/SectionHeading.svelte';

	interface Props {
		statement?: string;
		principles?: { title: string; body: string }[];
	}

	let {
		statement = 'Your design survives your codebase.',
		principles = [
			{ title: 'Consistency through composability', body: "Every screen is assembled from the same parts, so one card can't quietly become four." },
			{ title: 'Make it real', body: 'No mockup step, no spec format, no throwaway files. The design is the reference, and the code in your repository is the deliverable.' },
			{
				title: 'Rapid iteration',
				body: "Add a screen with one sentence, and it's built from the parts you already have. Change a token and it flows everywhere. Change a component and everything built on it re-checks."
			},
			{ title: 'Language agnostic', body: "Works in whatever UI stack you use. Storybook if you want it, a native sandbox if you don't." }
		]
	}: Props = $props();
</script>

<div>
	<div class="mb-9"><SectionHeading variant="statement" text={statement} /></div>
	<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-x-10 gap-y-8 border-t border-line pt-8">
		{#each principles as principle (principle.title)}<PrincipleCard {...principle} />{/each}
	</div>
</div>
