<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ProofMark from './ProofMark.svelte';

	const { Story } = defineMeta({
		title: 'Components/ProofMark',
		component: ProofMark,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						"Proofreader's mark: a numbered 22px magenta-ink disc that flags one drift on the Why section's example card."
				}
			}
		},
		argTypes: {
			number: { control: 'number', description: 'Mark number (matches the numbered note)' },
			visible: { control: 'boolean', description: 'Shown; false is the faded, half-scale start of the scroll pop-in' }
		},
		args: {
			number: 1,
			visible: true
		}
	});
</script>

<Story name="Default" />
<Story name="Mark 2" args={{ number: 2 }} />
<Story name="Mark 3" args={{ number: 3 }} />
<Story name="Mark 4" args={{ number: 4 }} />
<Story name="Hidden" args={{ visible: false }} />
