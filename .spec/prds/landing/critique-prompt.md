# Prompt: critique the pixel-perfect landing page strategy

> **How to use this file:** fill in "Owner's notes and feedback" at the bottom, then hand the whole file to an agent as its prompt. The agent reads your notes first.

---

## Your role

You are a digital marketing strategist who specializes in AI agent tools: agent skills, coding-agent plugins, MCP servers, and developer tools sold through marketplaces and directories. You have launched developer tools on Hacker News, Reddit, and plugin marketplaces. You know what converts developers and what makes them close a tab.

You've been hired to give a second opinion. Another consultant wrote a landing page strategy and built a design concept for an open-source product called **pixel-perfect**. Your job is to find what's wrong with it, what's missing, and what should change before anyone builds the real site.

**Be adversarial and useful.** Don't rubber-stamp. If you agree with everything, you haven't looked hard enough. Name the three weakest decisions in the strategy, even if they're only moderately weak. Every criticism must come with a specific fix.

## Before you start

1. **Read "Owner's notes and feedback" at the end of this file first.** The owner's notes override anything else in this prompt. If a note asks a question, answer it directly in your report.
2. Today's date is 2026-09-29. The market moves monthly, so check anything that matters against live sources.

## The product in brief

pixel-perfect is an open-source (MIT) agent skill. It runs inside Claude Code, Codex, Cursor, Grok, OpenCode, and Pi. You give it a high-fidelity design: a Claude Design deck, an HTML export, a URL, a screenshot, or wireframes. The agent then:

1. Renders every frame and reads each one once.
2. Writes an inventory of what to build: tokens, atoms, molecules, organisms, and screens.
3. Builds each layer as real code in the user's framework, and checks it against the design (a "gate") before starting the next layer.
4. Generates a native component sandbox in that framework. Storybook is optional.

**The owner's four guiding principles:**

- Consistency through composability.
- Make it real: skip needless abstractions and ship straight to production.
- Rapid iteration: all UI should be easy to extend or change.
- Language agnostic: works on any UI system. Storybook can be used but isn't required.

**Where it stands:** version 9.1.0, public since January 2026, 0 GitHub stars, no users to quote, and four breaking major releases in five months. The strategy already knows about two broken install paths (a missing `v9.1.0` git tag and an unpublished npm package). Check whether they're fixed, but don't report them as new findings.

## What to read

All paths are in the repository at `/Users/justinrich/Projects/pixel-perfect/`.

| File | What it is | Read it |
|---|---|---|
| `.spec/prds/landing/strategy.md` | The strategy under review, about 11,000 words | All of it |
| `design/concepts/pixel-perfect.html` | The design concept, as one HTML page | Render it (see below) |
| `README.md` | The product's own description | Skim, to check the strategy's claims |
| `plugins/pixel-perfect/docs/INVENTORY-CONTRACT.md` | Source of the "field note" the strategy plans to publish | The "Why one read" section |

**To see the concept, render it. Don't just read the code.** Open it in a real browser, or take headless Chrome screenshots at 1440 px and 390 px wide, in light and dark mode. Wait about four seconds so the load animations finish: the headline's color plates line up, then the mockup tilts and separates into five layers. Judge what a visitor sees.

## The industry trends to test against

The strategy's **§8, "What the leading skill pages taught us"**, summarizes a study of eight skill directories and landing pages, all read live on 2026-09-29:

- The Claude plugin marketplace, and frontend-design's listing there
- The github.com/anthropics/skills README
- skills.sh
- Figma AI skills
- TypeUI design skills
- ui-skills.com
- The awesome-lists: VoltAgent, travisvn, ComposioHQ
- Skills Directory and Agensi

The sources are in **Appendix B, §8**. In short, the study found:

- **What leading pages do:**
  - A copyable install command in the first screen.
  - A plain definition sentence before any slogan.
  - A metadata strip: author, license, source, supported agents, and counts once they're real.
  - Example prompts in the "how to use" section.
  - Security audit results near the install command, and a "what it touches" list.
  - The full skill file visible before install.
  - A live visual preview, for visual tools.
  - A FAQ that answers "why not just prompt?".
  - `llms.txt` and README badges, so agents can find the page.
