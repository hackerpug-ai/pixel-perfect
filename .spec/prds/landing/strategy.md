---
title: pixel-perfect landing page — strategy and creative recommendation
prepared_for: Justin Rich, hackerpug-ai
prepared_by: Claude (acting as strategy and creative consultant)
date: 2026-09-29
status: proposal — awaiting decisions in §17
concept: design/concepts/pixel-perfect.html
---

# pixel-perfect landing page: strategy and creative recommendation

## How to read this document

This is a pitch. It explains what we recommend for the pixel-perfect landing page and why.

- Short on time? Read **§1 Executive summary** and **§17 Decisions we need from you**.
- Want the reasoning? Read §3 to §8 in order. Each section ends with what it means for the page.
- Ready to build? Go to **§16 Implementation plan**. Each item maps to one tracked task.

Every factual claim points to evidence in **Appendix A** (this repository) or **Appendix B** (outside sources). When a statement is our judgment, not a fact, we say so. When we could not verify something, we mark it **UNVERIFIED**.

**Inputs we used:**

- The working concept in `design/concepts/pixel-perfect.html`. We call it "the concept" below.
- Your four guiding principles for pixel-perfect: consistency through composability, make it real, rapid iteration, and language agnostic. They are the backbone of the messaging in §7.
- A competitive scan of design-to-code tools, AI UI generators, and design-system tooling (Appendix B, §1 to §6).
- A study of eight skill directories and landing pages you named, done by four research agents on 2026-09-29 (§8; Appendix B, §7 and §8).
- The repository itself: README, changelog, docs, tags, and GitHub traffic (Appendix A).

---

## 1. Executive summary

### The situation

pixel-perfect is a mature, capable product with no audience yet. It is at version 9.1.0 and ships to six agent harnesses. The GitHub repository has 0 stars and had 0 page views in the last 14 days (Appendix A, E3 and E4). Nobody has vouched for it publicly. That means the landing page cannot borrow trust. It has to earn trust by showing the product working.

The market timing is good. AI tools now generate beautiful designs in seconds: Claude Design, v0, Google Stitch, Lovable. Each claims consistency inside its own tool. Official skills from OpenAI and Google Labs now translate a single Figma or Stitch screen into code (Appendix B, §7). None of them builds and maintains a composable design system in *your* repository, in *your* framework, after the handoff. That gap is exactly what pixel-perfect does.

### Our recommendation

1. **Position pixel-perfect as the step after the generator.** Designs are cheap now. Turning a design into a component system that stays true to it is still hard. Say so plainly.
2. **Lead with one line:** "Your mockup is a picture. Ship the system inside it."
3. **Build the message on your four principles**, in your words: consistency through composability, make it real, rapid iteration, and language agnostic. Each one can be checked against the code, which is what this audience trusts (§7.3).
4. **Adopt the "press proof" creative direction.** Print shops split an image into plates and align them exactly. pixel-perfect splits a mockup into layers and checks each one against the design. The metaphor maps one-to-one, it demos in a single image, and it looks like nothing else in the AI tool space.
5. **Prove, don't claim.** Build the production landing page *with pixel-perfect*, using the concept as the design reference. Then publish the page's own inventory and component sandbox. The page becomes its own case study.
6. **Put a copyable install command in the first screen.** Every leading skill page does this (§8.2).
7. **Order the page as the visitor decides:** what it is, why it matters, how it works, how to install it, answers to objections, final call to action. This swaps two sections in the concept (see §9).
8. **Distribute in two waves.** Directories that list you on submission or on installs come before launch. Curated "awesome" lists want real usage first, so they come after launch, submitted by you (§8.5, §13).

### Three things must happen before launch

These are blockers. The page would send people to commands that fail.

| # | Blocker | Evidence |
|---|---|---|
| B1 | The Cursor and OpenCode instructions clone tag `v9.1.0`. That tag does not exist on GitHub. The latest tag is `v9.0.0`. | Appendix A, E6 |
| B2 | The Pi instruction installs `npm:@hackerpug-ai/pixel-perfect`. That package is not published. `npm view` returns 404. | Appendix A, E7 |
| B3 | The concept's demo content ("Harbor", status numbers) is invented. It must be labeled as an example or replaced with real output before launch. | §11 |

### What we need from you

Twelve decisions, listed in §17. The three that unblock the most work are: the section order (D1), whether to build the site with pixel-perfect (D2), and the site's framework (D3).

---

## 2. The brief

You asked for a landing page that does four jobs:

1. **Inform** — say what the skill is.
2. **Persuade** — explain why someone needs it.
3. **Educate** — show how to install it.
4. **Show** — demonstrate how to use it.

We added two jobs that the four imply:

5. **Earn trust from zero.** The product has no stars, users, or testimonials to point to yet (§3).
6. **Feed distribution.** Skill directories and curated lists will link to the page. The page must serve those arrivals, who want install commands fast (§8, §13).

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
| Install paths that currently fail | Cursor, OpenCode (missing tag); Pi (unpublished package) | E6, E7 |

### 3.3 What this means for the page

1. **There is no borrowed credibility.** No star count, no logos, no quotes. Every trust signal has to be something the visitor can check: a working demo, real output files, open source, a visible changelog. §11 is the plan.
2. **The page is the front door, not a supplement.** With no referrers, whatever we publish is the first impression. The README should point to it.
3. **Stability needs a story.** A developer who sees "v9" and four breaking releases in five months will ask whether the tool will break their project next month. The page needs an honest answer: releases are version-locked across all six harnesses, and every breaking release ships an upgrade guide (E8). The product decision behind that answer is D10 in §17.
4. **Install must work before anything else matters.** Blockers B1 and B2 come first.

