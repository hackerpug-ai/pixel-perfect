---
title: pixel-perfect landing page strategy: second-opinion critique
reviews: .spec/prds/landing/strategy.md, design/concepts/pixel-perfect.html
date: 2026-09-29
revision: 2. Refocused on awareness patterns at the owner's request. Functional-competitor findings were removed.
method: live web reads on 2026-09-29; `gh api`; HN Algolia; a study of how the seven most-used coding-agent skills got noticed and how their pages convert; the repository's workflows; headless Chrome renders of the concept at 1440 px and 390 px, in light and dark mode, captured about 4.5 seconds after load
---

# Critique of the pixel-perfect landing page strategy

## 1. Verdict

**Revise before building.** The on-page plan is solid, but the plan for getting noticed is weaker than what the most-used skills actually did:

- It launches a landing page, not a story.
- It has no launch timing tied to a news event, and no third party lined up to share it.
- It treats skills.sh, the channel where design skills get found, as optional.

The story also stops at the first build, which hides `evolve`, the one feature that gives people a reason to come back and to share.

## 2. Keep

1. **Proof from zero (§11).** Build the site with pixel-perfect, then publish its inventory and sandbox. This is also the best raw material for the launch post.
2. **Fix the installs first, then add a CI smoke test (B1, B2, T2).** Both install blockers are **still open** on 2026-09-29. The latest tag is `v9.0.0`, and the npm package returns 404.
3. **Honesty rules.** The strategy labels examples, uses no invented numbers, and marks gaps UNVERIFIED.
4. **The on-page basics.** Install near the top, a named list of agents, `llms.txt`, a FAQ, and early directory submissions. Most of the top pages do the same (§5).
5. **The rule that a person, not an agent, submits to curated lists (§8.5).**

## 3. Findings

