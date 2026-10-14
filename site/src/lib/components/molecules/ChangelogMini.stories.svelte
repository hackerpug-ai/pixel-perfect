<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ChangelogMini from './ChangelogMini.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/ChangelogMini',
		component: ChangelogMini,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The Changelog page the evolve run assembles: bar, title and three release rows. Its five parts fly in from scattered offsets as scroll progress runs 0 to 1; at rest it is assembled. The scattered state clips at the canvas edge, as the organism does on the page: the parts fly in from off-canvas.'
				}
			}
		},
		argTypes: {
			versions: { control: 'object', description: 'Three release labels, newest first (placeholder: the release version at build time)' },
			progress: {
				control: { type: 'range', min: 0, max: 1, step: 0.01 },
				description: 'Pins scroll progress; unset rests at 1 (assembled)'
			}
		},
		args: {
			versions: ['v10.0.0', 'v9.3.0', 'v9.2.0']
		}
	});
</script>

{#snippet clipped(args: { versions: [string, string, string]; progress?: number })}
	<div class="overflow-x-clip"><ChangelogMini {...args} /></div>
{/snippet}

<Story name="Default" />
<Story name="Scattered" args={{ progress: 0 }} template={clipped} />
