# Component Contracts

A **component contract** is the canonical, machine-checked statement of *what a component must be built on* for a chosen component library. It is the sibling of a styling contract: the styling contract governs **how styles are expressed**, the component contract governs **what the component composes**.

> **Why this exists.** pixel-perfect recorded `tools.components = "react-native-reusables"` in the manifest, scaffold vendored 14 RNR components into `components/ui/`, and then BUILD wrote 18 atoms that imported `Text` and `Pressable` straight from `react-native` and composed none of them. Every gate went green, because all 18 used `className` and that is all the styling contract checks. The rule was already written in prose — the adapter doc's Verify section says "Component imports from `@/components/ui/*`" — and prose did not hold. A component contract makes the composition basis explicit and a **deterministic verify gate** blocks the drift. See `workflows/build.md` Phase 5 Step 1c (apply) and Step 2 item 4 (the verify gate).

## Mental model

```
EQUIP (init)                          BUILD                                     GATE
────────────                          ─────                                     ────
choose component library  ──►  resolve contract  ──►  load as hard rule  ──►  verify-styling-contract
   (react-native-reusables,      (built-in |           (compose the library's        (blocks the layer when a
    shadcn, paper, …)             researched |          primitive; never                vendored primitive is
                                   manual | none)       re-implement it)                 re-implemented)
```

**When no component library is declared, there is no contract and no gate.** `tools.components` absent, `none`, or `custom` resolves to `component_contract_source: "none"` and the whole mechanism stays silent — no question, no notice, no gate invocation. Projects that hand-build every primitive are a first-class path.

## Relationship to styling contracts

The two are independent and both apply. They share one file format, one gate script (`scripts/verify-styling-contract.mjs`), and one override pattern.

| | Styling contract | Component contract |
|---|---|---|
| Governs | how styles are emitted | what the component is built on |
| Manifest fields | `tools.style_contract*` | `tools.component_contract*` |
| Resolved from | `tools.style` (+ platform, framework) | `tools.components` |
| Catches | a parallel CSS system, inline literals, hardcoded colors | a re-implemented `Button`, a raw `Pressable` where the library vendored one |
| Blind to | which library the markup is built on | whether the classes are token-bound |

Neither can catch the other's failure. A hand-rolled `<Pressable className="bg-primary">` satisfies every styling contract in the repo.

## Contract file format

Identical to `docs/styling-contracts/` — one Markdown file per contract, YAML frontmatter for identity and provenance, a body of human/LLM-readable rules, and a fenced ```` ```json ```` block under `## Checks` carrying the machine-runnable detections.

### Frontmatter

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique contract id, kebab-case (matches the filename). |
| `name` | string | Human-readable name. |
| `appliesTo.platforms` | string[] | `web-desktop`, `web-mobile`, `mobile-ios`, `mobile-android`. |
| `appliesTo.frameworks` | string[] | `react`, `nextjs`, `vite`, `sveltekit`, `react-native`, `expo`, … |
| `appliesTo.componentLibrary` | string | The `tools.components` value this contract is selected by. |
| `distribution` | string | `vendored` (CLI copies source into the repo) or `package` (imported from node_modules). Determines the shape of the checks. |
| `importRoot` | string | Where the library's components are imported from — `@/components/ui` for vendored, the package name for package-import. |
| `source` | string | `builtin` \| `researched` \| `manual`. |
| `canonicalDocs` | url | Official documentation the contract is grounded in. |
| `lastUpdated` | date | YYYY-MM-DD. |

### Body sections

- **Compose method** — what a project component is built on, with a correct and an incorrect example.
- **Vendored inventory** — the primitives the library provides that must not be re-implemented.
- **Free primitives** — what the project may still reach for directly (layout, lists, platform APIs). This section matters as much as the ban list: a contract that forbids too much loses its authority the first time it fires on correct code.
- **Forbidden patterns** — the anti-patterns, each with a rationale. These become blocking gate checks.
- **Verify checklist** — human-readable component-level checks. Advisory; the gate enforces the `checks` block.

