---
title: pixel-perfect landing page strategy: second-opinion critique
reviews: .spec/prds/landing/strategy.md, design/concepts/pixel-perfect.html
date: 2026-09-29
method: Live web reads on 2026-09-29, `gh api` star counts, the repository's own workflows, and headless Chrome renders of the concept at 1440 px and 390 px in light and dark themes, captured about 4.5 seconds after load
---

# Critique of the pixel-perfect landing page strategy

## 1. Verdict

**Revise before building.** The research, the proof plan, and the install mechanics are sound. The strategy has two central problems. It sells a one-time conversion ("mockup to system in four commands"), when the product's lasting value is that the system keeps growing. That growth is also its clearest edge over rivals. Second, the strategy says pixel-perfect has no direct competitor, yet three design skills in the same shelf have 72K to 132K GitHub stars. Fix the story, the competitor map, and the Show HN plan first. Nothing else needs a rethink.

The two known blockers are **still open** as of 2026-09-29. `git ls-remote` shows `v9.0.0` as the latest tag, and `npm view @hackerpug-ai/pixel-perfect` returns 404.

## 2. Keep

1. **Proof from zero (§11).** Build the site with pixel-perfect, then publish its inventory and sandbox. This is the strongest idea in the document.
2. **Blockers first, then an install smoke test in CI (B1, B2, T2).** A broken command on launch day costs more than any copy change.
3. **Honesty rules.** The strategy labels examples, refuses to invent numbers, marks gaps UNVERIFIED, and drops the unsourced "91%" statistic. HN readers reward this.
4. **The drifted-card "why" section.** Numbered marks with measurable deltas make the failure concrete. Keep the device, but redraw the card (see F8).
5. **The four principles as pillars (§7.3)**, including the rule that every mention of a gate names the speed it buys.

## 3. Findings

