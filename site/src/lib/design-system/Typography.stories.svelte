<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'Design System/Typography',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component:
						'Anybody (display, variable width), Libre Franklin (body), IBM Plex Mono (code and labels). Sizes are the roles the landing uses.'
				}
			}
		}
	});

	const display = [
		{ token: 'display-xl', cls: 'text-display-xl', stretch: '[font-stretch:118%]', sample: 'Ship the system inside it.' },
		{ token: 'display-alt', cls: 'text-display-alt', stretch: '[font-stretch:118%]', sample: 'Turn a mockup into a system.' },
		{ token: 'display-lg', cls: 'text-display-lg', stretch: '[font-stretch:118%]', sample: 'Your next mockup has a system inside it.' },
		{ token: 'display-md', cls: 'text-display-md', stretch: '[font-stretch:115%]', sample: 'Designs die in translation.' },
		{ token: 'display-sm', cls: 'text-display-sm', stretch: '[font-stretch:110%]', sample: 'Your mockup is a picture.' }
	];
	const widths = [
		{ pct: '100%', cls: '[font-stretch:100%]' },
		{ pct: '105%', cls: '[font-stretch:105%]' },
		{ pct: '110%', cls: '[font-stretch:110%]' },
		{ pct: '115%', cls: '[font-stretch:115%]' },
		{ pct: '118%', cls: '[font-stretch:118%]' }
	];
	const text = [
		{ token: 'body · 17/1.55', cls: 'font-sans text-body', sample: 'pixel-perfect reads every frame of a high-fidelity mockup and turns it into real components.' },
		{ token: 'ui · 15', cls: 'font-sans text-ui', sample: 'Why · Build it · Grow it · Install · FAQ' },
		{ token: 'small · 14', cls: 'font-sans text-small', sample: 'Paste into any of the six agents.' },
		{ token: 'code · 13/1.6', cls: 'font-mono text-code', sample: 'npx skills add hackerpug-ai/pixel-perfect' },
		{ token: 'caption · 12', cls: 'font-mono text-caption', sample: 'STEP 1 · READ THE DESIGN' },
		{ token: 'label · 11', cls: 'font-mono text-label uppercase tracking-[.02em]', sample: 'Pixel-perfect · v9 · proof sheet' }
	];
</script>

<Story name="Scale" asChild>
	<div class="bg-paper px-8 py-10 text-ink">
		<h2 class="mb-6 font-mono text-label text-muted uppercase">Display — Anybody</h2>
		{#each display as d (d.token)}
			<div class="mb-6 grid grid-cols-[140px_1fr] items-baseline gap-6 border-b border-line pb-6">
				<code class="font-mono text-caption text-muted">{d.token}</code>
				<p class={['m-0 font-display leading-[1.02] font-extrabold tracking-[-.01em]', d.cls, d.stretch]}>{d.sample}</p>
			</div>
		{/each}

		<h2 class="mt-10 mb-4 font-mono text-label text-muted uppercase">Anybody width stops (weight 800)</h2>
		<div class="mb-10 flex flex-wrap gap-8">
			{#each widths as w (w.pct)}
				<div>
					<p class={['m-0 font-display text-display-sm font-extrabold', w.cls]}>Proof</p>
					<code class="font-mono text-caption text-muted">wdth {w.pct}</code>
				</div>
			{/each}
		</div>

		<h2 class="mb-6 font-mono text-label text-muted uppercase">Text — Libre Franklin and IBM Plex Mono</h2>
		{#each text as t (t.token)}
			<div class="mb-4 grid grid-cols-[140px_1fr] items-baseline gap-6">
				<code class="font-mono text-caption text-muted">{t.token}</code>
				<p class={['m-0', t.cls]}>{t.sample}</p>
			</div>
		{/each}
	</div>
</Story>
