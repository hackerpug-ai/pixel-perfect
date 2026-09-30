<script lang="ts">
	// The landing's plain display heading (PlateText owns the plate effect). Three recipes from the
	// export: section h2s (Why, Build it, Grow it, Install, Questions), the statement line
	// ('Your design survives your codebase.', a <p> in the export), and the DESIGN.md subhead (h3).
	// Margins and max-width belong to the section that places it.
	import type { Snippet } from 'svelte';

	type Variant = 'section' | 'statement' | 'subhead';

	interface Props {
		text?: string;
		variant?: Variant;
		as?: 'h2' | 'h3' | 'p';
		children?: Snippet;
	}

	const defaultElement: Record<Variant, 'h2' | 'h3' | 'p'> = { section: 'h2', statement: 'p', subhead: 'h3' };

	let { text = '', variant = 'section', as, children }: Props = $props();
</script>

<svelte:element
	this={as ?? defaultElement[variant]}
	class={[
		'm-0 font-display',
		variant === 'section' && 'text-display-md leading-[1.05] font-extrabold tracking-[-.01em] [font-stretch:115%]',
		variant === 'statement' && 'text-display-sm leading-[1.1] font-bold [font-stretch:110%]',
		variant === 'subhead' && 'text-[22px] font-bold [font-stretch:110%]'
	]}
>
	{#if children}{@render children()}{:else}{text}{/if}
</svelte:element>
