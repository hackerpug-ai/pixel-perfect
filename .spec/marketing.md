---
title: pixel-perfect marketing plan
date: 2026-10-06
status: proposal, awaiting the decisions in section 9
builds_on: .spec/prds/landing/strategy.md (2026-09-29)
new_input: AI software engineering news scan for 2026-09-21 to 2026-10-05, plus a study of how new agent skills got noticed in that window
---

# pixel-perfect marketing plan

## How to read this

- Short on time? Read **section 1** and **section 9**.
- Ready to work? **Section 8** is the task list.
- This plan does not replace `strategy.md`. That document designed the landing page and the launch. This one says what to do next, given what the product looks like today and what the October research found.

Every fact carries one of three labels:

| Label | Meaning |
|---|---|
| **Checked** | I ran the command or loaded the page on 2026-10-06. |
| **Scan** | From the news scan of 2026-10-05. Vendor numbers in it are the vendor's own claims. |
| **Snippet** | Seen in search results or one third-party page. Not confirmed at the original source. |

Anything that is my judgment says so.

---

## 1. The short version

pixel-perfect is finished, and nobody can find it. The repository has 0 stars. The skill is not listed on skills.sh, the public directory where people discover agent skills. Two of the install lines on the landing page are broken today.

The plan has four steps, in this order:

1. **Fix the front door.** Repair the two broken install lines. Promote nothing until they work.
2. **Get on the shelves.** Get listed in the places that list a skill without anyone's permission, and file the directory reviews that take weeks.
3. **Launch one story.** Publish one post with proof people can pass around as an image or a short clip. Put every channel into the same 24 hours.
4. **Keep showing up.** Post on every notable release.

**Why this order.** Every channel sends people to the landing page or to an install command. Today the page's main install line points at a URL that returns "not found". The second line installs a skill that cannot run. Promoting now would spend a first impression on a broken command.

**What the new research adds.** Skills that spread in the last two weeks shared one trait: their output is something you can screenshot, and you get it from one command. pixel-perfect's proof is strong, but it lives only on its own site, and its first run takes hours. Most of this plan is about closing that gap.

---

## 2. Where things stand

All rows **Checked** on 2026-10-06.

| Thing | State today | How checked |
|---|---|---|
| Product | Version 9.3.0, six agents, MIT license | `plugin-release.json` |
| Landing site | Live at `hackerpug-ai.github.io/pixel-perfect` | HTTP 200 |
| GitHub | 0 stars, 1 fork, 0 open issues | `gh api` |
| Traffic, last 14 days | 21 page views from 5 visitors. Referrers: github.com (3), yandex.ru (1). | `gh api .../traffic` |
| Clones, last 14 days | 207 clones from 52 sources. Probably CI and install tests, not people. I did not confirm that. | `gh api .../traffic/clones` |
| skills.sh listing | None. The repository's page returns "not found". | Page fetch |
| npm package (Pi install) | Not published. The manifest is ready and already carries the `pi-package` keyword. | `npm view`; `plugins/pixel-perfect/package.json` |
| Launch post | None. | `site/src/routes` |
| Directory submissions | No record in the repository. | `.spec/prds/landing/` |
| Shareable clip | None. The demo is a terminal recording that plays only on the site. The repository holds no GIF or video file. | `git ls-files` |
| Published sandbox and inventory | Not live. `/sandbox` and `/inventory.json` return "not found". | HTTP 404 |
| `llms.txt` | Not live. | HTTP 404 |

For comparison, `strategy.md` recorded 0 views and 9 clones on 2026-09-29. The site, the README, `INSTALL.md`, and the 9.3.0 release tag have all shipped since then.

### Two defects on the front door

**Defect 1: the site's main install line points at a dead URL.**

The line on the site reads:

```text
Install pixel-perfect: fetch and follow https://github.com/hackerpug-ai/pixel-perfect/INSTALL.md
```

That URL returns 404. The README uses `https://raw.githubusercontent.com/hackerpug-ai/pixel-perfect/main/INSTALL.md`, which returns 200. The broken string is in `site/src/lib/components/organisms/Hero.svelte` (line 42) and `InstallSection.svelte` (line 39). An agent may guess the right address. The page should not depend on that.

