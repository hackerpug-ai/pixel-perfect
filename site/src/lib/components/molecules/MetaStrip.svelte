<script lang="ts">
	// The hero's meta line between two rules (Landing.dc.html:115-117): licence, author, the source
	// link, agent count, frameworks. One row at 1440; flex-wrap gives the three rows at 390.
	import TextLink from '$lib/components/atoms/TextLink.svelte';

	type Item = string | { label: string; href: string; external?: boolean };

	interface Props {
		/** In order; a string is plain text, an object renders a TextLink. */
		items: Item[];
	}

	let { items }: Props = $props();
</script>

<ul class="flex flex-wrap gap-x-5 gap-y-2 border-y border-line py-3 font-sans text-small text-muted">
	{#each items as item, i (i)}
		<li>
			{#if typeof item === 'string'}
				{item}
			{:else}
				<TextLink href={item.href} label={item.label} external={item.external} />
			{/if}
		</li>
	{/each}
</ul>