---

## 4. The market

### 4.1 The generation half is solved; the system half is not

The market splits into two halves.

**Generating designs is solved and crowded.** Claude Design, v0, Lovable, Bolt, and Google Stitch all generate high-fidelity UI from a prompt (Appendix B, §2). Several now say they keep designs consistent, but only inside their own product. Claude Design builds a design system during onboarding and hands off to Claude Code as a bundle. Lovable defines design systems once and reuses them across its projects. Stitch extracts a design system into a `DESIGN.md` file.

**Turning a design into a maintained component system in your own repository is not solved.** The design-to-code tools map a design onto a component library *you already have*. They don't build that library. Figma's MCP server and Code Connect, Builder.io's Fusion, and Figma Make kits all work this way (Appendix B, §1). That reading is ours, based on how each vendor describes its product.

### 4.2 The real competitor is "just ask the agent"

The most common alternative is not a product. It is a developer pasting a screenshot into their agent and typing "build this."

That works for one screen. It breaks on the second. The second screen needs the same card, and the agent builds a new one with different padding. Nobody wrote down which colors are tokens, so the agent invents new ones. Six weeks later there are four slightly different cards, and no way to say which one is correct.

**For the page:** the "why" section must show this failure concretely, because every visitor has already tried the free alternative. The concept's side-by-side of an approved card and a drifted card does this.

### 4.3 Complements and rivals

| Product | What it does | Relationship to pixel-perfect |
|---|---|---|
| Claude Design, v0, Stitch, Lovable, Bolt | Generate designs or apps | **Upstream complement.** Their output is pixel-perfect's input. |
| Figma MCP, Code Connect, Builder.io Fusion | Map designs onto an existing library | **Complement.** Useful once a library exists. pixel-perfect builds one. |
| Storybook | Web component workshop | **Optional part.** pixel-perfect can use it, but defaults to a native sandbox that also works outside the web. |
| Chromatic | Visual testing for Storybook | Adjacent. Similar goal (catch drift), different scope. |
| Knapsack, Supernova | Enterprise design-system governance | **Closest in message, different buyer.** Knapsack names "invisible drift" from AI code. It sells governance to enterprise teams, not an in-repo build process. |
| Official vendor skills: `openai/figma-implement-design`, `google-labs-code/stitch-loop`, Figma's own Claude plugin | Translate a Figma or Stitch screen into code ("1:1 visual fidelity"), or loop design to code | **Closest in function, and backed by big brands.** They work screen by screen. None builds a layered, composable library or runs gates across it (Appendix B, §7). Our difference is "a system, not a screen". |
| Community agent skills | Figma spec extraction, design-doc generation | **No direct competitor found.** The nearest ones have 0 to 4 stars and don't build a layered library with gates (Appendix B, §4). The search was not exhaustive. |

**Our recommendation:** never attack the generators. Present pixel-perfect as what you run *after* them. "Made your design in Claude Design, v0, or Stitch? Here's how it survives your codebase." That turns every generator's audience into our audience.

### 4.4 Evidence of the pain

The zeroheight Design Systems Report 2026 surveyed 147 design-system practitioners (Appendix B, §6). It's a small sample, so we cite it with care:

- Teams rate design-side implementation satisfaction at 72%, but code-side at 54%.
- 31% name "ensuring consistency" as a top challenge.
- One finding sums up the problem: "People trust the system. They just don't use it consistently."
- 60% have no token automation. 5% have two-way design-to-code sync.

We could not verify a widely repeated statistic about handoff ("91% of developers think handoff can improve") at its original source. **Do not use it** until someone reads the source PDF.

### 4.5 The white space

The position nobody holds: an open-source process that runs in your own agent, builds a composable component system in your own framework, checks it against the design, and keeps checking as the design changes. Each part of that sentence excludes a competitor. Platform tools exclude "your own agent" and "your own framework". Mapping tools exclude "builds". Screen-level vendor skills exclude "system". Governance tools exclude "open source" and "in your repo".

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

### 5.2 The primary visitor's moment

The primary visitor already has a design they love. They already have an agent that writes code. They have probably already tried "build this from the screenshot" and gotten a good first screen. The moment they're ready for pixel-perfect is the moment the *second* screen, or the *second week*, goes wrong.

The page should describe that moment in their words, before it describes the product.

### 5.3 How much visitors already know

We use Eugene Schwartz's awareness levels, a standard copywriting framework:

- **Visitors from forums and social media are "problem-aware."** They have felt design drift. They don't know a build process can prevent it. For them: name the problem, then show the mechanism. Features come last.
- **Visitors from directories and the README are "product-aware."** They know what it is and want to install it. For them: a copyable install command in the hero, and every harness's commands one click away.

The page serves both by telling the story from top to bottom while letting installers copy a command without scrolling.

### 5.4 The job to be done

We use the Jobs to Be Done (JTBD) format:

> When I have a design I love and an agent that can write code,
> I want to turn that design into components I can keep building on,
> so the product still looks like the design six weeks from now.

Every section of the page should move this job forward.

---

## 6. Positioning

### 6.1 Positioning statement

This is an internal statement, not page copy. It uses Geoffrey Moore's template.

