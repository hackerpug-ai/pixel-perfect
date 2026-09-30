<script lang="ts">
	// The page footer (Landing.dc.html:413-416): licence and links on the left, mark C on the right.
	// Home places it after CloseCta (siblings: the gate keeps organisms out of organisms).
	import Logo from '$lib/components/atoms/Logo.svelte';
	import TextLink from '$lib/components/atoms/TextLink.svelte';

	interface Props {
		licence?: string;
		links?: { label: string; href: string }[];
	}

	let {
		licence = 'MIT',
		links = [
			{ label: 'Changelog', href: 'https://github.com/hackerpug-ai/pixel-perfect/blob/main/CHANGELOG.md' },
			{ label: 'Upgrade guides', href: 'https://github.com/hackerpug-ai/pixel-perfect/tree/main/docs/upgrade' }
		]
	}: Props = $props();
</script>

<footer class="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-small text-muted">
	<div class="flex flex-wrap gap-5">
		<span>{licence}</span>
		{#each links as link (link.href)}<TextLink {...link} variant="small" />{/each}
	</div>
	<Logo variant="footer" />
</footer>
