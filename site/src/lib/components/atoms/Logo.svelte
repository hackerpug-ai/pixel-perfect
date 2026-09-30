<script lang="ts">
	import { asset } from '$app/paths';

	interface Props {
		/** header: mark A, the stacked plates (header, social card). footer: mark C, the registered P. */
		variant?: 'header' | 'footer';
		/** Anybody wordmark beside the mark. Defaults to on for header, off for footer. */
		showWordmark?: boolean;
		/** Makes the lockup a link (the header links it to #top). */
		href?: string;
	}

	let { variant = 'header', showWordmark = variant === 'header', href }: Props = $props();

	const mark = $derived(variant === 'header' ? 'A' : 'C');
	// With the wordmark the text names the link, so the mark is decorative. width/height are the
	// artwork ratio at display height (the export's 54 is overridden by width:auto there).
	const alt = $derived(showWordmark ? '' : 'pixel-perfect');
	const markClass = $derived(['w-auto', variant === 'header' ? 'h-7' : 'h-6']);
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	{href}
	class={[
		'inline-flex items-center gap-2.5 text-ink no-underline',
		href && 'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus'
	]}
>
	<img
		src={asset(`/brand/mark-${mark}-light.svg`)}
		{alt}
		width={variant === 'header' ? 40 : 20}
		height={variant === 'header' ? 28 : 24}
		class={[markClass, 'dark:hidden']}
	/>
	<img
		src={asset(`/brand/mark-${mark}-dark.svg`)}
		{alt}
		width={variant === 'header' ? 40 : 20}
		height={variant === 'header' ? 28 : 24}
		class={[markClass, 'hidden dark:block']}
	/>
	{#if showWordmark}
		<span
			class="font-display text-[19px] leading-none font-bold tracking-[-0.01em] [font-stretch:105%]"
			>pixel<span
				class="mx-[0.06em] inline-block h-[0.11em] w-[0.42em] bg-current align-[0.27em]"
				><span class="sr-only">-</span></span
			>perfect</span
		>
	{/if}
</svelte:element>