| # | Area | Finding | Severity | Evidence | Recommended change | Confidence |
|---|---|---|---|---|---|---|
| F1 | Positioning | The story ends at the first build. The strategy names `evolve` twice, both times as upkeep. The concept gives evolve, refine, add-platform, and wireframe one line each under a small "Keep the system alive" heading, with no example. Yet evolve is the answer to the page's own problem: the second screen that drifts. | Critical | strategy §5.4, §7.1, §7.3, §9.2; concept render at 1440 px (bottom of "Use"); `workflows/evolve.md` | Tell the story in two acts: build the system, then grow it. Give evolve its own section with a real evolve digest from the dogfood project. See §8. | High |
| F2 | Competitors | §4.3 says "no direct competitor found; the nearest ones have 0 to 4 stars," and §4.5 claims a position "nobody holds." Live data refutes both. impeccable (72.5K stars) promises to "build from scratch, improve what you have, and stay true to your design system." open-design (98.7K) has an agent "refactor your real components to the brand spec." ui-ux-pro-max (131.6K) owns the "design skill" shelf. Stitch's `react-components` "syncs/updates existing React components to align with the latest Stitch designs." HN's first reply will name one of these. | Critical | github.com/pbakaus/impeccable; impeccable.style; github.com/nexu-io/open-design; github.com/google-labs-code/stitch-skills; stars from `gh api`, 2026-09-29 | Rewrite §4.3 and §4.5 to name them fairly. Narrow the unique claim to what the code proves: an inventory from every frame, gates on each layer, inventory changes proved by capture (absorb, promote, sweep), and native sandboxes outside the web. Add the FAQ entry "How is this different from impeccable, open-design, or Stitch skills?" | High |
| F3 | Launch | The suggested Show HN title is 94 characters. HN caps titles at 80. The Show HN rules also say "Don't post landing pages." HN has restricted Show HN posts from new accounts since March 2026 because of an influx of AI-built projects. | Critical | strategy §13.3; news.ycombinator.com/showhn.html; news.ycombinator.com/item?id=47300772 and ?id=48391260; ?id=40677110 (80-character limit) | Keep the title at 80 characters or fewer, and lead with a concrete result. Link the repository, with the demo at the top of the README, not the landing page. Post from an established account, and check the restriction status the week before launch. | High (length, rules); Medium (current restriction) |
| F4 | Competitors | Claude Code itself documents `/design` for importing a Claude Design design into your codebase. Claude Design also "builds a design system for your team by reading your codebase and design files." The platform owner is moving into the handoff. The strategy lists it only as an upstream generator. | Major | support.claude.com/en/articles/14604416; anthropic.com/news/claude-design-anthropic-labs | Add "vs. `/design` handoff" to the FAQ. Test what `/design` produces in a repo before claiming a difference (repo-side depth is UNVERIFIED). | Medium |
| F5 | Audience | `build` supports **brownfield** projects: it "runs the delta per level and proposes only what is missing or changed." The strategy never mentions this. Every segment and every line of copy assumes a fresh mockup, but the design-engineer segment's trigger (an AI pull request invents a fifth button style) is a brownfield problem. | Major | `workflows/build.md:229`; strategy §5.1 | If brownfield works on apps pixel-perfect didn't scaffold, add an "Already have an app?" path and an FAQ entry. If it doesn't, say so. See Q1. | Medium |
| F6 | Messaging | The hero and lede tie the product to "a high-fidelity mockup." The product also takes wireframes, PRDs (through `wireframe`), and plain sentences (`evolve "add a settings screen with profile and billing tabs"`). A builder partway through a project, with no fresh mockup, reads the hero as "not for me." | Major | concept hero; `workflows/evolve.md` Usage | Name the growth path in the lede, for example "…then grows it: new screens, from a mock or a sentence, reuse the parts you have." See §6 for headlines. | Medium (judgment) |
| F7 | Messaging | pixel-perfect **generates and lints a standard `DESIGN.md`** with Google's `@google/design.md` CLI. That is the file Stitch exports and impeccable reads ("DESIGN.md loaded / Existing system preserved"). The strategy mentions DESIGN.md only as a Stitch feature. | Major | `plugins/pixel-perfect/scripts/design-md.mjs`; impeccable.style; strategy §4.1 | Say it on the page: "Writes a standard DESIGN.md your other design tools can read." This makes the big design skills complements, not rivals. | High (capability); Medium (value) |
| F8 | Creative | The "why" card is an "Invite your team" card with pending-invite avatars and numbered issue marks. impeccable.style's refine demo shows an invite-your-team card with three numbered issues, including "Pending invitations look like active teammates." Visitors who know a 72.5K-star skill will read the concept as borrowed. | Major | concept "Why" section; impeccable.style | Redraw it with a card from the dogfood build, such as a real component from this landing page. | Medium |
| F9 | Page | At 1440×900, the headline fills about 60% of the first screen. The install button sits at the bottom edge, and the secondary CTA falls below the fold. At 390 px, Fig. 1 sits entirely below the fold, the layer names shrink to "01–05," and the plate contents can't be read. The planned hero install block has no room. | Major | screenshots: 1440 light/dark fold, 390 light fold | Cut display type by about a quarter and put the copyable command above the fold. On mobile, replace the isometric figure with a two-state image (mock, then sandbox) with legible names. | High |
| F10 | Proof | The token FAQ (§7.4) answers "how many tokens?" with two ~900K-token recovery passes. That tells a skeptic the tool is expensive, and it gives no number for a normal run. | Major | strategy §7.4, §11.2; INVENTORY-CONTRACT "Why one read" | Measure the dogfood run: tokens, minutes, frames, gates, and components. Publish those numbers and lead the FAQ with them. Keep the 900K story as the reason for the design choice, not as the cost answer. | High |
| F11 | Distribution | The GitHub description still reads "Claude Code plugin that builds token-governed design systems…". Directories and HN visitors see it first, and it contradicts "six agents." | Major | `gh api repos/hackerpug-ai/pixel-perfect` | Update the description and topics in T12 before any submission. | High |
| F12 | Scope | 18 tasks in five waves, with the whole site rebuild on the launch's critical path, is heavy for one maintainer. Brand assets, analytics, 30-day review, and SEO/AEO work all gate or precede launch. | Major | strategy §16 | Launch on the smallest set (see weakest decision 3). | Medium (judgment) |
| F13 | Measurement | `install_copy` measures intent, not installs. The plan ignores the sources that do count installs: the Anthropic directory's Usage tab (installs and error rates), skills.sh counts, and GitHub unique cloners. | Minor | claude.com/docs/directory/publish; strategy §14 | Week one: watch unique cloners each day, directory installs and errors, new issues, and the top objection in HN and Reddit comments. Use the copy events only to compare CTAs. | Medium |
| F14 | Distribution | The strategy marks the Anthropic directory's paid-plan rule UNVERIFIED. It is confirmed: "Pro, Max, Team, or Enterprise. Free accounts can't submit." Codex now has a self-serve submission flow (org verification; `displayName` ≤ 30 characters). The strategy says it's UNVERIFIED. Cursor reviews every plugin by hand, and one tracker shows an 8-day median and 40-day outliers, from only 9 submissions. | Minor | claude.com/docs/plugins/submit; developers.openai.com/plugins/deploy/submission; reviewtimes.fyi (thin data) | File Cursor and Codex in week −4, not −2. Confirm plan and org verification now. | High / Medium |
| F15 | Distribution | ComposioHQ/awesome-claude-skills (75.9K stars) has **no star minimum and no ban on AI-assisted pull requests**, only a real use case, docs, examples, and testing. The strategy holds it until after launch. | Minor | ComposioHQ/awesome-claude-skills CONTRIBUTING.md | Submit it on launch day, written by the owner. Keep VoltAgent and travisvn for after launch. | High |
| F16 | Evidence | Three §8 claims don't hold. Agensi's article never says skills.sh lacks a security review (it cites Snyk). The skills.sh docs name no audit vendors, only "routine security audits." Figma's hero has a "Try it out" button. | Minor | agensi.io/learn/best-ai-agent-skills-marketplaces-2026; skills.sh/docs; figma.com/community/ai-skills | Correct §8.1 and §8.3 before T3 copy cites them. | Medium |
| F17 | Page | The step 4 status block clips its text at 1440 px ("4 scr…"). | Minor | 1440 light render, "Check the proof" | Wrap or scroll the block, or shorten the line. | High |
| F18 | Messaging | "Language agnostic" reads as *programming* languages to developers. The principle means any UI stack. | Minor | strategy §7.3 | On the page, render it as "Any UI stack" and keep the owner's wording in the body. (Judgment.) | Low |

