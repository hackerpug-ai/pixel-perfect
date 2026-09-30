<script lang="ts">
	interface Props {
		/** The label, written as displayed (plate labels are caps; code panel headers are not). */
		label: string;
		/** muted: the default. accent: magenta-ink (DRIFTED). code: code-comment, on a code panel header. */
		tone?: 'muted' | 'accent' | 'code';
		/** label: 11px (panes, cards, lists). caption: 12px (step labels, FIG. 1). */
		size?: 'label' | 'caption';
	}

	let { label, tone = 'muted', size = 'label' }: Props = $props();

	const tones = { muted: 'text-muted', accent: 'text-accent-text', code: 'text-code-comment' };
</script>

<span class={['font-mono', tones[tone], size === 'label' ? 'text-label' : 'text-caption']}
	>{label}</span
>
