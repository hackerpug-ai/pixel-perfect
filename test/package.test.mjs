import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { checkRuntimePaths } from "../scripts/check-runtime-paths.mjs";
import { validatePackage } from "../scripts/validate-package.mjs";
import { validatePlugin } from "../scripts/validate-plugin.mjs";
import { validateSkills } from "../scripts/validate-skills.mjs";
import { validateWorkflows } from "../scripts/validate-workflows.mjs";
import { verifyRelease } from "../scripts/release.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("repository release and package gates pass together", async () => {
  const [release, packageResult, plugin, skills, runtimePaths, workflows] = await Promise.all([
    verifyRelease(ROOT, "7.1.0", { environment: {} }),
    validatePackage(ROOT),
    validatePlugin(ROOT),
    validateSkills(ROOT),
    checkRuntimePaths(ROOT),
    validateWorkflows(ROOT),
  ]);

  assert.deepEqual(release.channels, {
    claude: "7.1.0",
    codex: "7.1.0",
    grok: "7.1.0",
    opencode: "7.1.0",
  });
  assert.equal(packageResult.capabilities, 10);
  assert.equal(packageResult.internalSkills, 2);
  assert.equal(plugin.codexVersion, "7.1.0");
  assert.equal(skills.publicCapabilities, 10);
  assert.equal(runtimePaths.checkedCapabilities, 10);
  assert.equal(workflows.interactive, 6);
});
