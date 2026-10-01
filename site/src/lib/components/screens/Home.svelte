<script lang="ts">
	// Home, the landing page at / (Landing.dc.html). One route serves web-desktop (1440) and
	// web-mobile (390): below 720px every two-column row stacks, Fig. 1 hides, and the header turns
	// into the designed phone header. Sections follow the export's frame: 1200px of content plus the
	// gutters, 96px apart, ruled between; anchors clear the 60px sticky header. Organisms never hold
	// organisms, so the hero's figure row (ProofSlider, LayerStack) and the close (CloseCta then
	// SiteFooter) are placed here. The props drive the inventory's states for stories; the page
	// itself sets none (a link or the visitor's choice picks the install tab).
	import SectionHeading from '$lib/components/atoms/SectionHeading.svelte';
	import TextLink from '$lib/components/atoms/TextLink.svelte';
	import GrowCard from '$lib/components/molecules/GrowCard.svelte';
	import CloseCta from '$lib/components/organisms/CloseCta.svelte';
	import DemoStats from '$lib/components/organisms/DemoStats.svelte';
	import DesignMdPromo from '$lib/components/organisms/DesignMdPromo.svelte';
	import DriftComparison from '$lib/components/organisms/DriftComparison.svelte';
	import EvolveThread from '$lib/components/organisms/EvolveThread.svelte';
	import FaqList from '$lib/components/organisms/FaqList.svelte';
	import Hero from '$lib/components/organisms/Hero.svelte';
	import InstallSection from '$lib/components/organisms/InstallSection.svelte';
	import LayerStack from '$lib/components/organisms/LayerStack.svelte';
	import PrinciplesGrid from '$lib/components/organisms/PrinciplesGrid.svelte';
	import ProofSlider from '$lib/components/organisms/ProofSlider.svelte';
	import SiteFooter from '$lib/components/organisms/SiteFooter.svelte';
	import SiteHeader from '$lib/components/organisms/SiteHeader.svelte';
	import StepsTimeline from '$lib/components/organisms/StepsTimeline.svelte';
	import { cascadeLine } from '$lib/run';

	interface Props {
		/** strategy D13: the primary headline, or the alternate being tested. */
		headline?: 'primary' | 'alternate';
		/** Pins the install tab (stories). */
		installTab?: string;
		/** Indexes of the questions that start open (stories). */
		faqOpen?: number[];
		/** Starts the hero's install card on 'Copied ✓' (stories). */
		copied?: boolean;
	}

	let { headline = 'primary', installTab, faqOpen = [], copied = false }: Props = $props();

	const section = 'mx-auto box-content max-w-page scroll-mt-15 border-t border-line px-8 max-md:px-4';
</script>

<div class="min-h-screen overflow-x-clip bg-paper text-ink">
	<SiteHeader />
	<main>
		<section id="top" class="scroll-mt-15" aria-label="pixel-perfect">
			<Hero {headline} pasteFeedback={copied ? 'copied' : null}>
				{#snippet figures()}<ProofSlider /><LayerStack />{/snippet}
			</Hero>
		</section>

		<section id="why" class={[section, 'py-24']}>
			<div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start gap-12 max-md:grid-cols-1">
				<div>
					<div class="mb-5"><SectionHeading text="Designs die in translation." /></div>
					<p class="m-0 mb-4 max-w-130 text-pretty">
						You paste a screenshot into your agent and say "build this." The first screen comes out well. The second
						screen's card has different padding, a gray that isn't in the design, and a button that's almost the same.
						Nobody wrote down which colors are tokens, so the agent guessed.
					</p>
					<p class="m-0 max-w-130 text-pretty">
						Six weeks later there are four slightly different cards and no way to say which one is correct. The mockup
						is still right. The code drifted, one screen at a time.
					</p>
				</div>
				<DriftComparison />
			</div>
			<div class="mt-18"><PrinciplesGrid /></div>
		</section>

		<section id="build" class={[section, 'py-24']}>
			<div class="mb-3 max-w-200"><SectionHeading text="From mockup to system in four commands." /></div>
			<p class="m-0 mb-12 max-w-150 text-pretty text-muted">
				Point it at the design, scaffold a sandbox, build the layers, and read the report. Each layer is checked
				against its frames before the next one starts, so the report is the proof.
			</p>
			<StepsTimeline />
			<div class="mt-16"><DemoStats /></div>
		</section>

		<section id="grow" class={[section, 'py-24']}>
			<div class="mb-3 max-w-225"><SectionHeading text="Your next screen starts from the parts you already have." /></div>
			<p class="m-0 mb-12 max-w-150 text-pretty text-muted">
				The system is the deliverable, so it keeps going. Describe a page, or drop in a new mock, and the agent reuses
				what exists before it invents anything.
			</p>
			<div class="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start gap-10 max-md:grid-cols-1">
				<EvolveThread />
				<div class="flex flex-col gap-6">
					<GrowCard
						command="evolve"
						qualifier="with a new mock"
						description="Sorts each element into reuse, variant, new, promote, or remove, with an orphan sweep for removals. Confirms once. Proves by re-capture."
					/>
					<GrowCard
						command="refine"
						qualifier="with a token change"
						description="Change a token. Every component that uses it updates, and the gates confirm nothing else moved."
						cascade={cascadeLine}
					/>
					<GrowCard command="add-platform" description="The same system on a second platform, built from the same inventory." />
				</div>
			</div>
			<div class="mt-16"><DesignMdPromo /></div>
		</section>

		<section id="install" class={[section, 'py-24']}>
			<div class="flex flex-wrap items-baseline justify-between gap-4">
				<SectionHeading text="Install it in your agent." />
				<TextLink href="https://github.com/hackerpug-ai/pixel-perfect" label="View source" external />
			</div>
			<p class="m-0 mt-3 mb-8 max-w-150 text-muted">
				Read the skill before you install it. It's a folder of markdown and scripts in the open.
			</p>
			<InstallSection initialTab={installTab} />
		</section>

		<section id="faq" class={[section, 'py-24']}>
			<div class="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start gap-x-16 gap-y-8 max-md:grid-cols-1">
				<SectionHeading text="Questions" />
				<FaqList open={faqOpen} />
			</div>
		</section>

		<section id="close" class={[section, 'pt-24 pb-16']}>
			<CloseCta />
			<div class="mt-20"><SiteFooter /></div>
		</section>
	</main>
</div>
