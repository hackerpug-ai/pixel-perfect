# Red-Hat Review Report

**Report Date**: 2026-10-02T23:27:00Z
**Target**: Resume an existing Pixel Perfect component library and reconcile it with refreshed exported designs
**Source revision**: `e9621ff628ae962d7d3eb5422b46908163f70a1b` — local plugin version 9.2.0
**Reviewed By**: code-reviewer, frontend-designer, test-quality-reviewer; orchestrator independently checked source, the merge/validator probe, mutation logs, and restored file hashes
**Test-reality lens**: ran (implemented mode for existing scripts/tests; proposed refresh orchestration has no complete runnable implementation)

## Executive Summary

Pixel Perfect has most of the pieces, but it does **not yet provide a reliable whole-library refresh against new exports**. `evolve` is the closest intake command, `refine` is the existing implementation editor, and `verify` checks results. Their contracts leave a gap for an already-built entity whose identity and API stay the same while its required appearance changes.

Add a refresh mode to **existing `evolve`**, reuse `refine` for visual changes and `build` for inventory additions, and require proof against the accepted reference revision. `polish` is currently an internal lens pack, and its planned purpose is reference-free quality improvement. It is not the exported-design reconciliation mechanism.

**Scenario verdict: needs-revision.** This report recommends changes; it does not implement them or claim to have refreshed the user's dormant project. No consumer project or new export was supplied. Report completeness and product completion are separate verdicts.

## Scenario criteria and verdicts

These criteria translate the user's scenario into review questions. They are not an existing sprint's acceptance criteria, and no task checkboxes were edited.

| Criterion | Verdict | Current evidence and limitation |
|---|---|---|
| AC-1 Recover an older project without losing work | PARTIAL | `plugins/pixel-perfect/skills/process-context/SKILL.md:10-72` describes YAML, v4 and pre-v8 migration. Actual preservation of a May project's files, manifest and stories was not exercised. |
| AC-2 Make refreshed exports the accepted current design reference | FAIL for authoritative replacement | `plugins/pixel-perfect/docs/DESIGN-ANALYSIS.md:35-36,95-104` stages additive analysis. The merge retains earlier mappings and observations; it does not define reference supersession. |
| AC-3 Reconcile existing identities, tokens, states and structural differences | PARTIAL | `plugins/pixel-perfect/workflows/evolve.md:76-106` protects identity and asks about ambiguity, but lacks an existing-identity visual-update outcome. |
| AC-4 Refit existing shared components and composed views while preserving behavior | PARTIAL | `plugins/pixel-perfect/workflows/refine.md:61-74,242-258` can edit and cascade. It has no accepted fresh-reference worklist covering the entire selected scope. |
| AC-5 Reopen affected completed work and reject stale evidence | FAIL | `plugins/pixel-perfect/workflows/build.md:217,405-417` subtracts already-verified items and resumes saved plans. No reference-revision freshness contract reopens them. |
| AC-6 Prove fresh-target fidelity and working consumer behavior | PARTIAL; end-to-end proof absent | `plugins/pixel-perfect/docs/DESIGN-CONTRACT.md:31-35` requires visual comparison in prose. Catalog drift checks compare implementation captures to implementation goldens; they do not establish fidelity to a new export. |
| AC-7 Provide a clear, repeatable refresh with a no-op unchanged rerun | FAIL | No refresh orchestration or completion receipt exists. Explicit reanalysis with improved models must also be distinguished from an ordinary unchanged rerun. |

## Which command to use

| Command | Current job | Fit for this scenario |
|---|---|---|
| `evolve` | Ingest a design delta; classify reuse, variants, additions, promotions and removals | Best front door to extend. It already accepts `./updated-design-system/`, stages intake, and owns delta confirmation. |
| `refine` | Change an existing component, screen or theme and recapture | Correct editor for existing visuals; currently a targeted/manual loop rather than export-wide reconciliation. |
| `build` | Build the confirmed inventory through its saved plan | Reuse for actual additions and variants. Rerunning it alone does not reliably reopen completed components. |
| `verify` | Check current phase or selected entity; optionally fix detected failures | Evidence and regression checks; not the reprocessing coordinator. |
| `polish` | Internal lenses and findings schema | Not public: `plugins/pixel-perfect/skills/polish/SKILL.md:3-13`. Its original handoff describes reference-free critique, not mock fidelity (`docs/handoffs/handoff-20260814-2210-polish-workflow.md:13-24`). |

