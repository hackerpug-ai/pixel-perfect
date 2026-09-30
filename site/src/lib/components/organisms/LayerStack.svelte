<script lang="ts">
	// Fig. 1 (Landing.dc.html:153-169): one mockup separated into five plates — tokens, atoms,
	// molecules, organisms, screens — beside the layer labels. Motion (manifest.motion): fig1-tilt on
	// load (the stack starts flat, then tilts) and fig1-separate on scroll (this figure runs the view
	// timeline; the plates spread in depth and the label list opens). At rest and with reduced motion
	// --p is 0.5: half separated. Hidden at 720px and below; the proof slider replaces it there.
	import FigureCaption from '$lib/components/molecules/FigureCaption.svelte';
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';

	interface Props {
		caption?: string;
		/** Pins separation (0 flat-spaced to 1 fully spread) for stories; at rest 0.5. */
		progress?: number;
	}

	let {
		caption = 'One mockup, separated into five layers. Each layer is built and checked before the next.',
		progress
	}: Props = $props();

	const plate = 'absolute inset-0 box-border border bg-sheet motion-safe:animate-flat';
	const labels = ['SCREENS', 'ORGANISMS', 'MOLECULES', 'ATOMS', 'TOKENS'];
</script>

<figure
	class="m-0 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 [--p:0.5] max-md:hidden supports-[animation-timeline:view()]:motion-safe:animate-progress supports-[animation-timeline:view()]:motion-safe:[animation-range:cover_0vh_cover_80vh] supports-[animation-timeline:view()]:motion-safe:[animation-timeline:view()]"
	style:--p={progress}
>
	<div aria-hidden="true" class="box-border grid h-100 place-items-center overflow-hidden pt-30 perspective-[1100px]">
		<div class="relative h-40 w-62.5 transform-3d [transform:rotateX(58deg)_rotateZ(-32deg)] motion-safe:animate-flat">
			<!-- tokens -->
			<div class={[plate, 'flex items-end gap-1 border-line p-2.5 [transform:translateZ(0px)]']}>
				<span class="h-3.5 w-5.5 bg-plate-cyan"></span><span class="h-3.5 w-5.5 bg-plate-magenta"></span><span
					class="h-3.5 w-5.5 bg-plate-yellow"
				></span><span class="h-3.5 w-5.5 bg-ink"></span><span class="h-3.5 w-5.5 bg-muted"></span><span
					class="h-3.5 w-5.5 bg-line"
				></span>
			</div>
			<!-- atoms -->
			<div class={[plate, 'flex flex-wrap items-start gap-2 border-line p-3 [transform:translateZ(calc(10px_+_var(--p)*14px))]']}>
				<span class="h-4 w-14 rounded-xs bg-ink"></span><span class="box-border h-4 w-14 rounded-xs border border-ink"></span><span
					class="h-3 w-8.5 rounded-full bg-plate-magenta"
				></span>
			</div>
			<!-- molecules -->
			<div class={[plate, 'border-line p-3 [transform:translateZ(calc(20px_+_var(--p)*28px))]']}>
				<span class="box-border block h-13 w-22.5 rounded-sm border border-line p-1.5">
					<span class="mb-1.5 block h-1 w-10 bg-muted"></span><span class="mb-2 block h-2 w-15 bg-ink"></span><span
						class="block h-2 w-10 rounded-xs bg-ink"
					></span>
				</span>
			</div>
			<!-- organisms -->
			<div class={[plate, 'flex flex-col gap-2 border-line p-3 [transform:translateZ(calc(30px_+_var(--p)*42px))]']}>
				<span class="block h-2.5 bg-ink"></span>
				<span class="flex gap-1.5"
					><span class="h-11 flex-1 border border-line"></span><span class="h-11 flex-1 border border-line"></span><span
						class="h-11 flex-1 border border-line"
					></span></span
				>
			</div>
			<!-- screens -->
			<div class={[plate, 'flex flex-col gap-1.5 border-ink p-2.5 [transform:translateZ(calc(40px_+_var(--p)*56px))]']}>
				<span class="block h-2 bg-ink"></span>
				<span class="block h-3.5 w-[70%] bg-plate-cyan mix-blend-multiply dark:mix-blend-screen"></span>
				<span class="-mt-2 ml-[30%] block h-3.5 w-1/2 bg-plate-magenta mix-blend-multiply dark:mix-blend-screen"></span>
				<span class="mt-auto flex gap-1.5"><span class="h-9 flex-1 border border-line"></span><span class="h-9 flex-1 border border-line"></span></span>
			</div>
		</div>
	</div>
	<ol aria-hidden="true" class="m-0 flex list-none flex-col gap-[calc(8px_+_var(--p)*16px)] p-0 tracking-[.02em]">
		{#each labels as label (label)}<li><PlateLabel {label} size="caption" /></li>{/each}
	</ol>
	<div class="col-span-full"><FigureCaption variant="fig" label="FIG. 1" text={caption} /></div>
</figure>
