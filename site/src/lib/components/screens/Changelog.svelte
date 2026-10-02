<script lang="ts">
	// Changelog, the release notes at /changelog: the repository's CHANGELOG.md set as another page of
	// the landing's proof sheet. ChangelogMini draws it in miniature (a bar, the title, release rows led
	// by a version pill, newest filled, older outlined). Each release is ruled off like Home's sections
	// and set like Home's Questions row: the version and date in a margin column that stays in view
	// while its release scrolls past (720px and up), the groups in a column held near 70 characters.
	// Below 720px the margin becomes a row above the groups. Organisms never hold organisms, so the
	// header and footer are placed here, as in Home; the footer sits outside <main> as the page's
	// contentinfo.
	import SiteHeader from '$lib/components/organisms/SiteHeader.svelte';
	import PlateText from '$lib/components/atoms/PlateText.svelte';
	import VersionPill from '$lib/components/atoms/VersionPill.svelte';
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';
	import TouchList from '$lib/components/molecules/TouchList.svelte';
	import SiteFooter from '$lib/components/organisms/SiteFooter.svelte';
	import { releases as changelog, type Release } from '$lib/changelog';

	interface Props {
		/** Releases, newest first. Defaults to the repository's CHANGELOG.md, read at build time. */
		releases?: Release[];
		/** The landing page's URL, for the header's links back ('/' or the base path). */
		home?: string;
	}

	let { releases = changelog, home = '/' }: Props = $props();

	const frame = 'mx-auto box-content max-w-page px-8 max-md:px-4';

	// TouchList renders `backticked` runs as code. Bold and italic markers outside those runs are
	// punctuation in the changelog source, not part of the sentence.
	function entry(text: string) {
		return text
			.split('`')
			.map((run, i) => (i % 2 ? run : run.replace(/\*+/g, '')))
			.join('`');
	}
</script>

<div class="min-h-screen overflow-x-clip bg-paper text-ink">
	<SiteHeader {home} />
	<main>
		<div class={[frame, 'pt-16 pb-14 max-md:pt-10 max-md:pb-10']}>
			<!-- Prints into registration on arrival, like Home's headline; reduced motion shows the ink only. -->
			<PlateText as="h1" text="Changelog" size="display-lg" stretch={118} motion="load" />
			<p class="m-0 mt-4 max-w-150 text-pretty text-muted">All notable changes to Pixel Perfect are documented here.</p>
		</div>
		{#each releases as release, i (release.version)}
			{@const id = `v${release.version}`}
			<section {id} class={[frame, 'scroll-mt-15 border-t border-line py-12 max-md:py-10']}>
				<div class="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start gap-x-16 gap-y-5 max-md:grid-cols-1">
					<div class="flex items-center gap-3 md:sticky md:top-21 md:flex-col md:items-start md:gap-2">
						<h2 class="m-0 flex"><VersionPill label={id} variant={i === 0 ? 'filled' : 'outline'} /></h2>
						<time datetime={release.date} class="flex"><PlateLabel label={release.date} /></time>
					</div>
					<!-- overflow-wrap inherits into the lists, so a long code path breaks instead of overflowing 390px. -->
					<div class="flex max-w-130 flex-col gap-8 wrap-break-word">
						{#each release.groups as group, j (j)}
							<TouchList label={group.heading.toUpperCase()} items={group.items.map(entry)} />
						{/each}
					</div>
				</div>
			</section>
		{/each}
	</main>
	<div class={[frame, 'pb-16']}><SiteFooter /></div>
</div>