> **For** developers who build interfaces with AI coding agents and have a high-fidelity design they want to ship,
> **pixel-perfect** is an open-source agent skill
> **that** turns the design into a verified component system in their own framework.
> **Unlike** asking the agent to rebuild a screenshot, or design-to-code tools that map onto a library you already have,
> **pixel-perfect** builds the library itself, one layer at a time, and checks each layer against the design before the next one starts.

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
- It reads in about two seconds and needs no jargon.
- It pairs with the hero animation, which shows a mockup separating into the system inside it. The words and the picture say the same thing.

**Supporting line (the lede):**

> pixel-perfect is an agent skill that reads every frame of a high-fidelity mockup and turns it into real components in your framework: tokens, atoms, molecules, organisms, and screens. Each layer is checked against the frames it came from before the next layer starts.

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
| **Make it real** | No mockup step, no spec format, no throwaway files. The design is the reference, and the code in your repository is the deliverable. | How it works: every output is a real file in your project; the sandbox renders the real components | "There is no mockup step in between" (E15). Version 9 deleted the old HTML mockup engine (E5). |
| **Rapid iteration** | Change a token and it flows everywhere. Change a component and everything built on it re-checks. Add a screen without starting over. | `refine`, `evolve`, `add-platform`; the drift line in the status report | "Change a token and it propagates" (E16); `evolve` and catalog capture (E11) |
| **Language agnostic** | Works in whatever UI stack you use. Storybook if you want it, a native sandbox if you don't. | Framework list; sandbox example; the sandbox FAQ answer | The sandbox spec comes from two real sandboxes built in Rust, one for GPUI and one for Ratatui (E12) |

**What the four add up to:** your design survives your codebase. That is the promise under the headline.

**Where "faithful to the design" fits.** Reading every frame once and inventorying it is the mechanism behind "make it real": the design itself is the spec, so there is no need to write one. The page shows it in "How it works" and in the field note (§11). It is not a fifth pillar.

**A tension to manage.** "Gates" and "verification" can sound slow, which fights "rapid iteration". Always present a gate as what makes change fast and safe, never as paperwork. For example: "Change a color token. Every component that uses it updates, and the gates confirm nothing else moved." Never mention a gate without the speed it buys.

**Change to the concept.** The concept's four principle cards (Input, Order, Upkeep, Sandbox) already map onto these one-to-one. Rename them to your four principles and rewrite each in your words.

### 7.4 Objections and answers

A good page answers the questions a skeptic asks before they ask them.

| Objection | Answer | Where |
|---|---|---|
| "My agent already builds from screenshots." | It builds screens, not a system. Show the drifted card. Show the inventory. | Why |
| "Is this another framework to learn?" | Four commands, inside the agent you already use. | How it works |
| "Does it work with my stack?" | List the frameworks. Mention adapters and the docs-URL fallback for anything else. | Hero, FAQ |
| "Will it lock me in?" | The output is plain code in your repository. MIT license. Storybook is optional. | FAQ |
| "It's at version 9. Is it stable?" | Releases are version-locked across all six harnesses. Every breaking release ships an upgrade guide. | Install, FAQ |
| "Gates sound slow." | Gates are what make change fast. Change a token and the gates confirm what moved, instead of you checking every screen by eye. | How it works, FAQ |
| "What does it touch in my project?" | A short list of what it reads, writes, and runs, plus security scan results. | Install |
| "How many tokens does it burn?" | It reads every frame once, up front. On a real project, skipping that read cost two recovery passes of about 900K tokens each (E9). | FAQ |
| "I don't have a mockup yet." | Start from a PRD. `wireframe` turns plans into wireframes that build reads the same way. | How it works |
| "How is this different from v0, Claude Design, or Figma's MCP?" | They generate designs or map them onto a library you have. pixel-perfect builds and maintains the library after the handoff. | FAQ |

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
| skills.sh | Vercel's cross-harness directory and `npx skills` installer | frontend-design shows 935.6K installs, which matches, and now ranks #7. Snyk scanning is confirmed, plus Socket and Gen Agent Trust Hub audits. |
| Figma AI skills (figma.com/community/ai-skills) | Skills for the Figma agent | Figma's copy says seven categories; the page shows six. |
| typeui.sh/design-skills | A catalog of visual-style skills | The page says 94 skills. Its own repository and blog say 67 and 48. |
| ui-skills.com | A curated design-engineering catalog | 9.2K GitHub stars. |
| Awesome lists | Curated GitHub lists | VoltAgent/awesome-agent-skills has 35.0K stars, not ~13K, and is active. travisvn/awesome-claude-skills has 15.2K stars but no commits since 2026-04-28. ComposioHQ/awesome-claude-skills has 75.9K stars and is active. |
| Skills Directory and Agensi | A security-graded index, and a paid marketplace | Skills Directory grades skills A to F. Agensi's self-ranking comparison contradicts live data: it says skills.sh has no security review. |

### 8.2 Patterns worth adopting

