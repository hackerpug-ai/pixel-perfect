<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RegistrationTarget from './RegistrationTarget.svelte';

	const { Story } = defineMeta({
		title: 'Components/RegistrationTarget',
		component: RegistrationTarget,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'The crosshair-in-circle registration target: a print device on proof frame panes, not the logo. Decorative (aria-hidden).'
				}
			}
		},
		argTypes: {
			size: {
				control: 'select',
				options: ['small', 'large'],
				description: 'small: 14px muted (proof frame panes). large: 40px ink with a magenta centre pixel'
			}
		},
		args: {
			size: 'small'
		}
	});
</script>

<Story name="Default" />
<Story name="Large" args={{ size: 'large' }} />
