<script lang="ts">
	// Release pill from the Grow it changelog mock: the newest release filled with the accent,
	// older ones outlined in the line colour.
	interface Props {
		label: string;
		variant?: 'filled' | 'outline';
	}

	let { label, variant = 'filled' }: Props = $props();
</script>

<span
	class={[
		'inline-block rounded-full px-1.5 py-px text-pill',
		variant === 'filled' && 'bg-accent font-semibold text-on-accent',
		variant === 'outline' && 'border border-line'
	]}>{label}</span
>