**Defect 2: `npx skills add hackerpug-ai/pixel-perfect` installs a skill that cannot run.**

The site shows this line twice. I ran it in a sandbox with telemetry turned off, so the test created no public listing. What happened:

- The installer found 13 skills with bare names: `init`, `build`, `status`, `verify`, `research`, and so on. Two of them, `polish` and `process-context`, are internal.
- Installing `status` copied one file, `SKILL.md`.
- That file's first instruction is to read `../../workflows/RUNTIME-CONTRACT.md` and `../../workflows/status.md`. Neither file exists after the install.
- The bare names drop the `pixel-perfect:` prefix. `init` collides with the `/init` command that Claude Code already has.

This is blocker B4 in `strategy.md`. It is still open, and section 3 explains why it now matters most.

---

## 3. What the new research changes

| # | Finding | Label | What it means for pixel-perfect |
|---|---|---|---|
| 1 | **Skills get found on the skills.sh leaderboards, and listing is automatic.** The site ranks skills by install count, which the `npx skills` installer reports. It has all-time, 24-hour trending, and "hot" boards. There is no submission form. The first-ranked design skill, Anthropic's `frontend-design`, shows 956,400 installs. | Checked (skills.sh docs and FAQ); install count read 2026-10-05 | The main shelf is closed to us until `npx skills add` works. Fix it first. The trending board covers 24 hours, so installs bunched into one day count for more than the same installs spread over a month. |
| 2 | **One good day starts a free chain reaction.** The skill `answer-me-with-html` appeared on GitHub on about October 2. It reached #17 on a GitHub daily-trending tracker on October 4. Third-party skill directories had copied it in by October 3, and a YouTube video followed. | Scan, Snippet | Do not spend time submitting to the small directories. They copy from GitHub on their own. Spend the time on one concentrated launch day. |
| 3 | **The skills that spread produce something you can screenshot.** A logo-design skill reached 1,900 stars within two weeks of creation. The HTML-answer skill reached 1,200. The top "Show HN" posts in the window were all things you understand in one glance. | Scan (GitHub and Hacker News APIs) | Our proof is real, but it cannot leave the site. We need three assets that travel on their own. See step 3. |
| 4 | **Those skills also pay off in one command.** pixel-perfect's first build of the landing site took 326 active minutes and 10.0M new tokens. | Checked (`README.md`) | Find the cheapest first result and lead with it. My candidate is the inventory: the list of every component in your mockup, which `build` writes before it builds anything. Measure how long that takes before promising it. |
| 5 | **Usage limits are the loudest complaint in AI coding communities right now.** Threads about weekly limits and fast usage burn led r/ClaudeAI. Simon Willison wrote that everything will need hard budget caps. | Scan | "10.0M tokens" is the first number in our stats row. A reader in this mood reads it as a warning. Lead with what you get. State the cost plainly, with context. Publish the number we lack: what an `evolve` run costs. The README says "a fraction of the first build", which is not a number. |
| 6 | **"Agents write faster than anyone can check" is a live conversation.** Linear's post on rebuilding its test pipeline for agent-speed output drew 408 comments on Hacker News. Several new products sell relief from approving agent output by hand. | Scan (Hacker News API) | Our gates are that check, for interfaces. This is the promise we already make, in this month's words. |
| 7 | **Design generation moved into the terminal.** Claude Code gained a `/design` skill, in research preview, that turns a prompt into editable artboards. Google released a Stitch command-line tool on October 1 that connects to local coding agents and generates "screens and design systems". | Snippet | Our "step after the generator" story now fits in one session: generate, then run `/pixel-perfect:init` on the result. Record that run. It is also a warning. The generators are moving toward our ground, so launch in weeks, not months. |
| 8 | **Pi shipped version 1.0 on October 1 and drew heavy attention.** | Scan (secondary source) | We support Pi, but its install is a ten-line shell block because the npm package is not published. Publishing makes it one line and puts us in Pi's package listings while Pi is in the news. That shelf is far less crowded than skills.sh. |
| 9 | **People distrust vendor benchmarks and welcome hands-on comparisons.** The arguments over the two new flagship models turned on which settings each vendor chose. | Scan | We can write a comparison no vendor can: the same design built in two agents, with cost, time, and gates passed for each. The gates keep score. This costs real tokens, so it comes after launch. |
| 10 | **Two-language READMEs widen reach on GitHub trending.** Two of the fast-growing skills ship an English README plus a second language. | Scan | An optional test after launch: a Chinese README. Only do it if the existing docs drift test can cover it. |

