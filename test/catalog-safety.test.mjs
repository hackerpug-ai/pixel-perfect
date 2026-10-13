// Staging safety, --only scope, one structural artifact per story state, and capture-command
// hardening (timeout, tamper detection) for verify-catalog.mjs. Real temp projects, real files, and
// a real child process for every capture command.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, symlinkSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import {
  PIXEL_FIXTURE,
  STAGE_SCRIPT_HEAD,
  ROOT,
  cloneFixture,
  editManifest,
  readIn,
  removeDirs,
  runCli,
  scratchProject,
  writeCommandProject,
  writeIn,
} from "./helpers/catalog.mjs";

const GOLDENS = "design/goldens/web-desktop";
const HELPER_PNG = pathToFileURL(path.join(ROOT, "test/helpers/png.mjs")).href;

function pixelClone() {
  return cloneFixture(PIXEL_FIXTURE, "pp-safety-");
}

// --- M3: staging is accepted only inside design/.captures/ or the system temp directory ---

// SAFETY: these cases call the guard function only. They never run the CLI with a real path
// outside a temp project. On 2026-10-13 a CLI test passed "--out /" to code whose guard did not
// refuse it, and the script's recursive delete ran against the real file system. A test must
// never hand a path it does not own to code that deletes.
test("the staging guard refuses /, the project root, a parent, and the home directory", async () => {
  const { assertStagingAllowed } = await import(
    pathToFileURL(path.join(ROOT, "plugins/pixel-perfect/scripts/verify-catalog.mjs")).href
  );
  const dir = pixelClone();
  try {
    for (const dangerous of ["/", dir, path.dirname(dir), process.env.HOME, "/usr/local", "/Library"]) {
      assert.throws(
        () => assertStagingAllowed(dir, dangerous, "--out", GOLDENS),
        /--out/,
        `the guard must refuse ${dangerous}`
      );
    }
  } finally {
    removeDirs(dir);
  }
});

test("--out inside design/ but outside design/.captures/ is refused", () => {
  const dir = pixelClone();
  try {
    const { code, stderr } = runCli(["--render", dir, "--platform", "web-desktop", "--only", "atoms/Button", "--out", "design/.render"]);
    assert.equal(code, 2, stderr);
    assert.match(stderr, /design\/\.captures/);
  } finally {
    removeDirs(dir);
  }
});

test("--out pointing at the goldens folder is refused and the goldens survive", () => {
  const dir = pixelClone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    const before = readIn(dir, `${GOLDENS}/atoms/Button/default.dom`);
    const { code, stderr } = runCli(["--render", dir, "--platform", "web-desktop", "--only", "atoms/Button", "--out", GOLDENS]);
    assert.equal(code, 2, stderr);
    assert.equal(readIn(dir, `${GOLDENS}/atoms/Button/default.dom`), before, "the goldens must not be touched");
  } finally {
    removeDirs(dir);
  }
});

test("the staging guard refuses a path outside the project and outside the temp directory", async () => {
  const { assertStagingAllowed } = await import(
    pathToFileURL(path.join(ROOT, "plugins/pixel-perfect/scripts/verify-catalog.mjs")).href
  );
  const dir = pixelClone();
  const outside = path.join("/usr/local", "pp-not-allowed-" + process.pid);
  try {
    assert.throws(() => assertStagingAllowed(dir, outside, "--out", GOLDENS), /--out/);
    assert.equal(existsSync(outside), false, "a refused staging directory must not be created");
  } finally {
    removeDirs(dir);
  }
});

test("a symbolic link on the --out path is refused and its target is untouched", () => {
  const dir = pixelClone();
  const victim = scratchProject("pp-victim-");
  try {
    writeIn(victim, "keep.txt", "keep me\n");
    mkdirSync(path.join(dir, "design/.captures"), { recursive: true });
    symlinkSync(victim, path.join(dir, "design/.captures/link"));
    const { code, stderr } = runCli(["--render", dir, "--platform", "web-desktop", "--only", "atoms/Button", "--out", "design/.captures/link"]);
    assert.equal(code, 2, stderr);
    assert.match(stderr, /symbolic link/);
    assert.equal(readFileSync(path.join(victim, "keep.txt"), "utf8"), "keep me\n");
  } finally {
    removeDirs(dir, victim);
  }
});

