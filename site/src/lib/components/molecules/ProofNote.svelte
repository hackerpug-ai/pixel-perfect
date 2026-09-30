<script lang="ts">
	// A numbered note that explains one proofreader's mark (Landing.dc.html:205-210). It is a list
	// item: the host renders the <ol> (two columns at 1440, one at 390). Code in the note is written
	// in backticks and renders as InlineCode, e.g. 'An invented gray, `#8A8F96`, not in the tokens.'
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';

	interface Props {
		number: number;
		text: string;
	}

	let { number, text }: Props = $props();

	const parts = $derived(text.split('`'));
</script>

<li class="flex gap-2.5 text-small text-muted">
	<span class="font-mono text-accent-text">{number}</span>
	<span>
		{#each parts as part, i (i)}{#if i % 2}<InlineCode text={part} size={13} />{:else}{part}{/if}{/each}
	</span>
</li>
