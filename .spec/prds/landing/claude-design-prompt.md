---
title: Claude Design prompt — pixel-perfect landing page
source: .spec/prds/landing/strategy.md (v2, 2026-09-29)
date: 2026-09-29
status: ready to paste
---

# Claude Design prompt

Paste everything below the line into Claude Design. It follows the strategy's recommended order (D1), headline (D13 primary, with the alternate as a variant), and "press proof" creative direction (§10). Working copy is from §7 and §9; the copy deck (T3) replaces it later. Anything the dogfood build (T6) will produce is a labeled placeholder here, never an invented "real" number.

---

Design a landing page for **pixel-perfect**, an open-source (MIT) agent skill for developers. Build it as a real, responsive HTML/CSS page, not a static picture, so a developer can later build the production site from it. Deliver desktop at 1440×900 and mobile at 390 wide, in a light theme and a dark theme, with all four designed deliberately (not auto-inverted).

## 1. What the product is

You give your coding agent a design: a Claude Design deck, an HTML export, a URL, a screenshot, or a folder of wireframes. pixel-perfect has the agent:

1. Render every frame of the design and read each one once.
2. Write an **inventory** of what to build: tokens (colors, type, spacing), atoms (buttons, badges), molecules (small groups of atoms), organisms (larger stateful parts), and screens. Each item names the frames that justify it.
3. Build those items as real code in your framework, bottom layer first.
4. Check each layer against the design before starting the next. These checks are called **gates**.
5. Generate a **sandbox**, a small component browser, in your own framework.
6. Keep the system growing. `evolve` adds a screen from a new mock or a single sentence, reusing the parts that already exist. `refine` changes a token and shows which components moved. A re-capture proves nothing else changed.

It runs inside six agents: Claude Code, Codex, Cursor, Grok, OpenCode, and Pi. Output is plain code in the user's repository plus a standard `DESIGN.md`.

## 2. Who the page is for

Primary: solo developers and small teams who use Claude Code, Codex, or Cursor daily and get designs from Claude Design, v0, Stitch, or a designer. Their moment: they pasted a screenshot into their agent, said "build this", got a good first screen, and the **second** screen came out subtly different. Six weeks later there are four slightly different cards and no way to say which is correct.

Secondary: design engineers who own a component library. Wedge: SwiftUI, Expo, GPUI, and Ratatui developers who want a component browser where Storybook doesn't run.

Two arrival types must both be served: **problem-aware** visitors from posts and forums (name the problem, show the mechanism, features last) and **product-aware** visitors from directories (a copyable install command in the first screen, no scrolling).

The job to be done: *When I have a design I love and an agent that can write code, I want to turn that design into components I can keep building on, so the product still looks like the design six weeks from now, and every new screen starts from the parts I already have.*

## 3. Positioning

pixel-perfect is **the step after the generator, and the system that keeps growing**. Two acts: *build it* (turn a design into a component system) then *grow it* (every new screen starts from the parts you already have). Never attack Claude Design, v0, Stitch, Lovable, or Figma; their output is our input. The real competitor is "just ask the agent", which works for one screen and breaks on the second.

Promise under the headline: **your design survives your codebase.**

## 4. Voice

Plain, exact, confident, not hyped. Developers who distrust marketing and trust specifics they can check.

| Use | Avoid |
|---|---|
| build, check, match, layer, frame, drift, component | revolutionary, magic, seamless, effortless, 10x |
| Numbers with a source | Numbers without one |
| "Gate", explained in one line the first time it appears | Internal names (`molecules_capture`, "Phase 4a") |
| Short sentences, active voice | Puns on "pixel-perfect" |
| "Example" labels on illustrative content | Invented output presented as real |

One tension to manage: gates must never sound slow. Every time a gate is mentioned, pair it with the speed it buys ("Change a token. Every component that uses it updates, and the gates confirm nothing else moved.").

## 5. Page order and content

Order: **Hero → Why → Build it → Grow it → Install → FAQ → Close.** Top navigation: Why · Build it · Grow it · Install · FAQ · GitHub ↗, plus a light/dark toggle.

### 5.1 Hero (inform)