**The pattern under findings 3 and 4, in one sentence:** a new skill spreads when a stranger can see the result before installing and get their own result minutes after. pixel-perfect has neither yet. That is a packaging gap, not a product gap.

---

## 4. The plan

### Step 1: fix the front door (this week)

Nothing gets promoted until these pass on a clean machine.

1. **Fix the site's install URL.** Make the site's line match the README's.
2. **Make `npx skills add` install something that works, or stop advertising it.**
   - The installed skill must carry its own workflow files.
   - Its name must start with `pixel-perfect`.
   - The internal skills must not appear. The installer honors an "internal" flag in a skill's metadata (**Checked**: the flag is in the installer's code).
   - My recommendation for the shape: one listed skill named `pixel-perfect`, so every install counts toward one leaderboard row and not thirteen. The installer's help text says a `SKILL.md` at the repository root changes what it discovers. I did not test that. The implementer decides the shape.
   - Until this works, remove the line from the site. That is a two-line change.
3. **Publish the npm package for Pi.** Replace the ten-line shell block in `INSTALL.md` with one line.
4. **Check every advertised install line automatically.** The dead URL reached production because nothing tests the lines the site shows. Add that test.

### Step 2: get on the shelves (start today)

These reviews take days to weeks, so they start now, in parallel with step 1. They use each agent's own install path, which is separate from the two broken lines.

| Shelf | Action | Who must say yes |
|---|---|---|
| Anthropic plugin directory | Validate, then submit. Needs a paid Claude plan. | A reviewer |
| Codex plugin directory | Submit. Needs OpenAI organization verification. | A reviewer |
| Cursor marketplace | Submit the public repository. | A reviewer, by hand |
| Skills Directory | Sign in with GitHub and submit. | A reviewer |
| skills.sh | Nothing to submit. Listing follows the first real installs after step 1. | Nobody |
| Pi package listings | Nothing to submit. Listing follows the npm publish. | Nobody |
| GitHub search and the directories that copy from it | Add the topics people and crawlers search for: `claude-skills`, `agent-skill`, `design-to-code`, `pi-package`. | Nobody |
| AI search tools | Publish `/llms.txt`, which `strategy.md` planned and which is not live. | Nobody |

Details and draft entries for each directory are in `strategy.md`, section 8.5. Record every submission link and date in `.spec/prds/landing/distribution.md`.

### Step 3: launch one story

**The launch kit.** All of it is ready before launch day.

1. **The launch post.** `strategy.md` task T19 describes it: the drift problem, the field note, a real run, ending on `evolve`. Add two things:
   - The generator-to-system run from finding 7, if it works.
   - One line each for `assimilate` (9.2) and `evolve --refresh` (9.3), which shipped without a post.
2. **Three assets that travel without the site.**
   - One image: a design frame beside the component built from it.
   - One clip of 15 seconds or less: the real `evolve "add a changelog page"` run, with captions.
   - One image of the `status` report with every gate passed.
3. **The cheap numbers** from finding 5: the cost of the inventory, one `evolve`, and one `refine`.
4. **The published sandbox and inventory** at `/sandbox` and `/inventory.json`, so a skeptic can inspect the real output.

**Launch day.** Everything goes out inside one 24-hour window, because the trending boards on skills.sh, GitHub, and Trendshift rank by speed, not by total.

