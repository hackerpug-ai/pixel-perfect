<script lang="ts">
	// The social image (Social preview.dc.html; manifest ui_states.social_card), rendered to og.png
	// at build. A fixed 1200x630 light-only card: data-theme="light" makes it a light island, so it
	// stays light on a dark page too. The export's crosshair lockup is the Logo atom (strategy D5);
	// the headline is statically misregistered; the slider is the handle-less ProofFrame at 50%.
	import CropMark from '$lib/components/atoms/CropMark.svelte';
	import Logo from '$lib/components/atoms/Logo.svelte';
	import PlateText from '$lib/components/atoms/PlateText.svelte';
	import SlugLine from '$lib/components/atoms/SlugLine.svelte';
	import PlanCard from '$lib/components/molecules/PlanCard.svelte';
	import ProofFrame from '$lib/components/molecules/ProofFrame.svelte';

	type Card = { label: string; price: string; period: string; features: string; action: string };

	interface Props {
		lead?: string;
		headline?: string;
		agents?: string[];
		card?: Card;
	}

	let {
		lead = 'Your mockup is a picture.',
		headline = 'Ship the system inside it.',
		agents = ['Claude Code', 'Codex', 'Cursor', 'Grok', 'OpenCode', 'Pi'],
		card = { label: 'TEAM PLAN', price: '$24', period: '/ month', features: 'Unlimited projects · 5 seats', action: 'Choose plan' }
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
		{#snippet design()}<div class="w-71"><PlanCard {...card} variant="frame-side" /></div>{/snippet}
		{#snippet built()}<div class="w-71"><PlanCard {...card} /></div>{/snippet}
	</ProofFrame>
</div>