test("a symbolic link as an ancestor of --out is refused", () => {
  const dir = pixelClone();
  const victim = scratchProject("pp-victim-");
  try {
    writeIn(victim, "keep.txt", "keep me\n");
    mkdirSync(path.join(dir, "design/.captures"), { recursive: true });
    symlinkSync(victim, path.join(dir, "design/.captures/hop"));
    const { code } = runCli(["--render", dir, "--platform", "web-desktop", "--only", "atoms/Button", "--out", "design/.captures/hop/inner"]);
    assert.equal(code, 2);
    assert.equal(existsSync(path.join(victim, "inner")), false);
  } finally {
    removeDirs(dir, victim);
  }
});

test("a manifest capture.staging that points at the goldens is refused before the capture runs", () => {
  const dir = pixelClone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    const before = readIn(dir, `${GOLDENS}/atoms/Button/default.dom`);
    editManifest(dir, (m) => {
      m.platforms["web-desktop"].capture.staging = GOLDENS;
    });
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 2, stderr);
    assert.match(stderr, /capture\.staging/);
    assert.equal(readIn(dir, `${GOLDENS}/atoms/Button/default.dom`), before);
  } finally {
    removeDirs(dir);
  }
});

test("the catalog walk delete refuses a symlink staging directory and leaves the target", async () => {
  const { captureFromCatalog } = await import(
    pathToFileURL(path.join(ROOT, "plugins/pixel-perfect/scripts/verify-catalog.mjs")).href
  );
  const dir = pixelClone();
  const victim = scratchProject("pp-victim-");
  try {
    writeIn(victim, "keep.txt", "keep me\n");
    mkdirSync(path.join(dir, "design/.captures"), { recursive: true });
    symlinkSync(victim, path.join(dir, "design/.captures/link"));
    assert.throws(
      () => captureFromCatalog(dir, "sandbox/stories", "design/.captures/link", null, GOLDENS),
      /symbolic link/,
    );
    assert.equal(readFileSync(path.join(victim, "keep.txt"), "utf8"), "keep me\n");
  } finally {
    removeDirs(dir, victim);
  }
});

test("the capture-command delete refuses a staging path that overlaps the goldens", async () => {
  const { runCapture } = await import(
    pathToFileURL(path.join(ROOT, "plugins/pixel-perfect/scripts/verify-catalog.mjs")).href
  );
  const dir = pixelClone();
  const marker = path.join(dir, "command-ran.txt");
  try {
    writeIn(dir, `${GOLDENS}/atoms/Button/default.dom`, "<p>keep</p>\n");
    assert.throws(
      () =>
        runCapture(dir, {
          command: `node -e ${JSON.stringify(`require("fs").writeFileSync(${JSON.stringify(marker)}, "ran")`)}`,
          staging: GOLDENS,
          goldens: GOLDENS,
          catalogDir: "sandbox/stories",
          timeoutMs: 5000,
        }),
      /overlaps the goldens/,
    );
    assert.equal(readIn(dir, `${GOLDENS}/atoms/Button/default.dom`), "<p>keep</p>\n");
    assert.equal(existsSync(marker), false, "a refused staging path must not run the capture command");
  } finally {
    removeDirs(dir);
  }
});

test("--out inside design/.captures/ is allowed", () => {
  const dir = pixelClone();
  try {
    const { code, stderr } = runCli(["--render", dir, "--platform", "web-desktop", "--only", "atoms/Button", "--out", "design/.captures/button"]);
    assert.equal(code, 0, stderr);
  } finally {
    removeDirs(dir);
  }
});

// --- S2: --only is a render option ---

test("--only with --baseline is a usage error (exit 2)", () => {
  const dir = pixelClone();
  try {
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop", "--only", "atoms/Button"]);
    assert.equal(code, 2);
    assert.match(stderr, /--only is valid only with --render/);
    assert.equal(existsSync(path.join(dir, GOLDENS)), false);
  } finally {
    removeDirs(dir);
  }
});

// --- S3: one structural artifact per story state; PNG extensions case-insensitive; others ignored ---

test("two structural artifacts for one story state is a config error (exit 2)", () => {
  const dir = writeCommandProject(
    scratchProject(),
    `${STAGE_SCRIPT_HEAD}put("atoms/Dup/default.txt", "Dup\\na=1\\n");\nput("atoms/Dup/default.html", "<b>Dup</b>\\n");\n`,
  );
  try {
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 2, stderr);
    assert.match(stderr, /two structural artifacts for atoms\/Dup\/default/);
  } finally {
    removeDirs(dir);
  }
});

