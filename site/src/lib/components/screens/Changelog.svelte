<script lang="ts">
	// The Changelog page at /changelog: every release in the repository's CHANGELOG.md, newest first.
	// ChangelogMini draws it in miniature (a bar, the title, rows of pill and text); this is the full
	// page in Home's frame: 1200px of content plus the gutters, releases ruled apart. The bar links the
	// lockup home and offers the landing's primary action, Install. It is not SiteHeader, whose links
	// are in-page anchors on Home, and it does not stick: each release's margin slug does instead.
	// One route serves both widths; below 720px each release stacks.
	import { base } from '$app/paths';
	import Logo from '$lib/components/atoms/Logo.svelte';
	import SectionHeading from '$lib/components/atoms/SectionHeading.svelte';
	import TextLink from '$lib/components/atoms/TextLink.svelte';
	import ReleaseEntry from '$lib/components/molecules/ReleaseEntry.svelte';
	import SiteFooter from '$lib/components/organisms/SiteFooter.svelte';
	import { releases as changelog, type Release } from '$lib/changelog';

	interface Props {
		/** Newest first. Defaults to the repository's CHANGELOG.md, parsed at build time. */
		releases?: Release[];
	}

	let { releases = changelog }: Props = $props();

	const frame = 'mx-auto box-content max-w-page px-8 max-md:px-4';
</script>

<div class="min-h-screen overflow-x-clip bg-paper text-ink">
	<header class="border-b border-line">
		<nav aria-label="Main" class={[frame, 'flex h-15 items-center justify-between gap-4']}>
			<Logo variant="header" href="{base}/" />
			<TextLink href="{base}/#install" label="Install pixel-perfect" variant="ui" />
		</nav>
	</header>
	<main class={frame}>
		<div class="pt-20 pb-14 max-md:pt-12 max-md:pb-10">
			<SectionHeading text="Changelog" as="h1" />
			<p class="m-0 mt-4 max-w-150 text-pretty text-muted">
				What changed in each release of <span class="whitespace-nowrap">pixel-perfect</span>, newest first.
			</p>
		</div>
		<ol class="m-0 list-none p-0">
			{#each releases as release, i (release.version)}
				<li class="border-t border-line py-12 max-md:py-8"><ReleaseEntry {...release} latest={i === 0} /></li>
			{/each}
		</ol>
	</main>
	<div class={[frame, 'pb-16']}><SiteFooter /></div>
</div>