## 4. The three weakest decisions

**1. Framing pixel-perfect as a one-time conversion.**
*What it decided:* the headline, JTBD, "four commands" section, demo, and Show HN title all describe mockup → system. Growth is a footnote.
*Why it's weak:* a one-time tool is exactly the "design-to-code" shelf §6.2 tells us to avoid. It also hides the one capability no vendor skill has. Vendor skills work per screen (OpenAI's `figma-implement-design` needs "an established design system or component library" already) or sync one way from a single source (Stitch). Only evolve absorbs a new mock against what the system renders today, promotes repeats, sweeps orphans, and proves by capture that nothing else moved.
*Instead:* use two acts, "Build it" (init, scaffold, build) and "Grow it" (evolve, refine, add-platform). Make the second act visible and concrete. Details in §8.

**2. Declaring the field empty.**
*What it decided:* "No direct competitor found" (§4.3) and "the position nobody holds" (§4.5), based on a scan that found 0-to-4-star repositories.
*Why it's weak:* the design-skill audience already has favorites with 72K to 132K stars, and the platform owner ships `/design`. A launch that claims an empty field invites the most damaging reply HN can post: "How is this different from X?"
*Instead:* name the neighbors in a fair FAQ. Position pixel-perfect as the builder that writes the DESIGN.md they read, and claim only the mechanics the code proves (F2, F7).