| Order | Action |
|---|---|
| 1 | Publish the post. |
| 2 | Post a "Show HN" that links the post, with a result-first title of 80 characters or fewer. Write the first comment yourself. |
| 3 | Post in r/ClaudeAI, r/ClaudeCode, and r/cursor. Tailor each one. Check each community's rules that morning. |
| 4 | Submit the entry to the ComposioHQ skills list. You submit it, not an agent. |
| 5 | Post the clip on X and LinkedIn as an echo. |
| 6 | Reply to every comment the same day. Fix any install failure the same day. |

**Two changes from `strategy.md`.**

- **Outreach to writers becomes optional.** `strategy.md` puts "email three to five writers" on the launch path. With one maintainer and no existing audience, a step that waits on a stranger's reply is the step most likely to stall the launch. Keep it as upside. Nothing else here depends on it. This is my judgment.
- **Add one live demo before launch day.** Show the one-sentence `evolve` run at a local AI engineering meetup. A room of people who install it that evening gives you first-contact bugs and first installs you can count on. This is my judgment.

**Timing.**

| Item | Date |
|---|---|
| Kit ready | Target Tuesday, October 20 |
| Trigger | The first major release after that from Claude Design, Stitch, v0, or Figma. Launch within 48 hours and pitch pixel-perfect as "the step after it". |
| Fallback | Tuesday, October 27 to Thursday, October 29 |
| Avoid | November 3 to 5. November 3 is election day in the United States, and attention will be elsewhere. |
| If the kit slips | November 10 to 12 |

The Stitch release on October 1 was a valid trigger. We could not use it because the install lines were broken. That is the cost of step 1 being open.

### Step 4: keep showing up

| When | What |
|---|---|
| Every notable release | A short post, one real demo, one clip, and the upgrade note if anything broke (`strategy.md`, section 13.6). |
| Two to three weeks after launch | The two-agent comparison from finding 9. |
| After launch | A post for native and terminal developers: "a component browser for Ratatui and GPUI". This audience is small and has no alternative. |
| Once strangers are using it | Pull requests to the other curated lists, which refuse skills with no real usage. |
| Day 30 | A review: what each channel sent, and the next three tests. |

---

## 5. What to say

Keep the core line and the four principles from `strategy.md`, section 7. Add these.

**Three new hooks, each tied to something people are already discussing.**

| Hook | The conversation it joins |
|---|---|
| "Your agent builds a screen in a minute. What checks it?" | Agents write faster than anyone can review (finding 6). |
| "`/design` makes the artboards. pixel-perfect ships the system inside them." | Design generation in the terminal (finding 7). Use it only after the run in task M9 works. |
| "`frontend-design` makes one screen look good. pixel-perfect makes the tenth screen match the first." | The largest design-skill audience there is. pixel-perfect already bundles that skill as its aesthetic lens, so this is a complement, not an attack. |

**Rules for talking about cost.**

1. Lead with the result: a 22-frame design became 55 components, and a new page was added with one sentence while no other component moved.
2. Give the first-build cost in full, right after: 10.0M new tokens over 326 active minutes.
3. Follow it at once with the cost of the next change, once measured.
4. Never use "a fraction of" where a number belongs.

**Lead with outcomes, not activity.** "34 gates passed" is activity. "Nothing else moved" is an outcome. Gate and component counts support the claim. They are not the claim.

---

## 6. Channels, ranked

Ranked by what a solo maintainer with no audience gets for the effort. The ranking is my judgment.

| Rank | Channel | What it gives | Effort | Depends on someone else? |
|---|---|---|---|---|
| 1 | skills.sh | The main place skills are found. Ongoing installs with no further work. | Medium, once (step 1) | No |
| 2 | The launch post plus "Show HN" | The one large burst that feeds every trending board. | High, once | No, but it needs a Hacker News account with history |
| 3 | Reddit: r/ClaudeAI, r/ClaudeCode, r/cursor | The audience that already uses these agents daily. | Low | No |
| 4 | Official directories: Anthropic, Codex, Cursor | Steady installs, plus a security review you can cite. | Low, then waiting | Yes, a reviewer |
| 5 | npm and Pi listings | A less crowded shelf during Pi's news cycle. | Low | No |
| 6 | A live meetup demo | First installs and first-contact bugs. | Low | No |
| 7 | Curated GitHub lists | Trust and long-tail traffic. | Low | Yes, a maintainer |
| 8 | X and LinkedIn | An echo. Reach depends on an audience we do not have. | Low | No |
| 9 | Outreach to writers | A multiplier if one responds. | Medium | Yes, entirely |

