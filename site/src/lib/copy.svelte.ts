// Copy-to-clipboard for the command blocks (manifest ui_states.copy; the export's logic,
// Landing.dc.html:457-468). Shared by CopyBlock and CommandRow.

export type CopyResult = 'copied' | 'selected';

/**
 * Copies text to the clipboard. When the browser refuses (no Clipboard API, an insecure context,
 * a denied permission), selects the command in `fallbackEl` and tries the legacy copy command:
 * 'copied' if that worked, otherwise 'selected' so the visitor can copy the selection by hand.
 */
export async function copyText(text: string, fallbackEl?: HTMLElement | null): Promise<CopyResult> {
	try {
		await navigator.clipboard.writeText(text);
		return 'copied';
	} catch {
		if (fallbackEl) {
			const range = document.createRange();
			range.selectNodeContents(fallbackEl);
			const selection = getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
		}
		let ok = false;
		try {
			ok = document.execCommand('copy');
		} catch {
			/* not supported: the selection stands */
		}
		return ok ? 'copied' : 'selected';
	}
}

const LABELS = { idle: 'Copy', copied: 'Copied ✓', selected: 'Selected' } as const;
const ANNOUNCEMENTS = {
	copied: 'Copied to clipboard',
	selected: 'Command selected. Press Command-C or Control-C to copy.'
} as const;


/** A copy button's feedback: shown for 2 seconds, then back to "Copy". */
export class CopyFeedback {
	result = $state<CopyResult | null>(null);
	#timer: ReturnType<typeof setTimeout> | undefined;

	constructor(initial: CopyResult | null = null) {
		this.result = initial;
	}

	get label(): string {
		return this.result ? LABELS[this.result] : LABELS.idle;
	}

	/** Text for an aria-live region; empty when idle so nothing is announced. */
	get announcement(): string {
		return this.result ? ANNOUNCEMENTS[this.result] : '';
	}

	async copy(text: string, fallbackEl?: HTMLElement | null) {
		this.result = await copyText(text, fallbackEl);
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => (this.result = null), 2000);
	}
}
