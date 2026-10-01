<script lang="ts">
	// The Why section's figure (Landing.dc.html:179-212): a real component from this build, the
	// install card, beside a drifted copy of it (strategy §9.2; the owner's decision 2026-09-30),
	// then the numbered notes for the four proofreader's marks. The drift is drawn the way drift
	// happens: the system's CopyBlock with ad-hoc overrides on top (padding 20, the invented drift
	// gray, a fifth button style, radius 5) — deliberately off-system, so they live here, not in
	// CopyBlock. Motion why-drift (manifest.motion): this figure runs the view timeline; the drift
	// and the marks read --p. At rest, and with reduced motion, it is fully drifted. Both cards are
	// illustrations, so they are inert. Stacks at 720px and below.
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';
	import ProofMark from '$lib/components/atoms/ProofMark.svelte';
	import CopyBlock from '$lib/components/molecules/CopyBlock.svelte';
	import FigureCaption from '$lib/components/molecules/FigureCaption.svelte';
	import ProofNote from '$lib/components/molecules/ProofNote.svelte';

	interface Props {
		/** The install card's command. */
		command?: string;
		/** One note per mark, in order; code goes in backticks. */
		notes?: string[];
		caption?: string;
		/** Pins drift progress (0 to 1) for stories. */
		progress?: number;
	}

	let {
		command = 'Install pixel-perfect: fetch and follow https://github.com/hackerpug-ai/pixel-perfect/INSTALL.md',
		notes = [
			'Padding 20 instead of 16.',
			'An invented gray, `#8A8F96`, not in the tokens.',
			'A fifth button style.',
			'Border radius 5 instead of 4.'
		],
		caption = 'Example drift, applied to a real component from this build.',
		progress
	}: Props = $props();

	// The overrides, by mark: 1 padding and 4 radius grow with --p; 2 the drift gray; 3 the button.
	const drift = [
		'[&>div]:rounded-[calc(4px_+_var(--p)*1px)] [&>div]:px-[calc(16px_+_var(--p)*4px)] [&>div]:py-[calc(14px_+_var(--p)*4px)]',
		'[&_p]:text-drift',
		'[&_button]:rounded-[5px] [&_button]:border-accent-text [&_button]:bg-transparent [&_button]:font-semibold [&_button]:text-accent-text'
	];
	// Mark positions on the card edge and pop-in points. Each pin sits beside what its note names: 1 the
	// padded corner, 2 the drift-gray helper line, 3 the restyled button (top right on the install card,
	// so 2 and 3 trade the export's places, where the plan card's button was at the bottom), 4 the radius.
	const marks = [
		{ n: 1, at: 'opacity-[clamp(0,calc((var(--p)_-_0.25)*8),1)] scale-[clamp(.5,calc(.5_+_(var(--p)_-_0.25)*4),1)]', pos: '-top-2.75 -left-2.75' },
		{ n: 2, at: 'opacity-[clamp(0,calc((var(--p)_-_0.4)*8),1)] scale-[clamp(.5,calc(.5_+_(var(--p)_-_0.4)*4),1)]', pos: '-right-2.75 bottom-5.5' },
		{ n: 3, at: 'opacity-[clamp(0,calc((var(--p)_-_0.55)*8),1)] scale-[clamp(.5,calc(.5_+_(var(--p)_-_0.55)*4),1)]', pos: 'top-3.5 -right-2.75' },
		{ n: 4, at: 'opacity-[clamp(0,calc((var(--p)_-_0.7)*8),1)] scale-[clamp(.5,calc(.5_+_(var(--p)_-_0.7)*4),1)]', pos: '-right-2.75 -bottom-2.75' }
	];
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
			<div inert><CopyBlock {command} /></div>
		</div>
		<div>
			<div class="mb-4"><PlateLabel label="DRIFTED" tone="accent" /></div>
			<div inert class={['relative', drift]}>
				<CopyBlock {command} />
				{#each marks as mark (mark.n)}
					<span class={['absolute block', mark.pos, mark.at]}><ProofMark number={mark.n} /></span>
				{/each}
			</div>
		</div>
	</div>
	<figcaption class="mt-4">
		<ol class="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-5 gap-y-2 p-0">
			{#each notes as text, i (i)}<ProofNote number={i + 1} {text} />{/each}
		</ol>
		<div class="mt-2.5"><FigureCaption variant="mono" as="div" text={caption} /></div>
	</figcaption>
</figure>
