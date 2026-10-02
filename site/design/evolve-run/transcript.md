# Evolve transcript

Command: /pixel-perfect:evolve "add a changelog page"

Reply: Built `screens/Changelog` from existing parts.

reuse: 4
new: 1
capturedMoved: 0

The screen at /changelog composes SectionHeading, ChangelogMini, TextLink, and SiteFooter. Those four names were already in the inventory. The inventory gained one entity, the Changelog screen. Nothing was removed. SiteHeader stays on Home. Its logo points at #top and its phone Install link points at #install, and those ids are not on /changelog. Editing SiteHeader would change pre-existing goldens, so this screen does not compose it.

Catalog check on web-desktop and web-mobile, before the new goldens were kept: each exited 1 with Drift: 2 new stories, drifted 0, missing 0, extra screens/Changelog/default and screens/Changelog/default--dark. After SiteHeader was left off the screen, the same checks drifted only those two new Changelog stories on each platform. Of the 696 pre-existing golden HTML files, 0 changed. After the Changelog goldens were kept, both platforms matched 350 stories with drifted 0.

Release labels on the page are the three newest headings in CHANGELOG.md: 9.2.0, 9.1.0, and 9.0.0.

Result route: /changelog
