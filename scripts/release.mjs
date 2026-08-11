#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkRuntimePaths } from "./check-runtime-paths.mjs";
import { validatePackage } from "./validate-package.mjs";
import { validatePlugin } from "./validate-plugin.mjs";
import { validateSkills } from "./validate-skills.mjs";

const execFile = promisify(execFileCallback);
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCT_NAME = "pixel-perfect";
const OPENCODE_PACKAGE_NAME = "pixel-perfect-opencode-adapter";
const OPENCODE_DEPENDENCY = "@opencode-ai/plugin";
const OPENCODE_DEPENDENCY_VERSION = "1.16.2";
const CHANNELS = {
  claude: "claude-marketplace",
  codex: "codex-marketplace",
  cursor: "cursor-marketplace",
  grok: "claude-marketplace",
  opencode: "opencode-adapter",
};

export const RELEASE_PATHS = {
  authority: "plugin-release.json",
  codexManifest: "plugins/pixel-perfect/.codex-plugin/plugin.json",
  claudeManifest: "plugins/pixel-perfect/.claude-plugin/plugin.json",
  claudeMarketplace: ".claude-plugin/marketplace.json",
  cursorManifest: "plugins/pixel-perfect/.cursor-plugin/plugin.json",
  cursorMarketplace: ".cursor-plugin/marketplace.json",
  opencodePackage: "plugins/pixel-perfect/.opencode/package.json",
  opencodeLock: "plugins/pixel-perfect/.opencode/package-lock.json",
  changelog: "CHANGELOG.md",
};

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export class ReleaseError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ReleaseError";
    this.details = details;
  }
}

export function parseSemver(value, label = "version") {
  if (typeof value !== "string") {
    throw new ReleaseError(`${label} must be a string containing strict semver`);
  }

  const match = SEMVER_PATTERN.exec(value);
  if (!match) {
    throw new ReleaseError(`${label} is not strict semver: ${JSON.stringify(value)}`);
  }

  return {
    raw: value,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
    build: match[5] ? match[5].split(".") : [],
  };
}

function comparePrerelease(left, right) {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] === undefined) return -1;
    if (right[index] === undefined) return 1;
    if (left[index] === right[index]) continue;

    const leftNumeric = /^\d+$/.test(left[index]);
    const rightNumeric = /^\d+$/.test(right[index]);
    if (leftNumeric && rightNumeric) return Number(left[index]) < Number(right[index]) ? -1 : 1;
    if (leftNumeric) return -1;
    if (rightNumeric) return 1;
    return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

export function compareSemver(leftValue, rightValue) {
  const left = parseSemver(leftValue, "left version");
  const right = parseSemver(rightValue, "right version");
  for (const key of ["major", "minor", "patch"]) {
    if (left[key] !== right[key]) return left[key] < right[key] ? -1 : 1;
  }
  return comparePrerelease(left.prerelease, right.prerelease);
}

async function readText(root, relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch (error) {
    throw new ReleaseError(`cannot read ${relativePath}: ${error.message}`);
  }
}

async function readJson(root, relativePath) {
  const text = await readText(root, relativePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ReleaseError(`malformed JSON in ${relativePath}: ${error.message}`);
  }
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ReleaseError(`${label} must be an object`);
  }
  return value;
}

function findPlugin(marketplace, relativePath) {
  if (!Array.isArray(marketplace.plugins)) {
    throw new ReleaseError(`${relativePath}.plugins must be an array`);
  }
  const entries = marketplace.plugins.filter((entry) => entry?.name === PRODUCT_NAME);
  if (entries.length !== 1) {
    throw new ReleaseError(`${relativePath} must contain exactly one ${PRODUCT_NAME} plugin entry`);
  }
  return entries[0];
}

