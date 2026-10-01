<script lang="ts">
	// One measured figure from the Build it stats: a term/description pair meant to sit in a <dl>
	// (StatGrid). The value comes from this site's own build (run.json).
	interface Props {
		label: string;
		value: string;
	}

	let { label, value }: Props = $props();
</script>

<div>
	<dt class="font-mono text-label text-muted uppercase">{label}</dt>
	<dd class="m-0 mt-1 font-display text-stat leading-none font-bold">{value}</dd>
</div>
