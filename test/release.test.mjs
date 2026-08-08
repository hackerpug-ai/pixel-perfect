import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import {
  RELEASE_PATHS,
  compareSemver,
  parseSemver,
  prepareRelease,
  verifyVersionState,
} from "../scripts/release.mjs";

const execFile = promisify(execFileCallback);
const CHANNELS = {
  claude: "claude-marketplace",
  codex: "codex-marketplace",
  grok: "claude-marketplace",
  opencode: "opencode-adapter",
};

async function writeJson(root, relativePath, value) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function makeFixture(options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "pixel-perfect-release-test-"));
  const version = options.version ?? "7.1.0";
  const dependency = "1.16.2";
  const versions = {
    authority: version,
    codex: version,
    claude: version,
    marketplaceMetadata: version,
    marketplacePlugin: version,
    opencodePackage: version,
    opencodeLock: version,
    opencodeLockRoot: version,
    ...options.versions,
  };

  await Promise.all([
    writeJson(root, RELEASE_PATHS.authority, {
      name: "pixel-perfect",
      version: versions.authority,
      channels: CHANNELS,
      preserved: { authority: true },
    }),
    writeJson(root, RELEASE_PATHS.codexManifest, {
      name: "pixel-perfect",
      version: versions.codex,
      description: "codex",
      preserved: { codex: true },
    }),
    writeJson(root, RELEASE_PATHS.claudeManifest, {
      name: "pixel-perfect",
      version: versions.claude,
      description: "claude",
      preserved: { claude: true },
    }),
    writeJson(root, RELEASE_PATHS.claudeMarketplace, {
      name: "pixel-perfect",
      metadata: { version: versions.marketplaceMetadata, preserved: true },
      plugins: [
        {
          name: "pixel-perfect",
          version: versions.marketplacePlugin,
          source: "./plugins/pixel-perfect",
          preserved: { marketplace: true },
        },
      ],
    }),
    writeJson(root, RELEASE_PATHS.opencodePackage, {
      name: "pixel-perfect-opencode-adapter",
      version: versions.opencodePackage,
      private: true,
      preserved: { package: true },
      dependencies: { "@opencode-ai/plugin": options.packageDependency ?? dependency },
    }),
    writeJson(root, RELEASE_PATHS.opencodeLock, {
      name: "pixel-perfect-opencode-adapter",
      version: versions.opencodeLock,
      lockfileVersion: 3,
      preserved: { lock: true },
      packages: {
        "": {
          name: "pixel-perfect-opencode-adapter",
          version: versions.opencodeLockRoot,
          preserved: { root: true },
          dependencies: { "@opencode-ai/plugin": options.lockRootDependency ?? dependency },
        },
        "node_modules/@opencode-ai/plugin": {
          version: options.lockedDependency ?? dependency,
          resolved: "https://registry.example.invalid/plugin.tgz",
          integrity: "sha512-preserved",
        },
      },
    }),
  ]);
  await writeFile(
    path.join(root, RELEASE_PATHS.changelog),
    options.changelog ??
      `# Changelog\n\n## [Unreleased]\n\n### Added\n\n- Pending release note.\n\n## [${version}] - 2026-08-01\n\n- Existing release.\n`,
    "utf8",
  );
  await execFile("git", ["init", "-b", "main"], { cwd: root });
  return root;
}