- Harness line above the headline: "An agent skill for Claude Code, Codex, Cursor, Grok, OpenCode, and Pi."
- Headline: **Your mockup is a picture. Ship the system inside it.** Set the first sentence quiet and the second sentence heavy, with the second sentence rendered as three color plates (cyan, magenta, yellow) that slide into registration on load and land as solid ink.
- Lede: "pixel-perfect is an agent skill that reads every frame of a high-fidelity mockup and turns it into real components in your framework: tokens, atoms, molecules, organisms, and screens. Each layer is checked against the frames it came from before the next layer starts. After that, every new screen, from a mock or a single sentence, is built from the parts you already have."
- **Install block, in the first screen at both 1440 and 390:**
  - Primary line with a copy button: `Install pixel-perfect: fetch and follow https://github.com/hackerpug-ai/pixel-perfect/INSTALL.md` with the caption "Paste into any of the six agents."
  - Secondary line with a copy button: `npx skills add hackerpug-ai/pixel-perfect`
  - One text link below: "Prefer your agent's own commands? See every install option." → jumps to Install.
- Two CTAs: primary is copying the install line (the block itself), secondary is a "See it build" button that jumps to Build it. One primary style only; everything else is secondary.
- Metadata strip under the hero: MIT · by Justin Rich · View source ↗ · Works in six agents · Frameworks: SvelteKit, React, Expo, SwiftUI, GPUI, Ratatui, and any stack with a docs URL.
- **Proof slider** (the main proof): a before/after slider. Left side is a design frame; right side is the component pixel-perfect built from it, with registration marks at the four corners. Dragging reveals whether they line up. Use a placeholder pair labeled "Example — replaced by the real pair at launch."
- **Fig. 1** (the brand image): a flat mockup that tilts and separates into five stacked layers labeled tokens, atoms, molecules, organisms, screens, with a text caption. On desktop, place it beside or below the slider. On mobile, the slider replaces it.
- Layout rule: keep display type restrained. The headline must not take more than about 45% of the first screen at 1440×900. The install block and both CTAs must sit above the fold at both widths.

Also design one hero variant with the alternate headline for a five-second test: **Turn a mockup into a design system your agent keeps building on.** In that variant, the original line becomes the Fig. 1 caption.

### 5.2 Why (persuade)

- Heading: **Designs die in translation.**
- Two short paragraphs telling the second-screen story in the visitor's words (screenshot → "build this" → good first screen → the second screen's card has different padding → nobody wrote down which colors are tokens → four cards, none canonical).
- An **approved card next to a drifted card**, with four numbered proofreader's marks on the drifted one (for example: 1 padding 16 vs 20, 2 an invented gray, 3 a fifth button style, 4 a 1px border radius change). Notes for each mark below, numbered to match. Use a plain, generic card (a plan or settings card). Do not use an "invite your team" card with avatars. Label the pair "Example."
- Pivot line: "Your design survives your codebase."
- Four principle cards, in these words, with this meaning:
  1. **Consistency through composability** — every screen is assembled from the same parts, so one card can't quietly become four.
  2. **Make it real** — no mockup step, no spec format, no throwaway files. The design is the reference, and the code in your repository is the deliverable.
  3. **Rapid iteration** — add a screen with one sentence, and it's built from the parts you already have. Change a token and it flows everywhere. Change a component and everything built on it re-checks.
  4. **Language agnostic** — works in whatever UI stack you use. Storybook if you want it, a native sandbox if you don't.
- No CTA. Scrolling is the action.

### 5.3 Build it (show, act one)

- Heading: **From mockup to system in four commands.**
- Four steps, each with an example prompt on the left and its real-looking output on the right:
  1. `/pixel-perfect:init my designs are in design/deck.html` → the manifest.
  2. `/pixel-perfect:scaffold` → the sandbox with token stories.
  3. `/pixel-perfect:build` → the inventory (an excerpt showing items with the frames that justify them and a `composes` field).
  4. `/pixel-perfect:status` → the status report with gates passed.
