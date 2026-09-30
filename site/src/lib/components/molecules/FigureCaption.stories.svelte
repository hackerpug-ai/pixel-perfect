<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import FigureCaption from './FigureCaption.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/FigureCaption',
		component: FigureCaption,
		tags: ['autodocs'],
		parameters: {
			layout: 'padded',
			docs: { description: { component: "A figure's caption line: fig (label first), example (label last), plain, or mono." } }
		},
		argTypes: {
			variant: { control: 'select', options: ['fig', 'example', 'plain', 'mono'] },
			text: { control: 'text' },
			label: { control: 'text' },
			as: { control: 'select', options: ['figcaption', 'div'] }
		},
		args: {
			variant: 'fig',
			label: 'FIG. 1',
			text: 'One mockup, separated into five layers. Each layer is built and checked before the next.',
			as: 'div'
		}
	});
</script>

<Story name="Fig" />
<Story
	name="Example"
	args={{
		variant: 'example',
		text: 'Drag to compare the design frame with the component built from it. The corner marks line up when they match.',
		label: 'Example — replaced by the real pair at launch.'
	}}
/>
<Story name="Plain" args={{ variant: 'plain', text: 'One run, start to finish: init, scaffold, build, status.' }} />
<Story name="Mono" args={{ variant: 'mono', text: 'Example thread — replaced by the real run at launch.' }} />
