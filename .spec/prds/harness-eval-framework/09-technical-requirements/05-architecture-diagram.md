---
stability: CONSTITUTION
last_validated: 2026-10-30
prd_version: 2.0.0
---

# Architecture Diagram

```
Maintainer
    |  nightly published / hand selected mode / push exact checkout
    v
[harness-eval workflow]
    |-- [drift-proof job] -----------------> harness-eval/drift
    |-- [smoke matrix: 6 harnesses x pinned/newest]
    |         |  no key on install; key only on the smoke step
    |         v
    |     [per-harness adapter] -> grade file + event stream + verify report
    v
[grade recorder] --> artifact harness-eval-result
    |
    |-- [issue job: no model, issues write only] --> one issue per unexpected failure
    |         (read by a fixer; never read by the release gate)
    v
[pinned-channel status] --> harness-eval/pinned
    |
    +-- pinned fail or could-not-run --> release gate refuses publish
    |
    +-- newest graded fail only --> [fix agent, no write token]
                                         |
                                         v
                                   [reproduce + patch recheck on main repair base]
                                         |
                                         v
                                   [confirm exact patch, immutable base graders]
                                         |
                                         v
                                   [heal app opens PR; bot merge denied] --> person merges
```

Publish resolves trusted checkout run/attempt, actual loaded bytes, 36-hour freshness, and published compatibility holds, then repeats local drift. Published success alone never authorizes a candidate.