| # | Area | Finding | Severity | Evidence | Recommended change | Confidence |
|---|---|---|---|---|---|---|
| F1 | Awareness | **The launch vehicle is the page, not a story.** The field-note post is scheduled for weeks +1 to +4, after launch. The most-used skills launched with a story instead. Superpowers published a same-day blog post with a real run transcript, which reached 435 HN points. gstack linked its repo and got 15 HN points; its reach came from a 1M-view X account. Show HN rules also say "Don't post landing pages." | Critical | strategy §13.3; blog.fsck.com/2025/10/09/superpowers; news.ycombinator.com/item?id=45547344 and ?id=47355173; news.ycombinator.com/showhn.html | Write the launch post before launch. Combine the field note with the fourth-card problem and a real transcript of the dogfood build. Publish it on launch day and submit it to HN. | High |
| F2 | Awareness | **skills.sh is treated as optional.** It is the discovery channel for design skills. Impeccable's author reports "160,000 installs through skills.sh alone." The strategy lists it only "if T17 passes" (D12). E18 shows 10 of 11 skills link outside their own folder, which may break a folder-by-folder install. | Critical | x.com/pbakaus/article/2069111016366170524 (author's claim); strategy §8.5, D12, E18 | Make `npx skills add hackerpug-ai/pixel-perfect` work before launch. Restructure the links if needed. Add the skills.sh badge. | Medium-high |
| F3 | Story | **The story ends at the first build.** `evolve` gets one line on the page and two mentions in the strategy, both framed as upkeep. See §8. | Critical | strategy §5.4, §7.1, §9.2; concept at 1440 px | Tell it in two acts: build the system, then grow it. Give evolve its own section. | High |
| F4 | Awareness | **Nothing on the page is real output a visitor can reshare.** Fig. 1 is an illustration with invented "Harbor" content. The top design skills lead with real, reshareable output. Impeccable has a before/after slider per command and a scripted agent thread. UI UX Pro Max has 39 live demos, which third parties later reshared as reels and TikToks. | Major | impeccable.style; uupm.cc; concept hero | Build a mockup ↔ sandbox slider from the dogfood build, plus a scripted agent thread (`/pixel-perfect:evolve "add a changelog page"` → "reuse 4 · new 1 · 0 goldens moved"). Impeccable's own HN thread shows a weak before/after backfires ("devastatingly bad"), so use only strong pairs. | High |
| F5 | Awareness | **The launch isn't timed to a platform event.** Open Design launched the day Claude Design shipped and was Trendshift's #1 repo that day. Impeccable appeared 4 days after Anthropic's frontend-design post. Superpowers landed with Claude Code's plugin launch. The strategy picks "a Tuesday to Thursday" after T14. | Major | open-design.ai; github.com/nexu-io/open-design (created 2026-04-28); github.com/pbakaus/impeccable (created 2025-11-16) | Finish the launch kit, then launch within 48 hours of the next major release from Claude Design, Stitch, v0, or Figma, pitched as "the step after it." (Judgment on which events.) | Medium |
| F6 | Awareness | **No one outside is lined up to share it.** Superpowers' spike followed a Simon Willison write-up the next day. A zero-audience maintainer needs a third party. The plan has no outreach. | Major | simonwillison.net (2025-10-10 post on Superpowers) | Before launch day, send the post and demo to 3–5 writers who have covered skill launches. Don't ask for upvotes; HN rules forbid it. | Medium |
| F7 | Launch | **The suggested Show HN title is 94 characters.** HN's limit is 80. HN has also restricted Show HN posts from new accounts since March 2026. | Major | strategy §13.3; news.ycombinator.com/item?id=40677110, ?id=47300772 | Keep the title at 80 characters or fewer and lead with a result, for example "Show HN: I rebuilt my landing page from a mockup with a coding-agent skill" (74). Post from an established account. | High |
| F8 | Conversion | **No single install works for every agent.** gstack's whole install is "paste this into Claude Code." Superpowers tells the agent to "Fetch and follow instructions from" a raw INSTALL.md URL. Impeccable pairs `npx impeccable install` with tabs. The concept offers only tabs, and the first screen has no command. | Major | garrytan/gstack README; obra/superpowers README; impeccable.style | Add an agent-readable `INSTALL.md`. Make "Paste this into your agent" the hero command, and keep the six tabs below it. | Medium |
| F9 | Awareness | **Releases are treated only as a risk (R3).** Superpowers turns each release into a post; "Superpowers 6" got 196 HN points. pixel-perfect ships often and has nothing to show for it. | Major | news.ycombinator.com (2026-06-30, "Superpowers 6"); strategy R3 | Keep the stability note. Also plan a short post with a demo for each notable release. evolve is the first candidate. | Medium |
| F10 | Page | **The first screen has no room for action.** At 1440×900 the headline fills about 60% of the screen, and the second CTA falls below the fold. At 390 px, Fig. 1 falls entirely below the fold and its labels shrink to "01–05". | Major | renders: 1440 and 390 fold | Cut the display type by about a quarter. Put the paste-to-agent command in the first screen. On mobile, use the before/after instead of the isometric figure. | High |
| F11 | Creative | **The "why" card looks borrowed.** It is an "Invite your team" card with pending-invite avatars and numbered marks. impeccable.style, the most visible design-skill page, shows a nearly identical card ("Pending invitations look like active teammates"). | Major | concept "Why"; impeccable.style | Redraw it with a real component from the dogfood build. | Medium |
| F12 | Proof | **The token FAQ cites two ~900K-token recovery passes** and gives no cost for a normal run. That reads as "expensive." Context7's page leads with a measured claim instead: "34% cheaper, 37% fewer tokens." | Major | strategy §7.4; context7.com | Measure the dogfood run (tokens, minutes, gates, components) and publish those numbers. | High |
| F13 | Awareness | **The GitHub description still says "Claude Code plugin…".** Directories and HN visitors read it first, and it contradicts "six agents." | Major | `gh api repos/hackerpug-ai/pixel-perfect` | Fix the description and topics before any submission (T12). | High |
| F14 | Scope | **18 tasks gate the launch**, including brand assets, analytics, and SEO. | Major | strategy §16 | Use the smallest launch in §4, decision 3. | Medium |
| F15 | Distribution | **The directory list misses one channel and one early submission.** Trendshift is missing, even though it made Open Design "#1 Repository of the Day." ComposioHQ/awesome-claude-skills (75.9K stars) has no star minimum and no ban on AI-assisted pull requests, so it can take a launch-day submission. | Minor | trendshift.io; ComposioHQ CONTRIBUTING.md | Add Trendshift to watch. Have the owner submit to ComposioHQ on launch day. | High |
| F16 | Distribution | **Two UNVERIFIED items are now confirmed.** The Anthropic directory requires a paid plan ("Free accounts can't submit"). Codex has a self-serve submission flow that needs org verification. Cursor reviews by hand, and one thin tracker shows an 8-day median. | Minor | claude.com/docs/plugins/submit; developers.openai.com/plugins/deploy/submission; reviewtimes.fyi | Submit to Cursor and Codex in week −4. Confirm the plan and verification now. | High |
| F17 | Measurement | **`install_copy` measures intent, not discovery.** | Minor | strategy §14 | Each day in week one, track: GitHub referrers and unique cloners, skills.sh installs, the directory Usage tab (installs and errors), and the top objection in HN comments. | Medium |
| F18 | Evidence | **Three §8 claims fail.** Agensi never says skills.sh lacks a security review. skills.sh names no audit vendors. Figma's hero has a "Try it out" button. | Minor | agensi.io article; skills.sh/docs; figma.com/community/ai-skills | Correct them before the copy relies on them. | Medium |
| F19 | Page | **The step 4 status block clips its text** ("4 scr…") at 1440 px. | Minor | 1440 render | Wrap or shorten the line. | High |

