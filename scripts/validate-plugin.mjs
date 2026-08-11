#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_ROOT = "plugins/pixel-perfect";
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

class PluginValidationError extends Error {
  constructor(details) {
    super("plugin manifest validation failed");
    this.details = details;
  }
}

async function json(root, relativePath, errors) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return {};
  }
}

async function requireFile(root, relativePath, errors) {
  try {
    const metadata = await stat(path.join(root, relativePath));
    if (!metadata.isFile()) errors.push(`${relativePath} is not a file`);
  } catch {
    errors.push(`missing file: ${relativePath}`);
  }
}

function onePlugin(marketplace, label, errors) {
  const matches = Array.isArray(marketplace.plugins)
    ? marketplace.plugins.filter((entry) => entry?.name === "pixel-perfect")
    : [];
  if (matches.length !== 1) {
    errors.push(`${label} must contain exactly one pixel-perfect entry`);
    return {};
  }
  return matches[0];
}

export async function validatePlugin(root = REPOSITORY_ROOT) {
  const errors = [];
  const [codex, claude, cursor, codexMarketplace, claudeMarketplace, cursorMarketplace] = await Promise.all([
    json(root, `${PLUGIN_ROOT}/.codex-plugin/plugin.json`, errors),
    json(root, `${PLUGIN_ROOT}/.claude-plugin/plugin.json`, errors),
    json(root, `${PLUGIN_ROOT}/.cursor-plugin/plugin.json`, errors),
    json(root, ".agents/plugins/marketplace.json", errors),
    json(root, ".claude-plugin/marketplace.json", errors),
    json(root, ".cursor-plugin/marketplace.json", errors),
  ]);

  for (const [label, manifest] of [
    ["Codex manifest", codex],
    ["Claude manifest", claude],
    ["Cursor manifest", cursor],
  ]) {
    if (manifest.name !== "pixel-perfect") errors.push(`${label} name must be pixel-perfect`);
    if (!SEMVER.test(manifest.version ?? "")) errors.push(`${label} version must be strict semver`);
    if (typeof manifest.description !== "string" || !manifest.description.trim()) errors.push(`${label} needs a description`);
    if (manifest.author?.name !== "Justin Rich") errors.push(`${label} needs author.name`);
  }

  const unsupportedCodexFields = ["hooks"].filter((field) => Object.hasOwn(codex, field));
  if (unsupportedCodexFields.length) errors.push(`Codex manifest has unsupported fields: ${unsupportedCodexFields.join(", ")}`);
  if (codex.skills !== "./skills/") errors.push("Codex manifest skills path must be ./skills/");

  const requiredInterfaceFields = [
    "displayName",
    "shortDescription",
    "longDescription",
    "developerName",
    "category",
    "capabilities",
    "websiteURL",
    "defaultPrompt",
    "brandColor",
    "composerIcon",
    "logo",
  ];
  for (const field of requiredInterfaceFields) {
    if (codex.interface?.[field] === undefined) errors.push(`Codex manifest interface.${field} is required`);
  }
  if (!Array.isArray(codex.interface?.defaultPrompt) || codex.interface.defaultPrompt.length > 3) {
    errors.push("Codex manifest interface.defaultPrompt must contain at most three prompts");
  }
  for (const urlField of ["homepage", "repository"]) {
    if (!/^https:\/\//.test(codex[urlField] ?? "")) errors.push(`Codex manifest ${urlField} must be an HTTPS URL`);
  }
  for (const urlField of ["websiteURL", "privacyPolicyURL", "termsOfServiceURL"]) {
    const value = codex.interface?.[urlField];
    if (value !== undefined && !/^https:\/\//.test(value)) errors.push(`Codex interface.${urlField} must be an HTTPS URL`);
  }
  for (const assetField of ["composerIcon", "logo", "logoDark"]) {
    const value = codex.interface?.[assetField];
    if (value !== undefined) await requireFile(root, `${PLUGIN_ROOT}/${value.replace(/^\.\//, "")}`, errors);
  }
  for (const screenshot of codex.interface?.screenshots ?? []) {
    if (!screenshot.endsWith(".png")) errors.push(`Codex screenshot must be PNG: ${screenshot}`);
    await requireFile(root, `${PLUGIN_ROOT}/${screenshot.replace(/^\.\//, "")}`, errors);
  }

  const codexEntry = onePlugin(codexMarketplace, "Codex marketplace", errors);
  if (codexMarketplace.name !== "pixel-perfect") errors.push("Codex marketplace name must be pixel-perfect");
  if (codexMarketplace.interface?.displayName !== "Pixel Perfect") errors.push("Codex marketplace displayName must be Pixel Perfect");
  if (Object.hasOwn(codexEntry, "version")) errors.push("Codex marketplace entry must not duplicate the manifest version");
  if (codexEntry.source?.source !== "local" || codexEntry.source?.path !== "./plugins/pixel-perfect") {
    errors.push("Codex marketplace source must be local ./plugins/pixel-perfect");
  }
  if (codexEntry.policy?.installation !== "AVAILABLE" || codexEntry.policy?.authentication !== "ON_INSTALL") {
    errors.push("Codex marketplace policy must be AVAILABLE / ON_INSTALL");
  }
  if (!codexEntry.category) errors.push("Codex marketplace entry needs a category");

  const claudeEntry = onePlugin(claudeMarketplace, "Claude marketplace", errors);
  if (claudeMarketplace.name !== "pixel-perfect") errors.push("Claude marketplace name must be pixel-perfect");
  if (claudeEntry.source !== "./plugins/pixel-perfect") {
    errors.push("Claude marketplace source must be ./plugins/pixel-perfect");
  }

  for (const urlField of ["homepage", "repository"]) {
    if (!/^https:\/\//.test(cursor[urlField] ?? "")) errors.push(`Cursor manifest ${urlField} must be an HTTPS URL`);
  }
  if (cursor.logo) {
    await requireFile(root, `${PLUGIN_ROOT}/${String(cursor.logo).replace(/^\.\//, "")}`, errors);
  } else {
    errors.push("Cursor manifest logo is required");
  }

  const cursorEntry = onePlugin(cursorMarketplace, "Cursor marketplace", errors);
  if (cursorMarketplace.name !== "pixel-perfect") errors.push("Cursor marketplace name must be pixel-perfect");
  if (!cursorMarketplace.owner?.name) errors.push("Cursor marketplace needs owner.name");
  if (cursorEntry.source !== "./plugins/pixel-perfect") {
    errors.push("Cursor marketplace source must be ./plugins/pixel-perfect");
  }
  if (Object.hasOwn(cursorEntry, "version")) {
    errors.push("Cursor marketplace entry must not duplicate the manifest version");
  }

  await requireFile(root, `${PLUGIN_ROOT}/.claude-plugin/plugin.json`, errors);
  await requireFile(root, `${PLUGIN_ROOT}/.codex-plugin/plugin.json`, errors);
  await requireFile(root, `${PLUGIN_ROOT}/.cursor-plugin/plugin.json`, errors);

  if (errors.length) throw new PluginValidationError([...new Set(errors)]);
  return { codexVersion: codex.version, claudeVersion: claude.version, cursorVersion: cursor.version };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  validatePlugin()
    .then((result) =>
      process.stdout.write(
        `plugin manifests valid: codex ${result.codexVersion}, claude ${result.claudeVersion}, cursor ${result.cursorVersion}\n`,
      ),
    )
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      for (const detail of error.details ?? []) process.stderr.write(`- ${detail}\n`);
      process.exitCode = 1;
    });
}
