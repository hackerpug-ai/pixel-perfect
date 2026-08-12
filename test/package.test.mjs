import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { checkRuntimePaths } from "../scripts/check-runtime-paths.mjs";
import { validateContracts } from "../scripts/validate-contracts.mjs";
import { validatePackage } from "../scripts/validate-package.mjs";
import { validatePlugin } from "../scripts/validate-plugin.mjs";
import { validateSkills } from "../scripts/validate-skills.mjs";
import { validateWorkflows } from "../scripts/validate-workflows.mjs";
import { verifyRelease } from "../scripts/release.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("repository release and package gates pass together", async () => {
  const [release, packageResult, plugin, skills, runtimePaths, workflows, contracts] = await Promise.all([
    verifyRelease(ROOT, "8.0.0", { environment: {} }),
    validatePackage(ROOT),
    validatePlugin(ROOT),
    validateSkills(ROOT),
    checkRuntimePaths(ROOT),
    validateWorkflows(ROOT),
    validateContracts(ROOT),
  ]);

  assert.deepEqual(release.channels, {
    claude: "8.0.0",
    codex: "8.0.0",
    cursor: "8.0.0",
    grok: "8.0.0",
    opencode: "8.0.0",
  });
  assert.equal(packageResult.capabilities, 11);
  assert.equal(packageResult.internalSkills, 2);
  assert.equal(plugin.codexVersion, "8.0.0");
  assert.equal(plugin.cursorVersion, "8.0.0");
  assert.equal(skills.publicCapabilities, 11);
  assert.equal(runtimePaths.checkedCapabilities, 11);
  assert.equal(workflows.interactive, 7);
  assert.equal(contracts.layers, 4);
  assert.equal(contracts.builtinComponentContracts, 5);
});
