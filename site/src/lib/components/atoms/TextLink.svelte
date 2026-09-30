<script lang="ts">
	// Magenta text link (Landing.dc.html:26-27, 109, 116, 338, 410, 413). External links add a
	// decorative ↗. Inline, so focus is the outline only, no cyan plate (manifest ui_states.focus).
	interface Props {
		href: string;
		label: string;
		external?: boolean;
		variant?: 'ui' | 'small' | 'mono';
		onclick?: (event: MouseEvent) => void;
	}

	let { href, label, external = false, variant = 'small', onclick }: Props = $props();
</script>

<a
	{href}
	{onclick}
	class={[
		'text-accent-text underline decoration-1 underline-offset-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus',
		variant === 'ui' && 'font-sans text-ui',
		variant === 'small' && 'font-sans text-small',
		variant === 'mono' && 'font-mono text-code'
	]}
	>{label}{#if external}&nbsp;<span aria-hidden="true">↗</span>{/if}</a
>
