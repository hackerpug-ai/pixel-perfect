<script lang="ts">
	// Scaffold's reference component: proves theme tokens, fonts, both themes, the focus style
	// (manifest ui_states.focus), and Storybook controls end to end. Not part of the landing.
	interface Props {
		title?: string;
		subtitle?: string;
		variant?: 'sheet' | 'accent';
		showSlug?: boolean;
		actionLabel?: string;
		onaction?: () => void;
	}

	let {
		title = 'Ship the system inside it.',
		subtitle = 'One pixel, registered.',
		variant = 'sheet',
		showSlug = true,
		actionLabel = 'Install pixel-perfect',
		onaction
	}: Props = $props();
</script>

<article
	class={[
		'max-w-xl border p-6',
		variant === 'sheet' && 'border-line bg-sheet text-ink',
		variant === 'accent' && 'border-accent-text bg-paper text-ink'
	]}
>
	{#if showSlug}
		<p class="m-0 mb-4 font-mono text-label tracking-[.02em] text-muted uppercase">
			pixel-perfect · hello world · scaffold
		</p>
	{/if}
	<h2 class="m-0 font-display text-display-sm leading-[1.05] font-extrabold tracking-[-.01em] [font-stretch:115%]">
		{title}
	</h2>
	{#if subtitle}
		<p class={['mt-2 mb-0 text-ui', variant === 'accent' ? 'text-accent-text' : 'text-muted']}>{subtitle}</p>
	{/if}
	<button
		type="button"
		onclick={onaction}
		class="mt-5 cursor-pointer rounded-sm border border-ink bg-ink px-5 py-3 font-sans text-ui font-medium text-paper hover:border-accent-text hover:bg-accent-text focus-visible:shadow-[-3px_3px_0_0_var(--plate-cyan)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
	>
		{actionLabel}
	</button>
</article>