| # | Pattern | Seen on | Why it matters for pixel-perfect | Where it goes |
|---|---|---|---|---|
| 1 | A copyable install command in the first screen | skills.sh ("Try it now"), ui-skills (two install cards), the anthropics/skills README, TypeUI | Directory visitors arrive ready to install. Making them scroll loses some of them. | Hero |
| 2 | A plain definition sentence before any slogan | anthropics/skills README | It answers "what is it" for people and for AI search at the same time. | Hero lede (the concept already does this) |
| 3 | A metadata strip: author, license, source link, supported agents. Install and star counts once they're real. | frontend-design detail page, skills.sh sidebar | Quick, checkable trust facts. | Under the hero |
| 4 | Example prompts in "how to use" | frontend-design ("Build a landing page for…"), Figma's slash-command names | Visitors learn by copying. It also shows the work happens as a conversation inside the agent. | How it works |
| 5 | Security audit results near install | skills.sh (three PASS audits), Skills Directory (A to F grade), the Anthropic directory (scan on submission) | pixel-perfect writes code into your repository and runs a headless browser. Visitors will ask what it touches. | Install |
| 6 | A "what it touches" boundaries block | ui-skills' improve-ui skill ("Never modify product source") | Same reason. List what it reads, writes, and runs. | Install or FAQ |
| 7 | Let people read the skill before installing | ui-skills and skills.sh render the full SKILL.md | Transparency is the one trust signal we can have on day one. | "View source" link beside install |
| 8 | A live visual preview next to install | TypeUI detail pages | pixel-perfect's value is visual. A text-only page undersells it. | Fig. 1; a real frame next to its built component from the dogfood build |
| 9 | A FAQ that defines the category | Figma ("How is an AI skill different from a prompt?") | Our first objection is "why not just prompt my agent?". | FAQ |
| 10 | Machine-readable files for agents: `llms.txt`, a README badge | ui-skills (`llms.txt`, `registry.txt`), the skills.sh badge | Agents and answer engines can find and cite the page. | Site root, README |
| 11 | Plain, objective listing copy | Figma's contribution rules ban marketing copy; VoltAgent caps descriptions at 10 words | Each directory entry needs its own short, plain text. | Distribution kit (T13) |

### 8.3 Patterns to avoid

| Pattern | Seen on | Why |
|---|---|---|
| Vanity counters, and counts that disagree between pages | Skills Directory ("573,686 indexed skills"); TypeUI (48, 67, 94); Figma (seven vs six categories) | They look sloppy and invite doubt. Show only numbers the site build can generate from the repository. |
| Self-ranking comparison tables | Agensi | Vendor-written and self-contradicting. Any comparison in our FAQ must be factual and fair to the tools it names. |
| A hero with no action | Figma AI skills | Every visitor needs a next step in the first screen. |
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
| Anthropic plugin directory | Yes | Run `claude plugin validate`, then submit at claude.ai/directory/manage. Automated validation and a security scan run first, then a reviewer. One source says a paid claude.ai plan is required (UNVERIFIED). | Before launch |
| skills.sh | Yes, if compatible | There is no submission form. Skills appear through anonymous install telemetry when people run `npx skills add`. A community analysis reports a minimum install count before a skill shows in search (UNVERIFIED). **Risk:** 10 of the 11 pixel-perfect skills link to `../../workflows/`, outside their own folder (E18). A folder-by-folder install may break them. Test first (T17). | After T17 passes |
| Skills Directory | Yes | Sign in with GitHub and submit. Submissions are reviewed and graded A to F on SKILL.md. | Before launch |
| Cursor marketplace | Yes | Submit the public repository at cursor.com/marketplace/publish | Before launch |
| VoltAgent/awesome-agent-skills (35.0K stars, active) | Yes, after traction | A pull request titled `Add skill: hackerpug-ai/pixel-perfect`, with a description of 10 words or fewer. It refuses brand-new skills without "real community usage". | After launch |
| ComposioHQ/awesome-claude-skills (75.9K stars, active) | Yes, after traction | A pull request per its contribution guide. We have not reviewed that guide yet. | After launch |
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

1. The install command moves into the hero (§9.2).
2. A metadata strip goes under the hero.
3. The install section gets security scan results and a "what it touches" block (T18).
4. "How it works" gets example prompts.
5. The FAQ opens with "Why not just prompt my agent?".
6. The site ships `llms.txt` and the README gets a badge (T9).
7. Section labels and buttons switch to sentence case.
8. We test whether `npx skills add` works before we promise it (T17).
9. Curated lists move to after launch, and you submit them yourself.

---

## 9. Page architecture

### 9.1 Section order

**The concept's order:** Hero → Why → Install → Use → Close.

**Our recommended order:** Hero → Why → **How it works** → **Install** → FAQ → Close.

**Why we recommend the change:** visitors decide in a fixed order: what is it, do I care, will it work for me, how do I get it. This is the classic AIDA sequence: attention, interest, desire, action. Installing is the action. It belongs after the visitor has seen the product work. Visitors who already want to install lose nothing. The hero button and the top navigation jump straight to the install section.

### 9.2 Section blueprints

#### Hero — inform

| | |
|---|---|
| **Job** | Say what it is and create one memorable image. |
| **Key message** | "Your mockup is a picture. Ship the system inside it." |
| **Content** | Harness line, headline, lede, a copyable install block, two CTAs, a metadata strip (MIT · by Justin Rich · View source · works in six agents), framework list, and Fig. 1 (the mockup separating into five layers) with an "Assemble / Separate" toggle. |
| **Install block** | The two Claude Code commands with a copy button, plus one line: "Using Codex, Cursor, Grok, OpenCode, or Pi? See every install option." If T17 proves `npx skills add hackerpug-ai/pixel-perfect` works, that single command replaces the two lines, because it covers every harness at once. |
| **Proof** | Fig. 1 shows the mechanism. |
| **CTAs** | Primary: copy the install command. Secondary: "See how it works". |
| **Why** | The figure explains decomposition faster than any sentence. A visitor who reads only the hero should be able to say what the product does, and install it without scrolling. |

#### Why — persuade

