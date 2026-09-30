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
						'The Changelog page the evolve run assembles: bar, title and three release rows. Its five parts fly in from scattered offsets as scroll progress runs 0 to 1; at rest it is assembled.'
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
			versions: ['v9.1', 'v9.0', 'v8.4']
		}
	});
</script>

<Story name="Default" />
<Story name="Scattered" args={{ progress: 0 }} />