- **What to avoid:** vanity counters and counts that disagree between pages, self-ranking comparison tables, a hero with no action, text-only pages for visual tools, and paid or sponsor framing.
- **How listing works:**
  - skills.sh lists skills automatically from `npx skills add` installs.
  - The Anthropic directory scans and reviews submissions.
  - Curated lists refuse brand-new skills and pull requests submitted by an AI.

**Your job with these trends:**

1. Confirm or refute each one against live pages.
2. Find up to five important trends the study missed. Look at the top skill and plugin landing pages you know from 2026, and cite each.
3. Judge whether the strategy and concept actually apply the trends, or only mention them.

## What to critique

Cover every area. Spend your effort where the risk is highest.

1. **Positioning and category.**
   - Is "the step after the generator" the right position?
   - Is "agent skill that turns mockups into a component system" the right category?
   - Are the competitors right? Look especially at the official OpenAI, Google Labs, and Figma design-to-code skills.
2. **Audience.** Is "AI-native builders" the right primary segment? Is anyone important missing, or ranked wrong?
3. **Messaging.**
   - Does the headline, "Your mockup is a picture. Ship the system inside it.", work for a developer who gives it two seconds?
   - Do the four principles work as the page's pillars?
   - Does the voice fit this audience?
   - Offer at most three alternative headlines, and only ones you'd bet beat the current one. Say why.
4. **Page architecture and conversion.**
   - Section order.
   - The hero install block.
   - Calls to action.
   - The FAQ.
   - The primary conversion metric ("copied an install command").
5. **Creative direction.**
   - The "press proof" concept: print separations, registration, crop marks, CMYK colors. Is it distinctive, or too clever?
   - Does it read as AI-generated anywhere?
   - Does the animation help or get in the way?
6. **Proof with zero stars.**
   - Building the site with pixel-perfect itself.
   - Publishing the field note.
   - The demo recording.
   - Security scan results.
   - What's missing?
7. **Distribution and launch.**
   - Channels, and their order.
   - The Show HN title.
   - The Reddit approach.
   - The directory plan.
   - What would you do in the first 30 days with no budget?
8. **Measurement.** Are these the right events and checks? What would you watch in week one?
9. **Risks.** What will embarrass the owner at launch that the strategy didn't catch?
10. **Scope for one maintainer.**
    - The plan has 18 tasks. What would you cut, merge, or defer?
    - What's the smallest launch that still works?

## Rules

- **Check, don't recall.** Verify anything about a competitor, directory, or trend against a live page, and cite its URL. Mark anything you couldn't verify as **UNVERIFIED**.
- **Label judgment.** When a point is your opinion rather than a fact, say so.
- **No invented numbers.** Don't quote conversion benchmarks or statistics you can't source.
- **Be specific.** "The hero is weak" is not a finding. "The hero never says it works with Codex until the third line, so Codex users bounce" is.
- **Write plainly.** Short sentences, active voice, no jargon without a definition.
- **Stay read-only.** Don't edit the strategy, the concept, or any other file. Write only your report.

## What to deliver

Write your report to `.spec/prds/landing/critique.md` with these sections, in this order:

1. **Verdict.** Three sentences: ship as is, revise, or rethink, and why.
2. **Keep.** Up to five things the strategy gets right and should not lose.
3. **Findings.** A table sorted by severity.

   | # | Area | Finding | Severity | Evidence | Recommended change | Confidence |
   |---|---|---|---|---|---|---|

   - Severity is **critical** (will hurt the launch), **major** (costs real conversions or credibility), or **minor**.
   - Evidence is a URL, a strategy section number, or a screenshot you took.
4. **The three weakest decisions.** For each: what the strategy decided, why it's weak, and what to do instead.
5. **Trend check.** For each trend in §8, mark it confirmed, refuted, or outdated, with a source. Then list up to five missed trends, with sources and what pixel-perfect should do about each.
6. **Headline alternatives.** At most three, or "none beat the current one".
7. **Top five changes, in priority order.** Each is one sentence the owner can act on.
8. **Response to the owner's notes.** Answer each note directly.
9. **Questions for the owner.** Only questions whose answers would change your advice.

Keep the report under about 3,000 words. Findings matter more than prose.

---

## Owner's notes and feedback (read these first)

> Replace the prompts below with your own thoughts. Delete any you don't use. These notes take priority over everything above.

**What I think of the strategy so far:**



**What I've already decided (don't argue with these):**



**What I'm unsure about and want you to push hardest on:**



**Anything off-limits or out of scope:**



**Other notes:**



