# Design directions and `restyle` — changing the look, not the inventory

Status: proposed
Date: 2026-08-12
Companion to: `2026-08-11-living-design-system.md` (assumed landed)

## The gap, stated plainly

With the living-design-system plan finished, the plugin can change **one component**
(`refine`) and can change **which components exist** (`evolve`). It still cannot change
**the visual language all of them speak**.

That third axis is the entire Indiana Jones case: keep the brown/gold identity, but stop
reading as *grandpa's disco slacks* and start reading as *world adventurer*. Nothing is
added. Nothing is removed. No single component is wrong. Every component is simultaneously
speaking the wrong dialect — mid-value tan ground, mid-value brown text, soft shadows
everywhere, accent used as large fills. The fix is a coordinated change to surface strategy,
contrast, chroma placement, edge treatment, elevation, density, and type personality, landing
across every atom, molecule, organism and screen **at once**, or the app looks worse
half-done than it did before.

`refine` can only do it one component at a time, with no way to hold the fifty changes
coherent. `evolve` refuses it by definition — the inventory doesn't move. A token edit gets
partway and then silently stops at every component that hardcoded a value.

So: one new capability, `restyle`, and one new first-class artifact, the **design
direction**.

## Why the substrate makes this newly possible

The two capabilities are duals, and that is what gives `restyle` an unusually strong oracle:

| | Inventory | Language | Capture assertion |
|---|---|---|---|
| `evolve` | changes | held constant | pre-existing goldens must **not** move |
| `restyle` | held constant | changes | goldens **must** move — all of them |

The inverted assertion is the feature. Under a direction change, **a story whose capture did
not move is a story that is not reading the design system.** That is an empirical hardcode
audit covering exactly what `verify-styling-contract.mjs` cannot see statically: a component
inheriting a third-party library default, a value baked into an SVG, a color arriving from a
dependency's stylesheet. You cannot get this audit any other way, and it falls out of the
catalog for free.

Paired with it, the structural assertion:

> **Every story moves visually. No story moves structurally.**

Same element tree, same nesting, same test ids — only style-bearing state differs. If
structure moved, the restyle quietly became a rewrite and must route to `refine` or `evolve`
instead of shipping under a look-and-feel gate.

## Design directions

A **direction** is the named, addressable, swappable bundle that *is* the look:

```
design/directions/{name}/
  direction.json      # the axes (below) — the human-legible statement of intent
  foundations.json    # concept tokens: palette, type scale, space scale, radii, elevation
  semantic.json       # semantic mapping — which concept token each purpose resolves to
  recipes/            # OPTIONAL declared component-level style overrides (see below)
  README.md           # the rationale, and what it is deliberately not
```

The manifest names the active one. Components are pure functions of the active direction —
anything a component holds that isn't in the direction is a hardcode, and the total-coverage
assertion above proves it empirically rather than trusting the linter.

Goldens become direction-scoped: `design/goldens/{direction}/{platform}/{layer}/{name}/{state}.{ext}`.
That is the whole rollback story, and it is discussed at the end.

### Directions may carry component recipes — scoped, declared, gated

Being honest about this is what keeps the mechanism from failing in practice. Tan/soft →
dark/crisp is genuinely not always token-level: a card that separated itself with a soft
shadow needs a hairline border on a dark ground; a badge that was a filled pill wants an
outline. Insisting the change is pure-token produces a bad-looking result and teaches people
to bypass the command.

So a direction may carry `recipes/{Component}.md`, with a hard boundary:

- A direction with **no recipes** must be structurally isomorphic everywhere. Non-negotiable.
- A direction **with** recipes may move structure **only** for the components it names, every
  such component is listed by name in the confirm gate, and each still passes the component
  and styling contract gates through the normal `build` path.

Without that scoping, `restyle` degenerates into an unbounded rewrite with no gate.

## `restyle`

```
pixel-perfect:restyle <mode>

  --diagnose                     why the current look reads the way it does (deterministic)
  --explore "<taste words>"      generate N candidate directions, render them on real screens
  --explore <reference…>         same, seeded from images/URLs — language only, not structure
  --apply <direction>            apply a candidate; capture; assert; gate
  --switch <direction>           swap the active direction (rollback / A-B)
  --merge <a> <b> --axes <…>     take the ground from A, the type from B
  --diff <a> <b>                 axis-level and screen-level comparison of two directions
```