## 4. The three weakest decisions

**1. Framing pixel-perfect as a one-time conversion.**
The headline, the JTBD, the "four commands" section, and the Show HN title all stop at mockup → system. That leaves no reason to return and nothing new to share after day one. Tell it in two acts instead: **build it** (init, scaffold, build), then **grow it** (evolve, refine, add-platform). Details in §8.

**2. Launching the page instead of a story.**
The plan sends HN, Reddit, and X to the landing page on a date chosen by the task list, and publishes the field-note post weeks later. The top skills did the reverse:

- a story post on day one (Superpowers);
- launch timing tied to a vendor event (Open Design, Impeccable);
- a third party who shared it (Superpowers, through Simon Willison).

The page is where visitors convert. The post is where people first hear about it. Write the post first, time it to an event, and line up someone to share it (F1, F5, F6).

**3. Gating launch on 18 tasks while leaving the one-line install optional.**
The effort goes into the page, and the channel that finds users gets deferred (F2). The smallest launch:

- **Do before launch:**
  - T1 (installs), including skills.sh compatibility, plus `INSTALL.md`
  - T2 (install smoke test)
  - T6 (the dogfood build), with the T3 copy folded in; this build also produces the before/after, the transcript, and the run numbers
  - T8 (demo)
  - T12 (README and repo description)
  - T13 (Anthropic, Cursor, Codex, ComposioHQ)
  - T14 (install test only)
  - the launch post
