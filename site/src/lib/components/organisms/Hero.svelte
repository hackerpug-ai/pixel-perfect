<script lang="ts">
	// The hero (Landing.dc.html:60-117): crop marks, the slug line and colour strip, the harness line,
	// the plate headline (load motion), the lede beside the install stack, the meta strip, then a figure
	// row. The gate keeps organisms out of organisms, so the figure row is a slot: Home fills it with
	// ProofSlider and LayerStack (inventory note). One column at 720px and below.
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import ColorStrip from '$lib/components/atoms/ColorStrip.svelte';
	import CropMark from '$lib/components/atoms/CropMark.svelte';
	import PlateText from '$lib/components/atoms/PlateText.svelte';
	import SlugLine from '$lib/components/atoms/SlugLine.svelte';
	import TextLink from '$lib/components/atoms/TextLink.svelte';
	import CopyBlock from '$lib/components/molecules/CopyBlock.svelte';
	import MetaStrip from '$lib/components/molecules/MetaStrip.svelte';
	import { release } from '$lib/run';
	import type { CopyResult } from '$lib/copy.svelte';

	interface Props {
		/** strategy D13: the primary line, or the alternate being tested. */
		headline?: 'primary' | 'alternate';
		/** Slug line version and date (default: this release, run.json). */
		version?: string;
		date?: string;
		harnesses?: string;
		lede?: string;
		pasteLine?: string;
		skillsLine?: string;
		/** The meta strip under the install stack: strings are text, objects are links. */
		meta?: (string | { label: string; href: string; external?: boolean })[];
		/** Starts the install card on its copy feedback (Home's 'copied' state). */
		pasteFeedback?: CopyResult | null;
		/** The figure row: ProofSlider and LayerStack, placed by Home. */
		figures?: Snippet;
	}

	let {
		headline = 'primary',
		version = `V${release.major}`,
		date = release.date,
		harnesses = 'An agent skill for Claude Code, Codex, Cursor, Grok, OpenCode, and Pi.',
		lede = 'pixel-perfect is an agent skill that reads every frame of a high-fidelity mockup and turns it into real components in your framework: tokens, atoms, molecules, organisms, and screens. Each layer is checked against the frames it came from before the next layer starts. After that, every new screen, from a mock or a single sentence, is built from the parts you already have.',
		pasteLine = 'Install pixel-perfect: fetch and follow https://github.com/hackerpug-ai/pixel-perfect/INSTALL.md',
		skillsLine = 'npx skills add hackerpug-ai/pixel-perfect',
		meta = [
			'MIT',
			'by Justin Rich',
			{ label: 'View source', href: 'https://github.com/hackerpug-ai/pixel-perfect', external: true },
			'Works in six agents',
			'Frameworks: SvelteKit, React, Expo, SwiftUI, GPUI, Ratatui, and any stack with a docs URL'
		],
		pasteFeedback = null,
		figures
	}: Props = $props();

	const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
</script>

<!-- Content-box like the export's sections: 1200px of content plus the gutters. -->
<div class="relative mx-auto box-content max-w-page px-8 pt-9 pb-16 max-md:px-4">
	{#each corners as corner (corner)}<CropMark {corner} />{/each}
	<div class="flex flex-wrap items-center justify-between gap-4">
		<SlugLine {version} {date} />
		<ColorStrip />
	</div>
	<p class="mt-10 mb-3.5 text-ui text-muted">{harnesses}</p>
	<div class="max-w-245">
		{#if headline === 'primary'}
			<PlateText
				as="h1"
				lead="Your mockup is a picture."
				text="Ship the system inside it."
				size="display-xl"
				stretch={118}
				motion="load"
			/>
		{:else}
			<PlateText
				as="h1"
				text="Turn a mockup into a design system your agent keeps building on."
				size="display-alt"
				stretch={118}
				motion="load"
			/>
		{/if}
	</div>
	<div class="mt-7 grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start gap-x-14 gap-y-10 max-md:grid-cols-1">
		<p class="m-0 max-w-160 text-lg text-pretty text-ink">{lede}</p>
		<div class="flex flex-col gap-2.5">
			<CopyBlock command={pasteLine} initialFeedback={pasteFeedback} />
			<CopyBlock command={skillsLine} variant="row" />
			<div class="flex flex-wrap items-center justify-between gap-3">
				<TextLink href="#install" label="Prefer your agent's own commands? See every install option." variant="small" />
				<Button label="See it build" href="#build" variant="secondary" size="md" />
			</div>
		</div>
	</div>
	<div class="mt-9"><MetaStrip items={meta} /></div>
	{#if figures}
		<div class="mt-10 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start gap-10 max-md:grid-cols-1">
			{@render figures()}
		</div>
	{/if}
</div>