For work **today**, targeted `refine --component <name>` / `refine --screen <name>` with explicit references is the closest supported editing loop. Use `evolve` for real additions or variants. Manually inspecting fresh targets, maintaining their mapping, and checking every affected consumer are still necessary; this is not an automated batch refresh. Avoid treating `evolve --replace` as a visual refresh shortcut: its documented meaning is remove plus add (`evolve.md:26`).

Claude Design documents ZIP and standalone HTML export. For this plugin, use standalone HTML or extract the ZIP while retaining sibling assets, then point at the actual HTML/image source or containing directory. The renderer supports HTML, PNG/JPEG/WebP, URLs and suitable directories; it has no direct ZIP, PDF, PPTX or `.fig` reader (`render-frames.mjs:38-39,84-123`). This review does not verify the upstream Figma-to-Claude-Design transfer. [Official Claude Design export documentation](https://support.claude.com/en/articles/14604416-get-started-with-claude-design).

## HIGH Confidence Findings (3+ Agents Agree)

- [ ] F-005: A clean implementation catalog cannot establish fidelity to refreshed designs. | Severity: HIGH → CHG-003
  Agents: code-reviewer, frontend-designer, test-quality-reviewer.
  `plugins/pixel-perfect/scripts/verify-catalog.mjs:551-615` compares captures against implementation goldens. PNGs are excluded from authoritative comparison (`:332-333,379`). Baselining an already-drifted implementation or accepting a changed golden can make this check clean without moving closer to the export. The design contract's running-surface review remains valuable, but no durable refresh gate binds it to the selected target revision, state and viewport.

## MEDIUM Confidence Findings (2 Agents Agree)

- [ ] F-001: Changed designs on a completed project enter a command with no same-identity visual-update lane. | Severity: HIGH → CHG-002
  Agents: code-reviewer, frontend-designer.
  `plugins/pixel-perfect/workflows/build.md:174` routes changed references after compose to evolve. `evolve.md:80-87` defines reuse as nothing to build and variant as new state/prop/size. Its reuse option even recommends reuse for cosmetic differences (`:98-101`). A same-name button with obsolete typography or layout can therefore receive no work. E5 hands additions and variants to build (`:175`), leaving the missing path unconnected.

- [ ] F-002: Reference frame replacement conflicts with additive inventory preservation. | Severity: HIGH → CHG-001
  Agents: code-reviewer, frontend-designer; independently reproduced by orchestrator.
  `plugins/pixel-perfect/scripts/render-frames.mjs:173-180` replaces a source's frame set. `merge-inventory.mjs:18-26,38-47,56-68` unions prior frame associations and retains prior scalar/token observations. `verify-inventory.mjs:699-719` checks rendered-to-inventory coverage but not reverse resolution or source-hash agreement. A production-function probe retained five inventory frames while accepting a one-frame rendered index with exit 0 and no violations. A requested observation change from `#111111` to `#eeeeee` also retained `#111111`. These are observations of the design, not authority to override application tokens automatically. Evidence: [merge/validator probe](red-hat-2026-10-02-reference-refresh-evidence/merge-validator-probe.json).

- [ ] F-004: Old completion and saved plans can suppress required refresh work. | Severity: HIGH → CHG-002
  Agents: code-reviewer, frontend-designer.
  `plugins/pixel-perfect/workflows/build.md:217-229` computes required minus already verified; `:405-417` resumes the saved plan. A reference revision is not a required-work identity. `verify.md:371` leaves an old gate unchanged on failure. A May pass must remain historical evidence, not current proof of an October target.

- [ ] F-008: Returning-project guidance is fragmented and preservation is unproved. | Severity: MEDIUM → CHG-005
  Agents: code-reviewer, test-quality-reviewer; frontend-designer also notes the migration limitation.
  `README.md:73` points 7.x users at 8.0 migration, while `plugins/pixel-perfect/docs/UPGRADING-9.0.md:12-17` tells existing users to run build. The completed-project branch actually routes reference changes to evolve. Migration in `skills/process-context/SKILL.md:12-42` is a prose parse/rewrite/delete sequence; documentation tests do not prove retention on a real older project (`test/workflows.test.mjs:311-335`). No actual data loss is alleged.

## LOW Confidence Findings (Single Agent)

Confidence here counts reviewer agreement, not evidence quality. Executed mutation results can be strong evidence while still having one reviewer.

- [ ] F-003: Entry-file hashes miss changes to assets that affect the rendered target. | Severity: HIGH → CHG-001
  Agent: code-reviewer; orchestrator independently inspected source.
  `plugins/pixel-perfect/scripts/render-frames.mjs:633-634,684-685` hashes entry HTML, while supported decks load sibling partials/assets in place. `build.md:100` uses source hashes to skip current inventory analysis. A changed stylesheet, font or partial can alter the target without altering the cache key. Static source evidence; no asset-only browser mutation was run in this review.

- [ ] F-006: Green subsystem tests do not discriminate the complete refresh workflow, and two tested oracles accept broken behavior. | Severity: HIGH → CHG-004
  Agent: test-quality-reviewer; orchestrator inspected the logs and restored hashes.
  Existing consumer tests expand text composition markers (`test/fixtures/consumer-web/sandbox/capture.mjs:3-6,33-38`); they do not drive a real application's shared components. In an isolated worktree, widening catalog live roots from screens to all dependents still passed 24 tests (`test/catalog.test.mjs:234-258`). Removing `judged.push(...)` from `capture-polish.mjs:297` still passed the real Chrome/HTTP capture test because `test/capture-polish.test.mjs:131-140` only checks exclusion and iterates a possibly empty list. Conversely, disabling moved-story detection failed three relevant assertions, so the suite has useful discrimination too. These mutations were restored; neither defect was left in production. The polish helper is internal, not evidence that a public polish workflow is shipped and broken.

- [ ] F-007: A newer model is not an explicit design intent or permission to discard deliberate product differences. | Severity: MEDIUM → CHG-002
  Agent: frontend-designer.
  `plugins/pixel-perfect/docs/DESIGN-CONTRACT.md:7,27-33` correctly prioritizes product constraints and existing libraries. Refresh still needs a concrete choice between reproducing the accepted target and exploring a redesign, plus retained behavior/accessibility exceptions. An unchanged export also needs an explicitly requested fresh analysis after a model/plugin upgrade; ordinary idempotence must not silently prevent that request or force cosmetic edits where no improvement is needed.

## OVER-ENGINEERING (scoped to the artifact)

Lean already for this review's scope. No refactors or cuts recommended. Extend the existing workflow and deterministic helpers; do not create another competing build engine or public command.

## Agent Contradictions & Debates

| Topic | Positions | Assessment |
|---|---|---|
| Best command | Refine performs existing-implementation edits; evolve owns fresh-export intake | Both apply. Use evolve as coordinator and refine as editor; retain the short targeted refine path. |
| Imported sources | Some criteria were marked PARTIAL because staging/rendering exist; design reviewer marked authoritative replacement FAIL | The narrower helpers exist. The requested replacement of current design authority is absent, so AC-2 fails for the whole scenario. |
| Test severity | Standing seat labels survived mutations CRITICAL | Consolidated F-006 is HIGH for the missing trustworthy workflow proof. The reach mutation is a secondary impact-analysis defect; polish is internal. No fake public refresh implementation or production data loss was demonstrated. |
| Goldens and design targets | Historical polish handoff treats golden drift as mock-fidelity coverage | The current source proves these are separate checks. Keep implementation regression checks and add explicit target-fidelity evidence. |

## RECOMMENDED CHANGES (the change set)

### CHG-001 — Track and reconcile accepted source revisions · HIGH · effort L

- **Closes**: F-002, F-003
- **Target**: `plugins/pixel-perfect/docs/DESIGN-ANALYSIS.md:L35-104`; `plugins/pixel-perfect/scripts/merge-inventory.mjs:L18-68`; `plugins/pixel-perfect/scripts/render-frames.mjs:L129-183`; `plugins/pixel-perfect/scripts/verify-inventory.mjs:L699-719`
- **Now**: Intake extends prior inventory; active frames can be replaced while old associations remain. Freshness hashes only the entry document.
- **Change to**: Introduce explicit source supersession for a confirmed refresh while keeping default additive import behavior. Stage old/new source correspondence, accepted entity/state mappings and current observations. Preserve earlier targets as history, not competing active frames. Detect new download paths that replace old sources. Resolve reordered frames by semantic correspondence rather than trusting ordinal IDs. A partial export or omitted state must not silently delete product capability. Gate persisted active inventories with matching source revisions and bidirectional frame resolution; retain the broader context intentionally needed during additive delta analysis. Include local dependencies and render configuration in freshness, or render afresh and compare normalized output. Promote the staged revision only when its contract passes; preserve the previous accepted revision on failure.
- **Verify**: Add cases to `test/merge-inventory.test.mjs`, `test/verify-inventory.test.mjs` and `test/render-frames.test.mjs` for same-source reordered/removed frames, changed observations, renamed download paths, partial exports, and unchanged entry HTML with changed sibling CSS. Run these scripts against real files and Chrome. Reject dangling mappings and stale hashes; preserve unrelated entities and additive imports. The saved five-inventory/one-rendered-frame probe must no longer pass in active-revision mode.

### CHG-002 — Add an export-refresh lane to evolve and execute the whole accepted scope · HIGH · effort L

- **Closes**: F-001, F-004, F-007
- **Target**: `plugins/pixel-perfect/workflows/build.md:L174-229`; `plugins/pixel-perfect/workflows/evolve.md:L53-175`; `plugins/pixel-perfect/workflows/refine.md:L55-74`
- **Now**: Visual edits and inventory changes have separate useful workflows, but completed same-identity entities lack a fresh-export batch handoff.
- **Change to**: Add a refresh mode to evolve, with proposed public syntax `pixel-perfect:evolve --refresh ./exports/ --platform web-desktop`. This syntax is a recommendation, not shipped behavior. Classify selected entities as unchanged, visual-update, variant/addition, structural removal, or unresolved conflict. Show one reviewable plan covering shared tokens/components and their consumer views. Carry exact accepted target mappings into refine for visual changes and into build for new inventory. Reopen affected previously verified items explicitly; do not erase all project gates. Preserve APIs, existing data/event wiring, routes, accessibility requirements and accepted intentional divergences. Include affected composed views in the accepted batch. Track per-item progress so interruption resumes unfinished work. Explicitly requested reanalysis may reread unchanged exports with newer models; ordinary unchanged reruns should make no source or baseline changes. A current failure leaves the refresh incomplete even if an older pass remains in history. Store validated worklists, progress and revision comparisons in deterministic helpers, not solely model-written status prose.
- **Verify**: Start from a real completed library with one shared Badge used by two screens and one unrelated screen. Change only the exported Badge appearance and screen spacing. The plan must select existing identities, update both consumers, retain interaction behavior and leave the unrelated screen intact. A stale saved plan must not suppress this work. A deliberate unchanged-source reanalysis must run analysis without requiring gratuitous edits; a normal accepted rerun must be a no-op. Detailed automation and public-entry evidence belong to CHG-004.

### CHG-003 — Require current reference-fidelity evidence before accepting refresh completion · HIGH · effort M

- **Closes**: F-005
- **Target**: `plugins/pixel-perfect/docs/DESIGN-CONTRACT.md:L31-35`; `plugins/pixel-perfect/workflows/verify.md:L231-289`; `plugins/pixel-perfect/workflows/verify.md:L355-371`
- **Now**: Visual review is required in prose; catalog acceptance can certify implementation consistency without demonstrating alignment with refreshed targets.
- **Change to**: Report implementation regression, reference fidelity and consumer behavior separately. For every selected entity/state/viewport/theme, require accepted reference revision, implementation revision, before capture, after capture, fresh target, discrepancy verdict and any explicit exception. Validate evidence coverage/freshness deterministically and keep visual judgment explicit. Screenshots must come from the running component and its actual consumer routes. Preserve real interaction checks for affected behavior. Do not use accepting/rebaselining implementation goldens as proof of target fidelity. Reject missing, stale or mismatched evidence; old passing gates remain historical. Use visual discrepancy budgets or explicit observations suitable to the platform rather than promising exact byte-identical pixels across frameworks.
- **Verify**: Keep a visibly obsolete component unchanged and accept it as an implementation golden. Catalog consistency may pass, but fresh-reference completion must fail. Correct the shared component and verify both consumer views at matched states and viewports. Reintroducing the discrepancy, substituting an old reference receipt, disconnecting a real consumer import, or breaking its interaction must invalidate completion. Capture a before/after comparison that a human can inspect.

### CHG-004 — Prove the returning-project journey and strengthen the existing test oracles · HIGH · effort L

- **Closes**: F-006
- **Target**: `test/catalog.test.mjs:L234-258`; `test/capture-polish.test.mjs:L131-140`; `NEW: test/refresh-existing-project.test.mjs`; `NEW: test/fixtures/refresh-existing-project/`
- **Now**: Real filesystem helpers and a real Chrome capture have useful tests, but there is no complete public-entry refresh test. Two bounded mutations survived narrower tests.
- **Change to**: Assert exact valid judged screenshot membership and nonempty coverage; reject intermediate components from the expected screen-root set, including a component used only by a dead intermediate and the documented no-screen fallback. Add a real small component library plus consuming app with old and refreshed exports, a retained legacy manifest, two shared consumers, an unrelated route, behavior and ambiguity cases. Once CHG-001/002 exist, drive the public workflow or its real deterministic runner, not a sequence of helper calls labelled as end-to-end. Retain evidence from one supported coding harness executing the model-mediated analysis and actual code edits. Keep data/rendering real; do not mock the refresh planner, renderer or consumer.
- **Verify**: `node --test test/catalog.test.mjs test/capture-polish.test.mjs test/refresh-existing-project.test.mjs` must pass against real filesystem, HTTP and Chrome after implementation. The new test filename does not exist today. Require a failing initial fidelity check, successful scoped update, preserved interactions, ambiguity refusal, interruption recovery, stale-receipt rejection and unchanged no-op rerun. Repeat both survived mutations: empty judged images and broadened live roots must fail. Retain the already-killed no-moved-story mutation. Finish with a real returning user's project through the published entrypoint; passing only the fixture is insufficient to claim that person's project refreshed.

### CHG-005 — Publish one preservation-first returning-project recipe · MEDIUM · effort M

- **Closes**: F-008
- **Target**: `README.md:L73`; `plugins/pixel-perfect/skills/process-context/SKILL.md:L10-72`; `plugins/pixel-perfect/docs/UPGRADING-8.0.md:L11-29`; `plugins/pixel-perfect/docs/UPGRADING-9.0.md:L12-17`
- **Now**: Upgrade instructions are split by release and do not lead a returning user through the complete finished-project branch.
- **Change to**: Describe detected manifest generation, retained implementation/inventory/story fields, old references, capture readiness and pending migration work before refresh. Preserve original manifests until migrated output is parsed and validated, with no deletion on failed conversion. Link the v8 capture and v9 design-inventory changes. Capture the current built library as a before-state, explicitly distinct from fresh-target approval. Document supported export formats and a single recovery → export reconciliation → scoped update → fidelity/behavior proof route. State that polish remains internal until its actual workflow ships. Update the recipe when the refresh changes land; do not advertise proposed flags as available now.
- **Verify**: Take a real retained older project with completed components/stories through only the published recipe. Confirm no reinitialization or loss of product code, tokens, source references or platform state; block on a failed migration. Then execute the CHG-004 journey. The recipe must make the finished-project versus unfinished-build branch unambiguous.

### Not fixable in this artifact

None of the eight findings requires an outside owner to fix. Executing a refresh on the user's actual dormant project requires that project's location and chosen export; this is a limit of this review, not an extra implementation finding.

## Proposed user experience

The command should answer: **“Bring this existing system into agreement with these accepted designs, keeping the product working.”**

1. Recover the project context and capture its current state.
2. Render the refreshed export and map its screens/states to existing identities.
3. Present one plan: unchanged, visually changed, new/extended, removed, ambiguous, and intentional exceptions.
4. Apply the accepted visual changes through shared tokens/components before composed views; reuse existing implementation and behavior.
5. Show old implementation, refreshed target and new implementation together, then verify real consumer behavior.
6. Record the accepted target revision and complete coverage; subsequent unchanged runs report no work.

The export is the design decision. A better model may interpret or implement it better, but improvement is demonstrated by comparison and working behavior, not inferred from a model version. If the goal is a new aesthetic direction, approve that direction in the export first. Reference-free polish can be a separate later pass.

## Executed evidence and limits

| Check | Result | What it proves |
|---|---|---|
| Eight focused existing test files: catalog, consumer-catalog, evolve-inventory, merge-inventory, verify-inventory, workflows, contracts, polish-lenses | 148 passed | Existing narrow contracts; not end-to-end refresh |
| `node --test test/capture-polish.test.mjs` | Passed with real Chrome and local HTTP | Actual capture path runs |
| Widen live roots to all dependents, run catalog/consumer/evolve tests | 24 passed; mutation survived | Live-root oracle is incomplete |
| Disable moved-story detection, run blast/reach tests | Exit 1; three assertions failed | Existing suite detects missing propagation |
| Remove all valid images from judged list, run capture test | Passed; mutation survived | Screenshot judgment coverage can be empty |
| Orchestrator direct production merge + validator probe | Five inventory frames versus one rendered frame; exit 0; old observation retained | Replacement contract gap; repository fixture input, no application result claimed |
| Report checker self-test | 14/14 passed | Report validator works on its own fixtures |

Evidence lives in [the evidence directory](red-hat-2026-10-02-reference-refresh-evidence/). The current tests are not dismissed as fake: the browser/HTTP capture is real, and the text catalog is useful for its narrower transform contract. Neither supplies the absent refresh journey.

All mutations ran in a detached disposable worktree and were restored byte-for-byte. Orchestrator confirmed the worktree was clean and both script SHA-256 values matched the source checkout. `main` remained at the recorded source SHA through all reviewer dispatches. The existing `.gitignore` edit was preserved. No product source or tests were changed by this review.

The earlier site comparison at `.spec/reviews/red-hat-2026-10-01-design-comparison.md` describes related catalog limitations, but its browser evidence was not rerun or counted as current proof here. Upstream Figma transfer, complete real-project migration, full refreshed-library implementation, and model-quality improvement were not executed.

## Gate steps

The target is an existing workflow capability and a user scenario, not a sprint folder. Human Testing Gate pre-check is not applicable. No sprint or product completion claim was updated.

## Agent Reports (Summary)

- **code-reviewer**: Traced current command dispatch, completed-item skipping, source hashing, merge/persistence, upgrade guidance; executed the production merge/validator probe.
- **frontend-designer**: Reviewed target authority, identity-preserving visual updates, shared-component cascades, product constraints and the distinction between fidelity and polish.
- **test-quality-reviewer**: Audited all seven scenario criteria, ran focused tests and real browser capture, and tested three bounded mutations: two survived, one was killed.

## Metadata

- **Agents**: code-reviewer (source, shell, production-function probes), frontend-designer (source and design-workflow review), test-quality-reviewer (source, shell, real HTTP/Chrome, isolated mutations).
- **Reviewer selection**: No local AGENTS.md specialist table exists. Used available generic code-reviewer, the required frontend-designer role, and the unconditional test-quality-reviewer seat. This runtime fixes the designer role's model; the global `opus` preference could not be selected here.
- **Confidence Framework**: HIGH (3+ agents), MEDIUM (2), LOW (1); orchestrator checks do not inflate reviewer counts.
- **Artifact file set**: The named refine/evolve/verify/polish/build/init entry surfaces, their shared design/context/inventory/capture contracts and helpers, corresponding tests, and returning-project docs. User scenario supplied the scope; no feature diff or sprint was supplied. No repository-wide refactoring audit.
- **dropped_out_of_scope**: 0 over-engineering findings.
- **changes_recommended**: 5 from 8 consolidated findings (0 CRITICAL, 6 HIGH, 2 MEDIUM, 0 LOW severity).
- **no_change_upstream**: 0.
- **Report gate**: PASS 6/6 via check-report.sh (exit 0, no blocking findings or warnings); product scenario remains needs-revision. This validates report completeness, not the proposed feature.
- **Report Generated**: 2026-10-02T23:27:00Z.
- **Next Steps**: Implement the five recommended changes as coherent workflow behavior, then prove the actual returning-project journey.
