<script lang="ts">
	// Header theme switch (Landing.dc.html:55; manifest ui_states.theme_toggle). Names the theme it
	// switches TO; the dot is the current ink. Stateless: the page owns <html data-theme> and storage.
	interface Props {
		theme: 'light' | 'dark';
		iconOnly?: 'mobile' | 'always' | 'never';
		ontoggle?: () => void;
	}

	let { theme, iconOnly = 'mobile', ontoggle }: Props = $props();

	const next = $derived(theme === 'light' ? 'dark' : 'light');
</script>

<button
	type="button"
	aria-label="Switch to {next} theme"
	onclick={() => ontoggle?.()}
	class={[
		'inline-flex cursor-pointer items-center gap-2 rounded-sm border border-line bg-transparent font-sans text-small leading-(--text-body--line-height) text-ink hover:border-ink focus-visible:shadow-[-3px_3px_0_0_var(--plate-cyan)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus',
		iconOnly === 'always' ? 'size-10 justify-center' : 'px-3 py-1.5',
		iconOnly === 'mobile' && 'max-md:size-10 max-md:justify-center max-md:p-0'
	]}
>
	<span aria-hidden="true" class="inline-block size-2.5 rounded-full bg-ink"></span>
	<span class={[iconOnly === 'always' && 'sr-only', iconOnly === 'mobile' && 'max-md:sr-only']}>
		{next === 'dark' ? 'Dark' : 'Light'}
	</span>
</button>
