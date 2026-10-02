<script lang="ts">
	import { base } from '$app/paths';
	import Home from '$lib/components/screens/Home.svelte';

	const title = 'pixel-perfect — Your mockup is a picture. Ship the system inside it.';
	const description =
		'An agent skill for Claude Code, Codex, Cursor, Grok, OpenCode, and Pi that turns a high-fidelity mockup into a checked component system in your framework, then keeps building on it.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content="{base}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content="{base}/og.png" />
</svelte:head>

<Home />
