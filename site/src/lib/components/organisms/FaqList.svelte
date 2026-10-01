<script lang="ts">
	// The questions (Landing.dc.html:393-401): FaqItems between rules. Each item owns its open state
	// (native details; several can be open). Home places the 'Questions' heading beside it at 1440
	// (1:2 grid) and above it at 390.
	import FaqItem from '$lib/components/molecules/FaqItem.svelte';
	import { numbers, release, short } from '$lib/run';

	type Part = string | { code: string };

	interface Props {
		items?: { question: string; answer: string | Part[] }[];
		/** Indexes of the items that start open (stories). */
		open?: number[];
	}

	let {
		items = [
			{
				question: 'Why not just prompt my agent?',
				answer:
					'Prompting works for one screen and breaks on the second. The agent has no record of which values are tokens and which parts already exist, so each screen is a fresh guess. pixel-perfect writes that record down as code, then checks every new layer against the design before moving on.'
			},
			{
				question: 'What happens when the design changes?',
				answer: [
					'Run ',
					{ code: 'evolve' },
					' with the new mock. Each element is sorted into reuse, variant, new, promote, or remove, you confirm once, and a re-capture shows exactly which components moved.'
				]
			},
			{
				question: 'How many tokens does it use?',
				answer: `This site's own build read a ${numbers.frames}-frame design and used ${short(numbers.tokens)} new tokens across ${numbers.minutes} active minutes, plus ${short(numbers.cachedTokens)} tokens of cached context re-read between turns. Frames are read once and cached, so evolve and refine runs cost a fraction of the first build.`
			},
			{
				question: 'Does it work with my stack?',
				answer:
					"If your stack has a docs URL, yes. SvelteKit, React, Expo, SwiftUI, GPUI, and Ratatui have been built with it. Where Storybook doesn't run, it generates a native sandbox in your framework instead."
			},
			{
				question: 'Will it lock me in?',
				answer:
					'No. The output is plain code in your repository plus a DESIGN.md. Delete the skill and everything it built still works, because nothing depends on it at runtime.'
			},
			{
				question: `It's at version ${release.major}. Is it stable?`,
				answer:
					'The command surface is stable and version-locked across all six agents. The major number counts breaking changes to the inventory format, and each one ships with an upgrade guide.'
			},
			{
				question: "Don't gates make this slow?",
				answer:
					'They make the next step faster. A gate runs once per layer, so every layer is built on parts that already match, and later changes are cheap: change a token, every component that uses it updates, and the gates confirm nothing else moved.'
			},
			{
				question: "How is this different from v0, Claude Design, or Figma's MCP?",
				answer:
					'Those produce the design. pixel-perfect starts where they stop: it takes their output as input and turns it into a component system in your repository that keeps growing with every screen.'
			}
		],
		open = []
	}: Props = $props();
</script>

<div class="border-t border-line">
	{#each items as item, i (item.question)}<FaqItem {...item} open={open.includes(i)} />{/each}
</div>