---

## 7. Measurement and decision rules

**The baseline** is section 2. `strategy.md` refuses to invent targets, and so does this plan. The first 14 days after launch set the real baseline.

**Watch daily during launch week:**

1. Installs on skills.sh.
2. Unique cloners and referrers on GitHub.
3. New issues. Fix install failures the same day.
4. The most common objection in comments. It goes into the FAQ that week.

**Three yes-or-no signals that need no benchmark:**

| Signal | If yes | If no after 14 days |
|---|---|---|
| Did a stranger open an issue or a pull request? | People are running it. Answer within a day. | People are reading but not running. The first run costs too much. Push the cheap first result from finding 4. |
| Did anyone post their own before-and-after? | The proof travels. Ask permission to show it. | Make the assets easier to reuse, and ask the first users directly. |
| Did one channel send most of the cloners? | Put the next post there. | The launch was too spread out. Bunch the next release post into one day. |

---

## 8. Task list

Each row is one task. "Strategy task" names the matching task in `strategy.md`, section 16, where one exists. Agents are from `~/Projects/brain/agents/`, checked against the live roster on 2026-10-06.

| # | Task | Scope and files | Acceptance criteria | Depends on | Agent | Strategy task |
|---|---|---|---|---|---|---|
| M1 | Fix the install URL on the site | `site/src/lib/components/organisms/Hero.svelte`, `InstallSection.svelte`, and the stories and captures that show the line | AC-1: the paste-to-agent line on the deployed site holds a URL that returns 200 and serves `INSTALL.md` as plain text. AC-2: the site's line and the README's line are identical. AC-3: the site's own gates pass again. | None | `sveltekit-implementer`, then `sveltekit-reviewer` | T20 |
| M2 | Make `npx skills add` install a skill that works | Skill folder layout under `plugins/pixel-perfect/`, `scripts/build-adapters.mjs`, the validate scripts | AC-1: on a clean machine, after `npx skills add hackerpug-ai/pixel-perfect -y`, the installed status command runs in a real agent session and finds every file it reads. AC-2: `--list` shows no internal skill, and every listed name starts with `pixel-perfect`. AC-3: no installed command shadows a built-in command. AC-4: until AC-1 to AC-3 pass, the line is absent from the site and the README. | None | `ai-tooling-implementer`, then `ai-tooling-reviewer` | T17 |
| M3 | Publish the npm package for Pi | `plugins/pixel-perfect/package.json`, the release workflow, the Pi section of `INSTALL.md` | AC-1: `npm view @hackerpug-ai/pixel-perfect version` returns the current version. AC-2: on a clean machine, the one-line Pi install lists all 11 commands. AC-3: the Pi section of `INSTALL.md` is one line. AC-4: the release procedure in `CONTRIBUTING.md` names the npm publish step, and the install test in M4 fails when npm lags the release tag. | Your npm login | `pi-package-implementer`, then `pi-package-reviewer` | T1 |
| M4 | Test every advertised install line in CI | `.github/workflows/` | AC-1: CI collects every install line shown on the site, the README, and `INSTALL.md`. AC-2: it fails if any URL in them does not return 200, or if any command fails in a clean container. AC-3: it runs on each release tag and on each change to those files. | M1, M2, M3 | `ghactions-planner`, then `ghactions-implementer`, then `ghactions-reviewer` | T2 |
| M5 | File the directory submissions | `.spec/prds/landing/distribution.md` | AC-1: the Anthropic directory, the Codex directory, the Cursor marketplace, and Skills Directory are submitted, each with its link and date recorded. AC-2: the ComposioHQ entry is drafted for you to submit on launch day. | Decision 5 | You submit. `marketing-campaign-manager` drafts. | T13 |
| M6 | Make the repository easy to find | GitHub repository settings, `site/static/llms.txt`, `README.md` | AC-1: the topics include `claude-skills`, `agent-skill`, `design-to-code`, and `pi-package`. AC-2: `/llms.txt` returns 200 on the deployed site. AC-3: the README shows the skills.sh install badge once the listing exists. | M2 for AC-3 | `marketing-aeo-specialist`, then `techwriting-reviewer` | T6, T12 |
| M7 | Make proof that travels | `site/static/proof/`, `site/static/demo/` | AC-1: one image of a design frame beside its built component, from the landing build, judged a close match by someone outside the project. AC-2: one captioned clip of 15 seconds or less showing the real `evolve` run, as MP4 and GIF, each under 8 MB. AC-3: one image of the real `status` report. AC-4: no result is edited. AC-5: `/sandbox` and `/inventory.json` return 200 on the deployed site. | None | `frontend-designer`, reviewed by `marketing-creative-director` | T8, T21 |
| M8 | Measure the cheap numbers | README FAQ, site FAQ | AC-1: tokens and minutes, from real runs, for three things: `init` through the written inventory, one `evolve` by sentence, and one `refine` token change. Each is recorded with its model and date. AC-2: the README and site replace "a fraction of the first build" with the measured figures. AC-3: a written yes or no on leading with "see the system inside your mockup" as the first result, based on the inventory figure. | None. It spends your own usage. | No clean fit. Use the general `claude` agent to run it and `techwriting-implementer` to write it up. | None |
| M9 | Record the generator-to-system run | A recorded session and its transcript | AC-1: a real session in which Claude Code's `/design` or the Stitch tool produces a design, and `/pixel-perfect:init` and `build` run on it through the first passed gate. AC-2: the recording and transcript are saved. AC-3: if pixel-perfect cannot read that output, record it as a product gap and make no claim about it. | M1 | The general `claude` agent, then `product-explorer` for a first-contact check | None |
| M10 | Write the launch post | A page on the site or your blog | AC-1: it tells the drift problem, the field note, and the real run, and ends on the `evolve` step. AC-2: it includes the M7 assets and the M8 numbers, and the M9 run if that worked. AC-3: every claim traces to a file in this repository or to a recorded run. AC-4: it covers `assimilate` and `evolve --refresh` in one line each. | M7, M8 | `marketing-copywriter`, then `techwriting-reviewer` | T19 |
| M11 | Test first contact on a clean machine | The deployed site | AC-1: someone who has never seen the project follows the site, and each install path works in each agent it names. AC-2: the five-second headline test from `strategy.md` passes with 4 of 5 people. | M1, M2, M3 | `product-explorer` | T14 |
| M12 | Demo it live once | A local AI engineering meetup | AC-1: one live run of `evolve` by sentence. AC-2: the questions asked are written down, and the most common one goes into the FAQ. | M1 | You | None |
| M13 | Launch | The post, "Show HN", three Reddit posts, the ComposioHQ entry, X and LinkedIn | AC-1: you approve every post. AC-2: all of them go out within one 24-hour window. AC-3: the "Show HN" title is 80 characters or fewer and links the post. AC-4: every link is logged in `distribution.md`. | M4, M5, M10, M11 | `marketing-social-manager` and `marketing-copywriter` draft. You post. | T15 |
| M14 | Watch launch week and review at day 30 | `.spec/prds/landing/review-30d.md` | AC-1: the four daily checks in section 7 are recorded for seven days. AC-2: the three signals in section 7 are answered at day 14. AC-3: the review names what each channel sent and the next three tests. | M13 | `marketing-campaign-manager` | T16 |
| M15 | Follow-up posts | One per notable release, plus the two-agent comparison and the native-sandbox post | AC-1: each has a short post, one real demo, and one clip. AC-2: the comparison reports cost, time, and gates passed for each agent, from real runs. | M13 | `marketing-copywriter`, then `techwriting-reviewer` | T23 |

