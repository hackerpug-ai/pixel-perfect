<script lang="ts">
	// The proof slider's handle (Landing.dc.html:140; manifest ui_states.slider). Decorative: the
	// invisible range input is the control. Place it inside the relatively positioned pane. The centre
	// follows `split` but is clamped 14px (half the circle) from each edge, so the whole circle stays in
	// the pane. Focus is drawn here, from the `focused` prop or, with the range input placed before it
	// as a `peer`, from peer-focus-visible. It never takes pointer events, so drags reach the input.
	interface Props {
		split?: number;
		focused?: boolean;
	}

	let { split = 50, focused = false }: Props = $props();
</script>

<div
	aria-hidden="true"
	style:--split="{split}%"
	class={[
		'pointer-events-none absolute top-1/2 left-[clamp(14px,var(--split),calc(100%_-_14px))] grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-accent bg-sheet font-mono text-label text-accent-text select-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-focus',
		focused && 'outline-2 outline-offset-3 outline-focus'
	]}
>
	◂▸
</div>
