<script lang="ts">
	// One line of the evolve thread: the speaker label, then what they said. YOU says a command;
	// AGENT replies in prose (code in `backticks` renders as inline code), and the EvolveThread
	// organism passes the rest of the reply (change summary, ChangelogMini) as children.
	import type { Snippet } from 'svelte';
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';

	interface Props {
		speaker: 'you' | 'agent';
		/** YOU: the command. AGENT: the reply; `backticked` runs render as code. */
		text: string;
		/** AGENT only: more of the reply, stacked under the text. */
		children?: Snippet;
	}

	let { speaker, text, children }: Props = $props();
</script>

<div class="flex items-start gap-3">
	<span class="flex w-11 flex-none pt-0.75"><PlateLabel label={speaker === 'you' ? 'YOU' : 'AGENT'} /></span>
	{#if speaker === 'you'}
		<InlineCode {text} variant="block" tone="ink" />
	{:else}
		<div class="flex min-w-0 flex-1 flex-col gap-3">
			<p class="text-ui">
				{#each text.split('`') as part, i (i)}{#if i % 2}<InlineCode text={part} />{:else}{part}{/if}{/each}
			</p>
			{@render children?.()}
		</div>
	{/if}
</div>
