<script lang="ts">
	// Display text printed as a press proof: the ink text (the only text a screen reader reads)
	// plus three aria-hidden colour-plate copies (cyan, magenta, yellow) that blend with the page
	// (multiply on light, screen on dark). Motion follows manifest.motion:
	// - load: hero-plates-register. The copies slide into registration (animate-plate) and the ink
	//   prints over them (animate-ink). Reduced motion never runs it, so only the ink shows.
	// - scroll: close-register. The copies are offset by (1 - --p) and fade with opacity 1 - --p.
	//   The parent organism runs --p on a view timeline under motion-safe; here --p is only read.
	//   With reduced motion --p keeps its registered initial value (1), so only the ink shows.
	//   `progress` pins --p for stories (manifest motion.verify).
	// - static: the social card's permanent misregistration (--p fixed at 0), ink printed on top.
	type Size = 'display-sm' | 'display-md' | 'display-lg' | 'display-alt' | 'display-xl' | 'social';
	type Stretch = 100 | 105 | 110 | 115 | 118;
	type Motion = 'load' | 'scroll' | 'static';

	interface Props {
		text: string;
		lead?: string;
		as?: 'h1' | 'h2' | 'p';
		size?: Size;
		stretch?: Stretch;
		motion?: Motion;
		progress?: number;
	}

	let {
		text,
		lead = '',
		as = 'h1',
		size = 'display-xl',
		stretch = 118,
		motion = 'load',
		progress
	}: Props = $props();

	const sizes: Record<Size, string> = {
		'display-xl': 'text-display-xl leading-[1.02]',
		'display-alt': 'text-display-alt leading-[1.04]',
		'display-lg': 'text-display-lg leading-[1.02]',
		'display-md': 'text-display-md leading-[1.05]',
		'display-sm': 'text-display-sm leading-[1.1]',
		// The social card is a fixed 1200x630 image, so its headline does not scale with the viewport.
		social: 'text-[58px] leading-[1.02]'
	};

	const stretches: Record<Stretch, string> = {
		100: '[font-stretch:100%]',
		105: '[font-stretch:105%]',
		110: '[font-stretch:110%]',
		115: '[font-stretch:115%]',
		118: '[font-stretch:118%]'
	};

	// Offsets per moment: manifest.motion hero-plates-register, close-register, and the social export.
	const plates: { colour: string; offset: Record<Motion, string> }[] = [
		{
			colour: 'text-plate-cyan',
			offset: { load: '[--dx:-16px] [--dy:8px]', scroll: '[--dx:-18px] [--dy:9px]', static: '[--dx:-5px] [--dy:3px]' }
		},
		{
			colour: 'text-plate-magenta',
			offset: { load: '[--dx:14px] [--dy:-7px]', scroll: '[--dx:16px] [--dy:-8px]', static: '[--dx:4px] [--dy:-2px]' }
		},
		{
			colour: 'text-plate-yellow',
			offset: { load: '[--dx:4px] [--dy:13px]', scroll: '[--dx:5px] [--dy:14px]', static: '[--dx:1px] [--dy:4px]' }
		}
	];
</script>

<svelte:element
	this={as}
	class={[
		'm-0 font-display font-bold tracking-[-.01em] text-ink',
		size !== 'social' && 'text-balance', // the social export wraps greedily: 'system inside / it.'
		sizes[size],
		stretches[stretch]
	]}
>
	{#if lead}
		<span class={['block text-[.62em] text-muted [font-stretch:100%]', size === 'social' ? 'mb-[.25em]' : 'mb-[.22em]']}>{lead}</span>
	{/if}
	<span
		class={['relative inline-block font-extrabold', motion === 'static' && '[--p:0]']}
		style:--p={motion === 'scroll' ? progress : undefined}
	>
		<span class={['relative block', motion === 'load' && 'motion-safe:animate-ink', motion === 'static' && 'z-1']}>{text}</span>
		{#each plates as plate (plate.colour)}
			<span
				aria-hidden="true"
				class={[
					'absolute inset-0 mix-blend-multiply dark:mix-blend-screen',
					plate.colour,
					plate.offset[motion],
					motion === 'load'
						? 'opacity-0 motion-safe:animate-plate'
						: 'translate-x-[calc((1_-_var(--p))*var(--dx))] translate-y-[calc((1_-_var(--p))*var(--dy))] opacity-[calc(1_-_var(--p))]'
				]}>{text}</span
			>
		{/each}
	</span>
</svelte:element>
