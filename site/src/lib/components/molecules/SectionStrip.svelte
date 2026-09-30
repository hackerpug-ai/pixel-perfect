<script lang="ts">
	// The phone section strip (manifest ui_states.mobile_header.row_2): a slug line of NavLinks under
	// the sticky header, 1px line below, scrolling sideways with no visible scrollbar. Not sticky.
	// The header organism shows it below md; it renders at any width so it can be reviewed.
	// py-1.5: the scroller clips overflow, so it leaves room for the 3px-offset focus outline.
	import NavLink from '$lib/components/atoms/NavLink.svelte';

	interface Props {
		items: { label: string; href: string; external?: boolean }[];
	}

	let { items }: Props = $props();
</script>

<nav aria-label="Sections" class="border-b border-line">
	<ul
		class="flex items-center gap-1.5 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
	>
		{#each items as item, i (item.href)}
			<li class="flex flex-none items-center gap-1.5">
				{#if i > 0}<span aria-hidden="true" class="font-mono text-label text-muted">·</span>{/if}
				<NavLink variant="strip" href={item.href} label={item.label} external={item.external} />
			</li>
		{/each}
	</ul>
</nav>