export async function readReleaseDocuments(root = REPOSITORY_ROOT) {
  const [
    authority,
    codexManifest,
    claudeManifest,
    claudeMarketplace,
    cursorManifest,
    cursorMarketplace,
    opencodePackage,
    opencodeLock,
    changelog,
  ] = await Promise.all([
    readJson(root, RELEASE_PATHS.authority),
    readJson(root, RELEASE_PATHS.codexManifest),
    readJson(root, RELEASE_PATHS.claudeManifest),
    readJson(root, RELEASE_PATHS.claudeMarketplace),
    readJson(root, RELEASE_PATHS.cursorManifest),
    readJson(root, RELEASE_PATHS.cursorMarketplace),
    readJson(root, RELEASE_PATHS.opencodePackage),
    readJson(root, RELEASE_PATHS.opencodeLock),
    readText(root, RELEASE_PATHS.changelog),
  ]);

  requireObject(authority, RELEASE_PATHS.authority);
  requireObject(codexManifest, RELEASE_PATHS.codexManifest);
  requireObject(claudeManifest, RELEASE_PATHS.claudeManifest);
  requireObject(claudeMarketplace, RELEASE_PATHS.claudeMarketplace);
  requireObject(claudeMarketplace.metadata, `${RELEASE_PATHS.claudeMarketplace}.metadata`);
  requireObject(cursorManifest, RELEASE_PATHS.cursorManifest);
  requireObject(cursorMarketplace, RELEASE_PATHS.cursorMarketplace);
  requireObject(cursorMarketplace.metadata, `${RELEASE_PATHS.cursorMarketplace}.metadata`);
  requireObject(opencodePackage, RELEASE_PATHS.opencodePackage);
  requireObject(opencodePackage.dependencies, `${RELEASE_PATHS.opencodePackage}.dependencies`);
  requireObject(opencodeLock, RELEASE_PATHS.opencodeLock);
  requireObject(opencodeLock.packages, `${RELEASE_PATHS.opencodeLock}.packages`);
  requireObject(opencodeLock.packages[""], `${RELEASE_PATHS.opencodeLock}.packages[\"\"]`);
  requireObject(opencodeLock.packages[""].dependencies, `${RELEASE_PATHS.opencodeLock}.packages[\"\"].dependencies`);
  requireObject(
    opencodeLock.packages[`node_modules/${OPENCODE_DEPENDENCY}`],
    `${RELEASE_PATHS.opencodeLock}.packages[\"node_modules/${OPENCODE_DEPENDENCY}\"]`,
  );

  return {
    authority,
    codexManifest,
    claudeManifest,
    claudeMarketplace,
    claudeMarketplacePlugin: findPlugin(claudeMarketplace, RELEASE_PATHS.claudeMarketplace),
    cursorManifest,
    cursorMarketplace,
    cursorMarketplacePlugin: findPlugin(cursorMarketplace, RELEASE_PATHS.cursorMarketplace),
    opencodePackage,
    opencodeLock,
    changelog,
  };
}

