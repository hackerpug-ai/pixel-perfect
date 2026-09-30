<script lang="ts">
	interface Props {
		/** hero: 16x10 swatches (hero slug line). sheet: 20x14 swatches. */
		size?: 'hero' | 'sheet';
	}

	let { size = 'hero' }: Props = $props();

	// The four process inks, then each again at 50%. Tokens switch with the theme.
	const swatches = [
		'bg-plate-cyan',
		'bg-plate-magenta',
		'bg-plate-yellow',
		'bg-ink',
		'bg-plate-cyan opacity-50',
		'bg-plate-magenta opacity-50',
		'bg-plate-yellow opacity-50',
		'bg-ink opacity-50'
	];
</script>

<span aria-hidden="true" class="flex gap-0.5">
	{#each swatches as swatch (swatch)}
		<span class={[swatch, size === 'hero' ? 'h-2.5 w-4' : 'h-3.5 w-5']}></span>
	{/each}
</span>
