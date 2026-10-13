---
stability: CONSTITUTION
last_validated: 2026-10-13
prd_version: 1.0.0
---

# Architecture Diagram

```
Maintainer
    |  nightly / hand / push to main (plugin paths)
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
    v
[pinned-channel status] --> harness-eval/pinned
    |
    +-- pinned fail or could-not-run --> release gate refuses publish
    |
    +-- newest graded fail only --> [fix agent, no write token]
                                         |
                                         v
                                   [patch recheck on base SHA]
                                         |
                                         v
                                   [confirming run, graders from base]
                                         |
                                         v
                                   [heal app opens PR] --> person merges
```
