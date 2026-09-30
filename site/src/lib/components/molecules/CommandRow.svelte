<script lang="ts">
	// One install command on the dark code panel under an install tab (Landing.dc.html:364-367).
	// Stateful: the copy feedback, as CopyBlock (manifest ui_states.copy).
	import { untrack } from 'svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';
	import { CopyFeedback, COPY_LABELS, type CopyResult } from '$lib/copy.svelte';

	interface Props {
		command: string;
		/** Starting feedback, for stories (copied, selected). */
		initialFeedback?: CopyResult | null;
		oncopy?: (result: CopyResult) => void;
	}

	let { command, initialFeedback = null, oncopy }: Props = $props();

	const feedback = new CopyFeedback(untrack(() => initialFeedback));
	let commandEl: HTMLElement | undefined = $state();

	async function copy() {
		await feedback.copy(command, commandEl);
		if (feedback.result) oncopy?.(feedback.result);
	}
</script>

<div class="flex items-center justify-between gap-3 rounded-md bg-code-bg px-3.5 py-2.5 text-code-fg">
	<span bind:this={commandEl} class="min-w-0"><InlineCode text={command} variant="command" /></span>
	<Button label={feedback.label} reserve={COPY_LABELS} variant="code" onclick={copy} />
	<span class="sr-only" aria-live="polite">{feedback.announcement}</span>
</div>
