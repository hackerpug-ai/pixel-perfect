<script lang="ts">
	interface Props {
		/** Which corner of the positioned parent the mark sits in. */
		corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
		/** hero: 16px mark, 12px inset (the proof sheet). social: 20px mark, 20px inset (the social card). */
		size?: 'hero' | 'social';
	}

	let { corner = 'top-left', size = 'hero' }: Props = $props();

	const sides = {
		'top-left': 'border-t border-l',
		'top-right': 'border-t border-r',
		'bottom-left': 'border-b border-l',
		'bottom-right': 'border-b border-r'
	};
	const place = {
		hero: {
			'top-left': 'top-3 left-3',
			'top-right': 'top-3 right-3',
			'bottom-left': 'bottom-3 left-3',
			'bottom-right': 'bottom-3 right-3'
		},
		social: {
			'top-left': 'top-5 left-5',
			'top-right': 'top-5 right-5',
			'bottom-left': 'bottom-5 left-5',
			'bottom-right': 'bottom-5 right-5'
		}
	};
</script>

<!-- Absolutely placed: the parent must be positioned (relative). -->
<span
	aria-hidden="true"
	class={[
		'pointer-events-none absolute border-muted',
		size === 'hero' ? 'size-4' : 'size-5',
		sides[corner],
		place[size][corner]
	]}
></span>
