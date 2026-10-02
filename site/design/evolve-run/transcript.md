⏺ EVOLVE proved — add Changelog · SiteHeader+home · TouchList+inline code · check clean · 0 pre-existing goldens moved
reuse: 6
new: 1
capturedMoved: 0
Result route: /changelog
pre-existing golden HTML files changed: 0 of 696

The Changelog page is built, proved, and committed as 9ff0d42 in this worktree. The worktree is on a detached HEAD, so the commit is not on main yet; merging it there is yours to do.

What was checked
- Catalog: both platforms report "Catalog matches goldens (354 stories)". That is the 348 existing stories plus 6 new ones per platform.
- Built page: verify-landing.mjs passes 9 of 9 cases, including a new changelog case: 8 releases, 70 of 70 entries, code runs rendered, and the phone Install link lands on the landing
  page's #install.
- Gates: the type check, the styling contract, and the inventory gate all pass on the committed tree.
- By eye: I looked at the built page at 1440 and 390; there is no horizontal overflow in either theme.

One change outside the delta
The styling gate was already failing on a <style> block in src/routes/social-card/+page.svelte, committed yesterday in 9221dae. Tailwind's base rules already zero that margin, so I
removed the block. The built social card's body margin still computes to 0px.

Not done, as confirmed
- The landing page's footer "Changelog" link still points to GitHub.
- The "Grow it" thread still shows [n] placeholders. Filling them with these numbers is the scripts/record-run.mjs step (T21).
- The compose gate stays pending for the same reason as before.

Worth knowing
- The Changelog goldens will move whenever CHANGELOG.md changes; accept them at release with verify-catalog.mjs --accept.
- On the dev server in this worktree, fonts return 403 because node_modules is a symlink to the main checkout. I could not check the main checkout from here.
- The designer agent reported that brand marks do not load in Storybook on any story (a base-path issue that predates this run). I did not verify that.

To see the page
1. Pre-step: cd site && npm run build. Expected: Wrote site to "build".
2. Run npx vite preview --port 4187, then open http://127.0.0.1:4187/pixel-perfect/changelog. Expected: the "Changelog" title, then v9.2.0 with a filled pill and seven older releases
   with outlined pills.

The delta, the design decisions, and the measured result are in site/design/deltas/2026-10-02-changelog-page/.
