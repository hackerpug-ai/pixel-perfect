# Library Vetting Rubric

The canonical rubric for evaluating ecosystem libraries in pixel-perfect projects. Applied during the Ecosystem Scan (Phase 4b, Step 2b of `/pixel-perfect:build`) and standalone library research (`/pixel-perfect:research --libraries`).

A library scoring **≥5/8** is recommended. A library scoring **<4/8** needs explicit justification from the user before adoption.

## Criteria

### 1. Maintenance (PASS / FAIL)

| Rating | Condition |
|--------|-----------|
| **PASS** | Commits or releases in the last 6 months. Open issues are being triaged (not stale). |
| **FAIL** | No activity in 6+ months, or README/deprecation notice says "unmaintained." |

**How to check:** GitHub repo → recent commits, releases page, issue tracker activity.

---

### 2. Popularity (STRONG / MODERATE / WEAK)

| Rating | Threshold |
|--------|-----------|
| **STRONG** | ≥5,000 GitHub stars OR ≥100k weekly npm downloads |
| **MODERATE** | ≥1,000 stars OR ≥20k weekly downloads |
| **WEAK** | <1,000 stars AND <20k weekly downloads |

**Note:** Popularity is a directional signal, not a gate. A new but excellent library may be WEAK on popularity but score well on maintenance, tests, and community. Conversely, a popular library can be unmaintained.

**How to check:** npm registry (`npm view {package}`), GitHub stars, bundlephobia download stats.

---

### 3. Framework Compatibility (PASS / CONDITIONAL / FAIL)

| Rating | Condition |
|--------|-----------|
| **PASS** | Explicitly supports the project's framework and version. |
| **CONDITIONAL** | Works with the framework but may need adapter/wrapper work (e.g., headless library needing a UI layer). |
| **FAIL** | Not compatible with the project's framework (e.g., React-only library in a Svelte project). |

**How to check:** `peerDependencies` in package.json, README compatibility notes, framework-specific documentation or demos.

---

### 4. Bundle Size (SMALL / MEDIUM / LARGE)

| Rating | Threshold |
|--------|-----------|
| **SMALL** | <10KB gzipped, tree-shakeable |
| **MEDIUM** | 10-50KB gzipped, partial tree-shaking |
| **LARGE** | >50KB gzipped, not tree-shakeable |

