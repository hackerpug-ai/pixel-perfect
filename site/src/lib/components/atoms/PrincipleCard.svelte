<script lang="ts">
	// One of the four principles under "Your design survives your codebase." (Landing.dc.html:218-221).
	interface Props {
		title: string;
		body: string;
	}

	let { title, body }: Props = $props();
</script>

<div>
	<h3 class="m-0 mb-2 text-body font-semibold text-ink">{title}</h3>
	<p class="m-0 text-ui text-pretty text-muted">{body}</p>
</div>