**3. Gating launch on the full 18-task plan and one big HN day.**
*What it decided:* five waves, with brand assets, analytics, SEO, and the complete dogfood site all before launch. One Show HN post links to the site.
*Why it's weak:* this is a lot of pre-launch work for one maintainer. The title breaks HN's limit, and the target breaks Show HN rules (F3). Recent skill posts show a clear pattern. Concrete outcomes win: "skills that build complete Godot games" got 337 points and a chess-analysis skill got 75. Directories and meta-skills got 1 to 9 points (HN Algolia, per research on 2026-09-29).
*Instead:* launch the smallest set: T1, T2, T6 with T3 folded in, T8, T12, T13 (Anthropic, Cursor, Codex, ComposioHQ), and T14. Defer T4 (use the concept's mark), T9 beyond basic meta tags and `llms.txt`, T10, T11 (use the default Pages action), T16, and T17. Make the Show HN a result, for example: "Show HN: I rebuilt my landing page from a mockup with a coding-agent skill" (74 characters).

## 5. Trend check

| §8 trend | Verdict | Source |
|---|---|---|
| Copyable install in first screen | Confirmed | skills.sh ("Try it now `npx skills add`"); ui-skills.com (CLI and MCP cards); anthropics/skills README (after a note and badge). TypeUI UNVERIFIED (Vercel checkpoint). |
| Definition sentence before slogan | Confirmed | github.com/anthropics/skills |
| Metadata strip | Confirmed, narrower than claimed | claude.com/marketplace/plugins/frontend-design shows "Anthropic verified," "Made by Anthropic," "View source," "Installs 1,134,112." It has no license or supported-agents field. skills.sh sidebar UNVERIFIED. |
| Example prompts | Confirmed | frontend-design page ("Try prompts like…"); Figma slash names (`/design-crit`, `/build-from-prd`) |
| Security results near install | Partly confirmed | Skills Directory ("completed automated security analysis"; pages show "Grade A"; the A–F scale UNVERIFIED); Anthropic "runs a security scan"; skills.sh has an audits filter but names no vendors in its docs |
| "What it touches" list | UNVERIFIED | ui-skills improve-ui page returns 404; its llms.txt says "without modifying product source" |
| SKILL.md visible before install | Confirmed (skills.sh); UNVERIFIED (ui-skills) | skills.sh/anthropics/skills/frontend-design |
| Live visual preview | UNVERIFIED on TypeUI (blocked); confirmed elsewhere | impeccable.style ("Drag a slider to compare") |
| FAQ "why not just prompt?" | Confirmed | figma.com/community/ai-skills ("How is an AI skill different from a prompt or a plugin?") |
| `llms.txt` and badges | Confirmed | skills.sh/docs badge; ui-skills.com/llms.txt (its `/registry.txt` returns 404) |
| Avoid vanity or disagreeing counts | Confirmed | Skills Directory shows "574,687 indexed skills" and "675,517 Skills scanned" on one page; Figma says seven categories but shows six tabs |
| Avoid self-ranking tables | Pattern confirmed; Agensi example refuted | agensi.io article (cites Snyk for skills.sh) |
| Avoid a hero with no action | Refuted for Figma | Figma hero has "Try it out" |
| Avoid text-only listings | Confirmed | claude.com/marketplace/plugins |
| Avoid paid or sponsor framing | Confirmed | skillsdirectory.com ("Founder sponsor slots") |
| skills.sh lists from installs | Confirmed; threshold is speculation | skills.sh/docs/faq; vercel-labs/skills#1315 (community reply only) |
| Anthropic scans and reviews | Confirmed; paid plan required | claude.com/docs/plugins/submit |
| Curated lists refuse new skills and AI pull requests | Confirmed for VoltAgent and travisvn; **refuted for ComposioHQ** | each list's CONTRIBUTING.md |

**Missed trends:**

1. **DESIGN.md is becoming the shared format.** Stitch exports it, impeccable and open-design read it, and pixel-perfect already writes one (impeccable.style; stitch-skills `extract-design-md`). *Do:* lead the interop story with it (F7).
2. **Interactive agent-thread demos replace video.** impeccable.style scripts a thread ("You `/impeccable polish`… Agent… 4 tells found… 0 detector findings") next to a before/after slider. *Do:* script an evolve thread ("reuse 3 · variant 1 · new 1 · promote 1 · 0 goldens moved") beside the resulting sandbox.
3. **Measured cost claims.** Context7 leads with "34% cheaper, 37% fewer tokens" (context7.com). *Do:* publish the dogfood run's real numbers (F10).
4. **One cross-agent command beside per-harness tabs.** impeccable offers CLI, Codex, Claude plugin, and skills.sh. shadcn uses `pnpm dlx skills add shadcn/ui`. impeccable also lists ten harnesses, so "six agents" looks small beside it. *Do:* raise T17's priority. If `npx skills add` works, harness breadth grows for free.
5. **HN rewards results, not skills.** See weakest decision 3. *Do:* every launch post leads with what got built.

## 6. Headline alternatives

These are judgments. Test each against the current line in the five-second test (§14).

1. **"Turn a mockup into a design system your agent keeps building on."** It says what the product is without decoding a metaphor, names both acts, and holds the category words. Keep "Your mockup is a picture" as the Fig. 1 caption and the social line.
2. **"Your second screen should reuse your first."** It names the exact moment §5.2 identified. evolve's reuse classification is the proof, which the "why" section can show directly. Its risk: it needs the lede to say what the product is.

## 7. Top five changes, in priority order

1. Restructure "How it works" into "Build it" and "Grow it," and give evolve a section with a real digest and an agent-thread demo from the dogfood project.
2. Rewrite the competitor map and FAQ to name impeccable, open-design, Stitch skills, and `/design` fairly, and narrow every "only we" claim to mechanics the code proves.
3. Fix the Show HN plan: a title of 80 characters or fewer that leads with a result, the repository as the link, and an established account.
4. Measure the dogfood run (tokens, minutes, gates, components) and publish those numbers in place of the 900K-token anecdote.
5. Cut the launch to T1, T2, T6 (with T3), T8, T12, T13, and T14, and move everything else to after launch.

## 8. Response to the owner's notes

> *"I'm concerned that our strategy ignores the fact that evolve and refine are features that not only help you review/refine your existing system but extend it to new use cases."*

**You're right, and it's the biggest gap in the strategy.** The strategy mentions evolve twice, both as maintenance (§7.3 "Rapid iteration," §9.2 "After the first build"). The concept gives it one line. The JTBD, the headline, the demo script, and the Show HN title all end at the first build.

**What the workflows actually support** (`workflows/evolve.md`, `refine.md`, `add-platform.md`, `build.md`):

- evolve takes a new mock, screenshot, URL, directory, **or a plain sentence**, for example `evolve "add a settings screen with profile and billing tabs"`. It classifies each element against what the system renders today: reuse, variant, new, promote, or remove. It asks once, hands additions to build, then re-captures to prove nothing else moved.
- evolve also offers `--replace` for redesigns, an updated design-system folder for rebrands, and `--deprecate` for migrations. Removal runs an orphan sweep, and the sweep is confirmed, never automatic.
- refine changes token values with a measured blast radius, codemods renames with a zero-drift proof, and regenerates DESIGN.md.
- add-platform carries the same system to another target.
- build runs in brownfield mode on existing components.

**The use cases this opens, which the page should name:**

1. **Add features without a designer.** A sentence becomes a screen built from parts you already have.
2. **Keep the generator in the loop.** Each new Claude Design, v0, or Stitch output lands as a delta, not a fresh pile. "The step after the generator" becomes a loop, not a handoff.
3. **Redesigns and rebrands** without rewriting every screen.
4. **Cleanup.** Promote repeated patterns and delete screens without leaving orphans.
5. **New platforms** from the same tokens and inventory.
6. **Existing apps**, if brownfield holds up (Q1).

**Why it matters commercially** (judgment):

- It is the capability none of the vendor skills has (F2, weakest decision 1).
- It answers the page's own problem, the second screen that drifts. build creates the first system; evolve is what keeps the second screen honest.
- It turns one-time use into repeat use, and repeat use is what produces install counts, stars, and word of mouth.

**Concrete changes:**

- Extend the JTBD: "…so every new screen starts from the parts I already have."
- Make evolve the proof for the "Rapid iteration" pillar.
- Add a "Grow it" act with the evolve digest and a thread demo.
- During the dogfood build, add one page to the site *by sentence* through evolve, and film it for the demo.
- Add the story hook "I added a page to my site with one sentence, and nothing else moved."
- Add the FAQ entry "What happens when the design changes?"

**One caution:** keep build as act one. Installs happen when someone has a design in hand. Growth is why they stay.

## 9. Questions for the owner

1. Does brownfield `build` work on an app that pixel-perfect didn't scaffold (existing components, no manifest)? If yes, "apps already drifting" becomes a primary segment and the hero changes.
2. Can the dogfood build include a real evolve run, such as adding a page by sentence, today? If not, what blocks it?
3. How old is your HN account, and has it posted before? The Show HN restriction may decide the channel plan.
4. Do you have a paid Claude plan and a verified OpenAI organization? The Anthropic and Codex directories need them.
5. Do you expect another breaking major release within 60 days of launch? If so, the stability note must say so.
6. Do you want to name impeccable and open-design as complements (through DESIGN.md), or avoid naming them? That choice changes the FAQ and the positioning copy.
