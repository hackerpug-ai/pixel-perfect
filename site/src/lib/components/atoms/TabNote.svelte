<script lang="ts">
	// The line under an install tab's commands (Landing.dc.html:369-370, manifest ui_states.install_tabs).
	// note: a plain 15px line. warning: a 14px line led by a mono accent-text "Note" label.
	interface Props {
		variant?: 'note' | 'warning';
		text: string;
	}

	let { variant = 'note', text }: Props = $props();
</script>

{#if variant === 'warning'}
	<p class="m-0 flex gap-2.5 text-small text-ink">
		<span class="flex-none font-mono text-accent-text">Note</span><span>{text}</span>
	</p>
{:else}
	<p class="m-0 text-ui text-ink">{text}</p>
{/if}
