<script lang="ts">
	// Grow it's evolve thread (Landing.dc.html:290-311): YOU runs evolve, AGENT replies with the
	// change summary and the Changelog page it assembled. The words and the counts are the recorded
	// run in design/evolve-run. The release labels are the Changelog screen's measured versions.
	// Motion grow-assemble (manifest.motion): this figure runs the view timeline; ChangelogMini's
	// parts fly in with --p. At rest, and with reduced motion, the page is assembled.
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';
	import { changelogVersions } from '$lib/changelog';
	import ChangelogMini from '$lib/components/molecules/ChangelogMini.svelte';
	import FigureCaption from '$lib/components/molecules/FigureCaption.svelte';
	import ThreadRow from '$lib/components/molecules/ThreadRow.svelte';
	interface Props {
		command?: string;
		reply?: string;
		/** The change summary, in order (reuse, new, captured moved); rendered with muted dots between. */
		summary?: string[];
		versions?: [string, string, string];
		caption?: string;
		/** Pins assembly progress (0 to 1) for stories. */
		progress?: number;
	}

	let {
		command = '',
		reply = '',
		summary = [],
		versions = changelogVersions,
		caption = 'No evolve run is wired.',
		progress
	}: Props = $props();
</script>

<figure
	class={[
		'm-0',
		progress === undefined &&
			'supports-[animation-timeline:view()]:motion-safe:animate-progress supports-[animation-timeline:view()]:motion-safe:[animation-range:cover_5vh_cover_60vh] supports-[animation-timeline:view()]:motion-safe:[animation-timeline:view()]'
	]}
	style:--p={progress}
>
	<div class="flex flex-col gap-4.5 rounded-md border border-line bg-sheet p-5">
		<ThreadRow speaker="you" text={command} />
		<ThreadRow speaker="agent" text={reply}>
			<div class="flex flex-wrap gap-2.5 text-ink">
				{#each summary as item, i (i)}{#if i}<span class="font-mono text-code text-muted">·</span>{/if}<InlineCode text={item} size={13} />{/each}
			</div>
			<ChangelogMini {versions} />
			<p class="m-0"></p>
		</ThreadRow>
	</div>
	<div class="mt-2.5"><FigureCaption variant="mono" text={caption} /></div>
</figure>
