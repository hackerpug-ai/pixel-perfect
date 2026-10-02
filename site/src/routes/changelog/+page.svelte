<script lang="ts">
	import { base } from '$app/paths';
	import Changelog from '$lib/components/screens/Changelog.svelte';

	const title = 'Changelog — pixel-perfect';
	const description =
		'What changed in each release of pixel-perfect, the agent skill that turns a mockup into a checked component system, newest first.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content="{base}/og.png" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<Changelog />