| | |
|---|---|
| **Job** | Make the visitor recognize their own problem, then reframe it. |
| **Key message** | "Designs die in translation." |
| **Content** | Two short paragraphs; the approved card next to the drifted card with four numbered proofreader marks; the notes for each mark; the **field note** (§11); the pivot line; your four principles (§7.3). |
| **Proof** | The drifted card (labeled "Example"); the field note (real); zeroheight figures if you approve D7. |
| **CTA** | None. Scrolling is the action. |
| **Why** | Every visitor has tried the free alternative. Showing its failure in their own terms does more than any feature list. |

#### How it works — show

| | |
|---|---|
| **Job** | Prove it's four commands, and show real output at each step. |
| **Key message** | "From mockup to system in four commands." |
| **Content** | Steps 1 to 4 (`init`, `scaffold`, `build`, `status`), each next to its output: manifest, sandbox, inventory, status report. Each step shows an example prompt, such as `/pixel-perfect:init my designs are in design/deck.html`. A 60 to 90 second demo recording. "After the first build": `refine`, `evolve`, `add-platform`, `wireframe`. |
| **Proof** | Real output from the dogfood build (§11), replacing the concept's example output. |
| **CTA** | "Install pixel-perfect" at the end of the section. |
| **Why** | Showing real output answers "does it actually do this?" better than claiming it. |

#### Install — educate

| | |
|---|---|
| **Job** | Get the visitor from interest to a working install in under a minute. |
| **Key message** | "Install it in your agent." |
| **Content** | Six harness tabs, exact commands with copy buttons, a "Then run" next step, per-harness warnings (Cursor symlinks, Codex duplicate installs), a stability note, a "View source" link, security scan results, and a short "What it touches" list: what it reads, writes, and runs. |
| **Proof** | Commands that work. After blockers B1 and B2 are fixed, a CI check keeps them working (§16, T2). Scan results from the directories (T18). |
| **CTA** | Copy. After copying, show: "Next: open a project that has your design and run `/pixel-perfect:init`." |
| **Why** | This is the conversion. Every broken command here is a lost user and a public complaint. |

#### FAQ — new

| | |
|---|---|
| **Job** | Answer objections (§7.4) in one place and give AI answer engines clean answers. |
| **Content** | Six to eight questions. The first is "Why not just prompt my agent?". Each answer starts with the answer, in one or two sentences. |
| **Why** | Skeptics look for this section. AI search tools also quote well-structured question-and-answer blocks. This practice is called answer engine optimization (AEO). |

#### Close

| | |
|---|---|
| **Job** | One last call to action. |
| **Content** | "Your next mockup has a system inside it." Install button and GitHub link. |

### 9.3 Changes from the concept

1. Move "How it works" above "Install".
2. Add the FAQ section.
3. Add the field note to "Why".
4. Label the drifted card and the status output "Example" until real output replaces them.
5. Replace the "Harbor" demo with frames and output from the dogfood build.
6. Add a demo recording slot to "How it works".
7. Add a stability note to "Install".
8. Remember the visitor's chosen harness tab in their browser, and support direct links such as `#install-codex` so each directory listing can link to its own harness.
9. Add page metadata: title, description, social preview image, and structured data (§16, T9).
10. Fix the install commands (blockers B1 and B2).
11. Put a copyable install block in the hero, plus a metadata strip under it (§8.2, patterns 1 and 3).
12. Add example prompts to each step in "How it works" (pattern 4).
13. Add security scan results, a "View source" link, and a "What it touches" list to "Install" (patterns 5 to 7).
14. Rename the four principle cards to your four principles (§7.3).
15. Switch section labels and buttons to sentence case (§8.4).

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

Three more reasons:

- **It demos in one image.** Fig. 1 shows the whole product in a few seconds.
- **It's distinctive.** Most AI tool pages look the same: dark background, gradient, terminal window. This looks like nothing else in the space.
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

**The mark.** A registration target with one magenta pixel at its center: "one pixel, registered". We recommend adopting it as the logo and retiring the amber banner (decision D5).

### 10.5 Standards

- **Accessibility:** meet WCAG 2.2 AA (Web Content Accessibility Guidelines) contrast. Tabs follow the keyboard pattern for tab lists. The figure has a text caption. No content depends on animation.
- **Performance:** a static page with no framework script required to read it. Largest Contentful Paint (LCP) under 2.5 seconds, Google's "good" threshold. Limit font weights to those actually used.
- **Both themes:** designed deliberately, not inverted.

---

## 11. Proof strategy: earning trust from zero

The page cannot borrow credibility. It has to show it. In order of impact:

1. **Build the site with pixel-perfect (dogfooding).** Use the concept as the design reference. Run `init`, `scaffold`, and `build`. Publish the site's own `inventory.json` and sandbox at `/sandbox`. Then say: "This page was built with pixel-perfect. Here's its inventory. Here's its sandbox." This is the strongest proof available, and it costs little extra because the site has to be built anyway. It also replaces the invented "Harbor" demo with real output.
2. **Publish the field note.** `INVENTORY-CONTRACT.md` records a real failure (E9): deriving components from the spec found 8 molecules where the designs held 13. It missed the mobile tab bar entirely. It took four user interventions and two recovery passes of about 900K tokens each. This is why pixel-perfect reads every frame first. A true, specific, slightly embarrassing story persuades more than any claim (decision D6).
3. **Record a demo.** A 60 to 90 second screen recording: `init`, then `build`, then the sandbox, on the site's own design. Real commands, no edited output.
4. **Show real before-and-after comparisons** once early users share projects.
5. **Add social proof only when it's real.** Show the star count once it helps rather than hurts (our judgment: around 100 stars). Show directory install counts. Quote real users with their permission.
6. **Make transparency visible.** Link the changelog, the MIT license, and the integration tests. The release process already tests a real packed Pi install (E1).
7. **Show third-party security results.** The Anthropic directory scans every submission. skills.sh shows Snyk, Socket, and Gen Agent Trust Hub results. Skills Directory grades A to F. Put real results beside the install commands, next to a plain list of what pixel-perfect reads, writes, and runs. This is borrowed credibility we can earn before we have a single user.

