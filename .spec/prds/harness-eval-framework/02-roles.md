---
stability: PRODUCT_CONTEXT
last_validated: 2026-10-30
prd_version: 2.0.0
---

# Roles

| Role | Description |
|------|-------------|
| Plugin maintainer | The person who releases pixel-perfect. They read the run summary and the verify report, decide whether the next release may ship, and merge or reject a fix pull request. |
| Fix reviewer | The person who merges a pull request opened for a newest-version failure. This is often the same person as the maintainer. The merge is not the release gate, and it does not clear a pinned block. |
| Fixer | The person or agent who takes a failure issue, makes the change, and proves it with the eval the issue names. The issue grants no authority: the change still goes through review, and a person merges it. |
