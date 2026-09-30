<script lang="ts">
	// The example pricing card (Landing.dc.html:124-137, 186-201; Social preview). It is placeholder
	// content (placeholder register: T21 supplies real pairs), so every text is a prop. The card is
	// always an illustration, never a real control, so it is inert: its 'Choose plan' is not a tab stop.
	// Width belongs to the host (the slider pane sizes it, the Why grid fills a column).
	//
	// drifted reads --p (manifest.motion why-drift): radius 4 → 5px, padding 16 → 20px, and the four
	// proofreader's marks pop in at p = .25, .40, .55, .70. At rest (p = 1) it is fully drifted.
	// The drift is drawn the way drift happens: the system parts with ad-hoc overrides on top — the
	// drift gray on the label, and the Button restyled into 'a fifth button style'.
	import Button from '$lib/components/atoms/Button.svelte';
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';
	import ProofMark from '$lib/components/atoms/ProofMark.svelte';

	interface Props {
		label: string;
		price: string;
		period: string;
		features: string;
		action: string;
		/** approved: the system card · drifted: off-system, with marks · frame-side: the hatched design pane's copy (0.9 opacity) */
		variant?: 'approved' | 'drifted' | 'frame-side';
		/** Scroll progress 0-1 for drifted; leave unset to inherit --p from the section's view timeline. */
		progress?: number;
	}

	let { label, price, period, features, action, variant = 'approved', progress }: Props = $props();

	const drifted = $derived(variant === 'drifted');

	// Mark positions on the card edge (export: 1 top-left corner, 2-4 down the right edge) and pop-in points.
	const marks = [
		{ n: 1, at: 'opacity-[clamp(0,calc((var(--p)_-_0.25)*8),1)] scale-[clamp(.5,calc(.5_+_(var(--p)_-_0.25)*4),1)]', pos: '-top-2.75 -left-2.75' },
		{ n: 2, at: 'opacity-[clamp(0,calc((var(--p)_-_0.4)*8),1)] scale-[clamp(.5,calc(.5_+_(var(--p)_-_0.4)*4),1)]', pos: 'top-3.5 -right-2.75' },
		{ n: 3, at: 'opacity-[clamp(0,calc((var(--p)_-_0.55)*8),1)] scale-[clamp(.5,calc(.5_+_(var(--p)_-_0.55)*4),1)]', pos: '-right-2.75 bottom-5.5' },
		{ n: 4, at: 'opacity-[clamp(0,calc((var(--p)_-_0.7)*8),1)] scale-[clamp(.5,calc(.5_+_(var(--p)_-_0.7)*4),1)]', pos: '-right-2.75 -bottom-2.75' }
	];
</script>

<div
	inert
	style:--p={progress}
	class={[
		'relative flex flex-col gap-3 border border-line bg-sheet text-ink',
		drifted
			? [
					'rounded-[calc(4px_+_var(--p)*1px)] p-[calc(16px_+_var(--p)*4px)]',
					// Off-system overrides: the PlateLabel (the card's only direct span) and the Button.
					'[&>span]:text-drift',
					'[&_button]:rounded-[5px] [&_button]:border-accent-text [&_button]:p-2.25 [&_button]:font-semibold [&_button]:text-accent-text'
				]
			: 'rounded-md p-4',
		variant === 'frame-side' && 'opacity-90'
	]}
>
	<PlateLabel {label} />
	<div class="font-display text-[26px] leading-none font-bold">
		{price}<span class={['font-sans text-code font-normal', drifted ? 'text-drift' : 'text-muted']}> {period}</span>
	</div>
	<div class={['text-code leading-(--text-body--line-height)', drifted ? 'text-drift' : 'text-muted']}>{features}</div>
	<Button label={action} size="sm" variant={drifted ? 'secondary' : 'primary'} />
	{#if drifted}
		{#each marks as mark (mark.n)}
			<div class={['absolute', mark.pos, mark.at]}>
				<ProofMark number={mark.n} />
			</div>
		{/each}
	{/if}
</div>
