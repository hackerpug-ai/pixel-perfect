# Plan: AI Chat Quality Techniques (Adopted from ai-elements)

**Date**: 2026-06-20
**Source**: Assimilation of vercel/ai-elements (holocron doc `js7d0qvx9wskx4rg2tq3a5dv9n891tcw`)
**Status**: Proposal (not yet implemented)

## Problem

pixel-perfect's quality conventions (`docs/library-vetting-rubric.md`, the verify-checklist pattern, sandbox-spec) were designed before AI chat components were a meaningful category. Several techniques observed in ai-elements would benefit any future AI chat build — and some would benefit pixel-perfect projects generally. This plan records the techniques worth adopting and where they land.

## Scope

This is a **technique adoption plan**, not a code change. Each task below is a documentation edit that encodes a technique into the relevant pixel-perfect reference, so future builds inherit it automatically.

**Out of scope:** Replicating ai-elements' dynamic registry generation, adopting ai-elements as a dependency, or copying its CI workflow verbatim. Those are documented in `docs/ai-chat-patterns.md` (Distribution Model section) as reference only.

## Tasks

### Task 1: Vitest browser-playwright pattern (for any future JS testing doc)

**Source**: ai-elements uses real chromium via `@vitest/browser-playwright` instead of jsdom for component tests. Configuration in `packages/elements/vitest.config.mts`.

**Adoption**: Document in a new section of `docs/sandbox-spec.md` (or a future `docs/testing-patterns.md` if one is created). When a project uses Vitest for sandbox/interaction tests, prefer browser mode over jsdom for any component using `IntersectionObserver`, `ResizeObserver`, media APIs, or streaming.

```ts
// vitest.config.mts (reference shape)
export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
    coverage: { provider: "v8", reporter: ["text", "json", "html"] },
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
  },
});
```

**Caveat to document**: ai-elements tests only chromium (cost control). For general-purpose libs, add WebKit for components using web APIs with cross-browser differences.

**Owner of follow-up**: Future testing-patterns doc owner.

---

### Task 2: `vitest-fail-on-console` discipline (with quarterly audit)

**Source**: ai-elements fails tests on ANY console output (assert/debug/error/info/log/warn) with targeted `silenceMessage` allowlist for upstream noise.

**Adoption**: Document in same location as Task 1, with explicit warning about the allowlist-grows-over-time anti-pattern.

```ts
// __tests__/setup.ts
import failOnConsole from "vitest-fail-on-console";

failOnConsole({
  shouldFailOnError: true,
  shouldFailOnWarn: true,
  shouldFailOnLog: true,
  silenceMessage: (message) => {
    // Audit quarterly — prefer isolating tests from noisy deps over growing this list
    if (message.includes("ReactDOM.render is deprecated")) return true;
    return false;
  },
});
```

**Anti-pattern warning**: Document that the allowlist grows tech debt. Recommend isolating tests from noisy deps via mocks as the preferred solution.

---

### Task 3: `vi.hoisted()` pattern for mock-shared state

**Source**: When `vi.mock` factory closures need mutable state that tests control, use `vi.hoisted()` to define the state at hoist time.

**Adoption**: Document in testing reference (same location as Task 1).

```ts
const { mockState } = vi.hoisted(() => ({ mockState: { isAtBottom: true } }));

vi.mock("use-stick-to-bottom", () => ({
  useStickToBottomContext: () => ({ isAtBottom: mockState.isAtBottom }),
}));

// Then mutate mockState.isAtBottom per-test
```

---

### Task 4: oxlint + oxfmt + ultracite (Rust-based OXC over ESLint+Prettier)

**Source**: ai-elements uses oxlint + oxfmt (50-100x faster than ESLint+Prettier, single binary, no plugin resolution overhead) orchestrated by ultracite (a config/rule preset wrapper, NOT a Biome fork).

**Adoption**: This is project-wide tooling, not AI-chat-specific. Document as an option in `docs/library-vetting-rubric.md` under a new "Project Tooling" section, OR in a future `docs/conventions.md`. Not recommended as a pixel-perfect default (pixel-perfect is framework-agnostic and the OXC ecosystem is younger) but documented as an option for performance-sensitive React/TS projects.

```jsonc
// .oxlintrc.json
{
  "extends": ["ultracite/core", "ultracite/next", "ultracite/react"]
}

// .oxfmtrc.jsonc
{
  "printWidth": 80,
  "experimentalSortImports": { "enabled": true, "ignoreCase": true }
}
```

**Tradeoff to document**: OXC ecosystem is younger (fewer community plugins, some experimental features). For most projects, ESLint+Prettier remains the safe default. OXC is for teams that prioritize lint/format speed.

---

### Task 5: Skill generation pipeline (MDX → SKILL.md)

**Source**: ai-elements auto-generates `skills/ai-elements/SKILL.md` from MDX docs. TS script reads MDX, strips JSX-only constructs (`<Preview>`, `<Callout>`, `<TypeTable>`), converts `<TypeTable type={{...}} />` to markdown tables, rewrites import paths.

