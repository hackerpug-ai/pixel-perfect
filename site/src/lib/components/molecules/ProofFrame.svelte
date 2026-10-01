<script lang="ts">
	// The proof slider's comparison pane without its control (Landing.dc.html:122-146; drawn alone in
	// social-preview-dc/01): the hatched design frame on the left, the built component clipped in
	// from the right at `split`, the 2px divider, the two plate labels and four registration targets.
	// The ProofSlider organism passes `handle` (SliderHandle and the range input) and owns `split`;
	// the social card uses the static pane.
	import type { Snippet } from 'svelte';
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';
	import RegistrationTarget from '$lib/components/atoms/RegistrationTarget.svelte';

	interface Props {
		/** Where the built side starts, 0-100 (percent of the pane's width from the left). */
		split?: number;
		/** Content on the hatched design side. */
		design: Snippet;
		/** Content on the built side. */
		built: Snippet;
		/** Overlay for the interactive slider: divider, handle and range input (ProofSlider). */
		handle?: Snippet;
		designLabel?: string;
		builtLabel?: string;
	}

	let {
		split = 50,
		design,
		built,
		handle,
		designLabel = 'DESIGN FRAME',
		builtLabel = 'BUILT COMPONENT'
	}: Props = $props();

	// Registration targets: bottom corners and just under each label (export: 8px in, top 28px).
	const targets = ['bottom-2 left-2', 'right-2 bottom-2', 'top-7 left-2', 'top-7 right-2'];
</script>

<div
	class="relative aspect-[16/10] overflow-hidden border border-line bg-sheet select-none"
	style:--split="{Math.min(100, Math.max(0, split))}%"
>
	<div class="absolute inset-0 grid place-items-center bg-hatch">{@render design()}</div>
	<div class="absolute inset-0 grid place-items-center bg-sheet [clip-path:inset(0_0_0_var(--split))]">
		{@render built()}
	</div>
	<div aria-hidden="true" class="absolute inset-y-0 left-(--split) w-0.5 -translate-x-px bg-accent"></div>
	{@render handle?.()}
	<span class="absolute top-2.5 left-2.5"><PlateLabel label={designLabel} /></span>
	<span class="absolute top-2.5 right-2.5"><PlateLabel label={builtLabel} /></span>
	{#each targets as position (position)}
		<span class={['absolute', position]}><RegistrationTarget /></span>
	{/each}
</div>
