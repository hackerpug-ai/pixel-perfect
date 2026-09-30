<script lang="ts">
	// Site navigation link. header: the desktop nav (Landing.dc.html:48-53), 15px ink, no underline.
	// strip: the mobile section strip (manifest ui_states.mobile_header.row_2), mono caps 11px muted,
	// 44px touch target. Hover draws a 2px magenta rule 6px under the text (ui_states.hover).
	interface Props {
		href: string;
		label: string;
		external?: boolean;
		variant?: 'header' | 'strip';
		onclick?: (event: MouseEvent) => void;
	}

	let { href, label, external = false, variant = 'header', onclick }: Props = $props();
</script>

<a
	{href}
	{onclick}
	class={[
		'no-underline decoration-accent decoration-2 underline-offset-6 hover:underline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus',
		variant === 'header' && 'font-sans text-ui text-ink',
		variant === 'strip' && 'inline-flex min-h-11 items-center font-mono text-label tracking-[.06em] whitespace-nowrap text-muted uppercase'
	]}
	>{label}{#if external}&nbsp;<span aria-hidden="true">↗</span>{/if}</a
>
