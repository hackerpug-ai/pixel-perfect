---
title: pixel-perfect landing page — strategy and creative recommendation
prepared_for: Justin Rich, hackerpug-ai
prepared_by: Claude (acting as strategy and creative consultant)
date: 2026-09-29
revised: 2026-09-29
status: proposal v2 — revised after a second-opinion critique; awaiting decisions in §17
concept: design/concepts/pixel-perfect.html
critique: .spec/prds/landing/critique.md
---

# pixel-perfect landing page: strategy and creative recommendation

## How to read this document

This is a pitch. It explains what we recommend for the pixel-perfect landing page and why.

- Short on time? Read **§1 Executive summary** and **§17 Decisions we need from you**.
- Want the reasoning? Read §3 to §8 in order. Each section ends with what it means for the page.
- Ready to build? Go to **§16 Implementation plan**. Each item maps to one tracked task.

Every factual claim points to evidence in **Appendix A** (this repository) or **Appendix B** (outside sources). When a statement is our judgment, not a fact, we say so. When we could not verify something, we mark it **UNVERIFIED**.

**What changed in v2.** v2 adopts the findings of a second-opinion critique (`critique.md`):

- A two-act story, *build it* then *grow it*, so `evolve`, `refine`, and `add-platform` get their own section (§7, §9).
- An awareness plan based on how the seven most-used coding-agent skills got noticed (§8.7, §13).
- skills.sh as a launch blocker (B4), and real, shareable proof in place of the invented demo (§9, §11).
- A regrouped task plan: a launch set and an after-launch set, with new launch tasks (§16).
- Corrected facts (§8, Appendix B). In §4, only the incorrect competitor claims changed.

**Inputs we used:** the concept (`design/concepts/pixel-perfect.html`, "the concept" below); your four guiding principles (§7); a competitive scan (Appendix B, §1 to §6); a study of eight skill directories by four research agents on 2026-09-29 (§8; Appendix B, §7 and §8); a study of how the seven most-used skills got noticed (§8.7; Appendix B, §9); and the repository (Appendix A).

---

## 1. Executive summary

### The situation

pixel-perfect is a mature, capable product with no audience yet. It is at version 9.1.0 and ships to six agent harnesses. The GitHub repository has 0 stars and had 0 page views in the last 14 days (Appendix A, E3 and E4). Nobody has vouched for it publicly. That means the landing page cannot borrow trust. It has to earn trust by showing the product working.

The market timing is good. AI tools now generate beautiful designs in seconds: Claude Design, v0, Google Stitch, Lovable. Each claims consistency inside its own tool. Official skills from OpenAI and Google Labs now translate a single Figma or Stitch screen into code (Appendix B, §7). pixel-perfect's job starts after that handoff. It builds a composable component system in your repository and your framework. Then it keeps growing that system as new screens arrive, and every change is checked against the design (E19).

### Our recommendation

1. **Position pixel-perfect as the step after the generator, and the system that keeps growing.** Tell it in two acts: *build it* (turn a design into a component system) and *grow it* (every new screen, from a mock or a single sentence, starts from the parts you already have). In our judgment, designs are cheap now. A system that stays true to them as the product grows is not (§6, §7).
2. **Lead with one line:** "Your mockup is a picture. Ship the system inside it." Test one alternative that names both acts before launch (D13).
3. **Build the message on your four principles**, in your words: consistency through composability, make it real, rapid iteration, and language agnostic. Each one can be checked against the code (§7.3). `evolve` is the proof for rapid iteration.
4. **Adopt the "press proof" creative direction** for the page's look. The main proof is real, not illustrated: a slider between a mockup frame and the component pixel-perfect built from it (§9, §10).
5. **Prove, don't claim.** Build the production landing page *with pixel-perfect*, and add one page to it by sentence with `evolve`. Publish the inventory, the sandbox, and the run's real numbers: tokens, minutes, gates (§11).
6. **Make install one step in the first screen.** Use a paste-to-agent command that works in every harness, plus `npx skills add`. Keep the per-harness tabs below it (§9.2, §12).
7. **Order the page as the visitor decides:** Hero → Why → Build it → Grow it → Install → FAQ → Close (§9).
8. **Launch a story, not a page.** The launch vehicle is a post, the field note plus a real run, published on launch day. Time it to the next major release from a design generator. Line up a few writers to share it. Make sure skills.sh lists you. This is what the most-used skills did (§8.7, §13).

### Four things must happen before launch

These are blockers. The page would send people to commands that fail, or the launch would miss its main discovery channel.

| # | Blocker | Evidence |
|---|---|---|
| B1 | The Cursor and OpenCode instructions clone tag `v9.1.0`. That tag does not exist on GitHub. The latest tag is `v9.0.0`. **Still open on 2026-09-29.** | Appendix A, E6, E23 |
| B2 | The Pi instruction installs `npm:@hackerpug-ai/pixel-perfect`. That package is not published. `npm view` returns 404. **Still open on 2026-09-29.** | Appendix A, E7, E23 |
| B3 | The concept's demo content ("Harbor", status numbers) is invented. Replace it with real output from the dogfood build before launch. | §11 |
| B4 | `npx skills add` must install working skills. Today, 10 of 11 skills link to files outside their own folder, which a folder-by-folder install may break. skills.sh is where design skills get found. One popular design skill's author reports 160,000 installs from it alone. | Appendix A, E18; Appendix B, §9 |

### What we need from you

Eighteen decisions, listed in §17. The four that unblock the most work are: the section order (D1), whether to build the site with pixel-perfect (D2), the launch vehicle and timing (D9, D14), and the HN account (D15).

---

## 2. The brief

You asked for a landing page that does four jobs:

1. **Inform** — say what the skill is.
2. **Persuade** — explain why someone needs it.
3. **Educate** — show how to install it.
4. **Show** — demonstrate how to use it.

We added two jobs that the four imply:

5. **Earn trust from zero.** The product has no stars, users, or testimonials to point to yet (§3).
6. **Feed awareness and distribution.** People first hear about the product from the launch post, directories, and people who share it. Then they land on the page. The page must serve those arrivals, who want install commands fast. It must also supply the shareable proof the post links to: the slider, the thread demo, and the sandbox (§8.7, §13).

**Constraints we assumed:**

- Free, open-source (MIT) product. No paid acquisition budget.
- One maintainer. Anything we recommend must be cheap to keep accurate.
- The product changes often (four breaking major versions in five months, Appendix A, E5). The page must not go stale with every release.

---

## 3. Situation analysis

### 3.1 The product in plain words

You give your coding agent a design: a Claude Design deck, an HTML export, a URL, a screenshot, or a folder of wireframes. pixel-perfect has the agent:

1. Render every frame of the design and read each one once.
2. Write an inventory of what to build: tokens (colors, type, spacing), atoms (buttons, badges), molecules (small groups of atoms), organisms (larger stateful parts), and screens. Each item names the frames that justify it.
3. Build those items as real code in your framework, bottom layer first.
4. Check each layer against the design before starting the next. These checks are called **gates**.
5. Generate a **sandbox**, a small component browser, in your own framework, so you can see every component in isolation.
6. Keep all of this maintained. A manifest records what exists and what passed. Later changes run back through the same gates.

It runs inside Claude Code, Codex, Cursor, Grok, OpenCode, and Pi.

### 3.2 Where it stands today

| Signal | Value | Evidence |
|---|---|---|
| Version | 9.1.0, released 2026-09-02 | E1 |
| Distribution | Six harnesses, version-locked | E1, E2 |
| Public since | 2026-01-30 | E3 |
| GitHub stars / forks | 0 / 1 | E3 |
| GitHub page views, last 14 days | 0 | E4 |
| GitHub clones, last 14 days | 9 (7 unique) | E4 |
| Referring sites | none recorded | E4 |
| Breaking major releases | v5 (Mar 31), v6 (May 30), v8 (Aug 12), v9 (Aug 30) | E5 |
| Install paths that currently fail | Cursor, OpenCode (missing tag); Pi (unpublished package). Still failing on 2026-09-29. | E6, E7, E23 |
| GitHub description | "Claude Code plugin that builds…", which contradicts "six agents" | E22 |

### 3.3 What this means for the page

1. **There is no borrowed credibility.** No star count, no logos, no quotes. Every trust signal has to be something the visitor can check: a working demo, real output files, open source, a visible changelog. §11 is the plan.
2. **The page is the front door, not a supplement.** With no referrers, whatever we publish is the first impression. The README should point to it.
3. **Stability needs a story.** A developer who sees "v9" and four breaking releases in five months will ask whether the tool will break their project next month. The page needs an honest answer: releases are version-locked across all six harnesses, and every breaking release ships an upgrade guide (E8). The product decision behind that answer is D10 in §17.
4. **Frequent releases are also a recurring reason to post.** The same pace that worries adopters gives the project news. One of the most-used skills turns each notable release into a short post, and its "Superpowers 6" post reached 196 points on Hacker News (HN) (Appendix B, §9). Plan one post per notable release (§13.6).
5. **Install must work before anything else matters.** Blockers B1, B2, and B4 come first. Fix the GitHub description before any directory submission (E22).

---

## 4. The market

### 4.1 The generation half is solved; the system half is not

The market splits into two halves.

**Generating designs is solved and crowded.** Claude Design, v0, Lovable, Bolt, and Google Stitch all generate high-fidelity UI from a prompt (Appendix B, §2). Several now say they keep designs consistent, but only inside their own product. Claude Design builds a design system during onboarding and hands off to Claude Code as a bundle. Lovable defines design systems once and reuses them across its projects. Stitch extracts a design system into a `DESIGN.md` file.

**Turning a design into a maintained component system in your own repository is not solved.** The design-to-code tools map a design onto a component library *you already have*. They don't build that library. Figma's MCP server and Code Connect, Builder.io's Fusion, and Figma Make kits all work this way (Appendix B, §1). That reading is ours, based on how each vendor describes its product.

### 4.2 The real competitor is "just ask the agent"

In our judgment, the most common alternative is not a product. It is a developer pasting a screenshot into their agent and typing "build this."

That works for one screen. It breaks on the second. The second screen needs the same card, and the agent builds a new one with different padding. Nobody wrote down which colors are tokens, so the agent invents new ones. Six weeks later there are four slightly different cards, and no way to say which one is correct.

**For the page:** the "why" section must show this failure concretely, because every visitor has already tried the free alternative. The concept's side-by-side of an approved card and a drifted card does this.

### 4.3 Complements and rivals

