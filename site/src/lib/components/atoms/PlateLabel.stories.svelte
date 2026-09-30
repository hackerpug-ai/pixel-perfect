<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PlateLabel from './PlateLabel.svelte';

	const { Story } = defineMeta({
		title: 'Components/PlateLabel',
		component: PlateLabel,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: {
				description: {
					component:
						'A mono plate label, the eyebrow over panes, cards, steps and lists. Muted by default, magenta-ink for drift, code-comment on code panel headers.'
				}
			}
		},
		argTypes: {
			label: { control: 'text', description: 'Label text, as displayed' },
			tone: {
				control: 'select',
				options: ['muted', 'accent', 'code'],
				description: 'muted (default), accent (magenta-ink), code (code-comment, on a code panel)'
			},
			size: {
				control: 'select',
				options: ['label', 'caption'],
				description: 'label: 11px. caption: 12px (step labels, FIG. 1)'
			}
		},
		args: {
			label: 'DESIGN FRAME',
			tone: 'muted',
			size: 'label'
		}
	});
</script>

{#snippet onCode(args: { label: string; tone?: 'muted' | 'accent' | 'code'; size?: 'label' | 'caption' })}
	<div class="rounded-md bg-code-bg px-3.5 py-2">
		<PlateLabel {...args} />
	</div>
{/snippet}

<Story name="Default" />
<Story name="Approved" args={{ label: 'APPROVED' }} />
<Story name="Drifted" args={{ label: 'DRIFTED', tone: 'accent' }} />
<Story name="Step" args={{ label: 'STEP 1 · READ THE DESIGN', size: 'caption' }} />
<Story name="On code" args={{ label: 'Example output', tone: 'code' }} template={onCode} />
