## Acceptance-criterion assessment

This is a documentation-only remediation re-review. PASS means the current planning contract addresses the assigned finding; it does not attest runtime behavior. The table covers the union of stable criteria assigned by F/CHG-002, 009–013, and 017 in `11-remediation.md`. Paths are repository-relative.

| ID | Exact current criterion | Verdict | Evidence | Limits |
|---|---|---|---|---|
| T-REL-001 | Maintainer can rely on a pinned-version evaluated failure blocking release until a trusted, complete checkout evaluation for the exact publish commit clears it within its 36-hour lifetime | PARTIAL | .spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:27-32 | R-S001–003 require CHG-002 clarification; runtime unverified. |
| T-REL-003 | Maintainer can rely on an exit code of 0 not clearing that block | PARTIAL | .spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:27-32 | R-S001–003 require CHG-002 clarification; runtime unverified. |
| T-REL-004 | Maintainer can rely on an open fix pull request not clearing that block | PARTIAL | .spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:27-32 | R-S001–003 require CHG-002 clarification; runtime unverified. |
| T-REL-007 | Maintainer can open the fix pull request from that warning and can see it waiting for a person to merge it onto main | PASS | .spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md:39-53 | Planning contract only; real service proof remains required. |
| T-REL-008 | Maintainer can rely on the open pull request not counting as a cleared release | PARTIAL | .spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:27-32 | R-S001–003 require CHG-002 clarification; runtime unverified. |
| T-REL-010 | Maintainer can read, in the fix pull request, which harness failed on the newest version rather than the pinned version | PASS | .spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md:39-53 | Planning contract only; real service proof remains required. |
| T-REL-011 | Maintainer can read which of the four grades failed | PASS | .spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md:39-53 | Planning contract only; real service proof remains required. |
| T-REL-012 | Maintainer can read where the evidence is, including the verify report and the named defect when the failed grade is verify | PASS | .spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md:39-53 | Planning contract only; real service proof remains required. |
| T-REL-013 | Maintainer can merge or reject that pull request | PASS | .spec/prds/harness-eval-framework/09-technical-requirements/02-system-components.md:39-53 | Planning contract only; real service proof remains required. |
| T-REL-014 | Maintainer can rely on merging it not clearing a pinned release block | PARTIAL | .spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:27-32 | R-S001–003 require CHG-002 clarification; runtime unverified. |
| T-REL-018 | Maintainer can rely on could-not-run failing the release on the pinned version or on the newest version | PARTIAL | .spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:27-32 | R-S001–003 require CHG-002 clarification; runtime unverified. |
| T-RUN-001 | Maintainer can rely on a daily 06:17 UTC schedule request for published evaluation, with actual Actions start times recorded and no exact-start guarantee | PASS | .spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:13-21 | Planning contract only; real service proof remains required. |
| T-RUN-002 | Maintainer can read that this nightly start installs pixel-perfect into Claude Code, Codex, Grok, OpenCode, Pi, and Cursor | PASS | .spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:13-21 | Planning contract only; real service proof remains required. |
| T-RUN-003 | Maintainer can rely on a pull request not being what starts this nightly grade | PASS | .spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:13-21 | Planning contract only; real service proof remains required. |
| T-RUN-004 | Maintainer can start the grade by hand, choosing published or checkout mode with checkout as the default | PASS | .spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:13-21 | Planning contract only; real service proof remains required. |

## SECURITY REVIEW VERDICT

STATUS: NEEDS_FIXES for CHG-002's GitHub lookup/provenance details. The remaining assigned remediation contracts receive planning approval.

| Finding / change | Current assessment | Evidence |
|---|---|---|
| F-002 / CHG-002 | PARTIAL: source selection, mode policy, 36 hours, fail-closed latest attempt, and holds are defined. Three bounded corrections remain below. | 04-api-design.md:13-46; 03-data-schema.md:20-30 |
| F-009 / CHG-009 | PASS, planning only: direct pinned CLI replaces the GitHub action; no GitHub/OIDC credential in model process, no persisted credential helper; real restriction proof is a prerequisite. | 02-system-components.md:39; 06-external-dependencies.md:16 |
| F-010 / CHG-010 | PASS, planning only: newest missed-defect failure is the input; two real PRs exercise human merge and reject; independent pinned block stays. | .spec/scenarios/UC-REL-03/flow-rel-03-person-decides.scenario.md:34-36 |
| F-011 / CHG-011 | PASS, planning only: restrict main updates; only designated humans can bypass; heal app excluded; missing policy or proof disables healing. | 02-system-components.md:53; .spec/scenarios/UC-REL-03/flow-rel-03-remote-evidence.scenario.md:14 |
| F-012 / CHG-012 | PASS, planning only: reproduction on repair base, immutable graders/versions, twelve-cell target repair and regression controls, patch digest, and base-moved refusal. | 02-system-components.md:39-51; 03-data-schema.md:131-135 |
| F-013 / CHG-013 | PASS, planning only: cron requests 06:17 UTC; actual times observed; missed schedules invent neither a grade nor a record; manual checkout can refresh. | 04-api-design.md:15-21; .spec/scenarios/UC-RUN-01/flow-run-01-scheduler-crash.scenario.md:14 |
| F-017 / CHG-017 | PASS, planning only: plugin root and repository-relative allowed paths are explicit throughout; unknown directory never broadens scope. | 02-system-components.md:43; 03-data-schema.md:133 |

