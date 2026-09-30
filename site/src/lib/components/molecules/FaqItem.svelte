<script lang="ts">
	// One FAQ row (Landing.dc.html:393-400): a native <details> between rules. It owns `open`
	// (manifest state.declared); the prop only sets where it starts, so each item opens on its own
	// and several can be open. Open (ui_states.faq_open) shows the answer at once and turns the
	// glyph into an accent-text minus. The summary is a block control: outline plus cyan plate.
	import { untrack } from 'svelte';
	import DisclosureIcon from '$lib/components/atoms/DisclosureIcon.svelte';
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';

	type Part = string | { code: string };

	interface Props {
		question: string;
		/** The answer; pass parts to put a mono InlineCode run ({ code }) inside the prose. */
		answer: string | Part[];
		/** Initial state; the item owns it from then on. */
		open?: boolean;
	}

	let { question, answer, open: initialOpen = false }: Props = $props();

	// untrack: the prop is read once, on purpose; later prop changes do not reset the item.
	let open = $state(untrack(() => initialOpen));
	const parts = $derived(typeof answer === 'string' ? [answer] : answer);
</script>

<details bind:open class="border-b border-line">
	<summary
		class="group flex cursor-pointer list-none justify-between gap-4 py-4.5 text-body font-medium focus-visible:shadow-[-3px_3px_0_0_var(--plate-cyan)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus [&::-webkit-details-marker]:hidden"
		>{question}<DisclosureIcon {open} /></summary
	>
	<p class="max-w-160 pb-5 text-ui text-pretty text-muted">
		{#each parts as part, i (i)}{#if typeof part === 'string'}{part}{:else}<InlineCode text={part.code} size={14} />{/if}{/each}
	</p>
</details>