| Product | What it does | Relationship to pixel-perfect |
|---|---|---|
| Claude Design, v0, Stitch, Lovable, Bolt | Generate designs or apps | **Upstream complement.** Their output is pixel-perfect's input. |
| Figma MCP, Code Connect, Builder.io Fusion | Map designs onto an existing library | **Complement.** Useful once a library exists. pixel-perfect builds one. |
| Storybook | Web component workshop | **Optional part.** pixel-perfect can use it, but defaults to a native sandbox that also works outside the web. |
| Chromatic | Visual testing for Storybook | Adjacent. Similar goal (catch drift), different scope. |
| Knapsack, Supernova | Enterprise design-system governance | **Closest in message, different buyer.** Knapsack names "invisible drift" from AI code (Appendix B, §3). It sells governance to enterprise teams, not an in-repo build process. |
| Official vendor skills: `openai/figma-implement-design`, `google-labs-code/stitch-loop`, Figma's own Claude plugin | Translate a Figma or Stitch screen into code ("1:1 visual fidelity"), or loop design to code | **Closest in function, and backed by big brands.** They work screen by screen. In our reading of their descriptions, none builds a layered, composable library or runs gates across it (Appendix B, §7). Our difference is "a system, not a screen". |
| Popular design skills: Impeccable, Open Design, UI UX Pro Max | Design critique and polish, brand-spec refactors, design guidance. They have 72K to 132K GitHub stars. | **Neighbors on the same shelf.** We study them as marketing references (§8.7), and we don't position against them. Two of them show `DESIGN.md` on their pages (Appendix B, §9), and pixel-perfect writes one (E21). In our judgment, they can work alongside it. |

**Our recommendation:** never attack the generators or the neighboring skills. Present pixel-perfect as what you run *after* the generator, and keep running as the product grows. "Made your design in Claude Design, v0, or Stitch? Here's how it survives your codebase, and your next ten screens." That turns every generator's audience into our audience.

### 4.4 Evidence of the pain

The zeroheight Design Systems Report 2026 surveyed 147 design-system practitioners (Appendix B, §6). It's a small sample, so we cite it with care:

- Teams rate design-side implementation satisfaction at 72%, but code-side at 54%.
- 31% name "ensuring consistency" as a top challenge.
- One finding sums up the problem: "People trust the system. They just don't use it consistently."
- 60% have no token automation. 5% have two-way design-to-code sync.

We could not verify a widely repeated statistic about handoff ("91% of developers think handoff can improve") at its original source. **Do not use it** until someone reads the source PDF.

### 4.5 What pixel-perfect can prove

Claims of an empty field invite "how is this different from X?". So the page claims only mechanics a visitor can check in the code:

1. **Every frame is read once**, into an inventory where each item names the frames that justify it (E9).
2. **Layers are built bottom-up behind gates**, so a screen is never built on a component that doesn't render (E10).
3. **Inventory changes are proved by capture.** `evolve` absorbs a new mock or a sentence, reuses what exists, promotes repeated patterns, and sweeps orphans. Then a re-capture shows nothing else moved (E11, E19).
4. **A native sandbox in any framework**, including SwiftUI, Expo, GPUI, and Ratatui (E12).
5. **Plain code and a standard `DESIGN.md` in your repo**, MIT licensed (E13, E21).

---

## 5. Audience

### 5.1 Segments

| Segment | Who they are | Trigger moment | What they need to see | Priority |
|---|---|---|---|---|
| **AI-native builders** | Solo developers and small startup teams who use Claude Code, Codex, or Cursor daily. They get designs from Claude Design, v0, Stitch, or a freelance designer. | The second screen comes out subtly different from the first. | It works on a real design. It takes minutes, not a new workflow. It fits their stack. | **Primary** |
| **Design engineers** | Frontend leads who own a component library at a small or mid-size team. | An AI-assisted pull request invents a new color or a fifth button style. | The verification mechanics: gates, captured references, drift reports. | **Secondary** |
| **Native and terminal builders** | SwiftUI, Expo, GPUI, and Ratatui developers. | They want a component browser and Storybook doesn't run in their stack. | A sandbox that runs natively in their framework. | **Wedge** — small but underserved, likely to spread word of mouth |
| **Designers who code a little** | Designers using agents to ship their own work. | Their design shipped wrong and they can't say why. | A guided first run. | **Later** — the tool assumes a terminal and an agent today |

**Not our audience:** enterprise design-system teams (they buy governance platforms) and people who want a no-code app builder (they use Lovable or Bolt). The page should not try to win them.

**A segment to confirm: apps already drifting.** When an app already exists, `build` proposes only what is missing or changed (E20). This is called brownfield mode. If it works on apps pixel-perfect didn't scaffold, developers with an existing, drifting UI become a launch audience, and the page gets an "Already have an app?" path. How well that works is decision D18.

### 5.2 The primary visitor's moment

The primary visitor already has a design they love. They already have an agent that writes code. They have probably already tried "build this from the screenshot" and gotten a good first screen. The moment they're ready for pixel-perfect is the moment the *second* screen, or the *second week*, goes wrong.

The page should describe that moment in their words, before it describes the product.

### 5.3 How much visitors already know

We use Eugene Schwartz's awareness levels, a standard copywriting framework:

- **In our judgment, visitors from forums and social media are "problem-aware."** They have felt design drift. They don't know a build process can prevent it. For them: name the problem, then show the mechanism. Features come last.
- **Visitors from directories and the README are "product-aware."** They know what it is and want to install it. For them: a copyable install command in the hero, and every harness's commands one click away.

The page serves both by telling the story from top to bottom while letting installers copy a command without scrolling.

### 5.4 The job to be done

We use the Jobs to Be Done (JTBD) format:

> When I have a design I love and an agent that can write code,
> I want to turn that design into components I can keep building on,
> so the product still looks like the design six weeks from now,
> and every new screen starts from the parts I already have.

Every section of the page should move this job forward.

---

## 6. Positioning

### 6.1 Positioning statement

This is an internal statement, not page copy. It uses Geoffrey Moore's template.

> **For** developers who build interfaces with AI coding agents and have a high-fidelity design they want to ship,
> **pixel-perfect** is an open-source agent skill
> **that** turns the design into a verified component system in their own framework, and keeps growing it.
> **Unlike** asking the agent to rebuild a screenshot, or design-to-code tools that map onto a library you already have,
> **pixel-perfect** builds the library itself, one layer at a time, checks each layer against the design before the next one starts, and builds every later screen from the parts that already exist.

### 6.2 Choosing the category

The category name tells visitors what to compare the product with. We weighed four options.

| Option | What visitors will assume | Verdict |
|---|---|---|
| "Design-to-code tool" | One-click export. Code you throw away. Compare with Anima and Locofy. | Avoid in headlines. Keep for search keywords. |
| "AI design system generator" | It *generates designs*, which is the solved half. Compare with Claude Design and Stitch. | Avoid. |
| "Storybook alternative" | A component browser only. | Too narrow. Use it only as a hook for native and terminal developers. |
| **"Agent skill that turns mockups into a component system"** | Installs in my agent. Does one defined job. | **Recommended.** "Agent skill" is the container this audience already browses for in 2026. |

### 6.3 What only pixel-perfect can claim

| Unique capability | What it gives the user | Proof in the product |
|---|---|---|
| Reads every frame once and inventories it | Nothing in the design gets missed, including the mobile tab bar nobody named | Build Phase 4a; `verify-inventory.mjs` (E9) |
| Builds bottom-up with gates | A screen is never built on a component that doesn't render | Manifest gates (E10) |
| Captures references and detects drift | You can say what "correct" means, and see when code stops matching it | `verify-catalog.mjs --check`, `--blast` (E11) |
| Grows the system from a mock or a sentence | New screens reuse existing parts. Repeated patterns become shared components. Removed screens take their orphans with them, and a re-capture proves nothing else moved. | `evolve` (E19) |
| Writes a standard `DESIGN.md` | Other design tools and agents can read your system | `design-md.mjs` (E21) |
| Native sandbox in any framework | A component browser even in SwiftUI, Expo, GPUI, or Ratatui | Sandbox spec (E12) |
| Six harnesses, one version | Works in the agent you already use | `plugin-release.json` (E2) |
| MIT, output is plain code in your repo | No lock-in | LICENSE (E13) |

---

## 7. Messaging

### 7.1 The core line

> **Your mockup is a picture. Ship the system inside it.**

**Why this line works:**

- The first sentence reframes what the visitor has. They think they have a design. They have a picture of one.
- The second sentence is an instruction and a promise. It implies hidden value they haven't used yet.

**Supporting line (the lede):**

> pixel-perfect is an agent skill that reads every frame of a high-fidelity mockup and turns it into real components in your framework: tokens, atoms, molecules, organisms, and screens. Each layer is checked against the frames it came from before the next layer starts. After that, every new screen, from a mock or a single sentence, is built from the parts you already have.

**Headline under test (D13).** The core line asks the visitor to decode a metaphor, and it names only the first act. Before launch, run the five-second test (§14) on this alternative: "Turn a mockup into a design system your agent keeps building on." It says what the product is in plain words and names both acts. If it wins, the current line becomes the Fig. 1 caption and the social line. This is our judgment, to be settled by the test.

### 7.2 Headlines we considered and rejected

