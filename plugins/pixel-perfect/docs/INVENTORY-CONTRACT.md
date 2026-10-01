# Design Inventory Contract

The brief for the one whole-design read that `docs/DESIGN-ANALYSIS.md` dispatches through
`DESIGN_EXECUTE` — for `pixel-perfect:build` Phase 4a, `pixel-perfect:assimilate`, and
`pixel-perfect:evolve` E1. Its output is **the list of real components and compositions to make** — atoms,
molecules, organisms, and screens with their states — each tied to the rendered frames that justify
it. It is never HTML, never a mockup, never a token pipeline. The real components built later are the
deliverable; this inventory is the checklist they are built against.

The orchestrator substitutes `<<PLACEHOLDERS>>` at dispatch time, including `<<CALLER>>` and
`<<ANALYSIS_EXTRAS>>` as `docs/DESIGN-ANALYSIS.md` Step 2 specifies (for build they reproduce the
brief exactly as it read before the procedure was shared). Load
[`DESIGN-CONTRACT.md`](DESIGN-CONTRACT.md) alongside this file; the design contract governs how the
designer looks, this contract governs what the designer returns.

## Why one read, before anything is built

Deriving component lists per layer, at the moment each layer is built, from the spec's prose
undercounts. On a real project it produced 8 molecules where the designs held 13, missed the mobile
navigation entirely, marked a mockup *prop* as a built component, and left the organisms
unconsolidated across four documents — four user interventions and two ~900K-token recovery passes
that each re-rendered and re-read everything. Reading every frame once, up front, and confirming the
whole inventory before Phase 4b is what makes the later layers dispatch from a settled list instead of
rediscovering it.

## Model routing

One dispatch, strongest available model, vision-capable. The read must **look at every frame image**
— counting frames and claiming each one is part of the deliverable. Do not split the read per source
unless the orchestrator says so; cross-source compositions (a partial imported into three decks) are
exactly what a split loses.

---

## THE BRIEF

