<script lang="ts">
	// Demo video play control on the hatched poster (Landing.dc.html:265). The export's is an
	// aria-hidden placeholder; this one is a real button. The poster/video wiring is DemoStats' job.
	interface Props {
		label?: string;
		onplay?: () => void;
	}

	let { label = 'Play the demo', onplay }: Props = $props();
</script>

<button
	type="button"
	aria-label={label}
	onclick={onplay}
	class="grid size-14 cursor-pointer place-items-center rounded-full border border-ink bg-sheet text-ink hover:border-accent-text hover:text-accent-text focus-visible:shadow-[-3px_3px_0_0_var(--plate-cyan)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
>
	<svg aria-hidden="true" viewBox="0 0 16 20" class="ml-1 h-5 w-4 fill-current"><path d="M0 0 16 10 0 20Z" /></svg>
</button>
