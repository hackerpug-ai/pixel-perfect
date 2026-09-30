<script lang="ts">
	// The Build it stats (Landing.dc.html:272-279): a <dl> of Stats under a rule, then a mono note.
	// Auto-fit 90px columns give 4 + 1 in the 504px desktop column and 3 + 2 at 390.
	import Stat from '$lib/components/atoms/Stat.svelte';

	interface Props {
		/** The figures, in order. Values stay '[n]' until the dogfood run is measured. */
		stats: { label: string; value: string }[];
		/** The mono footnote under the grid; empty hides it. */
		note?: string;
	}

	let { stats, note = '' }: Props = $props();
</script>

<div>
	<dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-x-4 gap-y-5 border-t border-line pt-5">
		{#each stats as stat (stat.label)}
			<Stat label={stat.label} value={stat.value} />
		{/each}
	</dl>
	{#if note}
		<p class="mt-3 font-mono text-caption text-muted">{note}</p>
	{/if}
</div>
