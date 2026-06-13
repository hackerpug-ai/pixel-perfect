# Styling Convention Rubric

The canonical rubric for evaluating a **researched styling contract** before it is accepted and cached. Applied during `/pixel-perfect:research --styling`, which synthesizes a contract for a style system that has no built-in (SwiftUI, Compose, Flutter, GPUI, TUI, or any "Other" choice).

A contract scoring **≥6/7** is accepted and cached to `design/research/styling/{id}.md`. A contract scoring **<6/7** is **rejected** — the research step fails closed (it never caches or returns a weak contract; see "On failure" below).

This rubric is the guard against the failure mode that motivated styling contracts in the first place: a weak or fabricated contract lets the build drift back to a parallel global-CSS system. The `no-contradiction` and `forbidden-patterns` criteria are the load-bearing ones.

## Criteria

### 1. Official documentation cited (PASS / FAIL)

| Rating | Condition |
|--------|-----------|
| **PASS** | `canonicalDocs` points to the system's official docs, and the emit method / token binding are grounded in what those docs actually say (not a blog post or an LLM prior). |
| **FAIL** | No official docs found, or the contract contradicts the official docs that were fetched. |

**How to check:** the research step must have fetched the official docs (Exa/Jina/WebSearch) and at least one cited URL must resolve to the vendor/maintainer domain. If official docs are unreachable, this is FAIL and the contract cannot be accepted.

---

### 2. Colocation rule stated (PASS / FAIL)

| Rating | Condition |
|--------|-----------|
| **PASS** | `filePlacement.rule` is one of `colocated` / `central` / `hybrid` and the allowed/forbidden locations are concrete globs (not prose like "near the component"). |
| **FAIL** | File placement is vague, unstated, or copies a web-CSS assumption into a non-CSS system (e.g. telling a SwiftUI project to use `.css` files). |

**How to check:** the rule must answer "where does a style definition physically live?" for this specific system. Example: React Native StyleSheet → colocated `StyleSheet.create` in the component file; SwiftUI → inline view modifiers on the view; Tailwind → utility classes in the component's class attribute.

---

### 3. Token binding explained (PASS / FAIL)

| Rating | Condition |
|--------|-----------|
| **PASS** | `tokenBinding.mechanism` + access pattern describe exactly how a design token (color/spacing/radius/typography) reaches a styled element in this system. |
| **FAIL** | Token binding is absent, generic ("use variables"), or describes a mechanism the system does not have. |

**How to check:** trace one token end-to-end. Tailwind → CSS custom property → `@theme` → `bg-primary` utility. RN StyleSheet → `theme.colors.*` referenced in `StyleSheet.create`. SwiftUI → `@Environment(\.theme)` or asset catalog colors. If you cannot draw that line from the official docs, FAIL.

---

### 4. Forbidden patterns present and detection-shaped (PASS / FAIL)

| Rating | Condition |
|--------|-----------|
| **PASS** | The `checks` block lists ≥1 `forbiddenPatterns` entry that targets the real anti-pattern for this system, each with a runnable `glob` + `regex` and a `rationale`. |
| **FAIL** | No forbidden patterns, or patterns that are prose-only (no glob/regex), or patterns that forbid the system's own idiomatic mechanism. |

**How to check:** the contract must forbid the *bypass* of the chosen system. For a utility-class system, that means forbidding global custom-class CSS and inline styles. The regexes must be testable against a sample good and bad file.

---

### 5. Framework idiom (PASS / CONDITIONAL / FAIL)

| Rating | Condition |
|--------|-----------|
| **PASS** | The emit method is the idiomatic, first-class styling mechanism the framework documents (not a workaround). |
| **CONDITIONAL** | The mechanism works but is secondary (e.g. CSS-in-JS in a framework that prefers CSS Modules) — acceptable only if the user explicitly chose it. |
| **FAIL** | The contract imposes a mechanism foreign to the framework (e.g. CSS Modules in SwiftUI, global CSS in React Native). |

**How to check:** does the framework's own "getting started" / styling guide lead with this mechanism? If yes, PASS.

---

### 6. No contradictions (PASS / FAIL) — load-bearing

| Rating | Condition |
|--------|-----------|
| **PASS** | The contract does not contradict well-known facts about the system. |
| **FAIL** | The contract permits what the system's philosophy forbids, or forbids what it requires. |

**How to check (the tripwires):**

| System | Must NOT permit | Must NOT forbid |
|--------|-----------------|-----------------|
| Tailwind / NativeWind | global CSS with custom component classes; inline static styles | utility classes via `className` |
| CSS Modules | global unscoped CSS leaking class names | `*.module.css` colocated imports |
| React Native StyleSheet | central `styles/` files exported across components | colocated `StyleSheet.create` |
| SwiftUI / Compose | `.css` / `.scss` files; DOM `style=` | view modifiers / modifiers |
| TUI (Lipgloss / Bubbletea / Textual) | web CSS; DOM styles | the library's native style structs / palette |

A contract that violates any tripwire is FAIL regardless of other scores. This is the criterion that would have rejected a fabricated "Tailwind-but-actually-global-CSS" contract.

---

### 7. Completeness (PASS / FAIL)

| Rating | Condition |
|--------|-----------|
| **PASS** | Frontmatter has all required fields; body has Emit method, File placement, Token binding, Forbidden patterns, Verify checklist; `checks` JSON parses and every forbidden/mustInclude entry has `id` + `glob` + `regex`. |
| **FAIL** | Any required field missing, or the `checks` JSON does not parse, or any entry lacks a runnable detection. |

**How to check:** run the contract's `checks` JSON through `JSON.parse` and confirm the gate script can load it against an empty source dir without throwing.

---

## Scoring

- Each criterion is PASS (or CONDITIONAL counts as PASS for criterion 5 only) = 1 point.
- **≥6/7 → accept:** cache to `design/research/styling/{id}.md`, return the id. Note any single non-load-bearing FAIL in the artifact's notes.
- **<6/7 → reject:** do not cache. Do not return a contract id.
- **Any FAIL on criterion 6 (no contradictions) → reject immediately**, regardless of total. Contradictions are never acceptable.

## On failure (fail closed)

When a contract is rejected, the research step fails closed — it does **not** fabricate a contract, and it does **not** silently fall back to "no enforcement." It reports which criteria failed and offers:

1. Provide a more specific official-docs URL and re-run research.
2. Author a contract manually in `docs/styling-contracts/{id}.md` (the rubric still applies — run it against the manual contract).
3. Choose a supported style system from the init menu (which has a vetted built-in).
4. Proceed **without** a contract (explicit, recorded in the manifest as `style_contract_source: "none"`, `style_contract_enforcement: "off"` — non-default, flagged at every build). This is the only escape hatch and it is never silent.

This matches the project-wide rule: never stub, never fake success. A missing contract is an honest blocker, not a placeholder.
