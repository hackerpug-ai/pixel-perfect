<script lang="ts">
	import { base } from '$app/paths';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" sizes="16x16" href="{base}/favicon-16.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="{base}/favicon-32.png" />
	<link rel="icon" type="image/png" sizes="64x64" href="{base}/favicon-64.png" />
	<link rel="apple-touch-icon" href="{base}/apple-touch-icon.png" />
</svelte:head>
{@render children()}
