<script lang="ts">
	// One release on the Changelog page; ChangelogMini draws it in miniature (a pill, then a line).
	// The version pill and date sit in a margin column from 720px, where they stay in view while a
	// long release scrolls by, and stack above the changes below it. The newest release's pill is
	// filled, older ones outlined (the mini's rule). Each group is a
	// plate label over a bulleted list (TouchList's recipe). A change keeps the changelog's markdown:
	// `code` renders as InlineCode, **bold** as strong, *emphasis* as em; bold may hold code.
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';
	import VersionPill from '$lib/components/atoms/VersionPill.svelte';

	type Run = { text: string; code?: boolean; strong?: boolean; em?: boolean };

	interface Props {
		/** As written in CHANGELOG.md, without the v: '9.2.0'. */
		version: string;
		/** Release date, YYYY-MM-DD. */
		date: string;
		/** Groups in file order (Added, Changed, Fixed, Removed); each item is one change. */
		groups: { heading: string; items: string[] }[];
		/** The newest release: a filled pill. Older releases are outlined. */
		latest?: boolean;
	}

	let { version, date, groups, latest = false }: Props = $props();

	// One change → runs of text. The split's odd parts are the marked runs; bold and emphasis
	// recurse so a run inside them (**`evolve`**) keeps its own mark.
	const MARKED = /(`[^`]+`|\*\*.+?\*\*|\*[^*\s][^*]*\*)/;
	function runs(text: string, marks: Omit<Run, 'text'> = {}): Run[] {
		return text.split(MARKED).flatMap((part, i) => {
			if (!part) return [];
			if (i % 2 === 0) return [{ ...marks, text: part }];
			if (part.startsWith('`')) return [{ ...marks, text: part.slice(1, -1), code: true }];
			if (part.startsWith('**')) return runs(part.slice(2, -2), { ...marks, strong: true });
			return runs(part.slice(1, -1), { ...marks, em: true });
		});
	}
</script>

{#snippet plain(run: Run)}{#if run.code}<InlineCode text={run.text} />{:else}{run.text}{/if}{/snippet}

<div class="grid grid-cols-1 gap-x-16 gap-y-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
	<div class="flex items-center gap-3 self-start md:sticky md:top-8">
		<h2 class="m-0 flex"><VersionPill label="v{version}" variant={latest ? 'filled' : 'outline'} /></h2>
		<time datetime={date} class="font-mono text-caption text-muted">{date}</time>
	</div>
	<div class="flex max-w-150 flex-col gap-7">
		{#each groups as group, g (g)}
			<div>
				<h3 class="m-0 mb-2 text-label"><PlateLabel label={group.heading.toUpperCase()} /></h3>
				<ul class="m-0 list-disc space-y-2 pl-4.5 text-ui text-pretty wrap-break-word text-ink">
					{#each group.items as item, i (i)}
						<li>{#each runs(item) as run, r (r)}{#if run.strong}<strong class="font-semibold">{@render plain(run)}</strong>{:else if run.em}<em>{@render plain(run)}</em>{:else}{@render plain(run)}{/if}{/each}</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</div>