## R-S001 — Select status history explicitly when modes share a context

**Priority:** Required CHG-002 correction; MEDIUM availability/selection ambiguity. **Validation:** source-traced. **Confidence:** HIGH for the ambiguity, no live failure claimed.

**Locations:** `.spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:29,46` and `02-system-components.md:31`.

Both published and checkout producers write `harness-eval/pinned` on the workflow SHA. Their supersession check is scoped to SHA and mode, but GitHub's combined-status view retains the latest status per context, without mode separation. A newer published observation on the same main SHA can therefore make the combined status point to published evidence while the latest qualifying checkout remains fresh. The strict pointer matching rule then refuses an otherwise eligible checkout, even when published compatibility is clear.

**Fix:** Keep the stable context if desired, but require the paginated list-commit-statuses endpoint and select the exact trusted producer/run/attempt/mode pointer chosen by the run resolver. Explicitly reject the combined-status endpoint and latest-per-context shortcuts as authorization inputs. Define duplicate matching status handling and selection independent of arrival order. Separate mode contexts are another valid option if updated consistently.

**Discriminating real check:** Produce a passing checkout followed by a passing published run on the same workflow SHA. The published run must neither substitute for nor hide the qualifying checkout. Rerun an older run and confirm it cannot supersede the selected checkout. Runtime unverified; no status writes authorized here.

**Primary premise:** GitHub's [commit-status API](https://docs.github.com/en/rest/commits/statuses) supplies both a combined latest-context result and the complete status history.

## R-S002 — Artifact attempt provenance cannot rely on a native REST field

**Priority:** Required CHG-002 correction; MEDIUM feasibility ambiguity under the existing fail-closed rule. **Validation:** source-traced. **Confidence:** HIGH for the API field mismatch.

**Locations:** `.spec/prds/harness-eval-framework/09-technical-requirements/03-data-schema.md:30`; `04-api-design.md:29`; `02-system-components.md:27`.

The schema says artifact producer run/attempt is verified from GitHub outside the JSON. The artifact REST object exposes producer workflow run ID, repository, branch, and head SHA, but no native run_attempt. A constant physical name `harness-eval-result` plus a run ID does not specify how the gate separates the same run's attempts. The result's own run_attempt is not independent provenance.

**Fix:** Define `harness-eval-result` as the logical artifact type and a deterministic physical name containing run ID and attempt, assigned by the trusted recorder from GitHub execution context. Use no-overwrite upload semantics, immutable artifact ID/digest, producer run metadata, and attempt-specific recorder/upload provenance and timestamps. Require exact unique name/ID matching; never silently accept a payload's attempt claim or a different attempt's artifact. State explicitly that REST has no artifact run_attempt field. Keep producer-workflow validation and artifact-byte digest verification.

**Discriminating real check:** Keep attempt 1's artifact, rerun as attempt 2, and ensure the gate resolves only attempt 2's qualified artifact/metadata. Attempt 2 with a missing upload must refuse despite attempt 1's success. A replacement or duplicated qualifying artifact must refuse. No workflow was run here.

