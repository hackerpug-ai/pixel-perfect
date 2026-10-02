<script module lang="ts">
	/** Newest three `## [x.y.z]` headings in the repository CHANGELOG.md at the 2026-10-01 evolve. */
	export const changelogVersions = ['9.2.0', '9.1.0', '9.0.0'] as [string, string, string];
</script>

<script lang="ts">
	// Changelog, the page added by /pixel-perfect:evolve "add a changelog page".
	// The body is ChangelogMini, the designed assembly (Landing.dc.html:298-304).
	// SiteHeader stays off this route: its hash links are not on the page.
	// The footer is the existing SiteFooter. No new part is introduced.
	import { base } from '$app/paths';
	import SectionHeading from '$lib/components/atoms/SectionHeading.svelte';
	import TextLink from '$lib/components/atoms/TextLink.svelte';
	import ChangelogMini from '$lib/components/molecules/ChangelogMini.svelte';
	import SiteFooter from '$lib/components/organisms/SiteFooter.svelte';

	const section = 'mx-auto box-content max-w-page scroll-mt-15 border-t border-line px-8 max-md:px-4';
</script>

<div class="min-h-screen overflow-x-clip bg-paper text-ink">
	<main>
		<section class={[section, 'border-t-0 py-24']}>
			<p class="m-0 mb-8">
				<TextLink href="{base}/" label="pixel-perfect" />
			</p>
			<div class="mb-8"><SectionHeading text="Changelog" /></div>
			<p class="m-0 mb-8 max-w-150 text-pretty">The three newest releases.</p>
			<ChangelogMini versions={changelogVersions} />
			<p class="m-0 mt-8">
				<TextLink
					href="https://github.com/hackerpug-ai/pixel-perfect/blob/main/CHANGELOG.md"
					label="Full changelog"
					external
				/>
			</p>
		</section>
		<section class={[section, 'pt-0 pb-16']}>
			<SiteFooter />
		</section>
	</main>
</div>