### The `checks` block

Same schema and same parser as a styling contract — see `docs/styling-contracts/README.md` for the full field tables. One addition matters here:

| `mode` | Behavior |
|--------|----------|
| `content` (default) | regex tested per line; a matching **line** is a violation |
| `exists` | any file matching `glob` is a violation |
| `file` | regex tested against the **whole file**, so it can span newlines |

**Component contracts generally want `mode: "file"`.** Import statements are the signal, and a formatter breaks a long import list across lines the moment it exceeds the print width:

```tsx
import {
  Pressable,
  Text,
} from "react-native";
```

A per-line scan structurally cannot see that. In `file` mode a character class like `[^}]*` spans newlines and matches both the single-line and the wrapped form. Violations found this way are reported without a line number.

### Path layout

Contracts must match both common project layouts, because the framework decides:

- **root-relative** — `components/**`, `app/**` (Expo Router, Next.js app dir at root)
- **src-relative** — `src/components/**`, `src/screens/**`, `src/app/**`

Every glob list below carries both. Getting this wrong produces a vacuous scan (exit `3`), not a silent pass — the gate guards against it — but it still blocks the build, so get it right.

## How the gate runs

Same script, same determinism as styling:

```
node scripts/verify-styling-contract.mjs docs/component-contracts/<id>.md <project-root> [--allow GLOB]...
```

- exit `0` → layer proceeds.
- exit `1` → **layer blocks** until fixed or a per-component override is recorded in `tools.component_contract_overrides`.
- exit `2` (malformed contract) / exit `3` (vacuous scan — wrong source-root) → also blocking.

Pass one `--allow <glob>` per active override. The LLM formats the report; the pass/fail decision is deterministic.

## Authoring a contract

1. Copy the built-in closest to your library's **distribution** shape (`vendored` → `react-native-reusables.md`; `package` → `react-native-paper.md`).
2. Fill the frontmatter (`source: manual`, `importRoot`, `canonicalDocs`, `lastUpdated`).
3. List the vendored inventory **and** the free primitives. Ban only what the library genuinely replaces.
4. Write the `checks` block. Run the gate against a known-good and a known-bad tree and confirm both verdicts — real execution, do not assume.
5. Confirm the library's own source is excluded (`**/ui/**` for vendored): those files legitimately import raw primitives, and flagging them is the fastest way to make the gate ignorable.
6. Check the library's own required setup against your ban list. The first draft of the RNR contract flagged `import { PortalHost } from "@rn-primitives/portal"` — the exact line RNR's installation instructions tell you to write. Run the contract against a correct project before you ship it, not only against a broken one.

## Keeping false positives at zero

A gate that fires on correct code gets switched off. Two rules:

- **Ban re-implementation, not use.** `mustInclude`-style rules ("every component must import from the library") fire on genuinely primitive components — a hairline rule, a spacer, a scrim. The high-signal check is the inverse: forbid importing a primitive the library already vendored.
- **Leave layout alone.** `View`, `ScrollView`, `FlatList`, `SafeAreaView`, `<div>`, `<span>` are structure, not components a library replaces.

Genuine exceptions go in `tools.component_contract_overrides` as `{ComponentName: "reason"}`, which BUILD passes to the gate as `--allow` globs. The exception becomes a recorded decision instead of an invisible default — which is the entire point.

## Index of built-in contracts

| Contract | Platform | Library | Distribution | File |
|----------|----------|---------|--------------|------|
| React Native Reusables | mobile | `react-native-reusables` | vendored | `react-native-reusables.md` |
| shadcn/ui | web | `shadcn` | vendored | `shadcn.md` |
| shadcn-svelte | web | `shadcn-svelte` | vendored | `shadcn-svelte.md` |
| React Native Paper | mobile | `react-native-paper` | package | `react-native-paper.md` |
| Mantine | web | `mantine` | package | `mantine.md` |

Any other value of `tools.components` falls through the same resolution chain styling uses: research → manual → explicit `none`.
