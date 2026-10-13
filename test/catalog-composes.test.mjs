// Composition checks against real source (--composes) and the --blast note for compiled stacks.

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  PIXEL_FIXTURE,
  cloneFixture,
  editManifest,
  removeDirs,
  runCli,
  scratchProject,
  writeIn,
  writeProbeProject,
} from "./helpers/catalog.mjs";

// A pixel-web project whose Card molecule and Home screen declare source files and composes.
function composeProject() {
  const dir = cloneFixture(PIXEL_FIXTURE, "pp-composes-");
  writeIn(
    dir,
    "design/inventory.json",
    JSON.stringify({
      atoms: [{ name: "Button" }, { name: "Badge" }],
      molecules: [{ name: "Card", composes: ["Button"] }],
      organisms: [],
      screens: [{ name: "Home", composes: ["Card"] }],
    }),
  );
  editManifest(dir, (m) => {
    const platform = m.platforms["web-desktop"];
    platform.molecules.find((e) => e.name === "Card").file = "src/Card.tsx";
    platform.screens.find((e) => e.name === "Home").file = "src/Home.tsx";
  });
  writeIn(dir, "src/Home.tsx", 'import { Card } from "./Card";\nexport const Home = () => <Card />;\n');
  return dir;
}

test("--composes passes when each composed name is referenced in the item's source", () => {
  const dir = composeProject();
  try {
    writeIn(dir, "src/Card.tsx", 'import { Button } from "./Button";\nexport const Card = () => <Button />;\n');
    const { code, stderr, report } = runCli(["--composes", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stderr + JSON.stringify(report));
    assert.equal(report.checked, 2);
    assert.deepEqual(report.violations, []);
  } finally {
    removeDirs(dir);
  }
});

test("--composes fails and lists item, composes and file when the source never names the dependency", () => {
  const dir = composeProject();
  try {
    writeIn(dir, "src/Card.tsx", "export const Card = () => <section>a copy of the button</section>;\n");
    const { code, report } = runCli(["--composes", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1);
    assert.equal(report.violations.length, 1);
    const [v] = report.violations;
    assert.equal(v.item, "Card");
    assert.deepEqual(v.composes, ["Button"]);
    assert.deepEqual(v.missing, ["Button"]);
    assert.equal(v.file, "src/Card.tsx");
  } finally {
    removeDirs(dir);
  }
});

test("--composes ignores a reference that exists only inside comments", () => {
  const dir = composeProject();
  try {
    writeIn(
      dir,
      "src/Card.tsx",
      [
        '// import { Button } from "./Button";',
        "/* <Button /> is the primary action */",
        "export const Card = () => <section>{/* Button */}</section>;",
        "",
      ].join("\n"),
    );
    const { code, report } = runCli(["--composes", dir, "--platform", "web-desktop"]);
    assert.equal(code, 1, JSON.stringify(report));
    assert.deepEqual(report.violations.map((v) => [v.item, v.missing]), [["Card", ["Button"]]]);
  } finally {
    removeDirs(dir);
  }
});

test("--composes --layer checks only that layer", () => {
  const dir = composeProject();
  try {
    writeIn(dir, "src/Card.tsx", "export const Card = () => null;\n");
    const molecules = runCli(["--composes", dir, "--platform", "web-desktop", "--layer", "molecules"]);
    assert.equal(molecules.code, 1);
    const screens = runCli(["--composes", dir, "--platform", "web-desktop", "--layer", "screens"]);
    assert.equal(screens.code, 0, JSON.stringify(screens.report));
  } finally {
    removeDirs(dir);
  }
});

test("--composes with --layer: a composing item whose source is not recorded is exit 1", () => {
  const dir = composeProject();
  try {
    const { code, report } = runCli(["--composes", dir, "--platform", "web-desktop", "--layer", "molecules"]);
    assert.equal(code, 1, JSON.stringify(report));
    assert.equal(report.violations[0].kind, "not-built");
    assert.equal(report.violations[0].reason, "molecules/Card lists composes but is not built or not recorded");
  } finally {
    removeDirs(dir);
  }
});

test("--composes without --layer lists an unbuilt composing item under notBuilt; it is not a failure", () => {
  const dir = composeProject();
  try {
    const { code, report, stderr } = runCli(["--composes", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stderr);
    assert.deepEqual(report.notBuilt, ["molecules/Card"]);
    assert.equal(report.checked, 1, "Home is built and was checked");
  } finally {
    removeDirs(dir);
  }
});

test("--composes exits 2 when the inventory is missing", () => {
  const dir = composeProject();
  try {
    rmSync(path.join(dir, "design/inventory.json"));
    const { code, stderr } = runCli(["--composes", dir, "--platform", "web-desktop"]);
    assert.equal(code, 2);
    assert.match(stderr, /design\/inventory\.json/);
  } finally {
    removeDirs(dir);
  }
});

test("--composes with nothing checked is exit 3 (vacuous) with a note", () => {
  const dir = composeProject();
  try {
    writeIn(dir, "design/inventory.json", JSON.stringify({ molecules: [{ name: "Card" }], screens: [] }));
    const { code, report } = runCli(["--composes", dir, "--platform", "web-desktop"]);
    assert.equal(code, 3);
    assert.equal(report.checked, 0);
    assert.match(report.note, /No built item declares composes; nothing was checked/);
  } finally {
    removeDirs(dir);
  }
});

test("--composes states what it cannot see in its JSON note", () => {
  const dir = composeProject();
  try {
    writeIn(dir, "src/Card.tsx", 'import { Button } from "./Button";\n');
    const { report } = runCli(["--composes", dir, "--platform", "web-desktop"]);
    assert.match(report.note, /re-export/);
    assert.match(report.note, /run time/);
  } finally {
    removeDirs(dir);
  }
});

// A use is a name in markup, a call or trailing closure, or member access. A mention is not.
const USE_CASES = [
  ["markup <Button />", "export const Card = () => <Button />;\n", true],
  ["call Button(", "export const Card = () => Button({});\n", true],
  ["trailing closure Button {", "export const Card = () => { Button { }; };\n", true],
  ["member Button.Icon", "export const Card = () => Button.Icon;\n", true],
  ["bare word Button", "export const Card = () => Button;\n", false],
  ["a string literal", 'export const Card = () => "Button";\n', false],
  ["a longer identifier MyButton(", "export const Card = () => MyButton();\n", false],
  ["a hyphenated my-Button(", "export const Card = () => my-Button();\n", false],
  ["an import only", 'import { Button } from "./Button";\nexport const Card = () => null;\n', false],
  ["a type-only import with no use", 'import type { Button } from "./Button";\nexport const Card = () => null;\n', false],
  ["a use in a block comment", "/* <Button /> */\nexport const Card = () => null;\n", false],
  ["a use in a line comment", "// Button()\nexport const Card = () => null;\n", false],
];

test("--composes needs a use of the name, not a mention of it", () => {
  const dir = composeProject();
  try {
    for (const [label, source, expectPass] of USE_CASES) {
      writeIn(dir, "src/Card.tsx", source);
      const { code } = runCli(["--composes", dir, "--platform", "web-desktop", "--layer", "molecules"]);
      assert.equal(code === 0, expectPass, `${label}: exit ${code}`);
    }
  } finally {
    removeDirs(dir);
  }
});

test("--composes reads Svelte markup comments as comments, and markup as a use", () => {
  const dir = composeProject();
  try {
    editManifest(dir, (m) => {
      m.platforms["web-desktop"].molecules.find((e) => e.name === "Card").file = "src/Card.svelte";
    });
    writeIn(dir, "src/Card.svelte", "<!-- <Button /> -->\n<section></section>\n");
    assert.equal(runCli(["--composes", dir, "--platform", "web-desktop", "--layer", "molecules"]).code, 1);
    writeIn(dir, "src/Card.svelte", "<section><Button /></section>\n");
    assert.equal(runCli(["--composes", dir, "--platform", "web-desktop", "--layer", "molecules"]).code, 0);
  } finally {
    removeDirs(dir);
  }
});

test("--blast on a compiled stack moves nothing and says why, pointing at --composes", () => {
  const dir = writeProbeProject(scratchProject(), { "atoms/Lone/default.ts": "export const Lone = 1;\n" });
  try {
    const { code, stderr, report } = runCli(["--blast", "Lone", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stderr);
    assert.deepEqual(report.moved, []);
    assert.match(report.note, /comment-only perturbation does not change a compiled render/);
    assert.match(report.note, /--composes/);
  } finally {
    removeDirs(dir);
  }
});

test("--blast on a rendered stack reports the composed dependents and carries no note", () => {
  const dir = cloneFixture(PIXEL_FIXTURE, "pp-blast-");
  try {
    const { code, report } = runCli(["--blast", "Button", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0);
    const keys = report.moved.map((m) => m.key).sort();
    assert.deepEqual(keys, ["atoms/Button/default", "molecules/Card/default", "screens/Home/default"]);
    assert.equal(report.note, undefined);
  } finally {
    removeDirs(dir);
  }
});
