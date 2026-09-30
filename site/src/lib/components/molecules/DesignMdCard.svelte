<script lang="ts">
	// The generated DESIGN.md, shown as a document sheet in Grow it: a plate label, the title, then
	// a tokens list and a components list in two mono columns. Rows wrap to the left edge on narrow
	// screens, as the plain-text document would.
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';

	type Row = [name: string, value: string];

	interface Props {
		/** Plate label over the document. */
		label?: string;
		/** The document's title line. */
		title?: string;
		/** Token rows: name, value. */
		tokens: Row[];
		/** Component rows: name, variants or composition. */
		components: Row[];
	}

	let { label = 'DESIGN.md · GENERATED · EXAMPLE', title = 'design system', tokens, components }: Props = $props();

	// The export's two value columns start at 15ch (tokens) and 10ch (components).
	const lists = $derived([
		{ heading: '## tokens', rows: tokens, column: 'min-w-[15ch]' },
		{ heading: '## components', rows: components, column: 'min-w-[10ch]' }
	]);
</script>

<div class="border border-line bg-sheet px-7 py-6 font-mono text-code leading-[1.7] text-ink shadow-doc">
	<div class="mb-3 flex"><PlateLabel {label} /></div>
	<div class="text-base leading-[inherit] font-medium">{title}</div>
	{#each lists as list (list.heading)}
		<div class="mt-2.5 text-muted">{list.heading}</div>
		{#each list.rows as [name, value], i (i)}
			<div><span class={['inline-block pr-[2ch]', list.column]}>{name}</span>{value}</div>
		{/each}
	{/each}
</div>