- A demo video placeholder (60 to 90 seconds) with a poster frame.
- A run-numbers strip: tokens, minutes, frames, gates, components. Use `[n]` placeholders labeled "measured at launch." Do not invent values.
- One line for visitors without a mockup: "No mockup yet? `wireframe` turns a PRD into wireframes that build reads the same way."
- Output panels must be labeled "Example output" until replaced.
- No CTA.

### 5.4 Grow it (show, act two)

- Heading: **Your next screen starts from the parts you already have.**
- A **scripted agent thread**, the most shareable element: the user types `/pixel-perfect:evolve "add a changelog page"`, the agent replies with a one-line change summary in the shape `reuse [n] · new [n] · [n] captured components moved`, then a small render of the new page. Label "Example thread — replaced by the real run at launch."
- Three short cards beside it:
  - `evolve` with a new mock: sorts each element into reuse, variant, new, promote, or remove, with an orphan sweep for removals; confirms once; proves by re-capture.
  - `refine` with a token change: shows the cascade line ("Cascades into: …").
  - `add-platform`: the same system on a second platform.
- Show the generated **`DESIGN.md`** as a document artifact, so visitors see it works with their other tools.
- CTA at the end of the section: dark "Install pixel-perfect" button that jumps to Install.

### 5.5 Install (educate)

- Heading: **Install it in your agent.**
- Repeat the paste-to-agent line and `npx skills add` at the top with copy buttons.
- Six tabs (keyboard tab-list pattern, default tab Claude Code, each with a direct link like `#install-cursor`), with exact commands and copy buttons:
  - **Claude Code:** `/plugin marketplace add hackerpug-ai/pixel-perfect` then `/plugin install pixel-perfect@pixel-perfect`
  - **Codex:** `codex plugin marketplace add hackerpug-ai/pixel-perfect` then `codex plugin add pixel-perfect@pixel-perfect`. Warning: two enabled sources create duplicate `$pixel-perfect:*` namespaces; remove `pixel-perfect@personal` first.
  - **Cursor:** clone the tagged release and copy `plugins/pixel-perfect` into `~/.cursor/plugins/local/pixel-perfect`, then reload the window. Warning: copy, don't symlink; Cursor fails on symlinked plugins.
  - **Grok:** install through the Claude Code marketplace steps, then enable it in Grok's `/plugins` view.
  - **OpenCode:** clone the tagged release to `.pixel-perfect` and symlink `.opencode/commands` and `.opencode/skills`.
  - **Pi:** `pi install npm:@hackerpug-ai/pixel-perfect`
- After every tab, a "Then run" line: "Next: open a project that has your design and run `/pixel-perfect:init`."
- A stability note: "Releases are version-locked across all six agents. Every breaking release ships an upgrade guide."
- A "What it touches" block: three short lists, reads / writes / runs (including a headless browser for capture), plus a placeholder for third-party security scan results, labeled "pending."
- "View source ↗" link beside install, so people can read the skill before installing.

### 5.6 FAQ

Six to eight questions. Each answer starts with the answer in one or two sentences. Use a simple expandable list, not cards.

1. Why not just prompt my agent?
2. What happens when the design changes?
3. How many tokens does it use? (answer with `[n]` placeholders labeled "measured")
4. Does it work with my stack?
5. Will it lock me in?
6. It's at version 9. Is it stable?
7. Don't gates make this slow?
8. How is this different from v0, Claude Design, or Figma's MCP?

### 5.7 Close

Heading: **Your next mockup has a system inside it.** Dark "Install pixel-perfect" button and a GitHub link. Footer: MIT · changelog · upgrade guides · the registration-target mark.

## 6. Creative direction: "press proof"

Print shops split a color image into separate **plates**, one per ink (cyan, magenta, yellow, black), align them exactly (**registration**), and check a **proof** before the run. pixel-perfect does the same to a mockup, with layers instead of inks. The page borrows the look of a printer's proof sheet.

| Print device | Meaning on this page | Where |
|---|---|---|
| Separation (one plate per ink) | Splitting a mockup into tokens, atoms, molecules, organisms, screens | Fig. 1 |
| Registration (plates aligned) | Components matching their frames | Headline effect, slider corner marks |
| Proof (checked before the run) | A gate checked before the next layer | Step 4, "Check the proof" |
| Proofreader's marks | Numbered drift callouts | Why section |
| Crop marks and slug line | Page framing and the version line | Hero margins |
| Color control strip | The token layer | Hero strip, token plate |

