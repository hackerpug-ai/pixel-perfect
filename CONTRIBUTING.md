# Contributing to pixel-perfect

- Run `pnpm run ci` before every change lands. It runs verify, validate, and the tests, and it is the gate for every change.
- The landing site lives in `site/`. `site/README.md` covers it.
- Report bugs and requests in [GitHub Issues](https://github.com/hackerpug-ai/pixel-perfect/issues).
- When the landing page copy or the run numbers in `site/src/lib/run.json` change, review `README.md`. `test/readme.test.mjs` checks the links, the numbers, the command list, and the voice rules.

## Releasing

`plugin-release.json` is the only manually selected product version. Product version lockstep covers Claude, Codex, Cursor, Grok (via Claude marketplace), OpenCode, and Pi. All releases must use:

```bash
node scripts/release.mjs prepare <version>
node scripts/release.mjs verify <version>
node scripts/release.mjs publish <version>
```

Direct version edits, hand-created tags, and manual GitHub releases are unsupported. `prepare` synchronizes product-version fields, including the Cursor metadata and Pi package, without changing OpenCode dependency versions. `verify` is read-only. `publish` requires clean `main`, `HEAD === origin/main`, a matching non-empty changelog section, valid package content, an absent tag, and authenticated `gh` before creating an annotated tag or GitHub release. Publishing the npm artifact remains a separate authorized release action.
