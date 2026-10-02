// The release history the Changelog page prints: the repository's CHANGELOG.md (one level above
// site/, allowed in vite.config.ts), read at build time and parsed into releases, newest first.
// It fails closed: a heading or line it does not know, or a file with no releases, throws, so a
// format change breaks the build instead of quietly dropping text or printing an empty page.
import source from '../../../CHANGELOG.md?raw';

export type Release = {
	/** As written in the heading, without the brackets: '9.2.0'. */
	version: string;
	/** ISO date, 'YYYY-MM-DD'. */
	date: string;
	/** In file order; heading is Added, Changed, Fixed or Removed; items keep their markdown. */
	groups: { heading: string; items: string[] }[];
};

function parse(md: string): Release[] {
	const releases: Release[] = [];
	let release: Release | null = null; // null in the preamble and under [Unreleased]: skipped

	md.split(/\r?\n/).forEach((line, i) => {
		const error = (why: string) => new Error(`CHANGELOG.md:${i + 1}: ${why}: ${line}`);
		if (line.startsWith('## ')) {
			release = null;
			if (/^## \[Unreleased\]\s*$/.test(line)) return;
			const m = line.match(/^## \[([^\]\s]+)\] - (\d{4}-\d{2}-\d{2})\s*$/);
			if (!m) throw error('expected "## [version] - YYYY-MM-DD"');
			releases.push((release = { version: m[1], date: m[2], groups: [] }));
		} else if (release === null || line.trim() === '') {
			return;
		} else if (line.startsWith('### ')) {
			release.groups.push({ heading: line.slice(4).trim(), items: [] });
		} else if (line.startsWith('- ')) {
			const group = release.groups.at(-1);
			if (!group) throw error('a change before any ### heading');
			group.items.push(line.slice(2).trim());
		} else {
			throw error('not a heading or a one-line "- " change');
		}
	});

	const withEntries = releases
		.map((r) => ({ ...r, groups: r.groups.filter((g) => g.items.length) }))
		.filter((r) => r.groups.length);
	if (!withEntries.length) throw new Error('CHANGELOG.md has no released entries; refusing to build an empty Changelog page');
	return withEntries;
}

export const releases = parse(source);

// The evolve thread shows the three newest releases. The page prints every release.
const newest = releases.slice(0, 3).map((release) => release.version);
if (newest.length !== 3) throw new Error('CHANGELOG.md has fewer than three releases');
export const changelogVersions = newest as [string, string, string];
