<script lang="ts">
	// Build it's closing row (Landing.dc.html:262-283): the demo beside the stats and the wireframe
	// line; stacks at 720px and below. The numbers are this site's own build (run.json).
	// Play starts the recorded T8 run. The video stays mounted so playback can be observed.
	// The file is the uncut turn, about 185MB. The source is attached on Play so a page load does not fetch it.
	// Home sets the space above it.
	import { tick } from 'svelte';
	import { base } from '$app/paths';
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
		posterLabel = 'demo video',
		caption = 'Recorded run: init, build, sandbox, and one evolve.',
		stats = runStats,
		statsNote = "Measured on this site's own build. Tokens counts new tokens; see the FAQ.",
		onplay
	}: Props = $props();

	let video = $state<HTMLVideoElement | null>(null);
	let playing = $state(false);

	async function play() {
		playing = true;
		await tick();
		void video?.play();
		onplay?.();
	}
</script>

<div class="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start gap-10 max-md:grid-cols-1">
	<figure class="m-0">
		<div class="relative aspect-video overflow-hidden border border-line bg-ink">
			<video
				bind:this={video}
				class="h-full w-full object-contain"
				poster="{base}/demo/poster.png"
				muted
				playsinline
				preload="none"
				controls
			>
				{#if playing}<source src="{base}/demo/demo.mp4" type="video/mp4" />{/if}
				<track kind="captions" src="{base}/demo/demo.vtt" srclang="en" label="English" default />
			</video>
			{#if !playing}
				<div class="absolute inset-0 grid place-items-center">
					<div class="flex flex-col items-center gap-3">
						<PlayButton onplay={play} />
						<PlateLabel label={posterLabel} size="caption" />
					</div>
				</div>
			{/if}
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
