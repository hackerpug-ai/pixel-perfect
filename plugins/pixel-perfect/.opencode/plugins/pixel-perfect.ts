// OpenCode project plugin. Auto-loaded from `.opencode/plugins/` at startup.
//
// The install lays down three project-level links: `.opencode/commands`,
// `.opencode/skills`, and `.opencode/plugins`. This plugin verifies that the
// namespaced command link resolves and emits one structured JSON diagnostic
// line to stderr only when it does not. It performs no network access and no
// filesystem mutation, and it carries no third-party imports — the module must
// load under a symlinked package layout where dependency resolution is not
// guaranteed.
import { existsSync } from "node:fs";
import { join } from "node:path";

type PluginContext = { directory?: string };

export async function PixelPerfectPlugin(context: PluginContext = {}): Promise<void> {
  const projectRoot = context.directory ?? process.cwd();
  const namespacedCommand = join(projectRoot, ".opencode/commands/pixel-perfect/init.md");
  if (existsSync(namespacedCommand)) return;
  process.stderr.write(
    `${JSON.stringify({
      plugin: "pixel-perfect",
      check: "namespaced-commands-link",
      status: "missing",
      path: namespacedCommand,
    })}\n`,
  );
}