**Optional, off the critical path:** outreach to three to five writers (`strategy.md` task T22), and a Chinese README.

**What can run in parallel:**

- **Now:** M1, M2, M3, M5, M7, M8
- **Next:** M4, M6, M9, M11
- **Then:** M10, M12
- **On the trigger:** M13, then M14 and M15

---

## 9. Decisions needed from you

Each one stands alone.

1. **Remove the `npx skills add` line from the site today?**
   The site shows it twice, and a visitor who runs it gets a skill that cannot run. Removing it is a two-line change. It comes back when task M2 passes.
   **Recommendation: yes, today.**

2. **Accept the timing rule?**
   Launch within 48 hours of the next major design-tool release once the kit is ready. If none comes, launch between October 27 and 29. Skip November 3 to 5.
   **Recommendation: yes.** A fixed fallback stops the launch from waiting forever.

3. **Spend your own usage on measurements?**
   Task M8 needs three short real runs. The two-agent comparison in M15 needs two full builds, about 10M new tokens each by the landing build's figure.
   **Recommendation: do M8 now. Hold the comparison until after launch.**

4. **Which Hacker News account posts the "Show HN"?**
   Hacker News restricts "Show HN" for new accounts (`strategy.md`, decision D15). If yours has no history, submit the post as a regular story.
   **Recommendation: decide this week, so there is time to take part there before launch.**

