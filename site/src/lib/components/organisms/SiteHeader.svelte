<script lang="ts">
	// The sticky site header (Landing.dc.html:41-57) and, below md, the designed phone header
	// (manifest ui_states.mobile_header): the lockup, a mono "Install" link and the dot-only theme
	// toggle in the sticky row, then the non-sticky SectionStrip under it.
	// On another page (Changelog), `home` is the landing page's URL: it prefixes the logo's #top, the
	// phone Install link and every in-page (#) link, so they lead back to the landing's sections.
	// Stateful: the theme. It starts from the page (app.html sets data-theme before first paint, or
	// the system decides) and the toggle writes data-theme on <html> and remembers the choice.
	import { onMount } from 'svelte';
	import Logo from '$lib/components/atoms/Logo.svelte';
	import NavLink from '$lib/components/atoms/NavLink.svelte';
	import TextLink from '$lib/components/atoms/TextLink.svelte';
	import ThemeToggle from '$lib/components/atoms/ThemeToggle.svelte';
	import SectionStrip from '$lib/components/molecules/SectionStrip.svelte';

	type Link = { label: string; href: string; external?: boolean };

	interface Props {
		links?: Link[];
		/** The landing page's URL when the header sits on another page ('/' or the base path). '' on the landing. */
		home?: string;
		ontoggle?: (theme: 'light' | 'dark') => void;
	}

	let {
		links = [
			{ label: 'Why', href: '#why' },
			{ label: 'Build it', href: '#build' },
			{ label: 'Grow it', href: '#grow' },
			{ label: 'Install', href: '#install' },
			{ label: 'FAQ', href: '#faq' },
			{ label: 'GitHub', href: 'https://github.com/hackerpug-ai/pixel-perfect', external: true }
		],
		home = '',
		ontoggle
	}: Props = $props();

	let theme = $state<'light' | 'dark'>('light');

	onMount(() => {
		const set = document.documentElement.dataset.theme;
		theme = set === 'dark' || set === 'light' ? set : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	});

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			/* storage blocked: the choice lasts for this page only */
		}
		ontoggle?.(theme);
	}

	const resolved = $derived(links.map((l) => (l.href.startsWith('#') ? { ...l, href: home + l.href } : l)));
	const strip = $derived(resolved.map((l) => ({ ...l, label: l.label.toUpperCase() })));
</script>

<header class="sticky top-0 z-20 border-b border-line bg-paper">
	<nav aria-label="Main" class="mx-auto box-content flex h-15 max-w-page items-center gap-7 px-8 max-md:gap-3 max-md:px-4">
		<Logo variant="header" href="{home}#top" />
		<ul class="m-0 ml-auto flex list-none gap-5.5 p-0 max-md:hidden">
			{#each resolved as link (link.href)}
				<li><NavLink {...link} /></li>
			{/each}
		</ul>
		<span class="ml-auto md:hidden"><TextLink href="{home}#install" label="Install" variant="mono" /></span>
		<span class="md:ml-auto"><ThemeToggle {theme} iconOnly="mobile" ontoggle={toggle} /></span>
	</nav>
</header>
<div class="md:hidden"><SectionStrip items={strip} /></div>