function collectStateErrors(documents, expectedVersion, tagName) {
  const errors = [];
  const { authority } = documents;

  if (authority.name !== PRODUCT_NAME) {
    errors.push(`${RELEASE_PATHS.authority}.name must be ${PRODUCT_NAME}`);
  }
  for (const [channel, source] of Object.entries(CHANNELS)) {
    if (authority.channels?.[channel] !== source) {
      errors.push(`${RELEASE_PATHS.authority}.channels.${channel} must be ${source}`);
    }
  }

  const surfaces = [
    ["release authority", RELEASE_PATHS.authority, authority.version],
    ["Codex manifest", RELEASE_PATHS.codexManifest, documents.codexManifest.version],
    ["Claude manifest", RELEASE_PATHS.claudeManifest, documents.claudeManifest.version],
    ["Claude marketplace metadata", `${RELEASE_PATHS.claudeMarketplace} metadata.version`, documents.claudeMarketplace.metadata.version],
    ["Claude marketplace plugin", `${RELEASE_PATHS.claudeMarketplace} plugin.version`, documents.claudeMarketplacePlugin.version],
    ["Cursor manifest", RELEASE_PATHS.cursorManifest, documents.cursorManifest.version],
    ["Cursor marketplace metadata", `${RELEASE_PATHS.cursorMarketplace} metadata.version`, documents.cursorMarketplace.metadata.version],
    ["OpenCode package", RELEASE_PATHS.opencodePackage, documents.opencodePackage.version],
    ["OpenCode lockfile", RELEASE_PATHS.opencodeLock, documents.opencodeLock.version],
    ["OpenCode lock root package", `${RELEASE_PATHS.opencodeLock} packages[\"\"].version`, documents.opencodeLock.packages[""].version],
  ];

  let authorityVersion;
  try {
    authorityVersion = parseSemver(authority.version, `${RELEASE_PATHS.authority}.version`).raw;
  } catch (error) {
    errors.push(error.message);
  }

  for (const [label, location, value] of surfaces.slice(1)) {
    try {
      parseSemver(value, `${label} version`);
      if (authorityVersion && value !== authorityVersion) {
        errors.push(`${location} is ${value}; expected ${authorityVersion}`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (expectedVersion !== undefined) {
    try {
      parseSemver(expectedVersion, "expected version");
      if (authorityVersion && expectedVersion !== authorityVersion) {
        errors.push(`expected version ${expectedVersion}; release authority is ${authorityVersion}`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (documents.codexManifest.name !== PRODUCT_NAME) {
    errors.push(`${RELEASE_PATHS.codexManifest}.name must be ${PRODUCT_NAME}`);
  }
  if (documents.claudeManifest.name !== PRODUCT_NAME) {
    errors.push(`${RELEASE_PATHS.claudeManifest}.name must be ${PRODUCT_NAME}`);
  }
  if (documents.cursorManifest.name !== PRODUCT_NAME) {
    errors.push(`${RELEASE_PATHS.cursorManifest}.name must be ${PRODUCT_NAME}`);
  }
  if (documents.opencodePackage.name !== OPENCODE_PACKAGE_NAME) {
    errors.push(`${RELEASE_PATHS.opencodePackage}.name must be ${OPENCODE_PACKAGE_NAME}`);
  }
  if (documents.opencodeLock.name !== OPENCODE_PACKAGE_NAME) {
    errors.push(`${RELEASE_PATHS.opencodeLock}.name must be ${OPENCODE_PACKAGE_NAME}`);
  }
  if (documents.opencodeLock.packages[""].name !== OPENCODE_PACKAGE_NAME) {
    errors.push(`${RELEASE_PATHS.opencodeLock} root package name must be ${OPENCODE_PACKAGE_NAME}`);
  }

  const packageDependency = documents.opencodePackage.dependencies[OPENCODE_DEPENDENCY];
  const lockRootDependency = documents.opencodeLock.packages[""].dependencies[OPENCODE_DEPENDENCY];
  const lockedDependency = documents.opencodeLock.packages[`node_modules/${OPENCODE_DEPENDENCY}`].version;
  try {
    parseSemver(packageDependency, `${RELEASE_PATHS.opencodePackage} ${OPENCODE_DEPENDENCY} dependency`);
  } catch (error) {
    errors.push(error.message);
  }
  if (packageDependency !== OPENCODE_DEPENDENCY_VERSION) {
    errors.push(
      `${OPENCODE_DEPENDENCY} must remain at its independent pinned version ${OPENCODE_DEPENDENCY_VERSION}; ` +
        `found ${packageDependency}`,
    );
  }
  if (packageDependency !== lockRootDependency || packageDependency !== lockedDependency) {
    errors.push(
      `${OPENCODE_DEPENDENCY} must remain synchronized independently of the product version ` +
        `(package=${packageDependency}, lock-root=${lockRootDependency}, locked=${lockedDependency})`,
    );
  }

  if (authorityVersion) {
    const headingPattern = new RegExp(`^## \\[${escapeRegExp(authorityVersion)}\\](?: - \\d{4}-\\d{2}-\\d{2})?$`, "m");
    if (!headingPattern.test(documents.changelog)) {
      errors.push(`${RELEASE_PATHS.changelog} has no section heading for ${authorityVersion}`);
    }
  }

  if (tagName !== undefined && authorityVersion && tagName !== `v${authorityVersion}`) {
    errors.push(`tag ${tagName} does not equal v${authorityVersion}`);
  }

  return errors;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tagFromEnvironment(environment = process.env) {
  if (environment.GITHUB_REF_TYPE === "tag" && environment.GITHUB_REF_NAME) return environment.GITHUB_REF_NAME;
  if (environment.GITHUB_REF?.startsWith("refs/tags/")) return environment.GITHUB_REF.slice("refs/tags/".length);
  return undefined;
}

export async function verifyVersionState(root = REPOSITORY_ROOT, expectedVersion, options = {}) {
  const documents = await readReleaseDocuments(root);
  const tagName = options.tagName ?? tagFromEnvironment(options.environment);
  const errors = collectStateErrors(documents, expectedVersion, tagName);
  if (errors.length > 0) {
    throw new ReleaseError("release version verification failed", errors);
  }

  const version = documents.authority.version;
  return {
    version,
    documents,
    channels: {
      claude: documents.claudeManifest.version,
      codex: documents.codexManifest.version,
      cursor: documents.cursorManifest.version,
      grok: documents.claudeManifest.version,
      opencode: documents.opencodePackage.version,
    },
  };
}

export async function verifyRelease(root = REPOSITORY_ROOT, expectedVersion, options = {}) {
  const state = await verifyVersionState(root, expectedVersion, options);
  if (options.packageValidation !== false) {
    await Promise.all([validatePackage(root), validatePlugin(root), validateSkills(root), checkRuntimePaths(root)]);
  }
  return state;
}

async function run(command, args, root, options = {}) {
  try {
    const result = await execFile(command, args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      ...options,
    });
    return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  } catch (error) {
    const detail = [error.stdout, error.stderr, error.message].filter(Boolean).join("\n").trim();
    throw new ReleaseError(`${command} ${args.join(" ")} failed`, detail ? [detail] : []);
  }
}

async function localTagExists(root, tagName) {
  const result = await run("git", ["tag", "--list", tagName], root);
  return result.stdout.split("\n").includes(tagName);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function prepareChangelog(changelog, version, date) {
  const targetPattern = new RegExp(`^## \\[${escapeRegExp(version)}\\](?: - \\d{4}-\\d{2}-\\d{2})?$`, "m");
  if (targetPattern.test(changelog)) return changelog;

  const unreleasedPattern = /^## \[Unreleased\][^\n]*$/m;
  const match = unreleasedPattern.exec(changelog);
  if (!match) {
    throw new ReleaseError(`${RELEASE_PATHS.changelog} needs an ## [Unreleased] section before prepare can add ${version}`);
  }

  const headingEnd = changelog.indexOf("\n", match.index);
  const bodyStart = headingEnd === -1 ? changelog.length : headingEnd + 1;
  const nextSectionMatch = /^## \[/m.exec(changelog.slice(bodyStart));
  const nextSection = nextSectionMatch ? bodyStart + nextSectionMatch.index : changelog.length;
  const before = changelog.slice(0, match.index);
  const unreleasedBody = changelog.slice(bodyStart, nextSection).replace(/^\s+|\s+$/g, "");
  const after = changelog.slice(nextSection).replace(/^\s+/, "");
  const releaseBody = unreleasedBody ? `\n${unreleasedBody}\n` : "\n";
  const suffix = after ? `\n${after}` : "";
  return `${before}## [Unreleased]\n\n## [${version}] - ${date}\n${releaseBody}${suffix}`.replace(/\n*$/, "\n");
}

async function transactionalWrite(root, files) {
  const transaction = randomUUID();
  const entries = [];

  try {
    for (const [relativePath, content] of files) {
      const absolutePath = path.join(root, relativePath);
      const metadata = await stat(absolutePath);
      const temporaryPath = `${absolutePath}.prepare-${transaction}.tmp`;
      const backupPath = `${absolutePath}.prepare-${transaction}.bak`;
      await writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx", mode: metadata.mode });
      entries.push({ absolutePath, temporaryPath, backupPath, backedUp: false, installed: false });
    }

    for (const entry of entries) {
      await rename(entry.absolutePath, entry.backupPath);
      entry.backedUp = true;
      await rename(entry.temporaryPath, entry.absolutePath);
      entry.installed = true;
    }

    await Promise.all(entries.map((entry) => rm(entry.backupPath, { force: true })));
  } catch (error) {
    for (const entry of entries.reverse()) {
      if (entry.installed) await rm(entry.absolutePath, { force: true });
      if (entry.backedUp) await rename(entry.backupPath, entry.absolutePath).catch(() => undefined);
      await rm(entry.temporaryPath, { force: true });
    }
    throw new ReleaseError(`atomic prepare failed: ${error.message}`);
  }
}

export async function prepareRelease(root = REPOSITORY_ROOT, targetVersion, options = {}) {
  parseSemver(targetVersion, "target version");
  const documents = await readReleaseDocuments(root);
  parseSemver(documents.authority.version, "current release version");
  if (compareSemver(targetVersion, documents.authority.version) <= 0) {
    throw new ReleaseError(`target version ${targetVersion} must exceed current version ${documents.authority.version}`);
  }

  const tagName = `v${targetVersion}`;
  if (await localTagExists(root, tagName)) {
    throw new ReleaseError(`tag ${tagName} already exists`);
  }

  const authority = cloneJson(documents.authority);
  const codexManifest = cloneJson(documents.codexManifest);
  const claudeManifest = cloneJson(documents.claudeManifest);
  const claudeMarketplace = cloneJson(documents.claudeMarketplace);
  const claudeMarketplacePlugin = findPlugin(claudeMarketplace, RELEASE_PATHS.claudeMarketplace);
  const cursorManifest = cloneJson(documents.cursorManifest);
  const cursorMarketplace = cloneJson(documents.cursorMarketplace);
  const opencodePackage = cloneJson(documents.opencodePackage);
  const opencodeLock = cloneJson(documents.opencodeLock);

  authority.version = targetVersion;
  codexManifest.version = targetVersion;
  claudeManifest.version = targetVersion;
  claudeMarketplace.metadata.version = targetVersion;
  claudeMarketplacePlugin.version = targetVersion;
  cursorManifest.version = targetVersion;
  cursorMarketplace.metadata.version = targetVersion;
  opencodePackage.version = targetVersion;
  opencodeLock.version = targetVersion;
  opencodeLock.packages[""].version = targetVersion;

  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const changelog = prepareChangelog(documents.changelog, targetVersion, date);
  const candidate = {
    ...documents,
    authority,
    codexManifest,
    claudeManifest,
    claudeMarketplace,
    claudeMarketplacePlugin,
    cursorManifest,
    cursorMarketplace,
    cursorMarketplacePlugin: findPlugin(cursorMarketplace, RELEASE_PATHS.cursorMarketplace),
    opencodePackage,
    opencodeLock,
    changelog,
  };
  const candidateErrors = collectStateErrors(candidate, targetVersion, undefined);
  if (candidateErrors.length > 0) {
    throw new ReleaseError("prepared release candidate is invalid", candidateErrors);
  }

  await transactionalWrite(root, [
    [RELEASE_PATHS.authority, jsonText(authority)],
    [RELEASE_PATHS.codexManifest, jsonText(codexManifest)],
    [RELEASE_PATHS.claudeManifest, jsonText(claudeManifest)],
    [RELEASE_PATHS.claudeMarketplace, jsonText(claudeMarketplace)],
    [RELEASE_PATHS.cursorManifest, jsonText(cursorManifest)],
    [RELEASE_PATHS.cursorMarketplace, jsonText(cursorMarketplace)],
    [RELEASE_PATHS.opencodePackage, jsonText(opencodePackage)],
    [RELEASE_PATHS.opencodeLock, jsonText(opencodeLock)],
    [RELEASE_PATHS.changelog, changelog],
  ]);

  return verifyVersionState(root, targetVersion, { environment: {} });
}

export function extractChangelogSection(changelog, version) {
  const headingPattern = new RegExp(`^## \\[${escapeRegExp(version)}\\](?: - \\d{4}-\\d{2}-\\d{2})?$`, "m");
  const match = headingPattern.exec(changelog);
  if (!match) throw new ReleaseError(`${RELEASE_PATHS.changelog} has no section for ${version}`);
  const bodyStart = changelog.indexOf("\n", match.index) + 1;
  const nextHeading = /^## /m.exec(changelog.slice(bodyStart));
  const bodyEnd = nextHeading ? bodyStart + nextHeading.index : changelog.length;
  const body = changelog.slice(bodyStart, bodyEnd).trim();
  if (!body) throw new ReleaseError(`${RELEASE_PATHS.changelog} section ${version} is empty`);
  return body;
}

async function remoteTagExists(root, tagName) {
  const result = await run("git", ["ls-remote", "--tags", "origin", `refs/tags/${tagName}`, `refs/tags/${tagName}^{}`], root);
  return result.stdout.length > 0;
}

export async function publishRelease(root = REPOSITORY_ROOT, version) {
  parseSemver(version, "publish version");
  const state = await verifyRelease(root, version, { environment: {} });
  const notes = extractChangelogSection(state.documents.changelog, version);
  const tagName = `v${version}`;

  const branch = await run("git", ["branch", "--show-current"], root);
  if (branch.stdout !== "main") throw new ReleaseError(`publish requires main; current branch is ${branch.stdout || "detached"}`);

  const statusBefore = await run("git", ["status", "--porcelain=v1", "--untracked-files=all"], root);
  if (statusBefore.stdout) throw new ReleaseError("publish requires a clean worktree", statusBefore.stdout.split("\n"));

  const [head, originMain] = await Promise.all([
    run("git", ["rev-parse", "HEAD"], root),
    run("git", ["rev-parse", "origin/main"], root),
  ]);
  if (head.stdout !== originMain.stdout) {
    throw new ReleaseError(`local HEAD ${head.stdout} does not equal origin/main ${originMain.stdout}`);
  }
  if (await localTagExists(root, tagName)) throw new ReleaseError(`local tag ${tagName} already exists`);
  if (await remoteTagExists(root, tagName)) throw new ReleaseError(`remote tag ${tagName} already exists`);
  await run("gh", ["auth", "status"], root);

  const statusAfter = await run("git", ["status", "--porcelain=v1", "--untracked-files=all"], root);
  if (statusAfter.stdout) throw new ReleaseError("tracked files changed during publish preflight", statusAfter.stdout.split("\n"));

  await run("git", ["tag", "-a", tagName, "-m", `Pixel Perfect ${version}`], root);
  await run("git", ["push", "origin", tagName], root);

  const notesDirectory = await mkdtemp(path.join(tmpdir(), "pixel-perfect-release-"));
  const notesPath = path.join(notesDirectory, "notes.md");
  try {
    await writeFile(notesPath, `${notes}\n`, "utf8");
    const args = ["release", "create", tagName, "--verify-tag", "--title", `Pixel Perfect ${version}`, "--notes-file", notesPath];
    if (parseSemver(version).prerelease.length > 0) args.push("--prerelease");
    await run("gh", args, root);
  } finally {
    await rm(notesDirectory, { recursive: true, force: true });
  }

  return state;
}

export function formatVerification(state) {
  return [
    `Pixel Perfect ${state.version} verified`,
    `  claude:   ${state.channels.claude} (Claude manifest + marketplace)`,
    `  codex:    ${state.channels.codex} (Codex plugin manifest)`,
    `  cursor:   ${state.channels.cursor} (Cursor plugin manifest + marketplace)`,
    `  grok:     ${state.channels.grok} (shared Claude marketplace)`,
    `  opencode: ${state.channels.opencode} (adapter package + lockfile)`,
  ].join("\n");
}

async function main(argv) {
  const [command, version, ...extra] = argv;
  if (extra.length > 0 || !["prepare", "verify", "publish"].includes(command)) {
    throw new ReleaseError("usage: node scripts/release.mjs <prepare|verify|publish> [version]");
  }
  if ((command === "prepare" || command === "publish") && !version) {
    throw new ReleaseError(`${command} requires a version`);
  }

  let state;
  if (command === "prepare") state = await prepareRelease(REPOSITORY_ROOT, version);
  if (command === "verify") state = await verifyRelease(REPOSITORY_ROOT, version);
  if (command === "publish") state = await publishRelease(REPOSITORY_ROOT, version);
  process.stdout.write(`${formatVerification(state)}\n`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    const details = Array.isArray(error?.details) ? error.details : [];
    process.stderr.write(`${error.message}\n`);
    for (const detail of details) process.stderr.write(`- ${detail}\n`);
    process.exitCode = 1;
  });
}
