<script lang="ts">
	// Build it's closing row (Landing.dc.html:262-283): the demo poster (hatched 16:9 with PlayButton)
	// beside the stats and the wireframe line; stacks at 720px and below. The numbers are this site's
	// own build (run.json). The poster and its play button wait for the demo video (strategy T8):
	// kept as designed by the owner's decision (2026-09-30), the button plays nothing until then.
	// Home sets the space above it.
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';
	import PlayButton from '$lib/components/atoms/PlayButton.svelte';
	import FigureCaption from '$lib/components/molecules/FigureCaption.svelte';
	import StatGrid from '$lib/components/molecules/StatGrid.svelte';
	import { stats as runStats } from '$lib/run';

	interface Props {
		posterLabel?: string;
		caption?: string;
		stats?: { label: string; value: string }[];
		statsNote?: string;
		onplay?: () => void;
	}

	let {
		posterLabel = 'demo video · 60–90 s · poster frame',
		caption = 'One run, start to finish: init, scaffold, build, status.',
		stats = runStats,
		statsNote = "Measured on this site's own build. Tokens counts new tokens; see the FAQ.",
		onplay
	}: Props = $props();
</script>

<div class="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start gap-10 max-md:grid-cols-1">
	<figure class="m-0">
		<div class="relative grid aspect-video place-items-center border border-line bg-hatch">
			<div class="flex flex-col items-center gap-3">
				<PlayButton {onplay} />
				<PlateLabel label={posterLabel} size="caption" />
			</div>
		</div>
		<div class="mt-2.5"><FigureCaption text={caption} /></div>
	</figure>
	<div>
		<StatGrid {stats} note={statsNote} />
		<p class="m-0 mt-8 text-ui text-pretty text-muted">
			No mockup yet? <InlineCode text="wireframe" tone="ink" /> turns a PRD into wireframes that <InlineCode text="build" tone="ink" /> reads
			the same way.
		</p>
	</div>
</div>
