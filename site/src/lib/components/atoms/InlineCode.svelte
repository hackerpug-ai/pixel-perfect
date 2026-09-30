<script lang="ts">
	// A mono run. inline: inside prose; block: its own line (StepCard command, ThreadRow YOU line,
	// 'Cascades into' note); command: a copyable command that wraps anywhere (CopyBlock, CommandRow);
	// heading: the mono DESIGN.md inside the subhead. The export uses 13, 13.5 and 14px runs.
	type Size = 13 | 13.5 | 14;

	interface Props {
		text: string;
		variant?: 'inline' | 'block' | 'command' | 'heading';
		size?: Size;
		tone?: 'inherit' | 'ink' | 'muted';
	}

	let { text, variant = 'inline', size, tone = 'inherit' }: Props = $props();

	const sizes: Record<Size, string> = { 13: 'text-code', 13.5: 'text-[13.5px]', 14: 'text-small' };
	const resolvedSize = $derived(size ?? (variant === 'block' ? 14 : 13.5));
</script>

<code
	class={[
		'font-mono',
		variant === 'heading' ? 'text-[19px] font-medium' : sizes[resolvedSize],
		variant === 'block' && 'block wrap-anywhere',
		variant === 'command' && 'block leading-normal wrap-anywhere',
		tone === 'ink' && 'text-ink',
		tone === 'muted' && 'text-muted'
	]}>{text}</code
>