---

## 12. Conversion design

**Primary conversion:** copying an install command. We treat it as a stand-in for installing, because installs themselves happen outside the page.

**Secondary conversions:** visiting the GitHub repository, starring it, opening the upgrade guides.

**Reducing friction:**

- Exact commands with copy buttons, and a fallback that selects the text when the clipboard is blocked.
- A "Then run" line after every install, so the next step is never a guess.
- Per-harness warnings where people actually get stuck (Cursor fails on symlinks; Codex breaks with two installs).
- The chosen tab remembered on return visits.
- Direct links for each harness (`#install-cursor`), so directory listings land on the right tab.
- **Default tab: Claude Code.** We can't detect which harness a visitor uses. Claude Code is where the plugin started, and it has the largest skills audience. That second point is our judgment.

**One primary action, one style.** In the hero, the primary action is the copyable install block itself (§8.2, pattern 1). After "How it works" and in the close, it's the dark "Install pixel-perfect" button that jumps to the install tabs. Everything else is secondary.

---

## 13. Launch and distribution

### 13.1 Before launch

1. Fix blockers B1 and B2. Test every install command on a clean machine.
2. Complete the dogfood build, the demo recording, and the social preview image.
3. Set the repository's homepage to the site. Update the README banner and link to the site.
4. File directory submissions early. Some need review time.

### 13.2 Channels

The directory-by-directory detail is in §8.5. This table adds the channels that aren't directories.

| Channel | Why | Action | Evidence |
|---|---|---|---|
| Claude Code self-hosted marketplace | Already works. No approval needed. | Keep `/plugin marketplace add hackerpug-ai/pixel-perfect` as the primary command. | B §5 |
| Anthropic plugin directory | The official listing (340 plugins). Its scan result doubles as a trust signal. | Validate, then submit at claude.ai/directory/manage (§8.5). | B §5, §8 |
| Cursor marketplace | Official Cursor listing. | Submit the public repository at cursor.com/marketplace/publish. The manifests are already submission-ready (E2). | B §5 |
| Codex plugin directory | Official Codex listing. | Submit through OpenAI's portal. Self-serve status is **UNVERIFIED**; check before planning around it. | B §5 |
| skills.sh | The largest cross-harness skills directory. Listing happens automatically from installs. | Only after T17 proves `npx skills add` works. Then add the skills.sh badge to the README. | B §5, §8 |
| Skills Directory | Security grade A to F. | Submit with GitHub sign-in. | B §8 |
| Awesome lists | Curated and trusted, but gated on real usage. | After launch, you submit pull requests to VoltAgent/awesome-agent-skills, ComposioHQ/awesome-claude-skills, hesreallyhim/awesome-claude-code, rohitg00/awesome-claude-design, and awesome-opencode. Drafts are in §8.5. | B §5, §8 |
| Hacker News, "Show HN" | Show HN posts for Claude Code skills recur through 2026. | One post on launch day. | B §5 |
| Reddit | r/ClaudeAI (about 1.1M members), r/ClaudeCode (about 395K), r/cursor (about 144K). Counts come from a third-party stats site. | One tailored post per community. Follow each community's self-promotion rules. | B §5 |
| X (Twitter) | Where AI tools announce. | A short thread with Fig. 1 as a video. | UNVERIFIED |

### 13.3 Sequence

| When | What |
|---|---|
| Weeks −2 to 0 | Blockers, dogfood build, demo, social image, security scans, and submissions to the Anthropic directory, Cursor marketplace, and Skills Directory. |
| Launch day (a Tuesday to Thursday, our judgment) | Show HN post; Reddit posts; X thread. Reply to every comment the same day. |
| Weeks +1 to +4 | Awesome-list pull requests, submitted by you, once there's real usage to point to. A long-form post built on the field note. Fast replies to issues. Ask early users for quotes. |
| Day +30 | Measurement review (§14). |

**Suggested Show HN title:** "Show HN: pixel-perfect – turn a mockup into a verified component system with your coding agent."

### 13.4 Story hooks

These are angles for posts, not page copy.

- "The mobile tab bar nobody named" (the field note).
- "The fourth copy of the card" (the drift problem).
- "A Storybook for Ratatui" (the native and terminal wedge).
- "Your mockup is a picture" (the core line).

---

## 14. Measurement

**Principle:** measure what the page is for, which is installs. Use privacy-friendly, cookieless analytics (for example Plausible or GoatCounter) so no consent banner is needed. The final tool is decision D8.

**Events to track:**

| Event | Properties | Question it answers |
|---|---|---|
| `install_copy` | harness | Which harnesses matter, and does the install section convert? |
| `cta_click` | location (hero, how-it-works, close) | Which call to action works? |
| `tab_select` | harness | What do people look for before copying? |
| `fig_toggle` | state | Does the figure hold attention? |
| `outbound_github` | location | Does the page drive repository traffic? |

