# pixel-perfect — Agent Governance

pixel-perfect is an agent skill/plugin shipped to six coding-agent CLIs (Claude Code, Codex,
Grok, OpenCode, Pi, Cursor), with a landing site, an adapter build pipeline, and a
harness-evaluation framework (`.spec/prds/harness-eval-framework/`). This file is the
authoritative specialist table for `planning-specialist-resolver`, `kb-sprint-plan`, and
`kb-improvement-plan`. Created 2026-10-28 — before this date the resolver inferred
specialists from the roster because no table existed.

All agents below are verified present in the roster (`~/Projects/brain/agents/`).

## Local Domain Experts

| Specialist | Role | When to use (domain) |
|------------|------|----------------------|
| `github-agentic-workflow-planner` | planner | GitHub Actions workflows, GitHub Agentic Workflows (gh-aw), safe-outputs, release-gate wiring — `harness-eval.yml`, `tag-release.yml`, `ci.yml`, the heal-PR flow |
| `github-agentic-workflow-implementer` | implementer | Workflow YAML + composite actions via TDD (`gh aw compile --validate`, real runs) — never by inspection |
| `github-agentic-workflow-reviewer` | reviewer | Adversarial review of workflows: safe-outputs trust boundaries, sandbox/network policy, silent-drop keys, green-runs-that-wrote-nothing |
| `evals-planner` | planner | Evaluation/grading strategy: graders, fixtures, negative controls, planted-defect/clean-twin design, judges, error analysis for the harness-eval framework |
| `evals-implementer` | implementer | Grader/evaluator implementation against the real system and real model calls — no canned verdicts |
| `evals-reviewer` | reviewer | Eval-suite audit: oracle strength, fixture reality, judge validation, negative-path coverage |
| `ai-tooling-implementer` | implementer | Harness adapter code — OpenCode/Codex/Claude Code/Cursor/Pi/Grok plugin surfaces, `scripts/build-adapters.mjs` outputs, plugin manifests. **No `ai-tooling-planner` exists in the roster** — route planning for this domain through `evals-planner` or `github-agentic-workflow-planner` |
| `ai-tooling-reviewer` | reviewer | Harness adapter review (ecosystem patterns, TDD compliance, plugin contracts) |
| `github-platform-implementer` | implementer | Repo platform controls: Rulesets, branch protection, GitHub Apps, Projects — the heal-app merge-denial ruleset lives here |
| `devops-engineer` | specialist | CI/CD pipelines, releases, npm publishing (`scripts/release.mjs`, `pixel-perfect-opencode-adapter` distribution) |
| `react-vite-planner` | planner | `site/` landing site planning (Vite) |
| `react-vite-implementer` | implementer | `site/` landing site implementation |
| `react-vite-reviewer` | reviewer | `site/` landing site review |
| `code-reviewer` | reviewer | General code-quality review on any surface |
| `test-quality-reviewer` | reviewer | Standing test-reality seat (oracle strength, fixture reality, negative paths) — required by `/review-red-hat` |
| `product-manager` | lead | PRD planning lead (`/kb-prd-plan` team lead); product scope and verdicts |

## Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| CLI (Node/pnpm) | Required | Headless product — gates observe workflow runs, artifacts, and CLI output; no navigable UI |

## Notes

- **Specialist resolution**: `planning-specialist-resolver` reads this table first. The
  harness-eval-framework roadmap (2026-10-28) was planned with the roster-inferred set
  (`github-agentic-workflow-planner` + `evals-planner`), which this table now makes canonical.
- **Known roster gap**: `ai-tooling-planner` does not exist. If adapter-domain planning volume
  grows, create it (triad symmetry) via `/set-experts`; until then the two planners above cover it.

## Declared Specialist Suites

Read by `tools/task-assignment/resolve_planner.py`. Each row is one unambiguous
planner/implementer/reviewer triad for work in this repo. Added 2026-10-28 for the
harness-eval framework, whose workflow/platform/devops work has no same-suffix planner.

| Domain | Planner | Implementer | Reviewer |
|--------|---------|-------------|----------|
| GitHub Actions workflow scaffolding and grade-recorder jobs | `github-agentic-workflow-planner` | `github-platform-implementer` | `github-agentic-workflow-reviewer` |
| Workflow environment and credential wiring | `github-agentic-workflow-planner` | `devops-engineer` | `github-agentic-workflow-reviewer` |
| Capture-layer runtime and harness adapters inside the evaluator workflow | `github-agentic-workflow-planner` | `ai-tooling-implementer` | `ai-tooling-reviewer` |
| Evaluator grading, fixtures, and negative controls | `evals-planner` | `evals-implementer` | `evals-reviewer` |
| Review of the review itself (receipt audit) | `github-agentic-workflow-planner` | `github-agentic-workflow-reviewer` | `code-reviewer` |
