# Shared refinement execution

This is the editing and verification path used by targeted `refine` and accepted visual updates from `evolve --refresh`.

1. Load the component/screen, its stories, theme, adapter contracts, APIs, consumers, and accepted reference/feedback. Preserve interactions, wiring, accessibility, and intentional differences.
2. Run `DESIGN_EXECUTE` (see `workflows/RUNTIME-CONTRACT.md`, "Packaged agents") with `docs/DESIGN-CONTRACT.md` for the selected correction. Slug: `refine-<component>` for a targeted correction, or `refresh-<screen>` for an evolve refresh. The task brief names the component's files the child may write (its component file and its story). The child returns one JSON object that lists the files it changed. Step 3 then runs on exactly those files. Change the real component and story together; keep controls and props wired.
3. Run the actual compiler, render, controls, and affected consumer checks. Capture before and after. Review the full cascade from `verify-catalog.mjs --check`; accept intentional implementation goldens only after review.
4. Compare implementation captures with the accepted reference for every selected state, viewport, and theme. Record discrepancies and explicit exceptions separately from regression results. Golden acceptance is not reference fidelity.
5. For refresh work, use the accepted run's capture/apply/judge/check helpers from `docs/REFRESH-CONTRACT.md`. Preserve the accepted plan and use prepared file patches. For ordinary targeted refine, edit the named target directly and keep its existing verification path.
6. Use refine's token change recipe for token edits. Route additions/extensions to build through evolve; route removals through evolve's explicit confirmation path. Reverify consumers affected by shared changes.

A targeted correction already authorized by its invocation needs no additional approval. A refresh accepted as one plan needs no per-item or cascade reconfirmation unless new scope or ambiguity appears.