```
You are the designer for ONE whole-design read in the <<CALLER>>.
You return a complete inventory of what must be built; you write no code, no
HTML, and no mockup.

EXECUTE DIRECTLY. Do not spawn subagents or delegate; the orchestrator owns dispatch.

INPUTS
  • Frames index:      <<FRAMES_JSON>>      (design/reference/frames.json — every rendered
                       frame with id, png path, source, label, viewport)
  • Frame images:      the png of EVERY entry in the index. Open each one. If a frame image
                       is unreadable, report it under "blocked" — never skip it silently.
  • Sources:           <<SOURCE_REFS>>      (the design files themselves — HTML decks, images,
                       URLs, or a design/wireframes/ directory; read the files for
                       annotations, labels, copy, and the parts a frame crops away)
  • Spec:              <<SPEC_PATH>>        (the requirements document; use it to name routes
                       and states the way the product does, and to find surfaces the spec
                       requires that no frame draws)
  • Existing inventory: <<MANIFEST_INVENTORY>> (the platform's atoms/molecules/organisms/
                       screens already recorded, with file paths — reuse these names; do not
                       rename what exists)
  • Library primitives: <<LIBRARY_PRIMITIVES>> (manifest.platforms[platform].scaffold.
                       components[] — the component library items already pulled into the
                       repo; a primitive that exists is recorded, not re-invented)
  • Prior inventory:   <<PRIOR_INVENTORY>>   (design/inventory.json when re-running after a
                       source changed — keep every confirmed name that is still drawn)
<<ANALYSIS_EXTRAS>>

PROCEDURE (in this order — the order is what prevents undercounting)
  1. Count the frames in the index. Your inventory must account for every one of them
     (claimed by a screen state or a component's appears_on, or listed as unclaimed with
     a reason). Frames you never
     opened are the single most expensive omission this workflow has.
  2. For EACH frame, look at the image and read its source region. Record on the frame:
       route   — the page identity, stripped of state (web: the URL path from the spec's
                 IA; mobile: the navigator destination; TUI/desktop: the named view).
       state   — what varies (default · empty · loading · error · a tab · a drawn outcome).
       shows   — every distinct composition visible in it, by name (the names you will
                 use in the layers below).
     A frame that is not a product screen is still accounted for: a sticker sheet of one
     component's variants is claimed by the components that appear on it (list it in their
     appears_on, and read its states and variants off it); a frame nothing is built from —
     a palette sheet, a type ramp, a decisions page — is UNCLAIMED with that reason.
  3. Roll up bottom-up:
       atoms      — indivisible UI primitives. One that the component library already
                    provides is still listed, with library_primitive set (e.g.
                    "shadcn/badge"), so compositions can name it and the build knows to
                    configure rather than create.
       molecules  — named compositions of 2–3 atoms that form one functional unit
                    (SearchBar, FormField, a row with its overflow menu).
       organisms  — compositions of molecules + atoms that manage real internal state
                    (sort, selection, open/close, a multi-state card) or are too large for
                    a molecule but are not a routed page.
       screens    — one per route, carrying a states[] list; each state names the frames
                    that draw it. Use the state-vs-route rule in docs/state-patterns.md:
                    same data + same URL + instant toggle + shared chrome = a state; its
                    own fetch boundary or deep-link = a route. Ask (via notes) rather than
                    collapse when ambiguous.
     For every item: composes[] (what it is built from, by name, one layer down or lower),
     states[] and variants[] as drawn, appears_on[] (frame ids), evidence (one line: which
     frame/annotation/spec line justifies it).
  4. Cross-check the spec. A surface an acceptance criterion requires that no frame draws
     is still an item — record it with undrawn: "<reason>" instead of appears_on, so the
     gap is carried into the plan rather than lost.
  5. Self-check against the RULES below, then return.

RULES — each of these is a miss that happened
  • Look, don't grep. A text search for a component's name is not evidence of its
    presence or absence. "Ask about this" and "Ask again" both looked absent from screen
    labels and were real buttons; TableOfContents was marked "covered" because a mock
    carried a `toc` prop. A prop is not a component. Decide from the image.
  • A mobile frame whose STRUCTURE differs is a separate composition, not a breakpoint.
    At 390px the desktop NavRail was replaced by a header plus a two-item bottom tab bar —
    MobileTabBar — and no prose ever named it. Compare desktop and mobile frames of the
    same route side by side and name what only the mobile one has.
  • The spec's reuse table is a floor, never the list. A table of components "reused ≥2
    times" omits everything used once and everything the prose never named (a sign-in
    form, a row overflow menu, a suggested-commands chip row). Something drawn once still
    gets built once.
  • Every distinct drawn outcome is a state. The deck drew "Interrupted" (red, connection
    dropped) and "Cancelled by the operator" (grey, you pressed Stop) as two cards; the
    routing doc listed one state. Two colours, two copies, two states.
  • A variant sheet defines the family's contract. "One composition · five uses · at most
    one action" on the deck's own EmptyState sheet meant every non-trivial variant carries
    an action; a build that read only the prose shipped two of five without one. Read the
    sheet's rule and record it in variants[].
  • Small and everywhere still counts. A dot-plus-label device status line appeared on
    every chat frame and on none of the lists. Composition frequency is evidence for the
    atom, not a reason to inline it.
  • Reuse existing names. If the manifest already records ShareStatePip, that is its name
    even if the frame suggests a better one; put the observation in evidence.
  • Never invent a frame, a state, or a component to make the inventory look complete. An
    honest gap recorded as undrawn or unclaimed is the deliverable; a phantom is a defect.

OUTPUT
  Return ONE JSON object — nothing after it — matching design/inventory.json v1
  (docs/inventory.schema.json). The orchestrator runs verify-inventory.mjs on it and
  re-dispatches you with the exact violations if the deterministic gate fails; do not
  re-verify structure yourself. On harnesses with structured output the schema is
  enforced; the shape is identical either way.

  Top-level "status": "complete" | "blocked" — blocked only when a frame image or source
  could not be read (name it in "blocked": [...]); never for a design question, which is a
  note. "notes": ≤3 sentences, only for what the orchestrator must raise with the user
  (an ambiguous route collapse, a spec/design conflict).
```

---

## Classification quick reference

Identical to the level definitions in `workflows/build.md`; repeated here so the brief is
self-contained.

| Layer | Test | Examples |
|---|---|---|
| Atom | Indivisible; composes nothing. Library primitives are atoms with `library_primitive` set. | Button, Badge, Kbd, StreamingCursor, DeviceStatusIndicator |
| Molecule | 2–3 atoms forming one named functional unit; state is local and simple or absent. | SearchBar, FormField, SignInForm, LibraryRowActions, MobileTabBar |
| Organism | Composes molecules + atoms and owns real internal state, or is too large for a molecule; not routed. | NavRail, DataTable, ResearchCard, CommandPalette |
| Screen | Keyed by route; carries `states[]`; composes organisms/molecules/atoms; has layout and (maybe) data fetching. | `/library` with results · empty-archive · no-matches · device-asleep |

Atoms are never stateful. A state need at the atom level moves up to the molecule or the screen.

## What the inventory is not

- Not a token system. `tokens_observed` is evidence for `scaffold`'s theme step when no token table
  exists; it is never a theme and never overrides a spec's token table.
- Not authority for composition edges after code exists. `composes[]` seeds build order and the
  designer's read; the catalog gate's `--blast` proves composition in the real system (see
  `workflows/build.md`, Phase 5 exit gate).
- Not a mockup, not a wireframe, not a screenshot set. The frames under `design/reference/` are
  the pixel-targets the real components are built to match; the inventory is the index that says
  which target belongs to which component.