### `--diagnose` — turn "it looks clunky" into numbers

Measured off the committed goldens, so the decision is deterministic and the model only
formats the report — the same rule `verify-styling-contract.mjs` already follows:

The measure set below is **not speculative** — it was prototyped against Sidequest (Golden
Atlas) on 2026-08-12, reading the live `global.css` and the 44 rendered screens in
`design/shots`. Each row is annotated with what it actually caught there.

| Measure | What it catches | Verdict from the real run |
|---|---|---|
| **Surface-to-surface separation** — contrast and ΔL\* of every layered surface against the page | layers that have names but no visual distinction | **strongest single signal.** Was not in the first draft of this table; it is the one that explained "flat". |
| Text-on-surface contrast (WCAG) over the real declared pairs | low-contrast mud | useful, and cheap. Also surfaced two sub-3:1 pairs nobody had flagged. |
| Value distribution of surfaces (L\*) | everything mid-value with no anchor | useful; interpret jointly with separation, not alone. |
| Chroma histogram (LCh C\*) of surfaces vs accent | muted where it should punctuate, or vice versa | useful. |
| **Accent coverage, normalized against *ink* pixels** — and cross-checked against token usage counts in source | accent used as fill vs mark vs **not at all** | needs the ink normalization: as a fraction of *all* pixels every accent looks unused, because the ground dominates. The source cross-check (how many `bg-`/`border-`/`text-` usages) is what makes the finding unarguable. |
| Radius inventory | rounded-everything softness, or inconsistency | cheap, and immediately conclusive. |
| Elevation inventory — blurred shadows vs inset hairlines | soft-shadow haze | cheap, immediately conclusive. |
| Type scale — **step ratios**, not just count | hierarchy expressed through steps too small to perceive | count alone says nothing; the *median step ratio* is the finding. |
| Ink coverage per screen (fraction not equal to the page ground) | clunky density, or the opposite | works, but see the crop caveat below. |

**Crop caveat, learned the hard way.** Device screenshots carry chrome — status bar, sandbox
toolbar — and it materially skews every pixel statistic. An adaptive "find the bands that
differ from the body" crop silently failed on several screens (one cropped to a single row,
another not at all) and produced confident nonsense. The crop must be anchored to a **known
value**: find the rows containing the page-ground token. That succeeded identically
(rows 186–2396) on all 44 shots and correctly reported the one full-bleed screen it could not
measure instead of inventing a number for it. This belongs in the capture contract, not in
each analysis.

### `--explore` — judge candidates on the real app, not on swatches

Nobody can pick "tan ground vs dark ground" from a color chip. Everybody can pick it
instantly from their own job-detail screen with real data in it.

The catalog already renders every component in every state and every screen in every state.
So applying a candidate direction to a scratch capture produces **a complete before/after
contact sheet of the actual product, for free** — this is the byproduct of the substrate that
makes the whole feature worth building, and no other tool in this space has it.

Generate 3–4 directions spanning the axis space rather than four shades of the same idea,
capture each, present the same three high-signal screens across all of them side by side.
Then `--merge` exists because the real answer is usually "the ground from A with the type
from C", and directions are structured data, so that is a computation rather than a re-brief.

### Taste words → axes

The vibe translation is where this is most at risk of being hand-waved, so it needs a real
rubric shaped like the repo's existing `styling-convention-rubric.md`. An axis set, each axis
with token-level consequences:

`ground` (light | dark | inverted) · `contrast` (soft | crisp) · `chroma` (muted | rich) ·
`accent-role` (fill | mark) · `edge` (rounded | softened | squared) · `separation`
(shadow | hairline | flat) · `density` (airy | balanced | compact) · `type` (humanist |
geometric | slab | condensed) · `ornament` (none | rules | texture)

Then *world adventurer* resolves to: dark ground, crisp contrast, muted browns as material
with gold as a sparse **mark**, squared-to-softened edges, hairline separation, compact
density, slab or condensed type, rules-as-ornament. And *grandpa's disco slacks* is not an
insult, it is a diagnosis: light-mid ground + soft contrast + accent-as-fill + shadow
separation + rounded edges.

`direction.json` stores the axes, so a direction is legible and arguable *before* it is
rendered, and two directions differ in a way you can read.

### Reference intake — take the language, discard the structure

