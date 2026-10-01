<script lang="ts">
	// The install section body (Landing.dc.html:342-385; manifest ui_states.install_tabs): the two
	// one-step installs, the per-agent tabs and panel, the stability line, then "What it touches".
	// Home places the heading row above it. Stateful: the selected tab. A link (#install-{id}) wins,
	// then the visitor's remembered choice (strategy §12), then the first agent. Selecting updates the
	// hash so the tab can be linked; arrows, Home and End move between tabs (roving tabindex). Every
	// panel is rendered and the inactive ones hidden, so each tab's link and aria-controls resolve.
	import { onMount, tick, untrack } from 'svelte';
	import Tab from '$lib/components/atoms/Tab.svelte';
	import TabNote from '$lib/components/atoms/TabNote.svelte';
	import CommandRow from '$lib/components/molecules/CommandRow.svelte';
	import CopyBlock from '$lib/components/molecules/CopyBlock.svelte';
	import CopyNextStep from '$lib/components/molecules/CopyNextStep.svelte';
	import ScanBox from '$lib/components/molecules/ScanBox.svelte';
	import TouchList from '$lib/components/molecules/TouchList.svelte';
	import { release } from '$lib/run';

	type Agent = { id: string; name: string; steps: string[]; note?: string; warning?: string };
	type Item = string | { code: string; text?: string };

	interface Props {
		/** The release tag the clone commands check out (default: this release, run.json). */
		releaseTag?: string;
		/** Pins the selected tab (stories); unset, a link or the remembered choice decides. */
		initialTab?: string;
		pasteLine?: string;
		skillsLine?: string;
		agents?: Agent[];
		stability?: string;
		touches?: { label: string; items: Item[] }[];
		/** Third-party scan result. The box is left out until one exists (placeholder register). */
		scan?: string;
		onselect?: (id: string) => void;
	}

	let {
		releaseTag = release.tag,
		initialTab,
		pasteLine = 'Install pixel-perfect: fetch and follow https://github.com/hackerpug-ai/pixel-perfect/INSTALL.md',
		skillsLine = 'npx skills add hackerpug-ai/pixel-perfect',
		agents = [
			{ id: 'claude', name: 'Claude Code', steps: ['/plugin marketplace add hackerpug-ai/pixel-perfect', '/plugin install pixel-perfect@pixel-perfect'] },
			{
				id: 'codex',
				name: 'Codex',
				steps: ['codex plugin marketplace add hackerpug-ai/pixel-perfect', 'codex plugin add pixel-perfect@pixel-perfect'],
				warning: 'Two enabled sources create duplicate $pixel-perfect:* namespaces. Remove pixel-perfect@personal first.'
			},
			{
				id: 'cursor',
				name: 'Cursor',
				steps: [
					`git clone --branch ${releaseTag} https://github.com/hackerpug-ai/pixel-perfect`,
					'cp -R pixel-perfect/plugins/pixel-perfect ~/.cursor/plugins/local/pixel-perfect'
				],
				note: 'Then reload the window.',
				warning: "Copy, don't symlink. Cursor fails on symlinked plugins."
			},
			{
				id: 'grok',
				name: 'Grok',
				steps: ['/plugin marketplace add hackerpug-ai/pixel-perfect', '/plugin install pixel-perfect@pixel-perfect'],
				note: "Then enable it in Grok's /plugins view."
			},
			{
				id: 'opencode',
				name: 'OpenCode',
				// The design linked .opencode/* at the clone's root, which does not exist: the OpenCode
				// surface ships under plugins/pixel-perfect/. Checked against the v9.0.0 tag.
				steps: [
					`git clone --branch ${releaseTag} https://github.com/hackerpug-ai/pixel-perfect .pixel-perfect`,
					'mkdir -p .opencode',
					'ln -s ../.pixel-perfect/plugins/pixel-perfect/.opencode/commands .opencode/commands',
					'ln -s ../.pixel-perfect/plugins/pixel-perfect/.opencode/skills .opencode/skills'
				]
			},
			{ id: 'pi', name: 'Pi', steps: ['pi install npm:@hackerpug-ai/pixel-perfect'] }
		],
		stability = 'Releases are version-locked across all six agents. Every breaking release ships an upgrade guide.',
		touches = [
			{ label: 'READS', items: ['Your design files or URL', 'package.json and the framework config', 'DESIGN.md, if one exists'] },
			{ label: 'WRITES', items: ['Components in your source tree', 'Sandbox stories', { code: 'design/', text: ' and DESIGN.md' }] },
			{ label: 'RUNS', items: ['Your package manager', 'A headless browser, for capture', 'Your existing lint and test scripts'] }
		],
		scan,
		onselect
	}: Props = $props();

	const STORAGE_KEY = 'pixel-perfect:install-tab';
	const known = (id: string | null | undefined) => (agents.some((a) => a.id === id) ? id! : undefined);

	let selected = $state(untrack(() => known(initialTab) ?? agents[0].id));

	function pick(id: string, focus = false) {
		selected = id;
		history.replaceState(history.state, '', `#install-${id}`);
		try {
			localStorage.setItem(STORAGE_KEY, id);
		} catch {
			/* storage blocked: the choice lasts for this visit only */
		}
		if (focus) document.getElementById(`tab-${id}`)?.focus();
		onselect?.(id);
	}

	// A link to #install-{id}: the panel with that id only exists once its tab is selected, so the
	// browser cannot scroll to it on its own.
	async function follow() {
		const id = known(location.hash.match(/^#install-(.+)$/)?.[1]);
		if (!id) return;
		selected = id;
		await tick();
		document.getElementById(`install-${id}`)?.scrollIntoView();
	}

	onMount(() => {
		if (initialTab !== undefined) return;
		if (location.hash.startsWith('#install-')) follow();
		else {
			try {
				selected = known(localStorage.getItem(STORAGE_KEY)) ?? selected;
			} catch {
				/* storage blocked: start on the first agent */
			}
		}
		addEventListener('hashchange', follow);
		return () => removeEventListener('hashchange', follow);
	});

	function onkeydown(event: KeyboardEvent) {
		const i = agents.findIndex((a) => a.id === selected);
		const n = agents.length;
		const next = ({ ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 } as Record<string, number>)[event.key];
		if (next === undefined) return;
		event.preventDefault();
		pick(agents[next].id, true);
	}
</script>

<div class="grid max-w-250 grid-cols-2 gap-3 max-md:grid-cols-1">
	<CopyBlock command={pasteLine} />
	<CopyBlock command={skillsLine} variant="row" />
</div>

<div class="mt-12 max-w-250">
	<!-- The ARIA tabs pattern focuses the tabs (roving tabindex), never the tablist itself. -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div role="tablist" aria-label="Agent" class="flex flex-wrap gap-x-1 border-b border-line" {onkeydown}>
		{#each agents as agent (agent.id)}
			<Tab
				id="tab-{agent.id}"
				href="#install-{agent.id}"
				label={agent.name}
				selected={agent.id === selected}
				controls="install-{agent.id}"
				onselect={(event) => {
					event.preventDefault();
					pick(agent.id);
				}}
			/>
		{/each}
	</div>
	{#each agents as agent (agent.id)}
		<div
			role="tabpanel"
			id="install-{agent.id}"
			aria-labelledby="tab-{agent.id}"
			tabindex="0"
			hidden={agent.id !== selected}
			class="flex flex-col gap-3 pt-6 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
		>
			{#each agent.steps as step (step)}<CommandRow command={step} />{/each}
			{#if agent.note}<TabNote text={agent.note} />{/if}
			{#if agent.warning}<TabNote variant="warning" text={agent.warning} />{/if}
			<div class="mt-2"><CopyNextStep /></div>
		</div>
	{/each}
</div>

<p class="m-0 mt-10 max-w-150 text-ui text-muted">{stability}</p>

<div class="mt-12 max-w-250 border-t border-line pt-6">
	<h3 class="m-0 mb-5 text-body font-semibold">What it touches</h3>
	<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-6 text-ui">
		{#each touches as touch (touch.label)}<TouchList {...touch} />{/each}
		{#if scan}<ScanBox text={scan} />{/if}
	</div>
</div>
