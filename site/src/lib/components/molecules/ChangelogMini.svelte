<script lang="ts">
	// The Changelog page the evolve run assembles in Grow it: a bar, a title, and three release
	// rows (newest filled, older outlined) with line placeholders. Motion grow-assemble: each part
	// sits (1 - p) x its own offset away at 30% opacity and settles as --p reaches 1. The organism's
	// view timeline runs --p; at rest it is 1, so the page shows assembled.
	import VersionPill from '$lib/components/atoms/VersionPill.svelte';

	interface Props {
		/** The three release labels, newest first (placeholder: the release version at build time). */
		versions: [string, string, string];
		/** Pins scroll progress (0 to 1) for stories; the timeline sets it on the page. */
		progress?: number;
	}

	let { versions, progress }: Props = $props();

	// Each part moves by its own [--dx] [--dy] (manifest.motion grow-assemble offsets_px).
	const part =
		'translate-x-[calc((1_-_var(--p))*var(--dx))] translate-y-[calc((1_-_var(--p))*var(--dy))] opacity-[calc(.3_+_var(--p)*.7)]';
	const rows = [
		{ offset: '[--dx:-28px] [--dy:14px]', line: 'flex-1' },
		{ offset: '[--dx:34px] [--dy:4px]', line: 'flex-1' },
		{ offset: '[--dx:-18px] [--dy:20px]', line: 'w-3/5' }
	];
</script>

<div
	role="img"
	aria-label="A new Changelog page, assembled from existing parts"
	class="flex max-w-90 flex-col gap-2.5 border border-line bg-paper p-3.5"
	style:--p={progress}
>
	<div class={['h-2 w-full bg-ink [--dx:-40px] [--dy:-10px]', part]}></div>
	<div class={['font-display text-base leading-[inherit] font-bold [--dx:30px] [--dy:-6px]', part]}>Changelog</div>
	{#each rows as row, i (i)}
		<div class={['flex items-center gap-2', row.offset, part]}>
			<VersionPill label={versions[i]} variant={i === 0 ? 'filled' : 'outline'} />
			<span class={['h-1.5 bg-line', row.line]}></span>
		</div>
	{/each}
</div>
