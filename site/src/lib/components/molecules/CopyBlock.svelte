<script lang="ts">
	// A copyable command in the hero and the Install section (Landing.dc.html:97-108, 342-353).
	// card: the paste-to-agent line with its helper text. row: a bare command (npx skills add).
	// Stateful: the copy feedback (manifest ui_states.copy) — the label changes for 2 seconds without
	// moving anything, and a live region announces the result.
	import { untrack } from 'svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';
	import { CopyFeedback, COPY_LABELS, type CopyResult } from '$lib/copy.svelte';

	interface Props {
		command: string;
		variant?: 'card' | 'row';
		/** card only: the line under the command. */
		helper?: string;
		/** Starting feedback, for stories (copied, selected). */
		initialFeedback?: CopyResult | null;
		oncopy?: (result: CopyResult) => void;
	}

	let {
		command,
		variant = 'card',
		helper = 'Paste into any of the six agents.',
		initialFeedback = null,
		oncopy
	}: Props = $props();

	const feedback = new CopyFeedback(untrack(() => initialFeedback));
	let commandEl: HTMLElement | undefined = $state();

	async function copy() {
		await feedback.copy(command, commandEl);
		if (feedback.result) oncopy?.(feedback.result);
	}
</script>

<div
	class={[
		'rounded-md border border-line',
		variant === 'card' ? 'flex flex-col gap-2.5 bg-sheet px-4 py-3.5' : 'flex items-center justify-between gap-3 px-4 py-2.5'
	]}
>
	{#if variant === 'card'}
		<div class="flex items-start justify-between gap-3">
			<span bind:this={commandEl} class="min-w-0"><InlineCode text={command} variant="command" tone="ink" /></span>
			<Button label={feedback.label} reserve={COPY_LABELS} size="md" onclick={copy} />
		</div>
		<p class="m-0 text-code text-muted">{helper}</p>
	{:else}
		<span bind:this={commandEl} class="min-w-0"><InlineCode text={command} variant="command" tone="ink" /></span>
		<Button label={feedback.label} reserve={COPY_LABELS} variant="secondary" size="md" onclick={copy} />
	{/if}
	<span class="sr-only" aria-live="polite">{feedback.announcement}</span>
</div>