async function json(root, relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function dispose(root) {
  await rm(root, { recursive: true, force: true });
}

test("strict semver parsing and precedence", () => {
  assert.equal(parseSemver("7.1.0-beta.2+build.5").prerelease.join("."), "beta.2");
  assert.equal(compareSemver("7.1.0-beta.2", "7.1.0-beta.10"), -1);
  assert.equal(compareSemver("7.1.0", "7.1.0-rc.1"), 1);
  assert.throws(() => parseSemver("7.1"), /strict semver/);
  assert.throws(() => parseSemver("07.1.0"), /strict semver/);
  assert.throws(() => parseSemver("7.1.0-01"), /strict semver/);
});

test("prepare repairs divergent product versions and no other JSON fields", async () => {
  const root = await makeFixture({
    version: "7.0.1",
    versions: {
      codex: "6.9.0",
      claude: "7.0.0",
      marketplaceMetadata: "6.8.0",
      marketplacePlugin: "6.7.0",
      opencodePackage: "6.6.0",
      opencodeLock: "6.5.0",
      opencodeLockRoot: "6.4.0",
    },
  });

  try {
    const before = await Promise.all(Object.values(RELEASE_PATHS).slice(0, 6).map((relativePath) => json(root, relativePath)));
    const state = await prepareRelease(root, "7.1.0", { date: "2026-08-07" });
    assert.deepEqual(state.channels, { claude: "7.1.0", codex: "7.1.0", grok: "7.1.0", opencode: "7.1.0" });

    const after = await Promise.all(Object.values(RELEASE_PATHS).slice(0, 6).map((relativePath) => json(root, relativePath)));
    const versionPaths = [
      [0, ["version"]],
      [1, ["version"]],
      [2, ["version"]],
      [3, ["metadata", "version"]],
      [3, ["plugins", 0, "version"]],
      [4, ["version"]],
      [5, ["version"]],
      [5, ["packages", "", "version"]],
    ];
    for (const [index, keys] of versionPaths) {
      let cursor = after[index];
      for (const key of keys.slice(0, -1)) cursor = cursor[key];
      assert.equal(cursor[keys.at(-1)], "7.1.0");

      let beforeCursor = before[index];
      for (const key of keys.slice(0, -1)) beforeCursor = beforeCursor[key];
      beforeCursor[keys.at(-1)] = "<version>";
      cursor[keys.at(-1)] = "<version>";
    }
    assert.deepEqual(after, before);
    assert.equal(after[4].dependencies["@opencode-ai/plugin"], "1.16.2");
    assert.equal(after[5].packages["node_modules/@opencode-ai/plugin"].version, "1.16.2");

    const changelog = await readFile(path.join(root, RELEASE_PATHS.changelog), "utf8");
    assert.match(changelog, /^## \[7\.1\.0\] - 2026-08-07$/m);
    assert.match(changelog, /## \[7\.1\.0\][\s\S]*Pending release note/);
  } finally {
    await dispose(root);
  }
});

test("verify is read-only", async () => {
  const root = await makeFixture();
  try {
    const paths = Object.values(RELEASE_PATHS);
    const before = await Promise.all(paths.map((relativePath) => readFile(path.join(root, relativePath), "utf8")));
    await verifyVersionState(root, "7.1.0", { environment: {} });
    const after = await Promise.all(paths.map((relativePath) => readFile(path.join(root, relativePath), "utf8")));
    assert.deepEqual(after, before);
  } finally {
    await dispose(root);
  }
});

for (const scenario of [
  {
    name: "stale Claude marketplace metadata",
    options: { versions: { marketplaceMetadata: "7.0.9" } },
    pattern: /marketplace\.json metadata\.version is 7\.0\.9/,
  },
  {
    name: "stale Claude marketplace plugin entry",
    options: { versions: { marketplacePlugin: "7.0.9" } },
    pattern: /marketplace\.json plugin\.version is 7\.0\.9/,
  },
  {
    name: "stale Codex manifest",
    options: { versions: { codex: "7.0.9" } },
    pattern: /codex-plugin\/plugin\.json is 7\.0\.9/,
  },
  {
    name: "stale OpenCode package",
    options: { versions: { opencodePackage: "7.0.9" } },
    pattern: /\.opencode\/package\.json is 7\.0\.9/,
  },
  {
    name: "stale OpenCode lockfile",
    options: { versions: { opencodeLock: "7.0.9" } },
    pattern: /package-lock\.json is 7\.0\.9/,
  },
  {
    name: "stale OpenCode lock root package",
    options: { versions: { opencodeLockRoot: "7.0.9" } },
    pattern: /packages\[""\]\.version is 7\.0\.9/,
  },
]) {
  test(`verify rejects ${scenario.name}`, async () => {
    const root = await makeFixture(scenario.options);
    try {
      await assert.rejects(
        verifyVersionState(root, "7.1.0", { environment: {} }),
        (error) => scenario.pattern.test(error.details.join("\n")),
      );
    } finally {
      await dispose(root);
    }
  });
}

test("verify rejects invalid semver", async () => {
  const root = await makeFixture({ versions: { authority: "7.1" } });
  try {
    await assert.rejects(
      verifyVersionState(root, undefined, { environment: {} }),
      (error) => error.details.some((detail) => detail.includes("not strict semver")),
    );
  } finally {
    await dispose(root);
  }
});

test("verify rejects tag/version mismatch", async () => {
  const root = await makeFixture();
  try {
    await assert.rejects(
      verifyVersionState(root, undefined, { tagName: "v7.1.1", environment: {} }),
      (error) => error.details.includes("tag v7.1.1 does not equal v7.1.0"),
    );
  } finally {
    await dispose(root);
  }
});

test("verify rejects accidental OpenCode dependency-version modification", async () => {
  const root = await makeFixture({
    packageDependency: "1.17.0",
    lockRootDependency: "1.17.0",
    lockedDependency: "1.17.0",
  });
  try {
    await assert.rejects(
      verifyVersionState(root, undefined, { environment: {} }),
      (error) => error.details.some((detail) => detail.includes("must remain at its independent pinned version 1.16.2")),
    );
  } finally {
    await dispose(root);
  }
});

test("prepare rejects an existing target tag", async () => {
  const root = await makeFixture({ version: "7.0.1", changelog: "# Changelog\n\n## [Unreleased]\n\n- Next.\n" });
  try {
    await execFile("git", ["config", "user.email", "test@example.com"], { cwd: root });
    await execFile("git", ["config", "user.name", "Release Test"], { cwd: root });
    await execFile("git", ["add", "."], { cwd: root });
    await execFile("git", ["commit", "-m", "fixture"], { cwd: root });
    await execFile("git", ["tag", "v7.1.0"], { cwd: root });
    await assert.rejects(prepareRelease(root, "7.1.0"), /tag v7\.1\.0 already exists/);
  } finally {
    await dispose(root);
  }
});

test("prepare rejects non-incrementing versions", async () => {
  const root = await makeFixture();
  try {
    await assert.rejects(prepareRelease(root, "7.1.0"), /must exceed current version/);
    await assert.rejects(prepareRelease(root, "7.0.9"), /must exceed current version/);
  } finally {
    await dispose(root);
  }
});

test("prepare fails before writing when a release document is malformed", async () => {
  const root = await makeFixture({ version: "7.0.1" });
  try {
    const authorityBefore = await readFile(path.join(root, RELEASE_PATHS.authority), "utf8");
    await writeFile(path.join(root, RELEASE_PATHS.claudeManifest), "{ malformed", "utf8");
    await assert.rejects(prepareRelease(root, "7.1.0"), /malformed JSON/);
    assert.equal(await readFile(path.join(root, RELEASE_PATHS.authority), "utf8"), authorityBefore);
  } finally {
    await dispose(root);
  }
});