| Candidate | Why we rejected it |
|---|---|
| "Close the gap between design and code." | Every design-to-code vendor says this. It paints no picture. |
| "Designs are inputs, not deliverables." | Accurate (it's from the README), but abstract. It reads as a slogan. |
| "Stop rebuilding your mockups by eye." | A strong problem line. It's negative for a hero. **Keep it** for social posts and the "why" section. |
| "Pixel-perfect, for real this time." | A pun on the name with no information. |
| "Your design system, built by your agent." | Clear but generic. It leaves out verification, which is the difference. |

### 7.3 Message pillars: your four principles

You gave us four guiding principles. We recommend making them the page's pillars, in your words. They beat anything we would write, for two reasons. They are the beliefs the product was actually built on. And a skeptical developer can check each one against the code.

| Principle | What it means to the visitor | Proof on the page | Evidence in the product |
|---|---|---|---|
| **Consistency through composability** | Every screen is assembled from the same parts, so one card can't quietly become four. | Fig. 1; the drifted card (the failure this prevents); the inventory's `composes` field | The composition mutation check changes an atom and requires every declared dependent to change too. "A non-moving dependent is a copy, not a composition" (E17). |
| **Make it real** | No mockup step, no spec format, no throwaway files. The design is the reference, and the code in your repository is the deliverable. | Build it: every output is a real file in your project; the sandbox renders the real components | "There is no mockup step in between" (E15). Version 9 deleted the old HTML mockup engine (E5). |
| **Rapid iteration** | Add a screen with one sentence, and it's built from the parts you already have. Change a token and it flows everywhere. Change a component and everything built on it re-checks. | The "Grow it" section: a real `evolve` run on this site ("add a changelog page" → reuse, new, 0 captured components moved), a `refine` token change with its cascade line, and `add-platform` | `evolve` classifies and proves by re-capture (E19); "Change a token and it propagates" (E16); catalog capture (E11) |
| **Language agnostic** | Works in whatever UI stack you use. Storybook if you want it, a native sandbox if you don't. | Framework list; sandbox example; the sandbox FAQ answer | The sandbox spec comes from two real sandboxes built in Rust, one for GPUI and one for Ratatui (E12) |

**What the four add up to:** your design survives your codebase. That is the promise under the headline.

**Where "faithful to the design" fits.** Reading every frame once is the mechanism behind "make it real". The design is the spec, so you write none. The page shows it in "Build it", and the launch post tells it through the field note (§11, §13). It is not a fifth pillar.

**A tension to manage.** "Gates" and "verification" can sound slow, which fights "rapid iteration". Always present a gate as what makes change fast and safe, never as paperwork. For example: "Change a color token. Every component that uses it updates, and the gates confirm nothing else moved." Never mention a gate without the speed it buys.

**Change to the concept.** The concept's four principle cards (Input, Order, Upkeep, Sandbox) already map onto these one-to-one. Rename them to your four principles and rewrite each in your words.

### 7.4 Objections and answers

A good page answers the questions a skeptic asks before they ask them.

| Objection | Answer | Where |
|---|---|---|
| "My agent already builds from screenshots." | It builds screens, not a system. Show the drifted card. Show the inventory. Then show the second screen reusing the first screen's parts. | Why, Grow it |
| "Is this another framework to learn?" | Four commands to build, then `evolve` and `refine` to grow, inside the agent you already use. | Build it |
| "Does it work with my stack?" | List the frameworks. Mention adapters and the docs-URL fallback for anything else. | Hero, FAQ |
| "Will it lock me in?" | The output is plain code in your repository. MIT license. Storybook is optional. | FAQ |
| "It's at version 9. Is it stable?" | Releases are version-locked across all six harnesses. Every breaking release ships an upgrade guide. | Install, FAQ |
| "Gates sound slow." | Gates are what make change fast. Change a token and the gates confirm what moved, instead of you checking every screen by eye. | Grow it, FAQ |
| "What does it touch in my project?" | A short list of what it reads, writes, and runs, plus security scan results. | Install |
| "How many tokens does it burn?" | Give the measured numbers from the dogfood build: tokens, minutes, frames, gates, and components (T6). Lead with those. The 900K-token recovery passes (E9) explain *why* it reads every frame first. They are not the cost of a normal run, so don't present them as one. | FAQ |
| "I don't have a mockup yet." | Start from a PRD. `wireframe` turns plans into wireframes that build reads the same way. | Build it |
| "I don't have a mockup for the next screen." | Describe it in a sentence. `evolve` builds it from the parts you already have and asks before adding anything new (E19). | Grow it, FAQ |
| "What happens when the design changes?" | `evolve` absorbs a new mock as a change to the system: reuse, variant, new, promote, or remove. `refine` changes tokens and shows exactly which components moved (E19, E16). | Grow it, FAQ |
| "How is this different from v0, Claude Design, or Figma's MCP?" | They generate designs or map them onto a library you have. pixel-perfect builds the library after the handoff, then grows it with each new screen. | FAQ |

### 7.5 Voice

Plain, exact, confident, not hyped. The audience is developers who distrust marketing. They trust specifics they can check.

| Use | Avoid |
|---|---|
| build, check, match, layer, frame, drift, component | revolutionary, magic, seamless, effortless, 10x |
| Numbers with a source | Numbers without one |
| "Gate" with a one-line explanation the first time | Internal names without explanation (`molecules_capture`, "Phase 4a") |
| Short sentences in the active voice | Puns on "pixel-perfect" |
| "Example" labels on illustrative content | Invented output presented as real |

---

## 8. What the leading skill pages taught us

Four research agents studied the eight skill directories and landing pages you named. Each read the live pages on 2026-09-29, checked the numbers in your list, and reported what we should adopt and avoid. Sources are in Appendix B, §8.

### 8.1 What we studied

| Site | What it is | What we verified |
|---|---|---|
| Claude plugin marketplace (claude.com/marketplace/plugins) | Anthropic's official directory | 340 plugins, which matches your list. frontend-design is the first card, and its detail page shows 1,134,112 installs. The page never uses the word "featured". |
| github.com/anthropics/skills | Source of the official skills | 179K stars. Install is two slash commands. |
| skills.sh | Vercel's cross-harness directory and `npx skills` installer | frontend-design shows 935.6K installs, which matches, and now ranks #7. The docs mention "routine security audits", and the site has a "Security audits" filter. Which vendors run them is UNVERIFIED. |
| Figma AI skills (figma.com/community/ai-skills) | Skills for the Figma agent | Figma's copy says seven categories; the page shows six. |
| typeui.sh/design-skills | A catalog of visual-style skills | The page says 94 skills. Its own repository and blog say 67 and 48. |
| ui-skills.com | A curated design-engineering catalog | 9.2K GitHub stars. |
| Awesome lists | Curated GitHub lists | VoltAgent/awesome-agent-skills has 35.0K stars, not ~13K, and is active. travisvn/awesome-claude-skills has 15.2K stars but no commits since 2026-04-28. ComposioHQ/awesome-claude-skills has 75.9K stars and is active. |
| Skills Directory and Agensi | A security-graded index, and a paid marketplace | Skills Directory shows letter grades such as "Grade A". The full A-to-F scale is UNVERIFIED. Agensi publishes a self-ranking comparison that recommends its own paid marketplace. |

### 8.2 Patterns worth adopting

| # | Pattern | Seen on | Why it matters for pixel-perfect | Where it goes |
|---|---|---|---|---|
| 1 | A copyable install command in the first screen | skills.sh ("Try it now"), ui-skills (two install cards), the anthropics/skills README, TypeUI | Directory visitors arrive ready to install. Making them scroll loses some of them. | Hero |
| 2 | A plain definition sentence before any slogan | anthropics/skills README | It answers "what is it" for people and for AI search at the same time. | Hero lede (the concept already does this) |
| 3 | A metadata strip: author, license, source link, supported agents. Install and star counts once they're real. | frontend-design detail page, skills.sh sidebar | Quick, checkable trust facts. | Under the hero |
| 4 | Example prompts in "how to use" | frontend-design ("Build a landing page for…"), Figma's slash-command names | Visitors learn by copying. It also shows the work happens as a conversation inside the agent. | Build it, Grow it |
| 5 | Security audit results near install | skills.sh (security audits filter), Skills Directory (letter grade), the Anthropic directory (scan on submission) | pixel-perfect writes code into your repository and runs a headless browser. Visitors will ask what it touches. | Install |
| 6 | A "what it touches" boundaries block | ui-skills' improve-ui skill ("Never modify product source") | Same reason. List what it reads, writes, and runs. | Install or FAQ |
| 7 | Let people read the skill before installing | ui-skills and skills.sh render the full SKILL.md | Transparency is the one trust signal we can have on day one. | "View source" link beside install |
| 8 | A live visual preview next to install | impeccable.style (before/after slider); TypeUI detail pages (UNVERIFIED: blocked to crawlers) | pixel-perfect's value is visual. A text-only page undersells it. | The hero slider: a real frame next to its built component from the dogfood build |
| 9 | A FAQ that defines the category | Figma ("How is an AI skill different from a prompt?") | Our first objection is "why not just prompt my agent?". | FAQ |
| 10 | Machine-readable files for agents: `llms.txt`, a README badge | ui-skills (`llms.txt`, `registry.txt`), the skills.sh badge | Agents and answer engines can find and cite the page. | Site root, README |
| 11 | Plain, objective listing copy | Figma's contribution rules ban marketing copy; VoltAgent caps descriptions at 10 words | Each directory entry needs its own short, plain text. | Distribution kit (T13) |

### 8.3 Patterns to avoid

| Pattern | Seen on | Why |
|---|---|---|
| Vanity counters, and counts that disagree between pages | Skills Directory ("574,687 indexed skills" and "675,517 Skills scanned" on the same page); Figma (seven categories in the copy, six tabs) | They look sloppy and invite doubt. Show only numbers the site build can generate from the repository. |
| Self-ranking comparison tables | Agensi | Vendor-written, and it recommends itself. Any comparison in our FAQ must be factual and fair to the tools it names. |
| A hero with no action | None of the studied pages | Still worth avoiding: every visitor needs a next step in the first screen. |
| Text-only listings | Claude marketplace cards and detail pages | Fine for a catalog, wrong for a visual tool. |
| Paid or sponsor framing | Agensi; Skills Directory sponsor slots | Clashes with an MIT, open-source pitch. |

### 8.4 An honest check of our own concept

Anthropic's frontend-design skill (updated 2026-09-03) lists visual habits that mark a page as AI-generated. We checked the concept against that list.

| Habit on the list | In the concept? | Action |
|---|---|---|
| Cream background with a terracotta accent | No. Cool neutral paper and the four process inks. | None |
| Identical rounded cards | No. Card styling appears only where an object is on display. | None |
| Tracked, all-caps eyebrow labels | **Yes**, on section labels and buttons | Keep all caps only where print uses it: the slug line and the plate labels. Use sentence case for section labels and buttons. |
| Arrows on buttons | Only "↗" on outbound GitHub links | Acceptable as a link cue. Keep arrows off buttons. |
| "01 / 02 / 03" markers on content that isn't a sequence | No. Numbers mark only real sequences (five layers, four steps) and real references (mark 1 matches note 1). | None |
| Boldness everywhere | No. It sits in one place: the hero's registration and separation effects. | None |

### 8.5 Where to get listed

| Directory | Fit | How to get listed | When |
|---|---|---|---|
| Claude Code self-hosted marketplace | Yes | Already live: `/plugin marketplace add hackerpug-ai/pixel-perfect` | Now |
| Anthropic plugin directory | Yes | Run `claude plugin validate`, then submit at claude.ai/directory/manage. Automated validation and a security scan run first, then a reviewer. **A paid plan is required** (confirmed: "Free accounts can't submit"). Its Usage tab later shows installs and error rates. | Week −4 |
| skills.sh | **Yes, required** | There is no submission form. Skills appear through anonymous install telemetry when people run `npx skills add`. A minimum install count before a skill shows in search is community speculation (UNVERIFIED). This is the main discovery channel for design skills (§8.7). Today, 10 of the 11 pixel-perfect skills link to `../../workflows/`, outside their own folder (E18). Fix that first (B4, T17). | Before launch (blocker) |
| Codex plugin directory | Yes | Self-serve: submit a ZIP, resolve the automated findings, then publish after review. It requires organization verification, and `displayName` is 30 characters or fewer. | Week −4 |
| Trendshift | Yes | No submission. It ranks repositories by star velocity, and it featured one of the studied skills as "#1 Repository of the Day" on its launch day. | Watch on launch day |
| Skills Directory | Yes | Sign in with GitHub and submit. Skills Directory reviews submissions and grades SKILL.md with a letter grade (full scale UNVERIFIED). | Week −4 |
| Cursor marketplace | Yes | Submit the public repository at cursor.com/marketplace/publish. Cursor reviews every plugin by hand. One third-party tracker shows an 8-day median and a 40-day outlier, from only 9 submissions. | Week −4 |
| VoltAgent/awesome-agent-skills (35.0K stars, active) | Yes, after traction | A pull request titled `Add skill: hackerpug-ai/pixel-perfect`, with a description of 10 words or fewer. It refuses brand-new skills without "real community usage". | After launch |
| ComposioHQ/awesome-claude-skills (75.9K stars, active) | Yes | A pull request titled "Add [Skill Name] skill", in alphabetical order under Development. It needs a real use case, docs, examples, and testing. It sets **no star minimum and no ban on AI-assisted pull requests**. | Launch day, written and submitted by you |
| travisvn/awesome-claude-skills (15.2K stars) | Low priority | Needs at least 10 stars. Closes AI-generated or AI-submitted pull requests. No commits since April. | Only if it becomes active again |
| Figma community resources | No | Its list is for Figma MCP tools; entries need the `figma` and `figma-mcp` topics. | Not applicable |
| TypeUI awesome-design-skills | No | It lists visual-style skills (SKILL.md plus DESIGN.md). | Not applicable |
| Agensi | No | A paid marketplace. | Skip |

**One rule for every curated list:** a person writes and submits the pull request. At least one list closes AI-submitted pull requests without comment. We draft the entries; you submit them.

**Draft list entries:**

- VoltAgent format (9 words):
  `- **[hackerpug-ai/pixel-perfect](https://github.com/hackerpug-ai/pixel-perfect)** - Turn high-fidelity mockups into a verified, composable component system`
- Composio and travisvn format:
  `- **[pixel-perfect](https://github.com/hackerpug-ai/pixel-perfect)** - Reads every frame of a high-fidelity design, then builds it as real, composable components in your framework, one verified layer at a time.`

### 8.6 What this research changes

Each pattern's destination is in the "Where it goes" column of §8.2. The page changes are in §9, and the tasks are in §16. The awareness patterns in §8.7 change the launch plan in §13.

### 8.7 How the most-used skills got noticed

The eight sites above show what a listing page does. They don't show how a skill gets noticed in the first place. So we studied the seven most-used coding-agent skills and how each one got its first attention: Superpowers (about 293K GitHub stars), gstack (134.5K), UI UX Pro Max (131.6K), Open Design (98.7K), Impeccable (72.5K), Context7 (62.5K), and frontend-design (1.13M installs). They are marketing references, not rivals. Sources are in Appendix B, §9.

| Pattern | Who used it | What happened | What pixel-perfect does |
|---|---|---|---|
| **A story post as the launch vehicle**, with a real run inside | Superpowers | A same-day blog post with a real session reached 435 HN points. gstack linked its bare repo and got 15. | The launch post is the vehicle (§13, T19). |
| **Launch timing tied to a platform event** | Open Design (the day Claude Design launched); Impeccable (four days after Anthropic's frontend-design post); Superpowers (the week Claude Code launched plugins) | Each one launched into news people were already reading. | Launch within 48 hours of the next major Claude Design, Stitch, v0, or Figma release (D9). |
| **A third party who shares it** | Superpowers | Simon Willison wrote it up the next day. | Send the post to 3–5 writers before launch. Never ask for votes (T22). |
| **Discovery channels that list you on their own** | Impeccable (the creator reports 160,000 installs from skills.sh alone); Superpowers (official marketplace); Open Design (Trendshift #1) | Installs came from surfaces, not from posts. | B4, then the week −4 filings (§8.5). Watch Trendshift. |
| **Real output people can reshare** | Impeccable (a before/after slider for each command, plus a scripted agent thread); UI UX Pro Max (39 live demos, reshared as short videos by others) | The proof travels without the page. | A slider and an `evolve` thread from the dogfood build (§9, T21). Use strong pairs only (§10.4). |
| **One command, or a paste-to-agent install, that covers every agent** | gstack ("paste this into Claude Code"); Superpowers (the agent fetches and follows a raw `INSTALL.md`); Impeccable (`npx impeccable install` plus tabs); Context7 (`npx ctx7 setup`) | No tab-picking before the first try. | A paste-to-agent line plus `npx skills add` in the hero, with the six tabs below (T20). |
| **A named list of supported agents** | 5 of 7 (Impeccable names 10 on its page) | Visitors confirm fit at a glance. | Already planned: the harness line in the hero. |
| **Coined words and one command namespace** | Impeccable ("AI slop", "tells", `/impeccable <verb>`); Superpowers | The words spread with the product. | Use "drift", "the fourth card", and "one read" the same way everywhere, and keep every command under `/pixel-perfect:`. |
| **Releases as posts** | Superpowers ("Superpowers 6", 196 HN points) | Each release was a new chance to be noticed. | One short post and demo per notable release (§13.6). |
| **The system file shown as an artifact** | Impeccable and Open Design both show `DESIGN.md` | It signals that the skill works with the visitor's other tools. | Show the `DESIGN.md` pixel-perfect generates (E21) in "Grow it". |
| **Testimonials and counters** | Impeccable (a wall of posts); the Claude marketplace (install counts) | These came after traction. | Keep deferred until real (§11). |

**Patterns that worked only because of an existing audience.** gstack's reach came from its creator's X account: about 1M views on the launch post, against 15 points on HN. Context7 had a company blog (Upstash). anthropics/skills had Anthropic. Don't plan around any of these.

**What this means for the plan:** the on-page patterns in §8.2 were already covered. In our reading of seven cases, five things got these skills noticed: a story post, event timing, an amplifier, skills.sh, and shareable proof. §13 now carries all five.

---

## 9. Page architecture

### 9.1 Section order

**The concept's order:** Hero → Why → Install → Use → Close.

**Our recommended order:** Hero → Why → **Build it** → **Grow it** → **Install** → FAQ → Close.

**Why we recommend the change:** visitors decide in a fixed order: what is it, do I care, will it work for me, how do I get it. This is the classic AIDA sequence: attention, interest, desire, action. Installing is the action. It belongs after the visitor has seen the product work. Visitors who already want to install lose nothing, because the hero carries a one-line install and the top navigation jumps to the install section.

**Why two acts.** The concept gives `evolve`, `refine`, and `add-platform` one line each under "After the first build". But the "why" section's problem is the second screen that drifts, and `evolve` is what solves it. Growth is also the reason people come back and the demo people share (§8.7). "Build it" comes first because installs happen when someone has a design in hand. "Grow it" is why they stay.

### 9.2 Section blueprints

#### Hero — inform

| | |
|---|---|
| **Job** | Say what it is and create one memorable image. |
| **Key message** | "Your mockup is a picture. Ship the system inside it." |
| **Content** | Harness line, headline, lede, a one-line install block, two CTAs, a metadata strip (MIT · by Justin Rich · View source · works in six agents), framework list, and the **proof slider**: a real frame from the site's design next to the component pixel-perfect built from it. Fig. 1 (the mockup separating into five layers) stays as the brand image, beside or below the slider. |
| **Install block** | Primary: a paste-to-agent line that works in every harness, for example "Install pixel-perfect: follow github.com/hackerpug-ai/pixel-perfect/INSTALL.md" (T20). Secondary: `npx skills add hackerpug-ai/pixel-perfect` (B4). Below both, one line: "Prefer your agent's own commands? See every install option." Copy buttons on each. |
| **Layout** | Cut the display type by about a quarter from the concept. At 1440×900, the concept's headline fills about 60% of the first screen. It pushes the second CTA below the fold. At 390 px, Fig. 1 falls entirely below the fold and its labels shrink to "01–05". The install block must be in the first screen at both widths. On mobile, the slider replaces Fig. 1. |
| **CTAs** | Primary: copy the install line. Secondary: "See it build". |

#### Why — persuade

| | |
|---|---|
| **Job** | Make the visitor recognize their own problem, then reframe it. |
| **Key message** | "Designs die in translation." |
| **Content** | Two short paragraphs; an approved card next to a drifted card with four numbered proofreader marks; the notes for each mark; a short version of the **field note** (§11); the pivot line; your four principles (§7.3). **Redraw the card from a real component in the dogfood build.** The concept's "Invite your team" card, with pending-invite avatars and numbered issues, closely resembles a card on impeccable.style (Appendix B, §9). Visitors may read it as borrowed. |
| **Proof** | The drifted card (labeled "Example" if it's constructed); the field note (real); zeroheight figures if you approve D7. |
| **CTA** | None. Scrolling is the action. |
| **Why** | Every visitor has tried the free alternative. Showing its failure in their own terms does more than any feature list. |

#### Build it — show (act one)

| | |
|---|---|
| **Job** | Prove it's four commands, and show real output at each step. |
| **Key message** | "From mockup to system in four commands." |
| **Content** | Steps 1 to 4 (`init`, `scaffold`, `build`, `status`), each next to its output: manifest, sandbox, inventory, and status report. Each step shows an example prompt, such as `/pixel-perfect:init my designs are in design/deck.html`. A 60 to 90 second demo recording. A line for visitors without a mockup: `wireframe` turns a PRD into wireframes that build reads the same way. |
| **Proof** | Real output from the dogfood build (§11), replacing the concept's example output. The measured run numbers: tokens, minutes, frames, gates, components. |
| **CTA** | None. Scrolling into "Grow it" is the action. |

#### Grow it — show (act two)

| | |
|---|---|
| **Job** | Show that the system keeps paying off after the first build. Every new screen starts from the parts you already have. |
| **Key message** | "Your next screen starts from the parts you already have." (Our wording; test it with the rest of the copy in T3.) |
| **Content** | A **scripted agent thread** from a real run on this site: `/pixel-perfect:evolve "add a changelog page"` → the one-line change summary ("reuse 4 · new 1 · 0 captured components moved") → the new page. Beside it, three short cards: `evolve` with a new mock (reuse, variant, new, promote, remove, with an orphan sweep for removals); `refine` with a token change and its cascade line ("Cascades into: …"); and `add-platform`. Also show the `DESIGN.md` pixel-perfect generates, so visitors see it works with their other tools (E21). |
| **Proof** | The real `evolve` run and its re-capture result (E19). No invented numbers. |
| **CTA** | "Install pixel-perfect" at the end of the section. |
| **Why** | It answers the second-screen drift from "Why", and it is the most shareable demo (§13.5). |

#### Install — educate

| | |
|---|---|
| **Job** | Get the visitor from interest to a working install in under a minute. |
| **Key message** | "Install it in your agent." |
| **Content** | The paste-to-agent line and `npx skills add` at the top, then six harness tabs with exact commands and copy buttons, a "Then run" next step, per-harness warnings (Cursor symlinks, Codex duplicate installs), a stability note, a "View source" link, security scan results, and a short "What it touches" list: what it reads, writes, and runs. |
| **Proof** | Commands that work. After blockers B1, B2, and B4 are fixed, a CI check keeps them working (§16, T2). Scan results from the directories (T18). |
| **CTA** | Copy. After copying, show: "Next: open a project that has your design and run `/pixel-perfect:init`." |

#### FAQ — new

| | |
|---|---|
| **Job** | Answer objections (§7.4) in one place and give AI answer engines clean answers. |
| **Content** | Six to eight questions. The first is "Why not just prompt my agent?". Include "What happens when the design changes?" and "How many tokens does it use?" (answered with measured numbers). Each answer starts with the answer, in one or two sentences. |
| **Why** | Skeptics look for this section. AI search tools also quote well-structured question-and-answer blocks. This practice is called answer engine optimization (AEO). |

#### Close

| | |
|---|---|
| **Job** | One last call to action. |
| **Content** | "Your next mockup has a system inside it." Install button and GitHub link. |

### 9.3 Changes from the concept

Apply §9.1 and §9.2. Also rename the four principle cards (§7.3), switch labels to sentence case (§8.4), and remember the chosen harness tab (§12). Two changes appear only here:

1. Fix the "Check the proof" status block, which clips its text ("4 scr…") at 1440 px.
2. Add page metadata: title, description, and social preview image at launch (T6), and structured data after launch (T9).

---

## 10. Creative direction: "press proof"

### 10.1 The idea

Print shops can't print a color image in one pass. They split it into separate **plates**, one per ink: cyan, magenta, yellow, and black. Then they align the plates exactly, which printers call **registration**, so together they reproduce the original. Before the full print run, they check a **proof**.

pixel-perfect does the same thing to a mockup, with layers instead of inks. So the page borrows the look of a printer's proof sheet.

### 10.2 Why this metaphor fits

An abstract process is hard to remember. A physical picture of it is easy. We chose print because the vocabulary maps one-to-one:

| Print term | What it means in print | What it means in pixel-perfect | Where it appears |
|---|---|---|---|
| Separation | Splitting an image into one plate per ink | Splitting a mockup into tokens, atoms, molecules, organisms, screens | Fig. 1 |
| Registration | Aligning the plates exactly | Components matching their frames; compositions, not copies | Headline effect |
| Proof | A test print checked before the run | A gate checked before the next layer | Step 4, "Check the proof" |
| Proofreader's marks | Numbered corrections on a proof | Drift callouts | Why section |
| Crop marks, slug line | Trim guides and job details on the sheet margin | Page framing, version line | Hero |
| Color control strip | Swatches that check ink on press | The token layer | Hero strip, token plate |

Two more reasons:

- **It's distinctive.** In our judgment, many AI tool pages look alike: dark background, gradient, terminal window. We did not audit them all. This direction looks different.
- **The name fits.** "Pixel-perfect" is about exactness. Print is the craft where exactness is visible: anyone can see a misregistered print.

**Risk:** the metaphor could feel too clever. **Mitigation:** the copy never requires knowing anything about print. Print lives in the visuals. The words stand alone.

### 10.3 Directions we considered and rejected

| Direction | Why we rejected it |
|---|---|
| **Amber pixel-art CRT** (the current banner) | Says "retro game" and "pixel art". The product is neither. You also asked us not to hold on to it. |
| **Blueprint** | The most common "technical" look. It also frames the design as a plan to interpret, which is the mindset the product rejects: the design is the target, not a plan. |
| **Exploded parts manual on cream paper with red accents** | Close to today's most common AI-generated look (cream background, serif, terracotta). |
| **Standard dev-tool dark gradient with a terminal hero** | Blends into every AI launch. Nothing to remember. |
| **Model-kit parts frame** | Charming and says "parts", but toy-like. It undersells the rigor. |

### 10.4 Visual system

**Color.** The four process inks, cyan, magenta, yellow, and black, on a cool neutral paper. The light theme behaves like ink on paper: overlapping colors darken (a "multiply" blend). The dark theme behaves like light on a screen: overlapping colors brighten (a "screen" blend). The same four colors behave the way they physically would in each medium. Designers notice details like this. Magenta is the only accent used for action and emphasis. Yellow is never used for text.

**Type.**

| Role | Typeface | Why |
|---|---|---|
| Display | Anybody (variable width and weight) | Wide and heavy for headlines, with presence and personality. One family covers headlines and callout labels. |
| Body | Libre Franklin | Descended from Franklin Gothic, a print workhorse. Very legible. |
| Code and labels | IBM Plex Mono | Clear for commands. It has a technical-manual feel. |

We avoided Inter and Space Grotesk on purpose. They are the default look of AI tool pages.

**Graphic devices.** Crop marks, registration targets, a color control strip, slug lines, and numbered proofreader marks. The rule: every device must mean something. Numbers appear only for real sequences (the five layers, the four steps) or real references (mark 1 matches note 1). All caps appear only where print uses them: slug lines and plate labels. Section labels and buttons use sentence case (§8.4).

**Motion.** Two orchestrated moments on load. The headline's color plates slide into registration. Fig. 1 starts as a flat mockup, tilts, and separates into five layers. Motion is CSS only, never hijacks scrolling, and turns off for visitors who set "reduce motion".

**The proof slider.** The slider borrows the proof sheet's logic. On one side is the design frame; on the other, the built component, with registration marks at the corners. Dragging reveals whether they line up. Use only frame-component pairs that match closely. A weak before/after hurts more than none: Impeccable's own Show HN drew exactly that complaint (Appendix B, §9).

**The mark.** A registration target with one magenta pixel at its center: "one pixel, registered". We recommend adopting it as the logo and retiring the amber banner (decision D5).

### 10.5 Standards

- **Accessibility:** meet WCAG 2.2 AA (Web Content Accessibility Guidelines) contrast. Tabs follow the keyboard pattern for tab lists. The figure has a text caption. No content depends on animation.
- **Performance:** a static page with no framework script required to read it. Largest Contentful Paint (LCP) under 2.5 seconds, Google's "good" threshold. Limit font weights to those actually used.
- **Both themes:** designed deliberately, not inverted.

---

## 11. Proof strategy: earning trust from zero

The page cannot borrow credibility. It has to show it. In order of impact:

1. **Build the site with pixel-perfect (dogfooding).** Use the concept as the design reference. Run `init`, `scaffold`, and `build`. Then add one page by sentence with `evolve` (T6). Publish the site's `inventory.json` and sandbox at `/sandbox`, and say: "This page was built with pixel-perfect. Here's its inventory. Here's its sandbox. This page was added with one sentence." This is the strongest proof available. It also yields the slider pairs, the `evolve` thread, and the demo footage.
2. **Publish the run's numbers.** Record tokens, minutes, frames, gates passed, and components built for the dogfood run. Put them in "Build it", the FAQ, and the launch post. A measured claim beats an adjective. Context7 leads its page with one ("34% cheaper, 37% fewer tokens", Appendix B, §9).
3. **Publish the field note, in the launch post.** `INVENTORY-CONTRACT.md` records a real failure (E9): deriving components from the spec found 8 molecules where the designs held 13. It missed the mobile tab bar entirely. It took four user interventions and two recovery passes of about 900K tokens each. This is why pixel-perfect reads every frame first. A true, specific, slightly embarrassing story persuades more than any claim (decision D6). Tell it as the reason for the design, next to the measured cost of a normal run, so it doesn't read as "this tool is expensive".
4. **Record a demo** (T8): `init`, `build`, the sandbox, and one `evolve` by sentence. Real commands, no edited output, plus a 15-second `evolve` clip.
5. **Show real before-and-after comparisons.** Start with the slider pairs from the dogfood build. Add early users' projects once they share them.
6. **Add social proof only when it's real.** Show the star count once it helps rather than hurts (our judgment: around 100 stars). Show directory install counts. Quote real users with their permission.
7. **Make transparency visible.** Link the changelog, the MIT license, and the integration tests. The release process already tests a real packed Pi install (E1).
8. **Show third-party security results.** The Anthropic directory scans every submission. skills.sh has a "Security audits" filter, and Skills Directory shows letter grades (§8.1). Put real results beside the install commands, next to a plain list of what pixel-perfect reads, writes, and runs. This is borrowed credibility we can earn before we have a single user.

---

## 12. Conversion design

**Primary conversion:** copying an install command. We treat it as a stand-in for installing, because installs themselves happen outside the page.

**Secondary conversions:** visiting the GitHub repository, starring it, opening the upgrade guides.

**Reducing friction:**

- One install line that works in every harness: a paste-to-agent instruction backed by an agent-readable `INSTALL.md` in the repository (T20). Two of the most-used skills install this way (§8.7). `npx skills add` sits beside it once B4 is fixed.
- Exact commands with copy buttons, and a fallback that selects the text when the clipboard is blocked.
- A "Then run" line after every install, so the next step is never a guess.
- Per-harness warnings where people actually get stuck (Cursor fails on symlinks; Codex breaks with two installs).
- The chosen tab remembered on return visits.
- Direct links for each harness (`#install-cursor`), so directory listings land on the right tab.
- **Default tab: Claude Code.** We can't detect which harness a visitor uses. Claude Code is where the plugin started, and it has the largest skills audience. That second point is our judgment.

**One primary action, one style.** In the hero, the primary action is the paste-to-agent install line (§8.2, pattern 1; §8.7). After "Grow it" and in the close, it's the dark "Install pixel-perfect" button that jumps to the install section. Every other action is secondary.

---

## 13. Launch and distribution

A story post is the launch vehicle. The date follows a vendor release, a few outside writers get the post early, and the discovery channels work before anyone arrives (§8.7).

### 13.1 The launch kit (all ready before launch day)

1. **Installs that work:** B1, B2, and B4 fixed; every documented command passes on a clean machine; `INSTALL.md` live (T1, T2, T17, T20).
2. **The dogfood build** with the `evolve` page and run numbers (T6). This closes B3.
3. **The launch post** (T19): the fourth-card problem, the field note, and a real transcript of the dogfood run, ending on the `evolve` step. Publish it on your blog or the site, not only on social media.
4. **Shareable proof:** slider pairs, the `evolve` thread, the demo, and a 15-second clip (T8, T21).
5. **Repository ready:** description fixed, README leads with the slider and the one-line install, homepage points to the site (T12, E22).
6. **Submissions filed in week −4:** the Anthropic directory, Cursor, Codex, and Skills Directory (T13). Cursor and Anthropic review by hand. One tracker shows Cursor reviews of up to 40 days (9 submissions), so don't hold the launch for Cursor.
7. **Outreach list** (T22).

### 13.2 Channels

The directory-by-directory detail is in §8.5.

| Channel | Why | Action | Evidence |
|---|---|---|---|
| **Launch post** | The vehicle (§8.7). | Publish on launch day. Every other channel links to it. | B §9 |
| skills.sh | The main discovery channel for design skills (§8.5, §8.7). | Blocker B4. Add the skills.sh badge to the README on launch day. | B §8, §9 |
| Claude Code self-hosted marketplace | Already works. No approval needed. | Keep `/plugin marketplace add hackerpug-ai/pixel-perfect` in the tabs. | B §5 |
| Anthropic plugin directory | The official listing. Its scan result doubles as a trust signal. Requires a paid plan. | Validate, then submit in week −4 (D17). | B §8 |
| Cursor marketplace | Official Cursor listing, reviewed by hand. | Submit in week −4. | B §5, §8 |
| Codex plugin directory | Official Codex listing, self-serve with organization verification. | Submit in week −4 (D17). | B §8 |
| **Hacker News** | The best-documented channel for skill launches (§8.7). | One Show HN linking the launch post (§13.4). Reply to every comment the same day. | B §9 |
| **Amplifiers** | A well-known writer covered one of the most-used skills the day after it launched (Appendix B, §9). With no audience of your own, this is the multiplier. | Send the post and demo to 3–5 writers a day or two before launch. Offer early access. **Never ask anyone to upvote**; HN forbids it. | B §9 |
| Reddit | r/ClaudeAI (about 1.1M members), r/ClaudeCode (about 395K), r/cursor (about 144K). Counts come from a third-party stats site. | One tailored post per community, linking the launch post. r/ClaudeCode has a weekly showcase thread, so check each community's live rules first (UNVERIFIED). | B §5 |
| ComposioHQ/awesome-claude-skills | 75.9K stars, with no star minimum and no ban on AI-assisted pull requests. | You submit the pull request on launch day. | B §8 |
| Trendshift | Ranks repositories by star velocity (§8.5). | Nothing to submit. A concentrated launch day is what gets you in. | B §9 |
| Other awesome lists | Curated and trusted, but gated on real usage. | After launch, you submit to VoltAgent/awesome-agent-skills, hesreallyhim/awesome-claude-code, rohitg00/awesome-claude-design, and awesome-opencode. Drafts are in §8.5. | B §5, §8 |
| X (Twitter) | Reach depends on your own following (§8.7). | A short thread with the 15-second `evolve` clip, linking the post. Treat it as an echo unless you have an audience (D16). | B §9 |

### 13.3 Sequence

The launch is **triggered by a vendor event** once the kit is ready, not set by a calendar.

| When | What |
|---|---|
| Week −4 | Directory submissions (Anthropic, Cursor, Codex, Skills Directory). Fix the repository description. |
| Weeks −4 to 0 | Blockers, the dogfood build with the `evolve` run, run numbers, demo and clip, slider, launch post, security scans (T18), and the outreach list. |
| **Trigger** | The next major release from Claude Design, Google Stitch, v0, or Figma's AI tools. Launch within 48 hours, pitched as "the step after it". If no event arrives by the fallback date you set (D9), launch on a Tuesday to Thursday anyway. |
| Launch day −1 or −2 | Send the post and demo to the outreach list. |
| Launch day | Publish the post. Post the Show HN. Submit to ComposioHQ. Post on Reddit and X. Reply to every comment the same day. |
| Weeks +1 to +4 | Awesome-list pull requests to the other lists, submitted by you, once there's real usage to point to. Fast replies to issues. Ask early users for quotes and before/after pairs. |
| Every notable release | A release post (§13.6). |
| Day +30 | Measurement review (§14). |

### 13.4 Show HN

**Suggested title (74 characters):** "Show HN: I rebuilt my landing page from a mockup with a coding-agent skill"

- **HN titles are capped at 80 characters.**
- **Lead with a result, not "a skill".** In a small sample of recent skill launches (Appendix B, §9), posts about a concrete outcome did well (a skill that builds complete Godot games got 337 points). Posts about generic skills and directories got 1 to 9 points (HN Algolia search, 2026-09-29).
- **Link the launch post or the repository, not the landing page.** The Show HN rules say "Don't post landing pages."
- **Post from an established account.** HN has restricted Show HN for new accounts since March 2026 because of an influx of AI-built projects (Appendix B, §9). Check the restriction the week before launch (D15).
- **Put the first comment up yourself.** Say what it is, what the post shows, and what you want feedback on.

### 13.5 Story hooks

These are angles for posts, not page copy.

- "I added a page to my site with one sentence, and nothing else moved" (the `evolve` run).
- "The mobile tab bar nobody named" (the field note).
- "The fourth copy of the card" (the drift problem).
- "A Storybook for Ratatui" (the native and terminal wedge).
- "Your mockup is a picture" (the core line).

### 13.6 Release posts

Each notable release is a new chance to be noticed. One of the most-used skills got 196 HN points for a numbered release post (Appendix B, §9). Each release that adds a capability a user can see gets a short post, one real demo, a 15-second clip, and the upgrade note if anything broke (T23). Skip internal releases. Every release post states the stability policy (D10, R3).

---

## 14. Measurement

**Principle:** measure two things. **Discovery:** did people hear about it, and from where? **Installs:** did they try it? Page events show intent. The install and discovery numbers come from GitHub, skills.sh, and the directories. Use privacy-friendly, cookieless analytics (for example Plausible or GoatCounter) so no consent banner is needed. The final tool is decision D8.

**Page events** (they show intent, not installs):

| Event | Properties | Question it answers |
|---|---|---|
| `install_copy` | harness or method (paste-to-agent, skills, tab) | Which install path do people choose? |
| `cta_click` | location (hero, grow-it, close) | Which call to action works? |
| `tab_select` | harness | What do people look for before copying? |
| `slider_drag` | pair | Does the proof hold attention? |
| `outbound_github` | location | Does the page drive repository traffic? |

**Discovery and install sources** (outside the page):

| Source | What it shows | Where |
|---|---|---|
| GitHub referrers and unique cloners | Which channel sent people, and how many actually cloned | `gh api .../traffic/popular/referrers`, `.../traffic/clones` (same calls as E4) |
| skills.sh install count | Installs from the main discovery channel | The skill's skills.sh page |
| Anthropic directory Usage tab | Installs and error rates | claude.com/docs/directory/publish |
| Page referrers | Which post, list, or writer sent visitors | Analytics tool |

**Starting point:** 0 GitHub views and 9 clones in the last 14 days, 0 stars, and an unpublished npm package (E3, E4, E7).

**Week one, checked daily:**

1. Referrers and unique cloners on GitHub.
2. skills.sh installs and directory install errors.
3. New issues, especially install failures. Fix these the same day.
4. The most common objection in HN and Reddit comments. It goes into the FAQ that week.
5. Which amplifier, if any, wrote about it, and what traffic followed.

**Targets:** we won't invent benchmarks. The first 14 days after launch set the baseline. After that, set each target as the baseline plus a stated improvement, and review monthly.

**Qualitative checks before launch:** the five-second test (4 of 5 pass; it settles D13) and the first-contact install test on every harness, paste-to-agent line first. Details are in T14.

---

## 15. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Install commands fail | Certain today | High | Fix B1, B2, and B4. Add a CI check that runs every documented install command on each release (T2). |
| R2 | Zero social proof | Certain | High | Dogfood build, `evolve` run, run numbers, field note, demo recording (§11). |
| R3 | Breaking-release cadence scares adopters | High | Medium | Stability note on the page; upgrade guides; decision D10 on a release policy. The same pace is also a source of release posts (§13.6), and each post restates the policy. |
| R4 | Page claims drift from the product | High | Medium | Keep page facts traceable to the README; add a page review to the release checklist. |
| R5 | The metaphor confuses | Low | Medium | Copy never depends on it; the five-second test catches it. |
| R6 | Example content read as real | Medium | Medium | Replace it with dogfood output (B3). Label anything constructed "Example". |
| R7 | Animation hurts performance or accessibility | Low | Medium | CSS only; reduced-motion support; test on a low-end phone. |
| R8 | Marketplace rules change | Medium | Low | The site and repository are canonical; directories are extra reach. |
| R9 | A platform adds post-handoff maintenance | Medium | High | Hold the ground platforms can't: your repository, your framework, any agent, open source. Move fast. |
| R10 | Gates read as slow, which contradicts "rapid iteration" | Medium | Medium | Always pair a gate with the speed it buys (§7.3). Test the wording in the five-second test. |
| R11 | Visitors file it with single-screen design-to-code tools | Medium | Medium | Show the second act: the `evolve` run, where a new screen reuses existing parts. Claim only what the code proves (§4.5). |
| R12 | Curated lists refuse a new skill | High | Low | ComposioHQ on launch day; the others after launch, with usage to point to. You submit, not an agent. |
| R13 | A security scan flags something | Low | High | Scan before launch (T18). Fix findings before listing. |
| R14 | `npx skills add` installs broken skill folders | Medium | High | Blocker B4: fix the folder layout before launch and test on a clean machine (T17). |
| R15 | Show HN is restricted or the post sinks | Medium | High | Post from an established account (D15). Lead with a result. Link the post, not the page. If Show HN is blocked, submit the post as a regular story. |
| R16 | A weak before/after backfires | Medium | Medium | Use only pairs that match closely. Have someone outside the project judge them before launch. |
| R17 | No vendor event arrives in time | Medium | Low | Set a fallback date (D9) and launch then. |
| R18 | No amplifier responds | High | Medium | Launch anyway. The directories, skills.sh, and the post still carry it. Follow up with each release post (§13.6). |

---

## 16. Implementation plan

Each item below is one task. Approval of this document lets them go straight into the task list. Agents are from `~/Projects/brain/agents/`.

The plan has a **launch set** (§16.1) and an **after-launch set** (§16.2). Site setup (T5), publishing the proof (T7), and deployment (T11) are folded into the dogfood build (T6). New tasks: the launch post, the paste-to-agent install, the shareable proof, and outreach (T19 to T22), plus release posts after launch (T23).

### 16.1 Launch set

| # | Task | Scope | Acceptance criteria | Depends on | Agent |
|---|---|---|---|---|---|
| T1 | Fix the broken install paths | Release process; `plugin-release.json`; npm publish of `plugins/pixel-perfect` | AC-1: tag `v9.1.0` exists on GitHub. AC-2: `npm view @hackerpug-ai/pixel-perfect version` returns `9.1.0`. AC-3: all six install paths complete on a clean machine. | — | `devops-engineer`, then `pi-package-reviewer` for the npm package |
| T17 | Make `npx skills add` work (blocker B4) | Skill folder layout; `.claude-plugin/marketplace.json` | AC-1: on a clean machine, `npx skills add hackerpug-ai/pixel-perfect` installs skills that can reach the shared workflow files. If they can't, restructure the layout until they can. AC-2: `/pixel-perfect:status` runs from that install. AC-3: the skills.sh badge resolves. | T1 | `ai-tooling-implementer` → `ai-tooling-reviewer` |
| T20 | Paste-to-agent install | `INSTALL.md` at the repository root; hero and install copy | AC-1: pasting the one-line instruction into each of the six harnesses installs pixel-perfect with no other input. AC-2: `INSTALL.md` covers each harness's steps and the "Then run" step. | T1, T17 | `techwriting-implementer` → `ai-tooling-reviewer` |
| T2 | Add an install smoke test to CI | `.github/workflows/` | AC-1: on each release tag, CI runs every install command shown on the site, including `npx skills add`, in a clean container. AC-2: a failing command fails the release. | T1, T17 | `ghactions-planner` → `ghactions-implementer` → `ghactions-reviewer` |
| T18 | Security scan and "what it touches" list | Plugin; `.spec/prds/landing/boundaries.md` | AC-1: `claude plugin validate` passes. AC-2: a list of every file pixel-perfect reads, writes, and runs (including headless Chrome), checked against the code. AC-3: any scan findings fixed before listing. | T1 | `security-reviewer` → `code-reviewer` |
| T3 | Write the copy deck | `.spec/prds/landing/copy.md` | AC-1: final copy for every section in §9, including "Grow it". AC-2: every claim traces to Appendix A or B. AC-3: both headlines ready for the five-second test (D13). AC-4: passes style review. | D1, D6, D7 | `marketing-copywriter` → `marketing-creative-director` + `techwriting-reviewer` |
| T6 | Build, publish, and deploy the site with pixel-perfect | New site folder (framework per D3); GitHub Pages | AC-1: pixel-perfect `init` records `design/concepts/pixel-perfect.html` as a reference. AC-2: `design/inventory.json` accounts for every frame, and every gate passes. AC-3: one page is added by sentence with `evolve`, and its re-capture shows no other component moved. AC-4: the run numbers are recorded: tokens, minutes, frames, gates, and components. AC-5: `/sandbox` and `/inventory.json` are reachable on the deployed site. AC-6: the default GitHub Pages action deploys on push to `main`. AC-7: title, description, social tags, and `/llms.txt` are live. A cookieless analytics script records referrers. | T3, D2, D3, D4 | `sveltekit-planner` → `sveltekit-implementer` + `frontend-designer` → `sveltekit-reviewer` |
| T21 | Shareable proof | Slider pairs; the `evolve` thread; site "Grow it" section | AC-1: at least three frame-to-component slider pairs from T6, each judged a close match by someone outside the project. AC-2: the scripted `evolve` thread uses the real output from T6 AC-3. | T6 | `frontend-designer` → `sveltekit-reviewer` |
| T8 | Record the demo | 60 to 90 second video, a 15-second `evolve` clip, and poster frames | AC-1: shows real `init`, `build`, sandbox, and one `evolve` by sentence, with no edited results. AC-2: under 8 MB, captioned. | T6 | No clean fit. Use the general `claude` agent with `cmux-cua` screen recording. |
| T19 | Write the launch post | Blog post on the site or your blog | AC-1: tells the fourth-card problem, the field note, and the real dogfood run, and ends on the `evolve` step. AC-2: includes the run numbers, the demo, and one slider image. AC-3: every claim traces to Appendix A or B. | T6, T8, T21 | `marketing-copywriter` → `techwriting-reviewer` |
| T12 | Update the README and repository | `README.md`; repository settings | AC-1: the description no longer says "Claude Code plugin" and names the six agents (E22). AC-2: the README leads with a slider image and the one-line install, and shows the skills.sh badge. AC-3: the repository homepage is the site. AC-4: README install commands match the site. | T6, T20 | `techwriting-implementer` → `techwriting-reviewer` |
| T13 | File directory submissions | `.spec/prds/landing/distribution.md` | AC-1: the Anthropic directory, Cursor, Codex, and Skills Directory are submitted in week −4, with links recorded. AC-2: the ComposioHQ entry is drafted for you to submit on launch day. AC-3: the other awesome-list entries are drafted for after launch. | T1, T12 AC-1, T18, D17 | `marketing-campaign-manager` |
| T22 | Outreach list | `.spec/prds/landing/outreach.md` | AC-1: 3–5 writers who have covered skill launches, each with a link to a past piece. AC-2: a short personal note for each, drafted for you to send one or two days before launch. No upvote requests. | T19 | You send the notes. `marketing-campaign-manager` drafts them. |
| T14 | Run the pre-launch user tests | Deployed site | AC-1: the five-second test passes (4 of 5) and settles D13. AC-2: the first-contact install passes on every harness, paste-to-agent line first. | T6, T20 | `product-explorer` |
| T15 | Launch | The launch post, Show HN, ComposioHQ, Reddit, X | AC-1: you approve every post. AC-2: launched within 48 hours of the trigger event, or on the fallback date (D9). AC-3: the Show HN title is 80 characters or fewer and links the post. AC-4: links logged. | T13, T14, T19, T22, D9, D15 | `marketing-social-manager` + `marketing-copywriter` |

### 16.2 After launch

| # | Task | Scope | Acceptance criteria | Depends on | Agent |
|---|---|---|---|---|---|
| T4 | Produce the full brand set | `design/brand/` | AC-1: SVG mark, favicon, 1200×630 social image, README banner. AC-2: each reads in light and dark contexts. (For launch, T6 cuts a favicon and social image from the concept's mark and a slider pair.) | D5 | `frontend-designer` |
| T9 | Full search and answer-engine work | Structured data, FAQ tuning | AC-1: `SoftwareApplication` structured data validates. AC-2: FAQ answers lead with the answer, updated with the objections from launch week. | T15 | `marketing-seo-specialist` + `marketing-aeo-specialist` |
| T10 | Page analytics events | Site | AC-1: the five page events in §14 fire, confirmed on the deployed site. | T6, D8 | `sveltekit-implementer` |
| T23 | Release posts | One per notable release | AC-1: a short post, one real demo, and the upgrade note, per §13.6. | T15 | `marketing-copywriter` |
| T16 | 30-day review | `.spec/prds/landing/review-30d.md` | AC-1: baseline metrics, what worked by channel, and the next three tests. | T15 | `marketing-campaign-manager` |

**Parallel waves (launch set):**

- **Wave 1:** T1, T3, T12 AC-1 (the description fix only)
- **Wave 2:** T17, T18, T6
- **Wave 3:** T13 (from week −4), T20, T2, T21, T8
- **Wave 4:** T19, T12 (rest), T14
- **Wave 5:** T22
- **Trigger:** T15. Then the after-launch set.

---

## 17. Decisions we need from you

| # | Decision | Our recommendation | Why |
|---|---|---|---|
| D1 | Page order: Hero → Why → Build it → Grow it → Install → FAQ → Close? | **Yes** | Visitors install after they see it work, and "Grow it" shows the part that keeps them. Installers still copy from the hero. |
| D2 | Build the production site with pixel-perfect, and add one page with `evolve`? | **Yes** | The strongest possible proof. It produces the demo, the slider, the run numbers, and the story for the launch post. |
| D3 | Site framework | **SvelteKit with static output** | pixel-perfect's SvelteKit adapter is marked stable (E14), and static output hosts free on GitHub Pages. Vite with React is the alternative. |
| D4 | Hosting and domain | **GitHub Pages, custom domain of your choice** | Free, and it lives next to the code. The GitHub subdomain works as a fallback. |
| D5 | Adopt the registration-target mark and retire the amber banner? | **Yes** | It matches the new direction, and you said the current iconography is not fixed. |
| D6 | Publish the field note (8 vs 13 molecules)? | **Yes, in the launch post, next to the measured cost of a normal run** | True, specific, and it explains the core design choice. Next to the real numbers, it won't read as "expensive". |
| D7 | Cite the zeroheight survey figures? | **Yes, with the sample size** | Real third-party data. A sample of 147 is small, so say so. |
| D8 | Analytics tool | **A cookieless tool** | No consent banner; enough to see referrers and install intent. |
| D9 | Launch timing | **Once the kit is ready and T14 passes, launch within 48 hours of the next major Claude Design, Stitch, v0, or Figma release. Set a fallback date about two weeks after the kit is ready.** (Our judgment on the window.) | Three of the most-used skills launched into a vendor event (§8.7). The fallback keeps the launch from waiting forever. |
| D10 | A stability commitment on the page | **State the policy you'll keep**, for example "breaking changes only in major releases, each with an upgrade guide" | Four breaking majors in five months is the biggest adoption risk. The page and every release post should state the policy, and the product should keep it. |
| D11 | Use your four guiding principles as the page's pillars, in your words? | **Yes** | They're the product's real beliefs, and each one can be checked against the code (§7.3). |
| D12 | Make `npx skills add` a supported install path? | **Yes. Required before launch (B4)** | skills.sh is where design skills get found. One popular design skill's author reports 160,000 installs from it alone. |
| D13 | Headline | **Test the current line against "Turn a mockup into a design system your agent keeps building on." in the five-second test, and keep the winner** | The current line needs decoding and names only the first act. The test decides, not us. |
| D14 | Launch vehicle | **The launch post, not the landing page** | A story with a real run is what worked (§8.7), and Show HN rules say "Don't post landing pages". |
| D15 | Which HN account posts the Show HN? | **One with real posting history. If yours is new, start taking part in HN now. If Show HN is blocked, submit the post as a regular story.** | HN has restricted Show HN for new accounts since March 2026 (Appendix B, §9). |
| D16 | Is X a channel for you? | **Only if you already have a following. Otherwise post the clip there as an echo and put your time into the post and amplifiers.** | The one studied skill that grew through X had a very large existing audience (§8.7). |
| D17 | Paid Claude plan and OpenAI organization verification | **Confirm both now** | The Anthropic directory requires a paid plan, and Codex requires organization verification. Both submissions go in at week −4. |
| D18 | Does brownfield `build` work on apps pixel-perfect didn't scaffold? | **Test it once on a real existing app during T6. If it works, add an "Already have an app?" path. If not, don't claim it.** | If it works, developers whose existing UI is already drifting become a launch audience (§5.1, E20). |

---

## Appendix A: Evidence register (this repository)

| ID | Fact | Source |
|---|---|---|
| E1 | Version 9.1.0 released 2026-09-02; Pi package added with a real packed-artifact integration test | `CHANGELOG.md`, `plugin-release.json` |
| E2 | Six release channels (Claude, Codex, Cursor, Grok, OpenCode, Pi) | `plugin-release.json`; `README.md` "Quick Start" |
| E3 | Public since 2026-01-30; 0 stars; 1 fork (checked 2026-09-29) | `gh api repos/hackerpug-ai/pixel-perfect` |
| E4 | Last 14 days: 0 views; 9 clones (7 unique); no referrers (checked 2026-09-29) | `gh api .../traffic/views`, `.../traffic/clones`, `.../traffic/popular/referrers` |
| E5 | Breaking majors: v5.0.0 (2026-03-31), v6.0.0 (2026-05-30), v8.0.0 (2026-08-12), v9.0.0 (2026-08-30) | `git log --tags --simplify-by-decoration`; `gh release list` |
| E6 | Tag `v9.1.0` does not exist on GitHub; latest is `v9.0.0` (checked 2026-09-29) | `git ls-remote --tags origin` |
| E7 | `@hackerpug-ai/pixel-perfect` not found on npm (checked 2026-09-29) | `npm view @hackerpug-ai/pixel-perfect version` → 404 |
| E8 | Upgrade guides exist for 8.0 and 9.0 | `plugins/pixel-perfect/docs/UPGRADING-8.0.md`, `UPGRADING-9.0.md` |
| E9 | Field note: 8 molecules found vs 13 drawn; mobile tab bar missed; four user interventions; two ~900K-token recovery passes | `plugins/pixel-perfect/docs/INVENTORY-CONTRACT.md`, "Why one read, before anything is built" |
| E10 | Manifest gates block forward progress until they pass | `README.md` "The 7-Phase Process"; `design/manifest.json` schema |
| E11 | Catalog capture and the composition mutation check | `CHANGELOG.md` 8.0.0; `plugins/pixel-perfect/scripts/verify-catalog.mjs` |
| E12 | The sandbox is a spec, generated natively per framework | `plugins/pixel-perfect/docs/sandbox-spec.md`; `README.md` "The Sandbox" |
| E13 | MIT license | `LICENSE` |
| E14 | SvelteKit framework adapter status: stable | `README.md` "Included Adapters" |
| E15 | "There is no mockup step in between. The design is the reference and the component is the deliverable." | `README.md` "Designs Are Inputs, Not Deliverables" |
| E16 | "Change a token and it propagates; change an atom and every molecule and screen composing it is re-verified." | `README.md` "Atomic Design as the Execution Order" |
| E17 | Composition mutation check: "a non-moving dependent is a copy, not a composition" | `CHANGELOG.md` 8.0.0 |
| E18 | 10 of 11 `SKILL.md` files link to `../../workflows/`, outside their own folder | `grep -l "../../workflows" plugins/pixel-perfect/skills/*/SKILL.md` |
| E19 | `evolve` takes a file, URL, screenshot, directory, or a plain sentence (`evolve "add a settings screen with profile and billing tabs"`). It sorts each element into reuse, variant, new, promote, remove, or token change against the captured catalog, confirms the whole change once, and proves it by re-capture. It also covers `--replace`, `--deprecate`, and removal with an orphan sweep. | `plugins/pixel-perfect/workflows/evolve.md` |
| E20 | `build` has a brownfield mode: it "runs the delta per level and proposes only what is missing or changed" | `plugins/pixel-perfect/workflows/build.md` line 229 |
| E21 | pixel-perfect writes a project-root `DESIGN.md` from the manifest and tokens, and lints and diffs it with Google's `@google/design.md` CLI. `refine` regenerates it after token changes. | `plugins/pixel-perfect/scripts/design-md.mjs`; `workflows/refine.md` |
| E22 | The GitHub repository description still reads "Claude Code plugin that builds token-governed design systems…", which contradicts "six agents" (checked 2026-09-29) | `gh api repos/hackerpug-ai/pixel-perfect --jq .description` |
| E23 | B1 and B2 re-checked 2026-09-29 after review: the latest tag is still `v9.0.0`, and `npm view` still returns 404 | `git ls-remote --tags origin`; `npm view @hackerpug-ai/pixel-perfect version` |

## Appendix B: Outside sources

Research date 2026-09-29. Some pages were read through a summarizing fetch tool, so treat short quotes as close paraphrases unless marked verbatim.

**§1 Design-to-code tools**

- Figma MCP server: https://www.figma.com/blog/introducing-figma-mcp-server/
- Claude Code to Figma: https://www.figma.com/blog/introducing-claude-code-to-figma/
- Figma Make kits: https://help.figma.com/hc/en-us/articles/35946832653975-Use-your-design-system-package-in-Make-kits
- Anima: https://www.animaapp.com/
- Locofy (claims UNVERIFIED): https://www.locofy.ai/
- Builder.io Fusion: https://www.builder.io/fusion ; Visual Copilot 2.0: https://www.builder.io/blog/visual-copilot-2

**§2 AI UI generators**

- Claude Design: https://www.anthropic.com/news/claude-design-anthropic-labs
- v0: https://v0.app/
- Lovable design systems: https://docs.lovable.dev/features/design-systems
- Bolt: https://bolt.new/
- Google Stitch: https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/ ; DESIGN.md: https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/

**§3 Design-system tooling**

- Storybook: https://storybook.js.org/
- Chromatic: https://www.chromatic.com/
- shadcn/ui registry: https://ui.shadcn.com/docs/registry
- Supernova: https://www.supernova.io/
- Knapsack: https://www.knapsack.cloud/
- Tokens Studio: https://tokens.studio/

**§4 Neighboring agent skills**

- https://github.com/myth-zeb/design-system-skills
- https://github.com/jeltehomminga/figma-design-skills
- https://github.com/albertzhangz10/design-system-skill
- Figma official plugin: https://claude.com/plugins/figma

**§5 Distribution channels**

- Claude Code plugin publishing: https://code.claude.com/docs/en/plugins/publish ; directory: https://claude.com/plugins
- Codex plugins: https://developers.openai.com/codex/plugins/build
- Cursor marketplace: https://cursor.com/blog/marketplace
- skills.sh: https://www.skills.sh/ ; installer: https://github.com/vercel-labs/skills
- Pi: https://pi.dev/
- Awesome lists: https://github.com/VoltAgent/awesome-agent-skills ; https://github.com/hesreallyhim/awesome-claude-code ; https://github.com/ComposioHQ/awesome-claude-skills ; https://github.com/rohitg00/awesome-claude-design ; https://github.com/awesome-opencode/awesome-opencode ; https://github.com/hashgraph-online/awesome-codex-plugins
- Show HN examples: https://news.ycombinator.com/item?id=47932254 ; https://news.ycombinator.com/item?id=48231575
- Reddit sizes (third-party): https://gummysearch.com/r/ClaudeCode/

**§6 Pain data**

- zeroheight Design Systems Report 2026 (n = 147): https://report.zeroheight.com/
- "91% of developers…" handoff figure, attributed to Figma's State of the Designer 2025: seen only secondhand at https://dev.to/hunterstein/91-of-teams-say-design-handoff-is-broken-heres-how-to-fix-it-with-figma-to-azure-5h7 — **UNVERIFIED at source. Do not cite.**

**§7 Official vendor design-to-code skills** (as listed in VoltAgent/awesome-agent-skills)

- `openai/figma-implement-design` ("Translate Figma designs into production-ready code with 1:1 visual fidelity"): https://officialskills.sh/openai/skills/figma-implement-design
- `google-labs-code/stitch-loop` ("Iterative design-to-code feedback loop"): https://officialskills.sh/google-labs-code/skills/stitch-loop
- List: https://github.com/VoltAgent/awesome-agent-skills

**§8 Skill directories and landing pages**

- Claude plugin marketplace: https://claude.com/marketplace/plugins ; frontend-design listing: https://claude.com/marketplace/plugins/frontend-design ; submission guide: https://claude.com/docs/plugins/submit
- anthropics/skills: https://github.com/anthropics/skills ; frontend-design SKILL.md: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- skills.sh: https://skills.sh ; docs: https://skills.sh/docs ; FAQ: https://skills.sh/docs/faq ; frontend-design: https://skills.sh/anthropics/skills/frontend-design ; installer: https://github.com/vercel-labs/skills ; listing analysis (community): https://github.com/vercel-labs/skills/issues/1315
- Skills Directory: https://skillsdirectory.com ; submit: https://skillsdirectory.com/submit ; methodology: https://skillsdirectory.com/security/methodology . Its pages show letter grades such as "Grade A"; the full A-to-F scale is UNVERIFIED.
- Agensi (vendor-authored, biased): https://www.agensi.io/ ; https://www.agensi.io/learn/best-ai-agent-skills-marketplaces-2026 . The article cites Snyk for skills.sh.
- skills.sh audits: the docs say only "routine security audits", and the site has a "Security audits" browse filter. Vendor names (Snyk, Socket, Gen Agent Trust Hub) did not appear on the live docs and are UNVERIFIED.
- Anthropic directory plan requirement: "Plan: Pro, Max, Team, or Enterprise. Free accounts can't submit." https://claude.com/docs/plugins/submit ; publishing and the Usage tab: https://claude.com/docs/directory/publish
- Codex plugin directory submission (self-serve, organization verification required): https://developers.openai.com/plugins/deploy/submission
- Cursor marketplace review times (third-party, only 9 submissions tracked): https://reviewtimes.fyi
- ComposioHQ/awesome-claude-skills contribution rules (no star minimum, no ban on AI-assisted pull requests): https://github.com/ComposioHQ/awesome-claude-skills/blob/master/CONTRIBUTING.md
- Figma AI skills: https://www.figma.com/community/ai-skills ; contribution rules: https://github.com/figma/community-resources/blob/main/CONTRIBUTING.md
- TypeUI: https://typeui.sh/design-skills ; https://github.com/bergside/typeui ; https://github.com/bergside/awesome-design-skills
- UI Skills: https://ui-skills.com ; https://github.com/ibelick/ui-skills
- Awesome lists: https://github.com/travisvn/awesome-claude-skills (and its CONTRIBUTING.md) ; https://github.com/VoltAgent/awesome-agent-skills (and its CONTRIBUTING.md) ; https://github.com/ComposioHQ/awesome-claude-skills

**§9 How the most-used skills got noticed (added in v2)**

Research date 2026-09-29. Stars from `gh api`. HN points from the HN Algolia API. Numbers a creator reports about their own project are marked as the creator's claim.

- Superpowers (obra/superpowers, about 293K stars): launch post https://blog.fsck.com/2025/10/09/superpowers ; Show HN, 435 points, 231 comments: https://news.ycombinator.com/item?id=45547344 ; Simon Willison's write-up the next day, which notes "Claude Code just launched plugins, and Jesse is celebrating by wrapping up a whole host of his accumulated tricks as a new plugin called Superpowers": https://simonwillison.net/2025/Oct/10/superpowers/ ; README (https://github.com/obra/superpowers): installs from the official marketplace (`/plugin install superpowers@claude-plugins-official`), names 16 harnesses, and tells some agents to "Fetch and follow instructions from" a raw `INSTALL.md` ; "Superpowers 6" release post, 196 points (2026-06-30, found through HN Algolia).
- gstack (garrytan/gstack, about 134.5K stars): README install is "paste this into Claude Code": https://github.com/garrytan/gstack ; launch on X, about 1M views: https://x.com/garrytan/status/2032014570118922347 ; HN, 15 points: https://news.ycombinator.com/item?id=47355173
- UI UX Pro Max (about 131.6K stars): https://uupm.cc ; 39-demo gallery; spread by third-party short videos, March to May 2026 (observed, not measured).
- Open Design (about 98.7K stars): https://open-design.ai ; repository created 2026-04-28, the day Claude Design launched; Trendshift "#1 Repository of the Day": https://trendshift.io
- Impeccable (about 72.5K stars): https://impeccable.style (before/after slider, scripted agent thread, install tabs including skills.sh, `llms.txt`); repository created 2025-11-16, four days after Anthropic's frontend-design post; Show HN, 103 points: https://news.ycombinator.com/item?id=46587284 ; "160,000 installs through skills.sh alone" (creator's claim): https://x.com/pbakaus/article/2069111016366170524 ; the page names 10 agents, opens with "Turn AI slop into interfaces you're proud to ship", reports "4 tells found" in its demo thread, and shows a wall of about 30 user posts; a top comment on its Show HN called a before/after "devastatingly bad" (quoted in our research pass, not re-read)
- Context7 (about 62.5K stars): https://context7.com ("34% cheaper, 37% fewer tokens"; one command, `npx ctx7 setup`); HN, 3 points: https://news.ycombinator.com/item?id=43763843
- Page study of the seven (2026-09-29): five name their supported agents on the page (Impeccable, UI UX Pro Max, Open Design, Superpowers, Context7).
- Recent skill Show HN results (HN Algolia search, 2026-09-29): "Claude Code skills that build complete Godot games", 337 points (2026-03-16); a chess-analysis skill, 75 points (2026-09-26); generic skill directories and registries, 3 to 9 points (2026-01).
- Show HN rules ("Don't post landing pages"): https://news.ycombinator.com/showhn.html ; 80-character title limit: https://news.ycombinator.com/item?id=40677110 ; Show HN restrictions on new accounts: https://news.ycombinator.com/item?id=47300772 and https://news.ycombinator.com/item?id=48391260

## Appendix C: Glossary

| Term | Meaning |
|---|---|
| Agent harness | The coding agent the skill runs inside: Claude Code, Codex, Cursor, Grok, OpenCode, or Pi. |
| Tokens | Named design values: colors, type sizes, spacing. |
| Atom / molecule / organism / screen | The layers of a component system, from the smallest part (a button) to a full screen. From Brad Frost's Atomic Design. |
| Gate | A check that must pass before the next layer is built. |
| Inventory | `design/inventory.json`: the list of everything to build, each item tied to the frames that justify it. |
| Sandbox | A component browser that shows each component in isolation. |
| Drift | Code that no longer matches the design it was built from. |
| Dogfooding | Using your own product to build your own product. |
| AIDA | Attention, interest, desire, action: the order in which people move toward a decision. |
| AEO | Answer engine optimization: writing so AI search tools can quote the answers. |
| Launch vehicle | The one link a launch sends people to first. In v2, it is the launch post, not the landing page. |
| Amplifier | A third party with an audience who writes about or shares a launch. |
| Paste-to-agent install | An install that is a short instruction the visitor pastes into their agent, which then fetches and follows an `INSTALL.md`. One command covers every harness. |
| Catalog capture | pixel-perfect's recorded renders of every component. A re-capture shows exactly which components a change moved. |
| JTBD | Jobs to Be Done: describing a product by the job a customer hires it for. |
| CTA | Call to action. |
| LCP | Largest Contentful Paint: how long the main content takes to appear. |
| WCAG | Web Content Accessibility Guidelines. |
