<script lang="ts">
	interface Props {
		/** job: the proof sheet's job line, 12px (hero). agent: the agent line, 14px (social card). */
		variant?: 'job' | 'agent';
		/** Job line: the release version, e.g. 'V9'. Bound to the release, never hard-coded. */
		version?: string;
		/** Job line: the release date, e.g. '2026-09-29'. Bound to the release, never hard-coded. */
		date?: string;
		/** Agent line: the supported agents, after 'AN AGENT SKILL'. */
		agents?: string[];
	}

	let { variant = 'job', version = '', date = '', agents = [] }: Props = $props();

	const items = $derived(
		variant === 'job'
			? ['PIXEL-PERFECT', version, 'PROOF SHEET', date]
			: ['AN AGENT SKILL', ...agents]
	);
</script>

<p
	class={[
		'font-mono tracking-[0.02em] text-muted uppercase',
		variant === 'job' ? 'text-caption' : 'text-small'
	]}
>
	{items.filter(Boolean).join(' · ')}
</p>
