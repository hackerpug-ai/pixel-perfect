// What this page reports about its own build, recorded by scripts/record-run.mjs (the method is
// there). Re-run that script at the end of a run; never edit run.json by hand.
import run from './run.json';

type Kind = 'plain' | 'key' | 'value' | 'comment' | 'success';
export type Token = [Kind, string];

export const release = run.release;
export const numbers = run.numbers;
export const excerpts = run.excerpts as Record<'manifest' | 'inventory' | 'status', Token[][]>;
export const cascade = run.cascade;

/** A count as the page prints it: 8701797 → '8.7M', 23456 → '23K'. */
export const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : `${n}`);

/** The Build it stats, in the design's order. */
export const stats = [
	{ label: 'Tokens', value: short(numbers.tokens) },
	{ label: 'Minutes', value: `${numbers.minutes}` },
	{ label: 'Frames', value: `${numbers.frames}` },
	{ label: 'Gates', value: `${numbers.gates}` },
	{ label: 'Components', value: `${numbers.components}` }
];

/** The refine card's cascade line: what a change to one token reaches in this build. */
export const cascadeLine = (() => {
	const lead = ['Button', 'TextLink', 'PlateLabel'].filter((n) => cascade.direct.includes(n));
	return `Cascades into (${cascade.token}): ${lead.join(', ')}, ${cascade.reached - lead.length} more`;
})();
