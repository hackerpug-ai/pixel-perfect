<script lang="ts">
	// One "What it touches" column in Install (Landing.dc.html:380-382): a mono plate label over a
	// bulleted list. An item may lead with a mono path ({ code, text }), as WRITES does. In a text
	// item, `backticked` runs render as inline code (the Changelog's entries), as ThreadRow does.
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';

	type Item = string | { code: string; text?: string };

	interface Props {
		/** The plate label, as displayed: READS, WRITES or RUNS. */
		label: string;
		items: Item[];
	}

	let { label, items }: Props = $props();

	const id = $props.id();
</script>

<div>
	<div id="{id}-label" class="mb-2 text-label">
		<PlateLabel {label} />
	</div>
	<ul aria-labelledby="{id}-label" class="list-disc pl-4.5 text-ui text-ink">
		{#each items as item, i (i)}
			<li>
				{#if typeof item === 'string'}
					{#each item.split('`') as part, j (j)}{#if j % 2}<InlineCode text={part} />{:else}{part}{/if}{/each}
				{:else}
					<InlineCode text={item.code} />{#if item.text}{` ${item.text}`}{/if}
				{/if}
			</li>
		{/each}
	</ul>
</div>
