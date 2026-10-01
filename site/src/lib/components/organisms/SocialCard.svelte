<script lang="ts">
	// The social image (Social preview.dc.html; manifest ui_states.social_card), rendered to og.png
	// at build. A fixed 1200x630 light-only card: data-theme="light" makes it a light island, so it
	// stays light on a dark page too. The export's crosshair lockup is the Logo atom (strategy D5);
	// the headline is statically misregistered; the slider is the handle-less ProofFrame at 50% with
	// the real pair (the install card as designed beside the live CopyBlock; the owner's decision
	// 2026-09-30), staged at the card's 545px design width and zoomed to fit the 440px pane.
	import CropMark from '$lib/components/atoms/CropMark.svelte';
	import Logo from '$lib/components/atoms/Logo.svelte';
	import PlateText from '$lib/components/atoms/PlateText.svelte';
	import SlugLine from '$lib/components/atoms/SlugLine.svelte';
	import { asset } from '$app/paths';
	import CopyBlock from '$lib/components/molecules/CopyBlock.svelte';
	import ProofFrame from '$lib/components/molecules/ProofFrame.svelte';

	interface Props {
		lead?: string;
		headline?: string;
		agents?: string[];
		/** The install card's command. */
		command?: string;
	}

	let {
		lead = 'Your mockup is a picture.',
		headline = 'Ship the system inside it.',
		agents = ['Claude Code', 'Codex', 'Cursor', 'Grok', 'OpenCode', 'Pi'],
		command = 'Install pixel-perfect: fetch and follow https://github.com/hackerpug-ai/pixel-perfect/INSTALL.md'
	}: Props = $props();

	const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
</script>

<div
	data-theme="light"
	class="relative box-border grid h-[630px] w-[1200px] grid-cols-[1fr_440px] items-center gap-12 overflow-hidden bg-paper px-14 py-12 text-ink"
>
	{#each corners as corner (corner)}<CropMark {corner} size="social" />{/each}
	<div class="flex flex-col gap-7">
		<Logo />
		<PlateText as="p" {lead} text={headline} size="social" motion="static" />
		<SlugLine variant="agent" {agents} />
	</div>
	<ProofFrame split={50}>
		{#snippet design()}
			<img src={asset('/proof/install-card-desktop-light.png')} alt="The install card as drawn in the design" width="545" height="121" class="block [zoom:0.745]" />
		{/snippet}
		{#snippet built()}<div inert class="w-[545px] [zoom:0.745]"><CopyBlock {command} /></div>{/snippet}
	</ProofFrame>
</div>
