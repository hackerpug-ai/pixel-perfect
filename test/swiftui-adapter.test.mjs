// The shipped SwiftUI adapter template is the package in docs/adapters/swiftui.md.
// On this Mac the test copies those fences into a scratch package, runs `swift run`,
// and asks the catalog verifier to accept the PNG. A handwritten PNG is not used.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { inspectPng } from "../plugins/pixel-perfect/scripts/png.mjs";
import { main as catalog } from "../plugins/pixel-perfect/scripts/verify-catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOC = path.join(ROOT, "plugins/pixel-perfect/docs/adapters/swiftui.md");

function filesFromDoc(markdown) {
  const files = new Map();
  const parts = markdown.split(/^### /m).slice(1);
  for (const part of parts) {
    const name = part.slice(0, part.indexOf("\n")).trim();
    if (!name.includes(".")) continue;
    const fence = part.match(/```swift\n([\s\S]*?)```/);
    if (!fence) continue;
    files.set(name, fence[1]);
  }
  return files;
}

test("the SwiftUI template renders a real PNG and the catalog verifier accepts it", () => {
  const doc = readFileSync(DOC, "utf8");
  const files = filesFromDoc(doc);
  assert.ok(files.has("Package.swift"));
  assert.ok(files.has("Sources/Render/main.swift"));
  assert.match(files.get("Sources/Render/main.swift"), /ImageRenderer/);
  if (process.platform !== "darwin") return;

  const pack = mkdtempSync(path.join(tmpdir(), "pp-swiftui-"));
  const project = mkdtempSync(path.join(tmpdir(), "pp-swiftui-proj-"));
  try {
    for (const [name, body] of files) {
      const full = path.join(pack, name);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, body);
    }
    const png = path.join(pack, "badge.png");
    execFileSync("swift", ["run", "-c", "release", "--package-path", pack, "Render", png], {
      cwd: pack,
      stdio: "pipe",
      timeout: 180000,
    });
    const info = inspectPng(readFileSync(png));
    assert.equal(info.status, "ok", info.reason);
    assert.ok(info.inkPixels >= 64, `ink ${info.inkPixels}`);
    assert.ok(info.width >= 8 && info.height >= 8);

    mkdirSync(path.join(project, "sandbox/catalog/atoms/Badge"), { recursive: true });
    mkdirSync(path.join(project, "src"), { recursive: true });
    mkdirSync(path.join(project, "design"), { recursive: true });
    writeFileSync(path.join(project, "sandbox/catalog/atoms/Badge/default.txt"), "Badge\nlabel=Save\n");
    writeFileSync(path.join(project, "sandbox/catalog/atoms/Badge/default.png"), readFileSync(png));
    writeFileSync(path.join(project, "src/Badge.swift"), readFileSync(path.join(pack, "Sources/Render/main.swift")));
    writeFileSync(
      path.join(project, "design/manifest.json"),
      JSON.stringify({
        goal: "swiftui render",
        platforms: {
          "mobile-ios": {
            tools: { style_contract_source: "none", component_contract_source: "none" },
            capture: {
              medium: "png",
              catalog: "sandbox/catalog",
              goldens: "design/goldens/mobile-ios",
              staging: "design/.captures/mobile-ios",
              viewport: "390x844",
              pixels: "required",
            },
            atoms: [{ name: "Badge", file: "src/Badge.swift", story: "src/Badge.swift", status: "pending" }],
          },
        },
      }, null, 2),
    );
    let stdout = "";
    let stderr = "";
    const prevOut = process.stdout.write;
    const prevErr = process.stderr.write;
    process.stdout.write = (chunk) => {
      stdout += chunk;
      return true;
    };
    process.stderr.write = (chunk) => {
      stderr += chunk;
      return true;
    };
    let code;
    try {
      code = catalog(["--baseline", project, "--platform", "mobile-ios"]);
    } finally {
      process.stdout.write = prevOut;
      process.stderr.write = prevErr;
    }
    assert.equal(code, 0, stderr + stdout);
    console.log(`swiftui png ${info.width}x${info.height} ink=${info.inkPixels} catalog=${code}`);
  } finally {
    rmSync(pack, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
});
