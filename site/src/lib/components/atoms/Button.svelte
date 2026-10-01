<script lang="ts">
	// Action button (Landing.dc.html:100, 106, 110, 321, 366). Renders an <a> when given an href.
	// The label is a prop so a copy button can swap Copy / Copied ✓ / Selected (manifest ui_states.copy).
	// The button is as wide as its label, as the design draws it: a copy button widens for the 2 s its
	// feedback shows (the owner's decision 2026-09-30, so the hero's real pair lines up).
	interface Props {
		label: string;
		variant?: 'primary' | 'secondary' | 'code';
		size?: 'lg' | 'md' | 'sm';
		href?: string;
		onclick?: (event: MouseEvent) => void;
	}

	let { label, variant = 'primary', size = 'lg', href, onclick }: Props = $props();

	const classes = $derived([
		// The export inherits the page's 1.55 line height (font:inherit); pin it so no parent can change the box.
		'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm border font-sans leading-(--text-body--line-height) whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-3',
		variant === 'primary' &&
			'border-ink bg-ink font-medium text-paper hover:border-accent-text hover:bg-accent-text',
		variant === 'secondary' && 'border-line bg-transparent text-ink hover:border-ink hover:bg-sheet',
		variant !== 'code' && 'focus-visible:shadow-[-3px_3px_0_0_var(--plate-cyan)] focus-visible:outline-focus',
		// Sizes follow the export: lg is the CTA (15px, 12/20), md the copy buttons and 'See it build'
		// (14px, 36px min), sm the drawn example card's 'Choose plan' (13px, 9px all round; unused since the
		// card became the real install card). Padding includes the 1px border.
		variant !== 'code' && size === 'lg' && ['py-2.75 text-ui', variant === 'primary' ? 'px-4.75' : 'px-4'],
		variant !== 'code' && size === 'md' && ['min-h-9 px-3.5 text-small', variant === 'primary' ? 'py-2' : 'py-1.75'],
		variant !== 'code' && size === 'sm' && 'p-2 text-code',
		// On a code panel: always 13px; cyan is a syntax colour there, so focus is code-focus with no plate.
		variant === 'code' &&
			'min-h-8 border-code-control-border bg-transparent px-3 py-1.5 text-code text-code-fg hover:border-code-fg focus-visible:shadow-none focus-visible:outline-code-focus'
	]);
</script>


{#if href}
	<a {href} {onclick} class={classes}>{label}</a>
{:else}
	<button type="button" {onclick} class={classes}>{label}</button>
{/if}
