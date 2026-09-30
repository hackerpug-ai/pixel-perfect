<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DriftComparison from './DriftComparison.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/DriftComparison',
		component: DriftComparison,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The approved card beside its drifted copy, with a note per proofreader’s mark. On scroll the copy drifts and the marks pop in (why-drift); at rest, and with reduced motion, it is fully drifted. Example content.'
				}
			}
		},
		argTypes: {
			card: { control: 'object' },
			notes: { control: 'object', description: 'One note per mark; code in backticks' },
			caption: { control: 'text' },
			progress: { control: { type: 'range', min: 0, max: 1, step: 0.05 }, description: 'Pins drift progress for stories' }
		}
	});
</script>

<Story name="Drifted" />
<Story name="Scroll start" args={{ progress: 0 }} />
<Story name="Mid drift" args={{ progress: 0.5 }} />
