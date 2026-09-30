<script lang="ts">
	// The dashed third-party scan box in Install (Landing.dc.html:383). Its text is a placeholder until
	// strategy T18 supplies real scan results (the brief's placeholder register), so it is a prop.
	import PlateLabel from '$lib/components/atoms/PlateLabel.svelte';

	interface Props {
		label?: string;
		text: string;
	}

	let { label = 'SECURITY SCAN', text }: Props = $props();
</script>

<div>
	<div class="mb-2 flex"><PlateLabel {label} /></div>
	<div class="border border-dashed border-line p-3 font-mono text-caption text-muted">{text}</div>
</div>