**Starting point:** 0 GitHub views and 9 clones in the last 14 days, 0 stars, and an unpublished npm package (E3, E4, E7).

**Targets:** we won't invent benchmarks. The first 14 days after launch set the baseline. After that, set each target as the baseline plus a stated improvement, and review monthly.

**Qualitative checks before launch:**

- **Five-second test** with five developers who've never seen the product. Pass: at least four of five can say what it does after five seconds on the hero.
- **First-contact install test:** one person per harness installs from the page on their own machine, as it is. Pass: every harness succeeds without help.

---

## 15. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Install commands fail | Certain today | High | Fix B1 and B2. Add a CI check that runs every documented install command on each release (T2). |
| R2 | Zero social proof | Certain | High | Dogfood build, field note, demo recording (§11). |
| R3 | Breaking-release cadence scares adopters | High | Medium | Stability note on the page; upgrade guides; decision D10 on a release policy. |
| R4 | Page claims drift from the product | High | Medium | Keep page facts traceable to the README; add a page review to the release checklist. |
| R5 | The metaphor confuses | Low | Medium | Copy never depends on it; the five-second test catches it. |
| R6 | Example content read as real | Medium | Medium | Label it "Example"; replace it with dogfood output. |
| R7 | Animation hurts performance or accessibility | Low | Medium | CSS only; reduced-motion support; test on a low-end phone. |
| R8 | Marketplace rules change | Medium | Low | The site and repository are canonical; directories are extra reach. |
| R9 | A platform adds post-handoff maintenance | Medium | High | Hold the ground platforms can't: your repository, your framework, any agent, open source. Move fast. |
| R10 | Gates read as slow, which contradicts "rapid iteration" | Medium | Medium | Always pair a gate with the speed it buys (§7.3). Test the wording in the five-second test. |
| R11 | Official vendor skills (OpenAI, Google Labs, Figma) crowd the "design to code" shelf | High | Medium | Don't compete on "screen fidelity". Compete on "a system, not a screen": composability and maintenance. |
| R12 | Curated lists refuse a new skill | High | Low | Submit after launch, with usage to point to. You submit, not an agent. |
| R13 | A security scan flags something | Low | High | Scan before launch (T18). Fix findings before listing. |
| R14 | `npx skills add` installs broken skill folders | Medium | Medium | Don't advertise it until T17 passes on a clean machine. |

---

## 16. Implementation plan

Each item below is one task. Approval of this document lets them go straight into the task list. Agents are from `~/Projects/brain/agents/`.

| # | Task | Scope | Acceptance criteria | Depends on | Agent |
|---|---|---|---|---|---|
| T1 | Fix the broken install paths | Release process; `plugin-release.json`; npm publish of `plugins/pixel-perfect` | AC-1: tag `v9.1.0` exists on GitHub. AC-2: `npm view @hackerpug-ai/pixel-perfect version` returns `9.1.0`. AC-3: all six install paths complete on a clean machine. | — | `devops-engineer`, then `pi-package-reviewer` for the npm package |
| T2 | Add an install smoke test to CI | `.github/workflows/` | AC-1: on each release tag, CI runs every install command shown on the site in a clean container. AC-2: a failing command fails the release. | T1 | `ghactions-planner` → `ghactions-implementer` → `ghactions-reviewer` |
| T3 | Write the copy deck | `.spec/prds/landing/copy.md` | AC-1: final copy for every section in §9. AC-2: every claim traces to Appendix A or B. AC-3: passes style review. | D1, D6, D7 | `marketing-copywriter` → `marketing-creative-director` + `techwriting-reviewer` |
| T4 | Produce brand assets | `design/brand/` | AC-1: SVG mark, favicon, 1200×630 social image, README banner. AC-2: each asset reads in light and dark contexts. | D5 | `frontend-designer` |
| T5 | Set up the site project | New site folder; framework per D3 | AC-1: static build output. AC-2: pixel-perfect `init` completes with `design/concepts/pixel-perfect.html` recorded as a reference. | D2, D3 | `sveltekit-planner` (if D3 = SvelteKit) |
| T6 | Build the site with pixel-perfect | Site folder | AC-1: `design/inventory.json` accounts for every frame of the concept. AC-2: every gate passes. AC-3: the sandbox runs. AC-4: `/pixel-perfect:status` reports no catalog drift. | T3, T4, T5 | `sveltekit-implementer` + `frontend-designer` → `sveltekit-reviewer` |
| T7 | Publish the proof artifacts | `/sandbox` route; `/inventory.json` | AC-1: both reachable on the deployed site. AC-2: both linked from "How it works". | T6 | `sveltekit-implementer` |
| T8 | Record the demo | 60 to 90 second video plus poster frame | AC-1: shows real `init`, `build`, and sandbox output with no edited results. AC-2: under 8 MB, captioned. | T6 | No clean fit. Use the general `claude` agent with `cmux-cua` screen recording. |
| T9 | Search and answer-engine readiness | Page metadata, structured data, FAQ, `llms.txt` | AC-1: title, description, and social tags present. AC-2: `SoftwareApplication` structured data validates. AC-3: FAQ answers lead with the answer. AC-4: `/llms.txt` describes the product and links install and docs. | T3, T6 | `marketing-seo-specialist` + `marketing-aeo-specialist` |
| T10 | Analytics and events | Site | AC-1: cookieless analytics live. AC-2: the five events in §14 fire, confirmed on the deployed site. | T6, D8 | `sveltekit-implementer` |
| T11 | Deployment pipeline | GitHub Actions → GitHub Pages | AC-1: pushing to `main` deploys. AC-2: HTTPS on the chosen domain. | T5, D4 | `ghactions-implementer` → `ghactions-reviewer` |
| T12 | Update the README and repository | `README.md`; repository settings | AC-1: repository homepage is the site. AC-2: README uses the new banner and links the site. AC-3: README install commands match the site. | T4, T11 | `techwriting-implementer` → `techwriting-reviewer` |
| T13 | Prepare and file directory submissions | `.spec/prds/landing/distribution.md` | AC-1: each directory in §8.5 is submitted or marked not applicable, with links recorded. AC-2: awesome-list entries drafted in each list's format for you to submit after launch. | T1, T11, T18 | `marketing-campaign-manager` |
| T14 | Run the pre-launch user tests | Deployed site | AC-1: five-second test passes (4 of 5). AC-2: first-contact install passes on every harness. | T6, T1 | `product-explorer` |
| T15 | Launch | Show HN, Reddit, X | AC-1: you approve every post before it goes out. AC-2: posts published and links logged. | T8, T13, T14, D9 | `marketing-social-manager` + `marketing-copywriter` |
| T16 | 30-day review | `.spec/prds/landing/review-30d.md` | AC-1: baseline metrics, what worked, next three tests. | T15 | `marketing-campaign-manager` |
| T17 | Test the one-line `npx skills add` install | Plugin layout; `.claude-plugin/marketplace.json` | AC-1: on a clean machine, `npx skills add hackerpug-ai/pixel-perfect` installs skills that can reach the shared `workflows/` files. AC-2: `/pixel-perfect:status` runs from that install. AC-3: if either fails, record why and keep it off the page. | T1, D12 | `pi-package-implementer` → `pi-package-reviewer` |
| T18 | Security scan and "what it touches" list | Plugin; `.spec/prds/landing/boundaries.md` | AC-1: `claude plugin validate` passes. AC-2: a list of every file pixel-perfect reads, writes, and runs (including headless Chrome), checked against the code. AC-3: any scan findings fixed before listing. | T1 | `security-reviewer` → `code-reviewer` |

