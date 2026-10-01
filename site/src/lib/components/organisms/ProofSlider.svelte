<script lang="ts">
	// The hero's proof slider (Landing.dc.html:121-149; manifest ui_states.slider), with a real pair
	// from this build (strategy T21; the owner's decision 2026-09-30): the install card as drawn in the
	// design export (a 2x crop in static/proof/) on the hatched side, the live CopyBlock built from it
	// on the other. Both are staged at the card's design width — 545px from the 1440 frame at 720px
	// and up, 358px from the 390 frame below — and zoomed together to fit the pane, so they line up.
	// Stateful: split, through an invisible native range input over the pane — arrows ±1, Page
	// Up/Down, Home and End come from the platform; the input's focus is drawn on SliderHandle (peer).
	// A vertical swipe still scrolls the page (touch-action pan-y).
	import { untrack } from 'svelte';
	import { asset } from '$app/paths';
	import SliderHandle from '$lib/components/atoms/SliderHandle.svelte';
	import CopyBlock from '$lib/components/molecules/CopyBlock.svelte';
	import FigureCaption from '$lib/components/molecules/FigureCaption.svelte';
	import ProofFrame from '$lib/components/molecules/ProofFrame.svelte';

	interface Props {
		/** Starting split, 0-100 (stories: 0, 50, 100). */
		initialSplit?: number;
		/** The install card's command, as the hero shows it. */
		command?: string;
		caption?: string;
		onsplit?: (split: number) => void;
	}

	let {
		initialSplit = 50,
		command = 'Install pixel-perfect: fetch and follow https://github.com/hackerpug-ai/pixel-perfect/INSTALL.md',
		caption = 'Drag to compare the design frame with the component built from it. The corner marks line up when they match.',
		onsplit
	}: Props = $props();

	let split = $state(untrack(() => initialSplit));
	let width = $state(0);
	// Zoom that fits a stage of `stage` px in the pane with 16px either side (1 before layout).
	const fit = (stage: number) => (width ? Math.min(1, (width - 32) / stage) : 1);
	const stages = [
		{ name: 'desktop', width: 545, height: 121, box: 'w-[545px]', show: 'max-md:hidden [zoom:var(--fit-desktop)]' },
		{ name: 'mobile', width: 358, height: 141, box: 'w-[358px]', show: 'md:hidden [zoom:var(--fit-mobile)]' }
	];
	const alt = 'The install card as drawn in the design';
</script>

<figure class="m-0" bind:clientWidth={width} style:--fit-desktop={fit(545)} style:--fit-mobile={fit(358)}>
	<ProofFrame {split}>
		{#snippet design()}
			{#each stages as stage (stage.name)}
				<div class={stage.show}>
					<img src={asset(`/proof/install-card-${stage.name}-light.png`)} {alt} width={stage.width} height={stage.height} class="block dark:hidden" />
					<img src={asset(`/proof/install-card-${stage.name}-dark.png`)} {alt} width={stage.width} height={stage.height} class="hidden dark:block" />
				</div>
			{/each}
		{/snippet}
		{#snippet built()}
			{#each stages as stage (stage.name)}
				<div inert class={[stage.box, stage.show]}><CopyBlock {command} /></div>
			{/each}
		{/snippet}
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
	<div class="mt-2.5"><FigureCaption text={caption} /></div>
</figure>
