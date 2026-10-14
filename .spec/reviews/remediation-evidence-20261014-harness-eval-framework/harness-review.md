# Harness remediation review

**Verdict: REQUEST CHANGES — one remaining MEDIUM planning contradiction.** The assigned remediation is otherwise adequate as a written contract. No runtime conformance or release readiness is asserted.

Reviewed the current working-tree PRD 1.0.1 and linked scenarios. The candidate, historical review evidence, and git state were read only. This report is the only reviewer write.

## Assigned closure assessment

Abbreviations below resolve under `.spec/prds/harness-eval-framework/09-technical-requirements/`: SC = `02-system-components.md`; DS = `03-data-schema.md`; API = `04-api-design.md`. PASS is planning adequacy only.

| Finding/change | Planning status | Evidence |
|---|---|---|
| F/CHG-001: installation identity | PASS | DS:13-34 binds exact pins, requested/resolved/observed CLI versions, immutable plugin revision, loaded-byte manifest, generated-adapter mapping and mismatch refusal. API:13-21 preserves published-only nightly, checkout on plugin push, manual checkout default, and mode separation. API:27-32 gives checkout evidence a 36-hour lifetime. `flow-grd-01-loaded-identity.scenario.md:14` discriminates a stale cache from the selected candidate. |
| F/CHG-003: verification versus evaluation | PASS | DS:46-56 defines expected planted detection plus clean control as evaluation pass and preserves observed outcomes. `UC-GRD-02/flow-grd-02-four-grades.scenario.md:34-36` matches it. |
| F/CHG-004: report producer and binding | PASS | DS:60-74 makes case paths mandatory, gives the deterministic evaluator ownership, binds actual observations and invocation identity, and retains both planted/clean reports. All four UC-GRD-04 scenarios distinguish unrelated/stale/swapped reports, unsafe paths and storage failure. |
| F/CHG-005: incremental canonical facts | PARTIAL | DS:93-108 and SC:125 now require real version-specific mapping qualification, normalized facts, original_event fidelity and could-not-run on unobservable facts. HR-001 remains at intentional stop versus natural completion. |
| F/CHG-006: factual status | PASS | DS:76-78 and `UC-GRD-02/flow-grd-02-status-facts.scenario.md:14` require two valid, differing states, positive observed facts and unchanged hashes; generic or stale answers fail. |
| F/CHG-007: independent must-ask check | PARTIAL | DS:80-89 and SC:121 define init, empty project, allowed/forbidden prefix, no scripted answer and failure modes. The new must-ask scenario matches them, but HR-001 leaves Pi's successful early stop ambiguous. |
| F/CHG-008: consumed credentials | PASS | DS:114-123 names real consumed variables, fresh credential stores and authenticated positive controls. Grok missing-key and Pi late-key scenarios now remove XAI_API_KEY and GEMINI_API_KEY respectively. |
| F/CHG-014: persistent resume | PASS | SC:95,129 and DS:135-137 distinguish ephemeral first checks from persistent Pi later checks. The revised resume scenario requires a second process, native identity, context-dependent continuation and missing-state refusal. Unknown argv stays an explicit runtime prerequisite. |
| F/CHG-015: forbidden screenshot judging | PASS | DS:108 requires actual public verify plus complete child/tool/model observation. `UC-GRD-01/flow-grd-01-hidden-image-judge.scenario.md:14` requires a real hidden-judge negative control; missing observability is could-not-run. The structural-only public path remains honestly unimplemented/unverified, not replaced by the oracle script. |

Scenario filenames in this table are relative to `.spec/scenarios/`.

## HR-001 — MEDIUM: Pi's normal-completion rule still overrides a successful intentional question stop

**Requirement affected:** F/CHG-005 and F/CHG-007; T-GRD-007 through T-GRD-009.

**Exact source:**

- `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md:95` states that a missing last assistant `message_end`, or a `stopReason` other than `stop`, is could-not-run. This sits in the prescribed first-check invocation paragraph without a boundary-stop exception.
- The same file, line 121, requires stopping immediately at the first valid incremental question or question-tool start, without waiting for completion.
- `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md:87-89` requires that intentional stop and says incomplete capture is could-not-run; lines 100-106 also require completion/completeness facts without distinguishing complete evidence through the selected boundary from natural process completion.
- `.spec/scenarios/UC-GRD-02/flow-grd-02-must-ask.scenario.md:14` expects success when the grader stops at incremental text or tool start.

