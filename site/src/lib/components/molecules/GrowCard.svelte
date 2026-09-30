<script lang="ts">
	// One of the three rule-topped command cards beside the evolve thread in Grow it: the command,
	// an optional muted qualifier, what it does, and (refine only) the mono cascade line.
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';

	interface Props {
		/** The command name. */
		command: string;
		/** Muted note after the command ('with a new mock'); omitted for add-platform. */
		qualifier?: string;
		/** What the command does. */
		description: string;
		/** Mono line under the description ('Cascades into: …'); refine only. */
		cascade?: string;
	}

	let { command, qualifier, description, cascade }: Props = $props();
</script>

<div class="border-t border-line pt-4">
	<div>
		<InlineCode text={command} size={14} tone="ink" />{#if qualifier}{' '}<span class="text-small text-muted"
				>{qualifier}</span
			>{/if}
	</div>
	<p class="mt-1.5 text-ui text-pretty">{description}</p>
	{#if cascade}
		<div class="mt-2"><InlineCode text={cascade} variant="block" size={13} tone="muted" /></div>
	{/if}
</div>
