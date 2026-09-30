<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'Design System/Motion',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component:
						'Motion and pattern tokens (manifest.motion). Load moments play once; scroll moments animate --p (0 → 1) on a view timeline and rest at the end state under reduced motion or where scroll timelines are unsupported. Scroll the canvas to see the progress bar fill.'
				}
			}
		}
	});
</script>

<Story name="Tokens" asChild>
	<div class="bg-paper px-8 py-10 text-ink">
		<h2 class="mb-4 font-mono text-label text-muted uppercase">Hatching — bg-hatch</h2>
		<div class="mb-10 h-24 w-80 border border-line bg-sheet bg-hatch"></div>

		<h2 class="mb-4 font-mono text-label text-muted uppercase">Plate registration — animate-plate + animate-ink (load)</h2>
		<p class="relative m-0 mb-10 inline-block font-display text-display-md leading-[1.05] font-extrabold [font-stretch:118%]">
			<span class="relative block motion-safe:animate-ink">Ship the system.</span>
			<span aria-hidden="true" class="absolute inset-0 text-plate-cyan opacity-0 mix-blend-multiply [--dx:-16px] [--dy:8px] motion-safe:animate-plate dark:mix-blend-screen">Ship the system.</span>
			<span aria-hidden="true" class="absolute inset-0 text-plate-magenta opacity-0 mix-blend-multiply [--dx:14px] [--dy:-7px] motion-safe:animate-plate dark:mix-blend-screen">Ship the system.</span>
			<span aria-hidden="true" class="absolute inset-0 text-plate-yellow opacity-0 mix-blend-multiply [--dx:4px] [--dy:13px] motion-safe:animate-plate dark:mix-blend-screen">Ship the system.</span>
		</p>

		<h2 class="mb-4 font-mono text-label text-muted uppercase">Flatten — animate-flat (load)</h2>
		<div class="mb-10 flex h-40 w-72 items-center justify-center perspective-[1100px]">
			<div class="h-24 w-44 border border-ink bg-sheet [transform:rotateX(58deg)_rotateZ(-32deg)] motion-safe:animate-flat"></div>
		</div>

		<h2 class="mb-4 font-mono text-label text-muted uppercase">Scroll progress — animate-progress on a view timeline</h2>
		<div class="h-[60vh]"></div>
		<div
			class="w-80 border border-line bg-sheet p-4 supports-[animation-timeline:view()]:motion-safe:animate-progress supports-[animation-timeline:view()]:motion-safe:[animation-timeline:view()] supports-[animation-timeline:view()]:motion-safe:[animation-range:cover_10vh_cover_65vh]"
		>
			<p class="m-0 mb-2 font-mono text-caption text-muted">--p fills as this crosses the viewport</p>
			<div class="h-2 bg-line">
				<div class="h-2 w-[calc(var(--p)*100%)] bg-accent"></div>
			</div>
		</div>
		<div class="h-[60vh]"></div>
	</div>
</Story>
