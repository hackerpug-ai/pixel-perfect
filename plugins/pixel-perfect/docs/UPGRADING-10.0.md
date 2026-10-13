# Upgrading to Pixel Perfect 10.0

Version 10.0 makes the gates fail closed. A component is not verified because a model typed that status. It is verified when `gate.mjs` has a real render, a receipt, and a fresh judgment.

## What breaks

- **Capture must emit PNGs.** Every story needs a real, decodable, non-blank PNG no wider than the platform viewport, beside its structural artifact. A junk file named `.png` fails and names the story. A platform that cannot render pixels sets `capture.pixels` to `"none"` and gives `capture.pixels_reason`. Declare `capture.viewport` as `"WxH"` wherever pixels are required.
- **Only `gate.mjs` writes status.** `passed` and `verified` are written by `plugins/pixel-perfect/scripts/gate.mjs`. Workflows do not type them. `item` sets `built` when the files exist, the contract checks pass, and the story captured a real PNG. `record` stores a judgment bound to the hashes of the golden, the component file, the story file, and the frames. `layer` writes the manifest and the receipt together, and only when the previous layer passed. `audit` reads committed files and does not capture.
- **An existing `verified` mark is recorded before 10.0, not judged.** `gate.mjs audit` reports it as recorded before 10.0 and not judged. It stays that way until `verify` judges it. `verify` sends anything unjudged or stale to the judge, sends a failing component back to a builder at most twice, then asks you.

## Migrate an existing project

1. Add `capture.viewport` on each platform that renders pixels. Point `capture.command` at a command that writes `{state}.png` next to the structural artifact.
2. Run `node plugins/pixel-perfect/scripts/gate.mjs audit <project>`. Fix what it names: a missing PNG, a golden with no receipt, an empty styling scope, a layer that passed out of order, a hand-typed `passed`.
3. Run `pixel-perfect:verify`. It judges each unjudged or stale component and is the only step that turns a pre-10.0 `verified` mark into a judged one.