**How to check:** [bundlephobia.com](https://bundlephobia.com) (best), or `npx size-limit` against a test import. For non-JS packages (Go, Rust, Python), estimate from source size.

**Note for non-web targets:** Bundle size matters less for desktop (GPUI, SwiftUI) and TUI (Bubbletea, Textual) projects. For these targets, note the size but don't score it negatively.

---

### 5. Accessibility (YES / PARTIAL / NO)

| Rating | Condition |
|--------|-----------|
| **YES** | ARIA attributes, keyboard navigation, and screen reader support documented. Tests include a11y checks. |
| **PARTIAL** | Basic ARIA/semantic HTML but incomplete keyboard support or no a11y test coverage. |
| **NO** | No accessibility considerations documented. |

**How to check:** README a11y section, test suite for a11y checks, keyboard navigation demo in docs.

**Note for TUI/desktop targets:** This criterion is primarily for web libraries. For TUI/GUI libraries, evaluate whether the library provides accessible keyboard navigation patterns appropriate to the platform.

---

### 6. License (COMPATIBLE / REVIEW / INCOMPATIBLE)

| Rating | Licenses |
|--------|----------|
| **COMPATIBLE** | MIT, Apache-2.0, BSD (2-clause, 3-clause), 0BSD, ISC, Unlicense, CC0 |
| **REVIEW** | MPL-2.0, LGPL (copyleft but permissive for library use), BSL |
| **INCOMPATIBLE** | GPL/GPLv3 (strong copyleft), SSPL, AGPL, proprietary, no license |

**How to check:** `license` field in package.json, LICENSE file in repo, `npm view {package} license`.

---

### 7. Test Coverage (HIGH / MODERATE / LOW)

| Rating | Condition |
|--------|-----------|
| **HIGH** | Comprehensive test suite with CI running tests. Coverage badge or visible test directory. |
| **MODERATE** | Tests exist but no CI badge visible, or coverage appears spotty. |
| **LOW** | No tests or minimal test suite (a few smoke tests). |

**How to check:** GitHub Actions/CircleCI/CI config, test directory presence and size, coverage badge in README.

---

### 8. Community (ACTIVE / MODERATE / INACTIVE)

| Rating | Condition |
|--------|-----------|
| **ACTIVE** | Maintainers respond to issues within ~2 weeks. Discord/Slack/forum community exists. Regular releases. |
| **MODERATE** | Occasional responses. Limited community channels. |
| **INACTIVE** | Unanswered issues piling up. No visible communication channels. |

**How to check:** GitHub issue response times, Discord/Slack links in README, recent release notes.

---

## Scoring

| Score | Verdict | Action |
|-------|---------|--------|
| **8/8** all STRONG/PASS | **Excellent** | Recommend with confidence |
| **6-7/8** | **Good** | Recommend, note any weak areas in the BUILD PLAN |
| **5/8** | **Acceptable** | Recommend with caveats documented as `tradeoffs` |
| **3-4/8** | **Marginal** | Present alternatives first. Only proceed with explicit user justification |
| **<3/8** | **Not recommended** | Do not recommend, even if user asks. Offer alternatives |

**Edge cases:**
- `UNKNOWN` for any criterion (e.g., bundle size when bundlephobia is unreachable) doesn't count against the score.
- For TUI/desktop targets: ignore Bundle Size and Accessibility (treat as not-applicable, score out of remaining 6 criteria).
- Criteria scored as FAIL subtract from the denominator but are treated as 0/1 for that criterion.

## How to Apply

1. **Start from the lookup table.** `commands/build.md` Phase 4b Step 2b has a Category → Library Map. Check matches first.

2. **Verify via web search.** Libraries go stale. For every match, search:
   ```
   "{library-name} npm 2026"
   "{library-name} maintained status github"
   "{library-name} vs alternatives {framework}"
   ```
   If the table entry is unmaintained, search for its replacement:
   ```
   "react-beautiful-dnd alternative 2026"
   "{framework} drag and drop library 2026"
   ```

3. **Check npm.** Verify the package exists, check download stats, read the description.

4. **Check GitHub.** Stars, recent commits, open/closed issue ratio, LICENSE file.

5. **Check bundle.** Use bundlephobia.com or `size-limit` for bundle size.

6. **Score and rank.** Fill in each criterion. Record the total in the manifest.

7. **Present ranked results** to the user with scores and tradeoffs. User always has final say.

---

## Research Record Format

Every library recommendation (accepted or rejected) is recorded in the manifest's `ecosystemLibs`:

```json
{
  "ecosystemLibs": {
    "DataTable": {
      "package": "@tanstack/react-table",
      "version": "^8.20.0",
      "purpose": "Headless table logic (sorting, filtering, pagination, row selection)",
      "vetting": {
        "maintenance": "PASS",
        "popularity": "STRONG",
        "compatibility": "PASS",
        "bundleSize": "SMALL",
        "accessibility": "YES",
        "license": "COMPATIBLE",
        "tests": "HIGH",
        "community": "ACTIVE",
        "score": "8/8",
        "researchDate": "2026-06-04"
      },
      "tradeoffs": "Headless — requires UI wrapper for rendering. shadcn/ui provides a built-in wrapper."
    }
  }
}
```

### If the user chose a different library from the top recommendation:

```json
{
  "ecosystemLibs": {
    "DataTable": {
      "package": "ag-grid-react",
      "version": "^32.0.0",
      "purpose": "Feature-rich data grid (user selected over top recommendation)",
      "vetting": {
        "maintenance": "PASS",
        "popularity": "STRONG",
        "compatibility": "PASS",
        "bundleSize": "LARGE",
        "accessibility": "YES",
        "license": "COMPATIBLE",
        "tests": "HIGH",
        "community": "ACTIVE",
        "score": "7/8",
        "researchDate": "2026-06-04",
        "userChoice": true,
        "alternativesConsidered": ["@tanstack/react-table (8/8)"]
      },
      "tradeoffs": "~200KB gzipped. Enterprise features (row grouping, server-side model) require paid license. User chose for built-in features over bundle size."
    }
  }
}
```

---

## Standalone Research Artifact Format

When using `/pixel-perfect:research --libraries`, results are saved to `design/research/libraries/{pattern}.md`. These artifacts are reused by the Ecosystem Scan for 30 days:

```markdown
# Library Research: Data Table

**Researched:** 2026-06-04
**Framework:** React (Vite)
**Pattern:** Data Table

## Summary

| # | Library | Score | Package | Downloads/wk | Bundle | License |
|---|---------|-------|---------|-------------|--------|---------|
| 1 | TanStack Table | 8/8 | @tanstack/react-table | 2.1M | ~13KB gzipped | MIT |
| 2 | AG Grid | 7/8 | ag-grid-react | 890K | ~200KB gzipped | MIT |
| 3 | react-data-table-component | 5/8 | react-data-table-component | 310K | ~28KB gzipped | MIT |

## Detailed Scores

### TanStack Table — 8/8

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Maintenance | PASS | Last release 2026-05-15, active commits |
| Popularity | STRONG | 26K+ stars, 2.1M weekly downloads |
| Compatibility | PASS | React 18/19 supported, headless |
| Bundle Size | SMALL | ~13KB gzipped, tree-shakeable by feature |
| Accessibility | YES | ARIA attributes, keyboard nav docs |
| License | COMPATIBLE | MIT |
| Tests | HIGH | 500+ tests in CI |
| Community | ACTIVE | Discord community, responsive maintainers |

**Tradeoffs:** Headless — requires UI wrapper for rendering. shadcn/ui provides a built-in TanStack Table wrapper.
```

## Fallback Behavior

When web search is unavailable or times out:

1. Use the lookup table as a fallback recommendation.
2. Mark vetting as `"researchMethod": "lookup-table"` instead of `"verified-web-search"`.
3. Show a warning:
   ```
   Library scan ran in offline mode. Recommendations are from the built-in
   lookup table and have not been verified against current ecosystem state.
   Run /pixel-perfect:research --libraries to verify independently.
   ```
4. Do NOT block the BUILD PLAN — the user can proceed with unverified recommendations.