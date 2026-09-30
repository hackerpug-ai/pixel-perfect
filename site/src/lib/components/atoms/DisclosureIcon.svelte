<script lang="ts">
	// FAQ summary glyph (manifest ui_states.faq_open): "+" muted when closed, "−" (U+2212)
	// accent-text when open. Mono, so both glyphs share one advance width and nothing shifts.
	// Hover is the parent's: give the summary the `group` class and the "+" turns accent-text.
	// aria-hidden: the native details/summary announces expanded and collapsed.
	interface Props {
		open?: boolean;
	}

	let { open = false }: Props = $props();
</script>

<span
	aria-hidden="true"
	class={['font-mono text-body font-medium', open ? 'text-accent-text' : 'text-muted group-hover:text-accent-text']}
	>{open ? '−' : '+'}</span
>
