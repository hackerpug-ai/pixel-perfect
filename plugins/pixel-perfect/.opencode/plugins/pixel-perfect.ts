// OpenCode project plugin. Auto-loaded from `.opencode/plugins/` at startup.
//
// The install lays down real copies of the namespaced commands, skills, and
// this plugin under `.opencode/`. This plugin verifies that the namespaced
// command file is present and emits one structured JSON diagnostic line to
// stderr only when it is not. It performs no network access and no
// filesystem mutation, and it carries no third-party imports.
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
