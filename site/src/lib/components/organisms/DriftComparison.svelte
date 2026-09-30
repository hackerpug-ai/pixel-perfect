<script lang="ts">
	// The Why section's figure (Landing.dc.html:179-212): the approved card beside its drifted copy,
	// then the numbered notes for the four proofreader's marks. Motion why-drift (manifest.motion):
	// this figure runs the view timeline; the drifted PlanCard reads --p (radius and padding drift,
	// marks pop in). At rest, and with reduced motion, it is fully drifted. Stacks at 720px and below.
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';
	import FigureCaption from '$lib/components/molecules/FigureCaption.svelte';
	import PlanCard from '$lib/components/molecules/PlanCard.svelte';
	import ProofNote from '$lib/components/molecules/ProofNote.svelte';

	type Card = { label: string; price: string; period: string; features: string; action: string };

	interface Props {
		card?: Card;
		/** One note per mark, in order; code goes in backticks. */
		notes?: string[];
		caption?: string;
		/** Pins drift progress (0 to 1) for stories. */
		progress?: number;
	}

	let {
		card = { label: 'TEAM PLAN', price: '$24', period: '/ month', features: 'Unlimited projects · 5 seats · Priority support', action: 'Choose plan' },
		notes = [
			'Padding 20 instead of 16.',
			'An invented gray, `#8A8F96`, not in the tokens.',
			'A fifth button style.',
			'Border radius 5 instead of 4.'
		],
		caption = 'Example.',
		progress
	}: Props = $props();
</script>

<figure
	class={[
		'm-0',
		progress === undefined &&
			'supports-[animation-timeline:view()]:motion-safe:animate-progress supports-[animation-timeline:view()]:motion-safe:[animation-range:cover_10vh_cover_65vh] supports-[animation-timeline:view()]:motion-safe:[animation-timeline:view()]'
	]}
	style:--p={progress}
>
	<div class="grid grid-cols-2 gap-6 max-md:grid-cols-1">
		<div>
			<div class="mb-4"><PlateLabel label="APPROVED" /></div>
			<PlanCard {...card} />
		</div>
		<div>
			<div class="mb-4"><PlateLabel label="DRIFTED" tone="accent" /></div>
			<PlanCard {...card} variant="drifted" />
		</div>
	</div>
	<figcaption class="mt-4">
		<ol class="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-5 gap-y-2 p-0">
			{#each notes as text, i (i)}<ProofNote number={i + 1} {text} />{/each}
		</ol>
		<div class="mt-2.5"><FigureCaption variant="mono" as="div" text={caption} /></div>
	</figcaption>
</figure>
