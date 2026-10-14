# Harness evaluation specification remediation validation

Scope: PRD 1.0.1 and its linked scenario definitions. No production implementation, workflow deployment, repository rule, provider credential, merge, or release capability was changed by the remediation. The final documentation commit is made by the parent after these checks.

## Results

- `pnpm run ci` exited 0: release verification, all repository validators, 576 tests passed, 0 failed/cancelled/skipped/TODO. Full output: [repository-ci.txt](repository-ci.txt). The initial `pnpm ci` spelling invoked pnpm's unsupported built-in command; `pnpm run ci` correctly invoked the repository script.
- Document checks exited 0: 17/17; 65 original criterion IDs, 68 original plus 9 new scenario IDs, all 16 use cases, matching source/table text, local links, 99 valid YAML frontmatter blocks, 17 finding mappings, test type counts, whitespace, and preserved review/WIP hashes.
- [Harness reviewer](harness-review.md), [security reviewer](security-review.md), and [test-quality reviewer](test-quality-review.md): planning approval, with initial follow-up findings and their final dispositions preserved.
- Original HEAD/main were 9825d9c25c4eb4def9a5e980b1ac0928991a7036 throughout subordinate review. All 187 original review/evidence and unrelated WIP files remained byte-identical. [Baseline](baseline.json) stores that inventory; [structural result](structural-results.json) records the final check.
- Only specification/scenario documents and this new remediation evidence are staged. Original untracked reviews and .tmp work remain unstaged.

## Reproduce document checks

From the repository root with Python 3 and PyYAML available:

```sh
python3 .spec/reviews/remediation-evidence-20261014-harness-eval-framework/check-documents.py
pnpm run ci
```

The original precommit invocation also passed `--precommit`, which requires HEAD/main to equal the baseline. After the documentation commit, the default mode instead verifies baseline ancestry. Source ID comparisons always use the original reviewed commit, not a moving HEAD. The baseline-preservation check assumes the original local untracked review/WIP files remain available; an archive without those files cannot claim that local preservation proof.

## Proof limits

Structural checks and existing repository tests do not prove the new evaluation framework. All six-harness runtime paths, provider/authentication controls, GitHub selection/freshness/pagination and schedule behavior, artifact-upload provenance, fixer isolation/confirmation, bot-merge refusal, human merge/reject, screenshot-judge detection, and persistent native resume remain unverified until their specified real-service scenarios run. No stub, local replacement service, fabricated event, or documentation assertion closes those gates.
