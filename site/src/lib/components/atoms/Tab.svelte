<script lang="ts">
	// One link-tab in a role=tablist (Landing.dc.html:357-360). The tablist owns selection, arrow keys
	// and the roving tabindex: only the selected tab is in the tab order. -mb-px lays the 2px rule over
	// the list's 1px bottom line.
	interface Props {
		id: string;
		href: string;
		label: string;
		selected?: boolean;
		controls?: string;
		onselect?: (event: MouseEvent) => void;
	}

	let { id, href, label, selected = false, controls, onselect }: Props = $props();
</script>

<a
	{id}
	{href}
	role="tab"
	aria-selected={selected}
	aria-controls={controls || undefined}
	tabindex={selected ? 0 : -1}
	onclick={onselect}
	class={[
		'-mb-px cursor-pointer border-b-2 px-3.5 py-2.5 font-sans text-ui leading-(--text-body--line-height) no-underline hover:text-ink focus-visible:shadow-[-3px_3px_0_0_var(--plate-cyan)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus',
		selected ? 'border-ink font-semibold text-ink' : 'border-transparent font-normal text-muted'
	]}>{label}</a
>