**Parallel waves:**

- **Wave 1:** T1, T3, T4, T5
- **Wave 2:** T2, T6, T11, T17, T18
- **Wave 3:** T7, T8, T9, T10, T12
- **Wave 4:** T13, T14
- **Wave 5:** T15, then T16

---

## 17. Decisions we need from you

| # | Decision | Our recommendation | Why |
|---|---|---|---|
| D1 | Put "How it works" before "Install"? | **Yes** | Visitors install after they see it work. Installers still jump straight there from the hero. |
| D2 | Build the production site with pixel-perfect? | **Yes** | Strongest possible proof. Replaces invented demo content. |
| D3 | Site framework | **SvelteKit with static output** | pixel-perfect's SvelteKit adapter is marked stable (E14), and static output hosts free on GitHub Pages. Vite with React is the alternative. |
| D4 | Hosting and domain | **GitHub Pages, custom domain of your choice** | Free, and it lives next to the code. The GitHub subdomain works as a fallback. |
| D5 | Adopt the registration-target mark and retire the amber banner? | **Yes** | It matches the new direction, and you said the current iconography is not fixed. |
| D6 | Publish the field note (8 vs 13 molecules)? | **Yes** | True, specific, and it explains the product's core design choice. |
| D7 | Cite the zeroheight survey figures? | **Yes, with the sample size** | Real third-party data. A sample of 147 is small, so say so. |
| D8 | Analytics tool | **A cookieless tool** | No consent banner; enough to measure installs. |
| D9 | Launch timing | **After T14 passes** | Launching with broken installs wastes the one launch you get. |
| D10 | A stability commitment on the page | **State the policy you'll keep** — for example, "breaking changes only in major releases, each with an upgrade guide" | Four breaking majors in five months is the biggest adoption risk. The page should state a policy, and the product should keep it. |
| D11 | Use your four guiding principles as the page's pillars, in your words? | **Yes** | They're the product's real beliefs, and each one can be checked against the code (§7.3). |
| D12 | Make `npx skills add` a supported install path? | **Yes, if T17 passes** | One command for every harness, and automatic listing on skills.sh. Today's folder layout may break it. |

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
- Skills Directory: https://skillsdirectory.com ; submit: https://skillsdirectory.com/submit ; methodology: https://skillsdirectory.com/security/methodology
- Agensi (vendor-authored, biased): https://www.agensi.io/ ; https://www.agensi.io/learn/best-ai-agent-skills-marketplaces-2026
- Figma AI skills: https://www.figma.com/community/ai-skills ; contribution rules: https://github.com/figma/community-resources/blob/main/CONTRIBUTING.md
- TypeUI: https://typeui.sh/design-skills ; https://github.com/bergside/typeui ; https://github.com/bergside/awesome-design-skills
- UI Skills: https://ui-skills.com ; https://github.com/ibelick/ui-skills
- Awesome lists: https://github.com/travisvn/awesome-claude-skills (and its CONTRIBUTING.md) ; https://github.com/VoltAgent/awesome-agent-skills (and its CONTRIBUTING.md) ; https://github.com/ComposioHQ/awesome-claude-skills

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
| JTBD | Jobs to Be Done: describing a product by the job a customer hires it for. |
| CTA | Call to action. |
| LCP | Largest Contentful Paint: how long the main content takes to appear. |
| WCAG | Web Content Accessibility Guidelines. |