5. **Confirm a paid Claude plan and OpenAI organization verification.**
   The Anthropic directory requires the first, and the Codex directory requires the second. Without them, task M5 cannot start.
   **Recommendation: confirm both today, because those reviews take the longest.**

6. **Run `npm login` once.**
   Publishing the Pi package needs your npm account for the `@hackerpug-ai` scope. Only you can do that step.

---

## 10. What I did not verify

- **Claude Code's `/design` skill and the Stitch command-line tool.** I saw them in search results and one third-party article. I did not run either. Task M9 tests the claim before anyone makes it.
- **The scan's numbers.** Pi's attention, the star counts of the fast-growing skills, and the model price claims come from the October 5 scan. Some are vendor claims or secondary sources.
- **The other install paths.** I did not re-run the Claude Code, Codex, Cursor, Grok, or OpenCode installs. The October 4 handoff says the six-agent matrix passed.
- **Whether directory submissions were filed.** I found no record. A record may exist outside the repository.
- **Whether the 207 clones are people.**
- **Each Reddit community's current rules.**
- **How a fixed `npx skills add` appears on the leaderboard.** One row or several depends on the shape chosen in task M2.

---

## 11. Sources

**This repository:** `README.md`, `INSTALL.md`, `CHANGELOG.md`, `plugin-release.json`, `plugins/pixel-perfect/package.json`, `.spec/prds/landing/strategy.md`, the site source under `site/src/`.

**Commands run on 2026-10-06:**

- `gh api repos/hackerpug-ai/pixel-perfect`, with `/traffic/views`, `/traffic/clones`, and `/traffic/popular/referrers`
- `npm view @hackerpug-ai/pixel-perfect version`
- `npx skills add hackerpug-ai/pixel-perfect --list`
- `npx skills add hackerpug-ai/pixel-perfect -s status -a claude-code --copy -y`, in a sandbox, with `DISABLE_TELEMETRY=1` and `DO_NOT_TRACK=1`
- HTTP checks of the site, both `INSTALL.md` addresses, `/sandbox`, `/inventory.json`, and `/llms.txt`

**Pages read:**

- skills.sh documentation and FAQ: <https://skills.sh/docs>, <https://skills.sh/docs/faq>
- skills.sh leaderboard: <https://skills.sh>
- Skillselion's count of the skills ecosystem: <https://skillselion.com/state-of-ai-agent-skills-2026>
- Linear on its test pipeline: <https://linear.app/now/ci-bottleneck-reworked>
- Simon Willison on budget caps: <https://simonwillison.net/2026/Oct/3/default-hard-budget-caps/>
- The HTML-answer skill: <https://github.com/QingYunA/answer-me-with-html>
- The logo-design skill: <https://github.com/kaankiziltug/logo-design-skill>
- A third-party article that describes `/design`: <https://www.firecrawl.dev/blog/best-claude-code-skills>

**The October 5 scan:** stored in holocron as document `f619a7ea-4ad4-4de7-b34c-4b37253b608a`, "What's New: AI Software Engineering — Sep 21 → Oct 5, 2026".