**Primary premises:** [Artifact REST response fields](https://docs.github.com/en/rest/actions/artifacts); [upload-artifact overwrite semantics](https://github.com/actions/upload-artifact#overwriting-an-artifact) replace the old artifact with a new ID. The correction should use trusted uploader provenance rather than inventing a server field.

## R-S003 — Bound the required published history by evaluation completion, not creation

**Priority:** Required CHG-002 clarification; MEDIUM availability/hold-completeness ambiguity. **Validation:** source-traced. **Confidence:** HIGH for the missing bound.

**Location:** `.spec/prds/harness-eval-framework/09-technical-requirements/04-api-design.md:31`.

The rule correctly clears a completed published hold only when the selected checkout starts strictly later. It then requires readable published history without a lower bound. Indefinite history would eventually make expired, already-cleared records block every release. Conversely, implementing a naive `created >= checkout_start` query misses a published run created earlier that completes at or after checkout start and must still block.

**Fix:** Define the relevant hold interval by published evaluation completion at or after the selected checkout's evaluation start. Completed holds strictly before that boundary are cleared by that qualifying checkout and need no indefinitely retained grade artifact. Include runs/attempts that were already pending/running at the boundary; do not restrict by creation timestamp alone. At exact equality the hold remains, because clearance is strictly-after. Refuse incomplete relevant history, including API pagination/truncation gaps, rather than treating missing data as a pass. A new persistent store or watchdog is unnecessary.

**Discriminating real check:** A published failure completed before checkout starts is cleared by the later qualifying checkout, even when older irrelevant artifacts are expired. A run created before checkout starts but completing afterward still establishes a hold. Equality also blocks. No backdated JSON or local-clock manipulation counts as service evidence.

**Primary premise:** GitHub's [workflow-runs API](https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow) exposes a creation-time search filter; it is not a completion-time filter. The writer must implement the interval semantics explicitly and detect incomplete enumeration.

## Verification boundary

Read the current source contracts, remediation ledger, current criterion rows, assigned linked scenarios, and Git diff/status. Read primary GitHub status/artifact/workflow/ruleset documentation and Claude programmatic execution documentation. The current repository restriction contract matches GitHub's [restrict-updates rule](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#restrict-updates); actual settings are not asserted.

No source, original review, Git state, workflow, repository rule, credential, provider, merge, or release was changed. Only this temporary report was written. No runtime tests were run. Other agents' build/test successes were not used as proof of these service contracts. The parent's clarification requests were treated as questions to verify, not evidence that the source was already correct.


## Final disposition after current-source recheck

**Final status: PASS — planning approval for F/CHG-002, 009–013, and 017.** This supersedes the initial NEEDS_FIXES disposition above. The initial findings and criterion table are retained as the review record. No remaining consequential contradiction was found in the assigned revised contract. All runtime, provider, repository-policy, and release proof remains unverified.

| Initial re-review finding | Final disposition | Rechecked current evidence |
|---|---|---|
| R-S001 | Resolved in planning contract | `09-technical-requirements/04-api-design.md:29` now requires every status page and exact producer/run/attempt/mode selection, excluding combined/latest-per-context shortcuts. `02-system-components.md:31` agrees. `flow-rel-01-authoritative-run.scenario.md:16` now crosses a real pagination boundary and tests same-SHA published/checkout collision. |
| R-S002 | Resolved in planning contract | `04-api-design.md:34-38` distinguishes logical name from run/attempt-qualified physical name, forbids overwrite, binds immutable ID/digest, and requires attempt-specific recorder/upload provenance and creation interval. `03-data-schema.md:30` explicitly rejects a native artifact run_attempt assumption; `02-system-components.md:27` retains uploader provenance. The authoritative-run scenario rejects prior-attempt evidence sharing workflow_run.id. |
| R-S003 | Resolved in planning contract | `04-api-design.md:31` bounds relevant history by evaluation completion, includes pre-created straddling runs, blocks equality, and excludes already-cleared expired pre-boundary evidence. `flow-rel-01-published-hold.scenario.md:16` adds these controls. |

The six criterion rows initially PARTIAL are now **PASS at planning level**: T-REL-001, T-REL-003, T-REL-004, T-REL-008, T-REL-014, and T-REL-018. The other nine reviewed rows retain planning PASS. All 15 assigned criteria therefore pass this bounded specification re-review; none has acquired runtime PASS.

The artifact uploader provenance requirement is feasible without inventing a REST job-output field. GitHub exposes [attempt-specific jobs and downloadable job/step logs](https://docs.github.com/en/rest/actions/workflow-jobs). The official [upload-artifact implementation](https://github.com/actions/upload-artifact/blob/main/src/shared/upload-artifact.ts#L16) emits the immutable artifact ID and URL in its upload step's log, and exposes the ID/digest as action outputs. The implementation must retain and validate that trusted upload evidence; plain job JSON alone does not expose arbitrary action outputs. This is an implementation detail within the now-explicit contract, not another planning blocker.

Final recheck read API Design, affected Data Schema and System Components sections, and both revised release scenarios directly from the shared checkout. `git rev-parse HEAD main` still returned `9825d9c25c4eb4def9a5e980b1ac0928991a7036` for both. This reviewer changed only `/tmp/harness-eval-remediation-security-review.md`. No live action, credentials, settings, merge, publish, or service test was performed.