test("an upper-case .PNG is the state's pixel evidence", () => {
  const dir = writeCommandProject(
    scratchProject(),
    `${STAGE_SCRIPT_HEAD}import { inkImage } from ${JSON.stringify(HELPER_PNG)};\nput("atoms/Glyph/default.txt", "Glyph\\nx=1\\n");\nput("atoms/Glyph/default.PNG", inkImage({ width: 16, height: 16, inkCount: 100 }));\n`,
    { pixels: "required", pixels_reason: undefined, viewport: "16x16" },
  );
  try {
    const { code, stderr, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stderr + JSON.stringify(report?.violations));
  } finally {
    removeDirs(dir);
  }
});

test("a file with an unknown extension is listed in ignoredFiles and never rewritten", () => {
  const dir = writeCommandProject(
    scratchProject(),
    `${STAGE_SCRIPT_HEAD}put("atoms/Thing/default.txt", "Thing\\na=1\\n");\nput("atoms/Thing/default.bin", "raw-bytes-no-newline");\n`,
  );
  try {
    const { code, stderr, report } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 0, stderr);
    assert.deepEqual(report.ignoredFiles, ["atoms/Thing/default.bin"]);
    assert.equal(readFileSync(path.join(dir, "design/.captures/web-desktop/atoms/Thing/default.bin"), "utf8"), "raw-bytes-no-newline");
  } finally {
    removeDirs(dir);
  }
});

// --- S6: capture command timeout and gate-input tamper detection ---

test("a capture command that runs past capture.timeout_ms is exit 2 with a clear message", () => {
  const dir = writeCommandProject(
    scratchProject(),
    `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 8000);\n`,
    { timeout_ms: 300 },
  );
  try {
    const started = Date.now();
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 2, stderr);
    assert.match(stderr, /timed out after 300 ms/);
    assert.ok(Date.now() - started < 7000, "the timeout must stop the command, not wait it out");
  } finally {
    removeDirs(dir);
  }
});

test("a capture command that writes into the goldens is refused (exit 2) and says why", () => {
  const dir = pixelClone();
  try {
    assert.equal(runCli(["--baseline", dir, "--platform", "web-desktop"]).code, 0);
    const before = readIn(dir, `${GOLDENS}/atoms/Button/default.dom`);
    writeIn(
      dir,
      "sandbox/capture.mjs",
      `import { writeFileSync, mkdirSync } from "node:fs";\nmkdirSync("design/goldens/web-desktop/atoms/Evil", { recursive: true });\nwriteFileSync("design/goldens/web-desktop/atoms/Evil/default.dom", "<p>evil</p>\\n");\nprocess.exit(0);\n`,
    );
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 2, stderr);
    assert.match(stderr, /the capture command modified gate inputs/);
    assert.equal(readIn(dir, `${GOLDENS}/atoms/Button/default.dom`), before);
  } finally {
    removeDirs(dir);
  }
});

test("a capture command that edits design/manifest.json is refused (exit 2)", () => {
  const dir = writeCommandProject(
    scratchProject(),
    `${STAGE_SCRIPT_HEAD}put("atoms/Thing/default.txt", "Thing\\n");\nimport { appendFileSync } from "node:fs";\nappendFileSync("design/manifest.json", "\\n");\n`,
  );
  try {
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop"]);
    assert.equal(code, 2, stderr);
    assert.match(stderr, /modified gate inputs/);
    assert.match(stderr, /design\/manifest\.json/);
  } finally {
    removeDirs(dir);
  }
});

test("a command that ignores PIXEL_PERFECT_CAPTURE_LAYER cannot put another layer into the goldens", () => {
  const dir = writeCommandProject(
    scratchProject(),
    `${STAGE_SCRIPT_HEAD}put("atoms/Thing/default.txt", "Thing\\nx=1\\n");\nput("molecules/Other/default.txt", "Other\\nx=1\\n");\n`,
  );
  try {
    const { code, stderr } = runCli(["--baseline", dir, "--platform", "web-desktop", "--layer", "atoms"]);
    assert.equal(code, 0, stderr);
    assert.ok(existsSync(path.join(dir, GOLDENS, "atoms/Thing/default.txt")));
    assert.equal(existsSync(path.join(dir, GOLDENS, "molecules")), false, "nothing outside the layer may be written");
  } finally {
    removeDirs(dir);
  }
});
