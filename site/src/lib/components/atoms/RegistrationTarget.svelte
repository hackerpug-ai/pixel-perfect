<script lang="ts">
	interface Props {
		/** small: 14px muted target (proof frame panes). large: 40px ink target with a magenta centre pixel (component sheet). */
		size?: 'small' | 'large';
	}

	let { size = 'small' }: Props = $props();
</script>

<!-- A print device, not the logo. The 1px rules sit on the centre line: calc(50% - 0.5px). -->
<span
	aria-hidden="true"
	class={[
		'relative inline-block shrink-0',
		size === 'small' ? 'size-3.5 text-muted' : 'size-10 text-ink'
	]}
>
	<span
		class={[
			'absolute rounded-full border border-current',
			size === 'small' ? 'inset-0.5' : 'inset-1.5'
		]}
	></span>
	<span class="absolute inset-x-0 top-[calc(50%-0.5px)] h-px bg-current"></span>
	<span class="absolute inset-y-0 left-[calc(50%-0.5px)] w-px bg-current"></span>
	{#if size === 'large'}
		<span class="absolute top-[calc(50%-2px)] left-[calc(50%-2px)] size-1 bg-accent"></span>
	{/if}
</span>
