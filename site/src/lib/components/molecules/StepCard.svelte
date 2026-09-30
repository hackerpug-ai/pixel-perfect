<script lang="ts">
	// One step of the Build it timeline: the STEP label, the command, and what it does. The
	// StepsTimeline organism owns the rail, the list item and the paired CodePanel, and runs --p
	// (manifest.motion build-rail); this card only reads it, brightening from 50% as the rail
	// passes its threshold. At rest --p is 1, so the card shows at full opacity.
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';

	interface Props {
		/** Step number, 1 to 4. */
		step: number;
		/** The step's name, written as displayed (caps). */
		title: string;
		/** The command the step runs. */
		command: string;
		/** What the command does. */
		description: string;
		/** Rail progress at which this step starts to brighten (-0.10, 0.20, 0.45, 0.70 for steps 1 to 4). */
		threshold: number;
		/** Pins scroll progress (0 to 1) for stories; the timeline sets it on the page. */
		progress?: number;
	}

	let { step, title, command, description, threshold, progress }: Props = $props();
</script>

<div
	class="opacity-[clamp(.5,calc(.5_+_(var(--p)_-_var(--threshold))*5),1)]"
	style:--threshold={threshold}
	style:--p={progress}
>
	<div class="mb-2 flex"><PlateLabel label={`STEP ${step} · ${title}`} size="caption" /></div>
	<InlineCode text={command} variant="block" tone="ink" />
	<p class="mt-2.5 text-ui text-muted">{description}</p>
</div>
