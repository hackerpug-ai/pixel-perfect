<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'Design System/Colors',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component:
						'Press proof palette. Surfaces and roles switch with the theme; code-panel colours stay dark in both. Use the toolbar Theme switch to check the dark values.'
				}
			}
		}
	});

	// Full class names so Tailwind generates each swatch.
	const groups = [
		{
			name: 'Surfaces',
			note: 'The proof sheet: page, card, text, secondary text, rules, hatching.',
			swatches: [
				{ token: 'paper', cls: 'bg-paper', use: 'Page background' },
				{ token: 'sheet', cls: 'bg-sheet', use: 'Cards and panels' },
				{ token: 'ink', cls: 'bg-ink', use: 'Text, primary button' },
				{ token: 'muted', cls: 'bg-muted', use: 'Secondary text' },
				{ token: 'line', cls: 'bg-line', use: 'Rules and borders' },
				{ token: 'stripe', cls: 'bg-stripe', use: 'Design-frame hatching' }
			]
		},
		{
			name: 'Roles',
			note: 'What interaction uses. Magenta is the only action colour.',
			swatches: [
				{ token: 'accent', cls: 'bg-accent', use: 'Divider, handle, pills' },
				{ token: 'accent-text', cls: 'bg-accent-text', use: 'Links, labels, badges' },
				{ token: 'on-accent', cls: 'bg-on-accent', use: 'Text on accent fills' },
				{ token: 'focus', cls: 'bg-focus', use: 'Focus ring on paper and sheet' }
			]
		},
		{
			name: 'Plates',
			note: 'The four process inks, for plate effects and the colour strip only. Yellow is never body or interface text.',
			swatches: [
				{ token: 'plate-cyan', cls: 'bg-plate-cyan', use: 'Cyan plate' },
				{ token: 'plate-cyan-ink', cls: 'bg-plate-cyan-ink', use: 'Text-safe cyan' },
				{ token: 'plate-magenta', cls: 'bg-plate-magenta', use: 'Magenta plate' },
				{ token: 'plate-magenta-ink', cls: 'bg-plate-magenta-ink', use: 'Text-safe magenta' },
				{ token: 'plate-yellow', cls: 'bg-plate-yellow', use: 'Yellow plate' }
			]
		},
		{
			name: 'Code panels',
			note: 'Dark in both themes.',
			swatches: [
				{ token: 'code-bg', cls: 'bg-code-bg', use: 'Panel background' },
				{ token: 'code-fg', cls: 'bg-code-fg', use: 'Panel text' },
				{ token: 'code-comment', cls: 'bg-code-comment', use: 'Comments, panel header' },
				{ token: 'code-rule', cls: 'bg-code-rule', use: 'Header rule' },
				{ token: 'code-control-border', cls: 'bg-code-control-border', use: 'Copy button border' },
				{ token: 'code-key', cls: 'bg-code-key', use: 'Keys' },
				{ token: 'code-value', cls: 'bg-code-value', use: 'Values' },
				{ token: 'code-success', cls: 'bg-code-success', use: 'Success output' },
				{ token: 'code-focus', cls: 'bg-code-focus', use: 'Focus ring on panels' }
			]
		},
		{
			name: 'Special',
			note: 'Used in exactly one place.',
			swatches: [{ token: 'drift', cls: 'bg-drift', use: "The drifted card's off-system gray" }]
		}
	];
</script>

<Story name="Palette" asChild>
	<div class="bg-paper px-8 py-10 text-ink">
		{#each groups as group (group.name)}
			<section class="mb-10">
				<h2 class="font-display text-display-sm font-extrabold [font-stretch:115%]">{group.name}</h2>
				<p class="mt-1 mb-4 text-small text-muted">{group.note}</p>
				<div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
					{#each group.swatches as s (s.token)}
						<figure class="m-0 border border-line bg-sheet">
							<div class={['h-16 border-b border-line', s.cls]}></div>
							<figcaption class="p-2.5">
								<code class="block font-mono text-caption text-ink">{s.token}</code>
								<span class="text-caption text-muted">{s.use}</span>
							</figcaption>
						</figure>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</Story>