- **Defer:** T4 (use the concept's mark), T9 beyond basic meta tags and `llms.txt`, T10, T11 (the default Pages action is enough), and T16.

## 5. Trend check

**§8 claims, checked live:**

| §8 trend | Verdict | Source |
|---|---|---|
| Copyable install in the first screen | Confirmed | skills.sh "Try it now"; ui-skills.com CLI/MCP cards; anthropics/skills README. TypeUI is UNVERIFIED (blocked). |
| Definition sentence before slogan | Confirmed | github.com/anthropics/skills |
| Metadata strip | Confirmed, but narrower | frontend-design page shows verified badge, maker, source, and "Installs 1,134,112", but no license or agents field |
| Example prompts | Confirmed | frontend-design page ("Try prompts like…"); Figma slash names |
| Security results near install | Partly | Skills Directory and the Anthropic scan are confirmed. skills.sh names no vendors. A–F is UNVERIFIED (pages show "Grade A"). |
| "What it touches" list | UNVERIFIED | ui-skills improve-ui page returns 404 |
| SKILL.md visible before install | Confirmed (skills.sh) | skills.sh/anthropics/skills/frontend-design |
| Live visual preview | Confirmed elsewhere | impeccable.style slider (TypeUI blocked) |
| FAQ "why not just prompt?" | Confirmed | figma.com/community/ai-skills |
| `llms.txt` and badges | Confirmed | skills.sh badge; `llms.txt` on ui-skills, impeccable, context7, open-design |
| Avoid disagreeing counts, self-ranking tables, sponsor framing | Confirmed | Skills Directory (574,687 vs 675,517 on one page); sponsor slots |
| Avoid a hero with no action | Refuted for Figma | Figma has "Try it out" |
| skills.sh lists from installs | Confirmed | skills.sh/docs/faq |
| Anthropic scans and reviews | Confirmed, paid plan | claude.com/docs/plugins/submit |
| Curated lists refuse new skills or AI pull requests | Confirmed for VoltAgent and travisvn; refuted for ComposioHQ | CONTRIBUTING files |

**What the seven most-used skills do** (Superpowers, gstack, UI UX Pro Max, Open Design, Impeccable, Context7, frontend-design). This is the scorecard for your awareness pattern:

| Pattern | Used by | In the strategy? | Do |
|---|---|---|---|
| Launch story post with a real run | Superpowers (435 HN) | Deferred to weeks +1 to +4 | Make it the launch vehicle (F1) |
| Timing tied to a platform event | Open Design, Impeccable, Superpowers | No | Launch within 48 hours of a vendor release (F5) |
| Third party shares it | Superpowers (Willison) | No | Pitch 3–5 writers (F6) |
| Auto-discovery channels (skills.sh, marketplace, Trendshift) | Impeccable (160K via skills.sh), Superpowers, Open Design | Partly; skills.sh optional, Trendshift missing | F2, F15 |
| Real, reshareable before/after or gallery | Impeccable, UI UX Pro Max | No; the figure is illustrative | F4 |
| One command, or paste-to-agent install, covering all agents | gstack, Superpowers, Impeccable, Context7 | Tabs only | F8 |
| Named list of supported agents | 5 of 7 (Impeccable lists 10 on the page) | Yes | Keep |
| Coined vocabulary and a command namespace | Impeccable ("AI slop", `/impeccable <verb>`), Superpowers | Story hooks exist, but the page doesn't use them | Use "drift" and "the fourth card" consistently |
| Releases as posts | Superpowers ("Superpowers 6", 196 HN) | No; releases are only a risk | F9 |
| DESIGN.md shown as an artifact | Impeccable, Open Design | No, though pixel-perfect writes one (`scripts/design-md.mjs`) | Show the generated DESIGN.md in "Grow it" |
| Testimonial wall, counters | Impeccable, marketplace | Deferred until real | Keep deferred |

Patterns that worked only because of an existing audience: gstack's X reach, Context7's company channel, and anthropics/skills. Don't plan around them.

## 6. Headline alternatives

These are judgments. Test each one against the current line in the five-second test.

1. **"Turn a mockup into a design system your agent keeps building on."** It says what the product is in plain words and names both acts. Keep "Your mockup is a picture" as the figure caption and the social line.
2. **"Your second screen should reuse your first."** It names the moment §5.2 found, and evolve's reuse classification proves it. It needs the lede to say what the product is.

## 7. Top five changes, in priority order

1. Write the launch post (field note plus a real dogfood transcript that includes one evolve-by-sentence), and submit that post to HN with a title of 80 characters or fewer.
2. Make `npx skills add` and a paste-to-agent `INSTALL.md` work before launch, because skills.sh is where design skills get found.
3. Replace Fig. 1's invented demo with a real mockup ↔ sandbox slider and a scripted agent thread from the dogfood build.
4. Tell the story in two acts, build then grow, and give evolve its own section.
5. Launch within 48 hours of the next major design-generator release, and send the post to a few writers who cover skill launches.

## 8. Response to the owner's notes

**Note 1:** *"…evolve and refine…not only help you review/refine your existing system but extend it to new use cases."*

**You're right.** The strategy mentions evolve twice, both as upkeep, and the concept gives it one line. Here is what the workflows actually support:

- **`evolve`** takes a new mock, screenshot, URL, folder, **or a plain sentence**, for example `evolve "add a settings screen with profile and billing tabs"`. It classifies each element against what the system renders today as reuse, variant, new, promote, or remove. It asks once, then proves by re-capture that nothing else moved. It also handles redesigns (`--replace`), rebrands (an updated system folder), migrations (`--deprecate`), and safe removal with a confirmed orphan sweep.
- **`refine`** changes tokens with a measured blast radius and regenerates DESIGN.md.
- **`add-platform`** carries the system to a new target.

That opens use cases the page should name:

- adding features without a designer;
- absorbing each new Claude Design, v0, or Stitch output as a change to the existing system, not a fresh pile;
- redesigns and rebrands;
- cleanup;
- new platforms.

**It also serves awareness.** "I added a page to my site with one sentence, and nothing else moved" is a demo people can share. Every evolve feature is a release post (F9).

What to change:

- Extend the JTBD with "…so every new screen starts from the parts I already have."
- Make evolve the proof for "Rapid iteration."
- Add a "Grow it" act.
- Film one evolve run in the dogfood build.

**Note 2:** *"I wasn't looking for a competitor in functionality, just patterns from highly used sites that market harness skills… I want to make sure our pattern for raising awareness is most effective."*

Understood. This revision drops the functional-competitor findings and scores the plan against how the seven most-used skills actually got noticed (§5).

**Is the awareness pattern the most effective one? Not yet.** The strategy copies the **on-page** patterns well: install near the top, a named agent list, `llms.txt`, a FAQ, and directories. It misses the **off-page** mechanics that created awareness for the top skills:

1. A story post as the launch vehicle.
2. Launch timing tied to a platform event.
3. A third party who shares it.
4. skills.sh as the main discovery channel.
5. A real before/after that other people can share.

Add those five and the plan matches what worked. Everything else in the strategy can stay.

## 9. Questions for the owner

1. **HN account:** how old is it, and has it posted before? Show HN is restricted for new accounts, which may change the channel order.
2. **X audience:** will you post on X yourself, and do you have any following? That decides whether X is a channel or just an echo.
3. **Launch hook:** is there a vendor release in the next 60 days you'd tie the launch to (Claude Design, Stitch, v0, Figma)?
4. **evolve in the dogfood build:** can the dogfood build include a real evolve-by-sentence run today? If not, what blocks it?
5. **Directory requirements:** do you have a paid Claude plan and a verified OpenAI organization? The Anthropic and Codex directories need them.
6. **Brownfield:** does brownfield `build` work on an app pixel-perfect didn't scaffold? If yes, "apps already drifting" becomes a launch audience.
