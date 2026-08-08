// Behavioral tests for the component-contract gate.
//
// These run the real script as a subprocess against real files on disk, because
// the exit code is the actual contract with workflows/build.md — build branches on
// 0 / 1 / 2 / 3, so asserting on an imported function's return value would test
// something the build never sees.
//
// The fixture is modeled on an observed failure: a project that declared
// react-native-reusables, let scaffold vendor the ui/ layer, and then wrote atoms
// that imported Text and Pressable straight from react-native. Every styling
// contract passed it.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseContract } from "../plugins/pixel-perfect/scripts/verify-styling-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GATE = path.join(ROOT, "plugins/pixel-perfect/scripts/verify-styling-contract.mjs");
const RNR = path.join(ROOT, "plugins/pixel-perfect/docs/component-contracts/react-native-reusables.md");
const NATIVEWIND = path.join(ROOT, "plugins/pixel-perfect/docs/styling-contracts/nativewind-mobile.md");
const FIXTURE = (variant) => path.join(ROOT, "test/fixtures/rnr-drift", variant);

function runGate(contract, sourceRoot, ...extra) {
  const r = spawnSync(process.execPath, [GATE, contract, sourceRoot, ...extra], { encoding: "utf8" });
  return { status: r.status, report: r.stdout.trim() ? JSON.parse(r.stdout) : null, stderr: r.stderr };
}

const files = (report) => report.violations.map((v) => v.file);

test("drifted fixture: the gate blocks with exit 1", () => {
  const { status, report } = runGate(RNR, FIXTURE("drifted"));
  assert.equal(status, 1, "a tree that re-implements vendored primitives must block the layer");
  assert.equal(report.summary.total, 2);
});

test("drifted fixture: both hand-rolled atoms are named", () => {
  const { report } = runGate(RNR, FIXTURE("drifted"));
  const flagged = files(report);
  assert.ok(flagged.includes("src/components/atoms/PillButton.tsx"), "single-line raw import not caught");
  assert.ok(flagged.includes("src/components/atoms/Chip.tsx"), "multi-line raw import not caught");
});

test("drifted fixture: the vendored ui/ layer is never flagged", () => {
  // ui/button.tsx and ui/text.tsx import Pressable and Text from react-native by
  // design. Flagging the library's own source is the fastest way to teach someone
  // to pass --allow for everything, at which point the gate is decorative.
  const { report } = runGate(RNR, FIXTURE("drifted"));
  const inUi = files(report).filter((f) => f.includes("/ui/"));
  assert.deepEqual(inUi, [], `the gate flagged the vendored layer: ${inUi.join(", ")}`);
});

test("drifted fixture: free primitives and exempt setup are not flagged", () => {
  const { report } = runGate(RNR, FIXTURE("drifted"));
  const flagged = files(report);
  // View-only atom: RNR replaces no layout primitive.
  assert.ok(!flagged.includes("src/components/atoms/RuleLine.tsx"), "a View-only atom must not be flagged");
  // RNR's own install instructions prescribe importing PortalHost from the package.
  assert.ok(
    !flagged.includes("src/components/providers/AppProviders.tsx"),
    "PortalHost from @rn-primitives/portal is RNR's documented setup and must not be flagged"
  );
  // Stories legitimately render raw primitives to demonstrate them.
  assert.ok(!flagged.some((f) => f.includes(".stories.")), "story files must be excluded");
});

test("rebound fixture: the gate passes with exit 0", () => {
  const { status, report } = runGate(RNR, FIXTURE("rebound"));
  assert.equal(status, 0, `rebound tree should pass, got violations: ${files(report).join(", ")}`);
  assert.equal(report.summary.total, 0);
  // Guard against a vacuous pass: the files must actually have been evaluated.
  assert.ok(report.summary.filesInScope > 0, "rebound passed without scanning anything");
});

test("the styling contract cannot see this defect — exit 0 on both variants", () => {
  // This is the whole reason component contracts exist. Both fixtures use
  // className throughout and hardcode nothing, so NativeWind's contract is
  // satisfied either way. If this test ever fails, the two contracts have
  // started overlapping and the claim in the docs needs revisiting.
  for (const variant of ["drifted", "rebound"]) {
    const { status } = runGate(NATIVEWIND, FIXTURE(variant));
    assert.equal(status, 0, `styling contract should pass on the ${variant} fixture`);
  }
});

test("mode:\"file\" is load-bearing — a per-line scan misses the wrapped import", () => {
  // The regression this guards: run prettier, the import list wraps, and a
  // content-mode (per-line) check silently stops matching. Asserting the premise
  // directly, against the real contract regex and the real fixture file.
  const { checks } = parseContract(RNR);
  const check = checks.forbiddenPatterns.find((c) => c.id === "raw-primitive-reimplementation");
  assert.equal(check.mode, "file", "the raw-primitive check must run in file mode");

  const wrapped = readFileSync(path.join(FIXTURE("drifted"), "src/components/atoms/Chip.tsx"), "utf8");
  const re = new RegExp(check.regex);

  assert.ok(re.test(wrapped), "file mode must match the wrapped import");
  assert.ok(
    !wrapped.split("\n").some((line) => re.test(line)),
    "premise broken: a per-line scan now matches the wrapped import, so this test proves nothing"
  );
});

test("a wrong source-root fails loudly with exit 3 rather than passing vacuously", () => {
  // Pointing at src/ (or any subdirectory) makes every glob match zero files.
  // Silently reporting "0 violations" there would be the worst possible outcome.
  const { status, report } = runGate(RNR, path.join(FIXTURE("drifted"), "src/components/ui"));
  assert.equal(status, 3);
  assert.equal(report.summary.filesInScope, 0);
  assert.match(report.warnings.join(" "), /vacuous/i);
});

test("an override suppresses a specific file without disabling the check", () => {
  // BUILD passes one --allow per entry in tools.component_contract_overrides.
  const { status, report } = runGate(
    RNR,
    FIXTURE("drifted"),
    "--allow",
    "src/components/atoms/PillButton.tsx"
  );
  assert.equal(status, 1, "the un-overridden atom must still block");
  assert.deepEqual(files(report), ["src/components/atoms/Chip.tsx"]);
});
