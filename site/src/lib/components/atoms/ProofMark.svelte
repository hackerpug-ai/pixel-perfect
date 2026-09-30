<script lang="ts">
	// Proofreader's mark: a numbered magenta-ink disc. The Why section's drift figure pops marks in
	// one by one on scroll (manifest.motion why-drift); that timing belongs to DriftComparison.
	// `visible` is the resting state it starts from (hidden: faded and scaled to half).
	interface Props {
		number: number;
		visible?: boolean;
	}

	let { number, visible = true }: Props = $props();
</script>

<span
	class={[
		'grid size-5.5 place-items-center rounded-full bg-accent-text font-mono text-caption font-medium text-on-accent',
		!visible && 'scale-50 opacity-0'
	]}>{number}</span
>