Rule: **every device must mean something.** Numbers appear only for real sequences (five layers, four steps) or real references (mark 1 matches note 1). The copy must never require knowing anything about print; the metaphor lives in the visuals only.

### 6.1 Color

Four process inks on a cool neutral paper. The light theme behaves like ink on paper: overlapping colors darken (`mix-blend-mode: multiply`). The dark theme behaves like light on a screen: overlapping colors brighten (`mix-blend-mode: screen`). **Magenta is the only accent for action and emphasis. Yellow is never used for text.**

| Token | Light | Dark |
|---|---|---|
| paper (page) | `#F3F4F1` | `#0D0F12` |
| sheet (surface) | `#FBFBF9` | `#14171B` |
| ink (text) | `#111316` | `#ECEDE8` |
| cyan | `#0096D1` | `#29C1F0` |
| cyan-ink (text-safe) | `#006C99` | `#6AD3F6` |
| magenta | `#E0007A` | `#FF3D9E` |
| magenta-ink (text-safe) | `#B5005F` | `#FF7AB9` |
| yellow | `#FFD900` | `#FFE14A` |
| blend | multiply | screen |

Code blocks are the same in both themes: background `#14171B`, foreground `#E6E7E2`, keys `#7CCFF2`, strings `#FFE27A`, success `#8EE3B0`, dim `#7D838B`.

### 6.2 Type

| Role | Typeface (Google Fonts) | Use |
|---|---|---|
| Display | **Anybody** (variable width and weight) | Headlines wide and heavy; callout labels |
| Body | **Libre Franklin** | All running text |
| Code and labels | **IBM Plex Mono** | Commands, slug lines, plate labels |

Do not use Inter or Space Grotesk. Limit font weights to those actually used.

### 6.3 Graphic devices and the mark

Crop marks, registration targets, a color control strip, slug lines, and numbered proofreader's marks. All caps only where print uses it: slug lines and plate labels. **Section labels and buttons use sentence case.** The logo is a registration target with one magenta pixel at its center ("one pixel, registered"); use it in the nav and footer, and cut the favicon from it.

### 6.4 Motion

Two orchestrated moments on load, CSS only: the headline's three color plates slide into registration; Fig. 1 starts flat, tilts, and separates into five layers. Nothing hijacks scroll. Everything respects `prefers-reduced-motion` and the page reads fully with motion off.

## 7. Hard rules

- Do not show star counts, install counts, testimonials, logos, or comparison tables. There are none yet, and vanity counters look sloppy.
- Do not invent run numbers, token counts, or output. Use `[n]` placeholders and "Example" labels; the real dogfood build replaces them.
- Avoid the generic AI-tool look: no dark gradient with a terminal hero, no cream-and-terracotta palette, no identical rounded cards in a grid, no tracked all-caps eyebrow labels, no arrows on buttons ("↗" is allowed only on outbound links), no "01 / 02 / 03" on content that isn't a sequence.
- Card styling appears only where an object is on display (the drifted card, the slider, output panels), not as a default container.
- Boldness lives in one place: the hero's registration and separation effects. The rest of the page is calm.
- Every section has a job: inform, persuade, show, educate. Cut anything that doesn't serve one.

## 8. Standards

- WCAG 2.2 AA contrast in both themes. Tabs use the keyboard tab-list pattern. Figures have text captions. No content depends on animation.
- Static page: no framework script needed to read it. Target LCP under 2.5 s.
- Mobile at 390: 16px side gutters, no horizontal scroll, the install block in the first screen, the slider in place of Fig. 1, tabs collapse to a select or stacked list.
- Copy buttons fall back to selecting the text when the clipboard is blocked.

## 9. Deliverables

1. The full page, light and dark, at 1440 and 390.
2. The hero variant with the alternate headline (§5.1).
3. A one-screen component sheet: buttons (primary dark, secondary line), copy block, tab list, proofreader mark, registration target, color control strip, code panel, FAQ item, in both themes.
4. A 1200×630 social preview built from the mark and the slider.