**Trigger and impact:** Pi emits a valid first question before any expensive work. The grader observes it and terminates the process as required before Pi emits its final assistant message_end/stopReason. The must-ask contract says the probe succeeded; the adapter's unconditional completion rule says could-not-run. Either outcome blocks consistent grading and can create a false release hold. This is a conflict between two explicit proposed rules, not a claim about an implementation that has not been written.

**Validation:** source-traced. **Confidence: HIGH** for the written conflict. No runtime result is claimed.

**Actionable fix:** In `02-system-components.md:95,121` and `03-data-schema.md:87-106`, explicitly distinguish natural completion from an evaluator-initiated boundary stop. A qualified, complete prefix through a valid first-question boundary should be evaluable without a later message_end/stopReason. Keep natural-completion checks for full invocations, preserve observed violations on deliberately stopped ask-nothing checks, and retain could-not-run for missing/truncated evidence before the selected boundary. Record the actual stop reason and boundary offset; do not fabricate a native completion event. Add this precise Pi case and a premature-truncation control to `flow-grd-02-must-ask.scenario.md` or `flow-grd-03-event-coverage.scenario.md`.

**Discriminating verification:** During implementation, a real Pi process stopped after a fully captured valid first question but before natural message_end must pass the must-ask evaluation. A separate real capture interrupted before the question boundary must remain could-not-run, and a required completed status/verify invocation lacking successful completion must not pass. This review authorizes no runtime execution.

## Preserved requirements and proof limits

Independent read-only comparison with HEAD confirmed:

- All 65 original T-* IDs remain, with no duplicate criterion IDs.
- All 68 original FLOW-* IDs remain; the current set has 77 unique IDs.
- Cursor remains a required blocking could-not-run channel: SC:107; API:40.
- Later failures/could-not-run remain report-only: DS:137; API:44.
- The owner-selected trigger modes and 36-hour checkout lifetime are consistent in the inspected identity, component and API contracts.

Read the assigned revised source contracts, all revised GRD-04/05/06 scenarios, new identity/status/question/event/image scenarios, the revised resume scenario, criteria and remediation record. Inspected adjacent release policy only for identity/mode/freshness consistency; did not repeat the separate security or test-quality review. No need to reopen historical reports to establish these conclusions.

Commands: read-only `nl`, `sed`, `rg`, `git status`, and a Python comparison using `git show` / `git grep` against HEAD. No installs, provider calls, CLI execution, mutation probes, commits, merges or pushes. Runtime mapping qualification, structural-only public verification, permission stances, loaded-byte proof, credential controls and cross-process resume remain unverified. Documentation closure after HR-001 is resolved would not close any of those runtime gates.

## Final disposition after targeted recheck

**APPROVE — assigned documentation/planning remediation. HR-001 is resolved in the written contract.** This supersedes the initial REQUEST CHANGES verdict above for the revised candidate; it does not erase the original finding or claim runtime closure.

Independently re-read the current three changed passages:

- `.spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md:95` now scopes Pi's message_end/stopReason rule to normally completing invocations and explicitly applies the intentional boundary-stop exception.
- `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md:110` records termination kind, runner reason/signal, boundary offset, prefix completeness and raw status. A complete valid question prefix can be graded without inventing a native completion event. Ask-nothing questions remain failures; missing bytes/mappings, unexplained kills, prior model errors, unrelated timeouts and truncated captures cannot become passes.
- `.spec/scenarios/UC-GRD-02/flow-grd-02-must-ask.scenario.md:16` now specifies the real Pi stop-before-message_end positive control, truncated/unexplained-stop negative controls, and preservation of genuine completion evidence for native-completion checks.

F/CHG-005 and F/CHG-007 move from PARTIAL to PASS for planning adequacy. All nine assigned F/CHG areas are now adequate as written; no actionable contradiction remains in this targeted recheck. Confidence is HIGH for source-contract resolution. No runtime test, CLI invocation, provider call or release operation was performed. The real per-version mapping, boundary-stop, structural verification and resume gates remain unverified. Candidate and git state stayed read only; only this report was appended.
