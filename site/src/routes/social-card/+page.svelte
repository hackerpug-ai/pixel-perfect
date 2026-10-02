<script lang="ts">
	import { onMount } from 'svelte';
	import SocialCard from '$lib/components/organisms/SocialCard.svelte';

	// The export waits for this. The card's proof image has to be decoded first.
	onMount(async () => {
		const img = document.querySelector('img');
		if (!(img instanceof HTMLImageElement)) return;
		await img.decode();
		document.documentElement.dataset.socialCardReady = 'true';
	});
</script>

<SocialCard />
