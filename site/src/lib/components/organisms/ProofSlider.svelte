<script lang="ts">
	// The hero's proof slider (Landing.dc.html:121-149; manifest ui_states.slider). Stateful: split,
	// through an invisible native range input over the pane — arrows ±1, Page Up/Down, Home and End
	// come from the platform; the input's focus is drawn on SliderHandle (peer). A vertical swipe
	// still scrolls the page (touch-action pan-y). The pair is the placeholder $24 card until T21.
	import { untrack } from 'svelte';
	import SliderHandle from '$lib/components/atoms/SliderHandle.svelte';
	import FigureCaption from '$lib/components/molecules/FigureCaption.svelte';
	import PlanCard from '$lib/components/molecules/PlanCard.svelte';
	import ProofFrame from '$lib/components/molecules/ProofFrame.svelte';

	type Card = { label: string; price: string; period: string; features: string; action: string };

	interface Props {
		/** Starting split, 0-100 (stories: 0, 50, 100). */
		initialSplit?: number;
		card?: Card;
		caption?: string;
		captionNote?: string;
		onsplit?: (split: number) => void;
	}

	let {
		initialSplit = 50,
		card = { label: 'TEAM PLAN', price: '$24', period: '/ month', features: 'Unlimited projects · 5 seats · Priority support', action: 'Choose plan' },
		caption = 'Drag to compare the design frame with the component built from it. The corner marks line up when they match.',
		captionNote = 'Example — replaced by the real pair at launch.',
		onsplit
	}: Props = $props();

	let split = $state(untrack(() => initialSplit));
</script>

<figure class="m-0">
	<ProofFrame {split}>
		{#snippet design()}<div class="w-[calc(min(300px,70%)_+_34px)]"><PlanCard {...card} variant="frame-side" /></div>{/snippet}
		{#snippet built()}<div class="w-[calc(min(300px,70%)_+_34px)]"><PlanCard {...card} /></div>{/snippet}
		{#snippet handle()}
			<input
				type="range"
				min="0"
				max="100"
				bind:value={split}
				oninput={() => onsplit?.(split)}
				aria-label="Compare the design frame with the built component"
				aria-valuetext="{split}% design frame, {100 - split}% built component"
				class="peer absolute inset-0 m-0 size-full cursor-ew-resize touch-pan-y opacity-0"
			/>
			<SliderHandle {split} />
		{/snippet}
	</ProofFrame>
	<div class="mt-2.5"><FigureCaption variant="example" text={caption} label={captionNote} /></div>
</figure>