`design-deconstruct` today derives inventory and language together from a mock. Restyle needs
the opposite: hand it a screenshot of an app you admire, a movie poster, or a photo of a
worn leather flight jacket, and extract **only** palette relations, contrast strategy, type
personality and edge treatment — explicitly discarding layout and inventory. That is a mode
on an engine that already exists, not a new engine.

## The one substrate change to make while the plan is still in flight

**The structural artifact must serialize resolved style state, not just markup.**

`verify-catalog.mjs` normalizes and diffs whatever the generated capture command emits; the
capture command's contract is specified in `docs/sandbox-spec.md` piece #8 and
`docs/adapters/custom-sandbox.md`, and neither is written yet. Decide now that the web
medium emits computed styles per element (a stable filtered property set) alongside the
serialized DOM, and the equivalent resolved-style dump on native and TUI.

Without it, "did this component's styling change" has only the PNG to answer with — and the
plan already concedes pixels are noisy across machines and font stacks. Restyle's
total-coverage gate would then be perceptual and flaky, which the plan itself identifies as
the failure that trains people to `--accept` everything and silently deletes the mechanism.
With it, the gate is exact.

This is cheap to add now and expensive later: retrofitting it re-baselines every golden in
every project the plugin has touched.

Second, smaller: the plan's `pinned` concept needs a sibling for restyle — a per-story
`style-exempt` list with a written justification, for the genuine case (a divider that only
draws `--border` legitimately may not move under a type-only direction). Same shape as
`pinned`, same "unused today ≠ dead" reasoning: *unmoved ≠ hardcoded*, sometimes.

## Rollback and iteration

This is the part the direction-as-artifact model buys outright.

| Want | How |
|---|---|
| Roll back | `restyle --switch previous`. No revert, no code change — the direction pointer moves. |
| Prove the rollback was clean | Re-capture must reproduce that direction's stored goldens **exactly**. Same assertion machinery. |
| A/B two looks | Both directions exist simultaneously; goldens are direction-scoped; `--diff` compares them at axis and screen level. |
| Iterate one axis | `--merge` / edit one axis in `direction.json`, re-capture, and the diff shows precisely which screens the axis moved. |
| Keep a look you abandoned | It stays on disk as a direction. Nothing is lost by exploring. |
| Ship a seasonal or per-tenant look | Directions were already plural; this needs no new mechanism. |

The invariant that makes all of it hold: **components never encode the look, so switching the
look never edits a component.** Every guarantee above collapses the moment a component
hardcodes — which is exactly what the total-coverage assertion exists to catch, run on every
apply.

## Caveats, stated honestly

- **Total-coverage has false positives.** Hence `style-exempt` with justification. If that
  list grows past a handful, the system is not token-governed and the honest report says so
  rather than passing.
- **Recipes are the leak.** A direction that names thirty component recipes is a rewrite
  wearing a restyle's clothes. Report the recipe count at the confirm gate and make a large
  one visible rather than quietly allowed.
- **A great palette can still land badly.** Direction axes constrain relationships, not
  composition. Restyle cannot fix a screen whose *layout* is the problem — that is `refine`
  or `evolve`, and the diagnose report should say which of the three axes the complaint
  actually lives on before anything runs.
- **Capture cost scales with exploration.** N candidates × every story is N full captures.
  Explore on a declared subset of high-signal screens; capture in full only on `--apply`.
- **Direction-scoped goldens multiply storage.** Structural artifacts are text and cheap;
  PNGs are not. Keep full visual goldens for the active direction, and a fixed representative
  set for the rest.

## Sequencing

1. **Computed-style capture** — fold into the in-flight plan's step 1. Blocking for everything
   below; nearly free now.
2. **Directions as an artifact** — extract the current look into `design/directions/current/`,
   point the manifest at it, direction-scope the goldens. No behavior change, and it makes
   step 3 measurable.
3. **`restyle --diagnose`** — pure read over existing goldens. Independently useful the day it
   lands, and it is what tells a user whether they even want a restyle.
4. **`restyle --apply` + `--switch`** — one direction in, the two assertions, the confirm gate,
   rollback. This is the product.
5. **`--explore`, `--merge`, reference intake** — the exploration surface, on rails that all
   exist by this point.

Steps 3 and 4 are the answer to "my app looks clunky and I don't know why." Step 5 is the
answer to "I don't know what I want yet."
