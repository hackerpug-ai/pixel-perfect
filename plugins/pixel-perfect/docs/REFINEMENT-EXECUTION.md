# Shared refinement execution

This is the editing and verification path used by targeted `refine` and accepted visual updates from `evolve --refresh`.

1. Load the component/screen, its stories, theme, adapter contracts, APIs, consumers, and accepted reference/feedback. Preserve interactions, wiring, accessibility, and intentional differences.
2. Run `DESIGN_EXECUTE` from `docs/DESIGN-CONTRACT.md` for the selected correction. Change the real component and story together; keep controls and props wired.
3. Run the actual compiler, render, controls, and affected consumer checks. Capture before and after. Review the full cascade from `verify-catalog.mjs --check`; accept intentional implementation goldens only after review.
4. Compare implementation captures with the accepted reference for every selected state, viewport, and theme. Record discrepancies and explicit exceptions separately from regression results. Golden acceptance is not reference fidelity.
5. For refresh work, use the accepted run's capture/apply/judge/check helpers from `docs/REFRESH-CONTRACT.md`. Preserve the accepted plan and use prepared file patches. For ordinary targeted refine, edit the named target directly and keep its existing verification path.
6. Use refine's token change recipe for token edits. Route additions/extensions to build through evolve; route removals through evolve's explicit confirmation path. Reverify consumers affected by shared changes.

A targeted correction already authorized by its invocation needs no additional approval. A refresh accepted as one plan needs no per-item or cascade reconfirmation unless new scope or ambiguity appears.
