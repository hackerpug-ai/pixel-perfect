<script lang="ts">
	// The next step under the Install tabs, always shown (decided at B-inv; Landing.dc.html:371).
	import InlineCode from '$lib/components/atoms/InlineCode.svelte';

	interface Props {
		text?: string;
		command?: string;
	}

	let { text = 'Next: open a project that has your design and run', command = '/pixel-perfect:init' }: Props = $props();
</script>

<p class="m-0 mt-2 text-ui text-muted">{text} <InlineCode text={command} tone="ink" />.</p>
