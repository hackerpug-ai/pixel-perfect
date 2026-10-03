<script lang="ts">
	// Build it's closing row (Landing.dc.html:262-283): the demo beside the stats and the wireframe
	// line; stacks at 720px and below. The numbers are this site's own build (run.json).
	// The demo is a terminal recording (static/demo/demo.cast, made by scripts/record-demo.mjs) that
	// loops in asciinema-player. The cast carries its own colours, the page's code-panel ones.
	// Nothing is fetched until it starts. It starts when the frame scrolls into view, or on Play for
	// a visitor who prefers reduced motion. The catalog capture forces reduced motion, so the golden
	// is the idle poster. Home sets the space above it.
	import { onMount, tick } from 'svelte';
	import { base } from '$app/paths';
	import Button from '$lib/components/atoms/Button.svelte';
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';
	import PlayButton from '$lib/components/atoms/PlayButton.svelte';
	import FigureCaption from '$lib/components/molecules/FigureCaption.svelte';
	import StatGrid from '$lib/components/molecules/StatGrid.svelte';
	import demo from '$lib/demo.json';
	import { stats as runStats } from '$lib/run';

	interface Props {
		posterLabel?: string;
		caption?: string;
		stats?: { label: string; value: string }[];
		statsNote?: string;
		onplay?: () => void;
	}

	// What ran and how long it really took, from the recording's own record (demo.json).
	const ran = demo.commands.map((command) => command.replace('/pixel-perfect:', '').split(' ')[0]).join(', then ');
	const took = demo.realSeconds < 90 ? `${demo.realSeconds} seconds` : `${Math.round(demo.realSeconds / 60)} minutes`;

	let {
		posterLabel = 'terminal recording',
		caption = `Recorded run, sped up: ${ran}. ${took} in ${Math.round(demo.duration)} seconds.`,
		stats = runStats,
		statsNote = "Measured on this site's own build. Tokens counts new tokens; see the FAQ.",
		onplay
	}: Props = $props();

	let host = $state<HTMLDivElement | null>(null);
	let phase = $state<'idle' | 'loading' | 'playing' | 'paused'>('idle');
	let player: { play(): unknown; pause(): unknown; dispose(): void } | undefined;
	let visible = true; // false while less than half the frame is in view
	let held = false; // the visitor pressed Pause, so scrolling back into view must not resume
	let gone = false; // destroyed while the player was still loading
	const poster = $derived(phase === 'idle' || phase === 'loading');

	function run(on: boolean) {
		if (!player) return;
		if (on) player.play();
		else player.pause();
		phase = on ? 'playing' : 'paused';
	}

	async function start() {
		if (phase !== 'idle' || !host) return;
		phase = 'loading';
		try {
			// The player measures the font when it mounts, so the font loads first.
			const [{ create }] = await Promise.all([
				import('asciinema-player'),
				import('asciinema-player/dist/bundle/asciinema-player.css'),
				document.fonts.load('1em "IBM Plex Mono"')
			]);
			if (gone) return;
			player = create(`${base}/demo/demo.cast`, host, {
				autoPlay: true,
				loop: true,
				controls: false,
				fit: 'both',
				cols: demo.cols,
				rows: demo.rows,
				terminalFontFamily: "'IBM Plex Mono', ui-monospace, monospace"
			});
			// The poster goes now. If focus was on its Play button, it moves to the Pause button.
			const focused = host.parentElement?.contains(document.activeElement);
			phase = 'playing';
			onplay?.();
			if (!visible) run(false);
			if (focused) {
				await tick();
				host.closest('figure')?.querySelector('button')?.focus();
			}
		} catch (error) {
			phase = 'idle'; // the poster and Play are back, so the visitor can try again
			console.error(error);
		}
	}

	function toggle() {
		held = phase === 'playing';
		run(!held);
	}

	onMount(() => {
		// With reduced motion nothing moves until the visitor presses Play.
		const watch =
			host && !matchMedia('(prefers-reduced-motion: reduce)').matches
				? new IntersectionObserver(
						([entry]) => {
							visible = entry.intersectionRatio >= 0.5;
							if (!visible) {
								if (phase === 'playing') run(false);
							} else if (phase === 'idle') void start();
							else if (phase === 'paused' && !held) run(true);
						},
						// 0 as well as 0.5: Play pressed while the frame is mostly out of view still stops once it is gone.
						{ threshold: [0, 0.5] }
					)
				: undefined;
		if (host) watch?.observe(host);
		return () => {
			gone = true;
			watch?.disconnect();
			player?.dispose();
		};
	});
</script>

<div class="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start gap-10 max-md:grid-cols-1">
	<figure class="m-0" data-demo-state={phase}>
		<div class={['relative aspect-video overflow-hidden border border-line', poster ? 'bg-hatch' : 'bg-code-bg']}>
			<!-- Display only: the text churns and the player's own markup is focusable, so the terminal is inert and
			     hidden from assistive technology. The Pause button is the control. -->
			<div bind:this={host} inert aria-hidden="true" class="h-full w-full"></div>
			{#if poster}
				<div class="absolute inset-0 grid place-items-center">
					<div class="flex flex-col items-center gap-3">
						<PlayButton onplay={start} />
						<PlateLabel label={posterLabel} size="caption" />
					</div>
				</div>
			{/if}
		</div>
		<div class="mt-2.5 flex items-center justify-between gap-4">
			<FigureCaption text={caption} />
			{#if phase === 'playing' || phase === 'paused'}
				<Button variant="secondary" size="md" label={phase === 'playing' ? 'Pause' : 'Play'} onclick={toggle} />
			{/if}
		</div>
		<p class="sr-only">A terminal recording of pixel-perfect running {ran}.</p>
	</figure>
	<div>
		<StatGrid {stats} note={statsNote} />
		<p class="m-0 mt-8 text-ui text-pretty text-muted">
			No mockup yet? <InlineCode text="wireframe" tone="ink" /> turns a PRD into wireframes that <InlineCode text="build" tone="ink" /> reads
			the same way.
		</p>
	</div>
</div>
