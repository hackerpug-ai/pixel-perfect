<script lang="ts">
	// An example-output panel beside each Build it step (Landing.dc.html:235-257): dark in both
	// themes, a header with the file name and an "Example output" plate label, then syntax-coloured
	// lines. Content is data; the page passes this site's own build output (run.json).
	// At phone width it scrolls sideways; the scroll area is focusable so keyboards can scroll it.
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';

	type Kind = 'plain' | 'key' | 'value' | 'comment' | 'success';
	type Token = [kind: Kind, text: string];

	interface Props {
		/** The header's left side: a file name, "terminal", or "status". */
		title: string;
		label?: string;
		/** One array of tokens per line. */
		lines: Token[][];
	}

	let { title, label = 'Example output', lines }: Props = $props();

	const colours: Record<Kind, string> = {
		plain: '',
		key: 'text-code-key',
		value: 'text-code-value',
		comment: 'text-code-comment',
		success: 'text-code-success'
	};
</script>

<div class="overflow-hidden rounded-md bg-code-bg text-code-fg">
	<div class="flex justify-between gap-4 border-b border-code-rule px-3.5 py-2">
		<PlateLabel label={title} tone="code" />
		<PlateLabel {label} tone="code" />
	</div>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<pre
		tabindex="0"
		aria-label="{title}, {label}"
		class="m-0 overflow-x-auto p-3.5 font-mono text-code focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-code-focus">{#each lines as line, i (i)}{#each line as [kind, text], j (j)}<span
					class={colours[kind]}>{text}</span
				>{/each}{#if i < lines.length - 1}{'\n'}{/if}{/each}</pre>
</div>