**Adoption**: pixel-perfect already has `skills/process-context/SKILL.md` and the broader skill ecosystem. If this skill (or others) need to stay in sync with docs changes, replicate the generation pipeline. **Use a real MDX AST parser, not regex** (ai-elements uses regex — flagged as anti-pattern; breaks on nested JSX).

**Concrete proposal**:
1. Write a TS script `scripts/generate-skill-from-docs.ts` that:
   - Reads `docs/ai-chat-patterns.md` (or other source)
   - Uses `@mdx-js/mdx` AST parser (not regex)
   - Outputs `skills/ai-chat-patterns/SKILL.md` with frontmatter (`name`, `description`, trigger-rich)
2. Add a path-filtered CI workflow that auto-regenerates + auto-commits on docs changes

**Priority**: LOW (current skill is hand-authored and stable). Worth doing if/when doc churn increases.

---

### Task 6: Changesets with `updateInternalDependencies: "patch"`

**Source**: ai-elements uses changesets with `updateInternalDependencies: "patch"` so internal workspace deps auto-bump at patch level on any release. All `@repo/*` packages are in `ignore` (private, never published).

**Adoption**: Only relevant if pixel-perfect itself becomes a multi-package published monorepo (currently it's a docs/skills repo). Document in `docs/library-vetting-rubric.md` Project Tooling section as a reference for future monorepo distribution.

```jsonc
// .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@repo/*", "docs"]
}
```

---

### Task 7: Real-browser sandbox for AI chat components

**Source**: ai-elements tests streaming components in real chromium. The sandbox stories (per `docs/sandbox-spec.md` AI chat states) benefit from the same fidelity.

**Adoption**: When the sandbox is `custom` web (React/Vite/Next), ensure the dev server runs in a real browser, not a JSDOM shim. For Storybook sandboxes, this is automatic. For `custom` sandboxes, the dev-server script should launch a real browser instance.

**Action**: Add a note to `docs/sandbox-spec.md` (after the AI chat states section) recommending real-browser execution for AI chat components, with the rationale that streaming/IntersectionObserver/ResizeObserver behaviors don't reproduce in JSDOM.

---

## Summary

7 tasks, all documentation edits:

| # | Technique | Lands in | Priority |
|---|---|---|---|
| 1 | Vitest browser-playwright | future testing-patterns doc | MEDIUM |
| 2 | vitest-fail-on-console discipline | future testing-patterns doc | MEDIUM |
| 3 | vi.hoisted() mock pattern | future testing-patterns doc | LOW |
| 4 | oxlint + oxfmt + ultracite | library-vetting-rubric Project Tooling section | LOW |
| 5 | Skill generation pipeline | new `scripts/generate-skill-from-docs.ts` (when needed) | LOW |
| 6 | Changesets multi-package config | library-vetting-rubric Project Tooling section | LOW |
| 7 | Real-browser sandbox for AI chat | sandbox-spec.md note | MEDIUM |

Tasks 1, 2, 3, 7 are blocked on a future `docs/testing-patterns.md` (which doesn't exist yet). When that doc is created, this plan provides the source material. Tasks 4, 6 are blocked on a Project Tooling section being added to `docs/library-vetting-rubric.md` (or a new conventions doc). Task 5 is blocked on doc churn justifying the pipeline investment.

## Verification

When this plan is implemented, future pixel-perfect builds of AI chat components should:
- Use real-browser testing for streaming components (Task 1 + 7)
- Fail CI on hidden console warnings from upstream deps (Task 2)
- Use the `vi.hoisted()` pattern for mock-shared state (Task 3)
- Have a documented faster lint/format alternative (Task 4)
- Eventually auto-sync docs → skills (Task 5)

## Out of Scope

- Adopting ai-elements as a hard pixel-perfect dependency (React-only; pixel-perfect is framework-agnostic)
- Replicating ai-elements' dynamic registry generation (overkill for docs-driven workflow)
- Copying ai-elements' CI workflow verbatim (Vercel-specific GitHub App token + Vercel deploy)

## Cross-references

- [Assimilation: vercel/ai-elements](https://holocron.anomaly.dev/document/js7d0qvx9wskx4rg2tq3a5dv9n891tcw) — full report in holocron
- [Integration Plan](https://holocron.anomaly.dev/document/js7b6mvwhr7h56tkzzyqzr75zn89081g) — high-level integration plan in holocron
- `docs/ai-chat-patterns.md` — the 16 patterns (the primary integration deliverable)
- `docs/library-vetting-rubric.md` — AI SDK dependency vetting section
- `docs/sandbox-spec.md` — AI chat state scenarios section
- `docs/styling-contracts/ai-chat-tailwind-web.md` — styling contract
- `docs/state-patterns.md` — streaming-aware state section
- `docs/ecosystem-patterns.md` — AI chat surface row in pattern table
