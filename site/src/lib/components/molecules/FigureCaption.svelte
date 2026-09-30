<script lang="ts">
	// A figure's caption line (Landing.dc.html:149, 166, 211, 269, 307). Muted 14px text, with a
	// mono 12px PlateLabel run: leading ('FIG. 1'), trailing (the 'Example — …' note), or on its own.
	// Spacing above it belongs to the figure. `as="div"` when it sits inside another figcaption.
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';

	interface Props {
		/** fig: mono label, then text · example: text, then mono label · plain: text · mono: text in mono */
		variant?: 'fig' | 'example' | 'plain' | 'mono';
		text: string;
		/** The mono run for fig ('FIG. 1') and example ('Example — replaced by the real pair at launch.'). */
		label?: string;
		as?: 'figcaption' | 'div';
	}

	let { variant = 'plain', text, label = '', as = 'figcaption' }: Props = $props();
</script>

<svelte:element this={as} class={['text-muted', variant === 'mono' ? 'text-caption' : 'text-small']}>
	{#if variant === 'mono'}
		<PlateLabel label={text} size="caption" />
	{:else if variant === 'fig'}
		<PlateLabel {label} size="caption" /> &nbsp;{text}
	{:else if variant === 'example'}
		{text} <PlateLabel {label} size="caption" />
	{:else}
		{text}
	{/if}
</svelte:element>
