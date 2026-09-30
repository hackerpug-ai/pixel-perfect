<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'Design System/Spacing',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component:
						"Tailwind's 4px step. These are the steps the landing uses; radius and layout tokens follow."
				}
			}
		}
	});

	const steps = [
		{ step: '1', px: 4, cls: 'w-1' },
		{ step: '1.5', px: 6, cls: 'w-1.5' },
		{ step: '2', px: 8, cls: 'w-2' },
		{ step: '2.5', px: 10, cls: 'w-2.5' },
		{ step: '3', px: 12, cls: 'w-3' },
		{ step: '3.5', px: 14, cls: 'w-3.5' },
		{ step: '4', px: 16, cls: 'w-4' },
		{ step: '4.5', px: 18, cls: 'w-4.5' },
		{ step: '5', px: 20, cls: 'w-5' },
		{ step: '6', px: 24, cls: 'w-6' },
		{ step: '8', px: 32, cls: 'w-8' },
		{ step: '10', px: 40, cls: 'w-10' },
		{ step: '16', px: 64, cls: 'w-16' },
		{ step: '24', px: 96, cls: 'w-24' }
	];
	const radii = [
		{ token: 'rounded-xs · 2px', cls: 'rounded-xs' },
		{ token: 'rounded-sm · 3px', cls: 'rounded-sm' },
		{ token: 'rounded-md · 4px', cls: 'rounded-md' },
		{ token: 'rounded-full', cls: 'rounded-full' }
	];
</script>

<Story name="Scale" asChild>
	<div class="bg-paper px-8 py-10 text-ink">
		<h2 class="mb-4 font-mono text-label text-muted uppercase">Spacing steps</h2>
		{#each steps as s (s.step)}
			<div class="mb-2 grid grid-cols-[120px_1fr] items-center gap-4">
				<code class="font-mono text-caption text-muted">{s.step} · {s.px}px</code>
				<div class={['h-3 bg-accent', s.cls]}></div>
			</div>
		{/each}

		<h2 class="mt-10 mb-4 font-mono text-label text-muted uppercase">Radius</h2>
		<div class="flex flex-wrap gap-6">
			{#each radii as r (r.token)}
				<div>
					<div class={['size-16 border border-ink bg-sheet', r.cls]}></div>
					<code class="mt-2 block font-mono text-caption text-muted">{r.token}</code>
				</div>
			{/each}
		</div>

		<h2 class="mt-10 mb-4 font-mono text-label text-muted uppercase">Layout</h2>
		<p class="m-0 text-small text-muted">
			Page max width <code class="font-mono text-ink">max-w-page</code> (1200px) · gutters 32px, 16px at the
			<code class="font-mono text-ink">md</code> breakpoint (720px) and below · header 60px.
		</p>
	</div>
</Story>
