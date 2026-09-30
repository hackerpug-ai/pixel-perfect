<script lang="ts">
	// The DESIGN.md row that closes Grow it (Landing.dc.html:323-332): subhead, lede and the install
	// CTA beside the generated document; stacks at 720px and below. Home sets the space above it.
	import Button from '$lib/components/atoms/Button.svelte';
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';
	import SectionHeading from '$lib/components/atoms/SectionHeading.svelte';
	import DesignMdCard from '$lib/components/molecules/DesignMdCard.svelte';

	type Row = [string, string];

	interface Props {
		lede?: string;
		action?: string;
		actionHref?: string;
		tokens?: Row[];
		components?: Row[];
	}

	let {
		lede = 'A plain document of your tokens and components, kept current on every build, so your other tools and your teammates read the same system.',
		action = 'Install pixel-perfect',
		actionHref = '#install',
		tokens = [
			['color.ink', '#111316'],
			['color.accent', '#E0007A'],
			['space.4', '16px'],
			['radius.sm', '4px']
		],
		components = [
			['Button', 'primary, secondary'],
			['PlanCard', 'composes Heading, Price, Button'],
			['Header', 'composes Logo, NavLink']
		]
	}: Props = $props();
</script>

<div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-10 max-md:grid-cols-1">
	<div>
		<div class="mb-2">
			<SectionHeading variant="subhead">It writes a <InlineCode text="DESIGN.md" variant="heading" /> too.</SectionHeading>
		</div>
		<p class="m-0 mb-6 text-ui text-pretty text-muted">{lede}</p>
		<Button label={action} href={actionHref} />
	</div>
	<DesignMdCard {tokens} {components} />
</div>
