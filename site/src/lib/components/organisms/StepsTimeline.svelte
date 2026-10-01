<script lang="ts">
	// Build it's four steps (Landing.dc.html:230-259): each StepCard beside its example CodePanel
	// (stacked at 720px and below), on a 2px rail. Motion build-rail (manifest.motion): this list runs
	// the view timeline; the magenta fill grows with --p and each StepCard brightens as the rail
	// reaches it. At rest, and with reduced motion, the rail is full and every step is bright.
	// The panels quote this site's own build (run.json): its manifest, scaffold, inventory, status.
	import CodePanel from '$lib/components/molecules/CodePanel.svelte';
	import StepCard from '$lib/components/molecules/StepCard.svelte';
	import { excerpts, type Token } from '$lib/run';

	type Step = { title: string; command: string; description: string; threshold: number; panel: { title: string; lines: Token[][] } };

	interface Props {
		steps?: Step[];
		/** Pins rail progress (0 to 1) for stories. */
		progress?: number;
	}

	let {
		steps = [
			{
				title: 'READ THE DESIGN',
				command: '/pixel-perfect:init my designs are in design/deck.html',
				description: 'Finds the frames, detects your framework, writes the manifest.',
				threshold: -0.1,
				panel: { title: 'design/manifest.json (excerpt)', lines: excerpts.manifest }
			},
			{
				title: 'SCAFFOLD THE SANDBOX',
				command: '/pixel-perfect:scaffold',
				description: 'A component browser in your framework, with the token stories already in it.',
				threshold: 0.2,
				panel: {
					title: 'terminal',
					lines: [
						[['success', 'created'], ['plain', '  src/app.css']],
						[['success', 'created'], ['plain', '  .storybook/main.ts']],
						[['success', 'created'], ['plain', '  src/lib/design-system/Colors.stories.svelte']],
						[['success', 'created'], ['plain', '  src/lib/design-system/Typography.stories.svelte']],
						[['comment', 'sandbox'], ['plain', '  http://localhost:6006']]
					]
				}
			},
			{
				title: 'BUILD THE LAYERS',
				command: '/pixel-perfect:build',
				description:
					'Writes the inventory first. Every item names the frames that justify it and the parts it composes. Then it builds, bottom layer first.',
				threshold: 0.45,
				panel: { title: 'design/inventory.json (excerpt)', lines: excerpts.inventory }
			},
			{
				title: 'CHECK THE PROOF',
				command: '/pixel-perfect:status',
				description:
					'A gate is a check of one layer against its frames. It runs once per layer, so the next layer starts from parts that already match.',
				threshold: 0.7,
				panel: { title: 'status', lines: excerpts.status }
			}
		],
		progress
	}: Props = $props();
</script>

<ol
	class={[
		'relative m-0 flex list-none flex-col gap-10 p-0 pl-7',
		progress === undefined &&
			'supports-[animation-timeline:view()]:motion-safe:animate-progress supports-[animation-timeline:view()]:motion-safe:[animation-range:cover_0%_cover_100%] supports-[animation-timeline:view()]:motion-safe:[animation-timeline:view(block_60vh_30vh)]'
	]}
	style:--p={progress}
>
	<li role="presentation" aria-hidden="true" class="absolute top-1 bottom-1 left-0 w-0.5 bg-line">
		<span class="block h-[calc(var(--p)*100%)] w-0.5 bg-accent"></span>
	</li>
	{#each steps as step, i (step.command)}
		<li class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-start gap-x-10 gap-y-6 max-md:grid-cols-1">
			<StepCard step={i + 1} title={step.title} command={step.command} description={step.description} threshold={step.threshold} />
			<CodePanel title={step.panel.title} label="This build" lines={step.panel.lines} />
		</li>
	{/each}
</ol>
