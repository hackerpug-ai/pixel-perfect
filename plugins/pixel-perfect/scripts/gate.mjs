#!/usr/bin/env node
// gate.mjs — the only writer of `passed` and `verified`.
//
// item    files exist, contract checks pass, the story captured a real PNG → status built
// record  store a judgment only when its hashes match the golden, the component, the story,
//         the frames, and the capture
// layer   previous layer passed, scope from the manifest, empty scope fails; on success the
//         manifest and the receipt are written together; on failure the manifest is untouched
// audit   recompute from files already on disk. It does not capture.
//
// Exit: 0 pass · 1 a named failure · 2 usage or configuration.
//
//   node gate.mjs item   <project> --platform <id> --layer <layer> --name <Name>
//   node gate.mjs record <project> --platform <id> --layer <layer> --name <Name> --judgment <file>
//   node gate.mjs layer  <project> --platform <id> --layer <atoms|molecules|organisms|screens|scaffold>
//   node gate.mjs audit  <project> [--platform <id>]

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { digest } from "./reference-revisions.mjs";
import { runManifestGate } from "./verify-styling-contract.mjs";
import {
  auditGoldens,
  gateCapture,
  inventoryDir,
  loadManifest,
  planGoldens,
  readReceipts,
  receiptEntry,
  resolveCaptureConfig,
  resolvePlatform,
  runCapture,
  storyKey,
  writeGoldenSet,
  writeReceipts,
} from "./verify-catalog.mjs";

const LAYERS = ["atoms", "molecules", "organisms", "screens"];
const LAYER_GATE = { atoms: "atoms", molecules: "molecules", organisms: "organisms", screens: "compose" };
const COMMANDS = new Set(["item", "record", "layer", "audit"]);
const USAGE =
  "Usage:\n" +
  "  gate.mjs item   <project> --platform <id> --layer <layer> --name <Name>\n" +
  "  gate.mjs record <project> --platform <id> --layer <layer> --name <Name> --judgment <file>\n" +
  "  gate.mjs layer  <project> --platform <id> --layer <atoms|molecules|organisms|screens|scaffold>\n" +
  "  gate.mjs audit  <project> [--platform <id>]\n";

class GateConfigError extends Error {}

const text = (value) => typeof value === "string" && value.trim() !== "";

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function readJson(file, label) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new GateConfigError(`${label} is not valid JSON: ${error.message}`);
  }
}

function manifestFile(root) {
  return join(root, "design", "manifest.json");
}

function gateReceiptFile(root, platformId) {
  return join(root, "design", "fidelity", platformId, "gate.json");
}

function judgmentFile(root, platformId, layer, name) {
  return join(root, "design", "fidelity", platformId, layer, `${name}.json`);
}

function readGateReceipt(root, platformId) {
  const file = gateReceiptFile(root, platformId);
  if (!existsSync(file)) return { version: 1, platform: platformId, layers: {} };
  const parsed = readJson(file, file);
  if (parsed?.version !== 1 || !parsed.layers || typeof parsed.layers !== "object") {
    throw new GateConfigError(`${file} is not a version 1 gate receipt`);
  }
  return parsed;
}

function itemsOf(config, layer) {
  const list = config[layer];
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item && text(item.name));
}

function componentId(layer, name) {
  return `${layer}/${name}`;
}

function openProject(root, platform) {
  const manifest = loadManifest(root);
  const { id, config } = resolvePlatform(manifest, platform);
  return { manifest, id, config };
}

function captureConfig(config, platformId) {
  return resolveCaptureConfig(config, platformId);
}

function inventoryEntry(root, layer, name) {
  const file = join(root, "design", "inventory.json");
  if (!existsSync(file)) return null;
  const inventory = readJson(file, file);
  return (inventory[layer] ?? []).find((entry) => entry && entry.name === name) ?? null;
}

function frameIds(layer, manifestEntry, fromInventory) {
  const source = fromInventory ?? manifestEntry ?? {};
  if (layer === "screens") return (source.states ?? []).flatMap((state) => state.frames ?? []);
  return source.appears_on ?? [];
}

function frameFiles(root, manifest, ids) {
  if (ids.length === 0) return [];
  const dir = join(root, manifest.inventory?.reference ?? "design/reference");
  const indexPath = join(dir, "frames.json");
  if (!existsSync(indexPath)) throw new GateConfigError(`no frames index at ${indexPath}`);
  const index = readJson(indexPath, indexPath);
  if (!Array.isArray(index.frames)) throw new GateConfigError(`${indexPath} has no frames array`);
  const byId = new Map(index.frames.map((frame) => [frame.id, frame]));
  return ids.map((id) => {
    const frame = byId.get(id);
    if (!frame) throw new GateConfigError(`frame ${id} is not in the frames index`);
    const png = join(dir, frame.png);
    if (!existsSync(png)) throw new GateConfigError(`PNG for frame ${id} is not on disk: ${png}`);
    return png;
  });
}

function digestFiles(paths) {
  const sorted = [...paths].sort();
  return digest(Buffer.concat(sorted.map((file) => readFileSync(file))));
}

function storiesFor(stories, name) {
  return stories.filter((story) => story.name === name).sort((a, b) => storyKey(a).localeCompare(storyKey(b)));
}

function goldenDigest(stories, dir, relative) {
  return digestFiles(stories.map((story) => join(dir, relative(story))));
}

function renderDigest(stories, stagingAbs, pixels) {
  if (pixels === "none") return "none";
  const pngs = stories.map((story) => story.png ?? join(stagingAbs, story.layer, story.name, `${story.state}.png`));
  return digestFiles(pngs);
}

export function expectedHashes(root, manifest, config, captureCfg, layer, name, stories, stagingAbs) {
  const item = itemsOf(config, layer).find((entry) => entry.name === name);
  if (!item?.file || !item?.story) throw new GateConfigError(`no file and story recorded for ${componentId(layer, name)}`);
  const filePath = join(root, item.file);
  const storyPath = join(root, item.story);
  if (!existsSync(filePath)) throw new GateConfigError(`component file is missing: ${item.file}`);
  if (!existsSync(storyPath)) throw new GateConfigError(`story file is missing: ${item.story}`);
  const ids = frameIds(layer, item, inventoryEntry(root, layer, name));
  const frames = frameFiles(root, manifest, ids);
  return {
    item,
    frames,
    kind: frames.length === 0 ? "contract-review" : "frames",
    hashes: {
      golden: goldenDigest(stories, stagingAbs, (story) => story.rel),
      file: digest(readFileSync(filePath)),
      story: digest(readFileSync(storyPath)),
      frames: frames.length === 0 ? "none" : digestFiles(frames),
      render: renderDigest(stories, stagingAbs, captureCfg.pixels),
    },
  };
}

function captureComponent(root, captureCfg, layer, name) {
  const captured = runCapture(root, captureCfg, layer, { only: { layer, name } });
  const stories = storiesFor(captured.stories, name);
  const stagingAbs = join(root, captureCfg.staging);
  const gate = gateCapture(stories, stagingAbs, captureCfg, captured.ignoredFiles);
  return { stories, stagingAbs, gate };
}

function contractFindings(root, platformId, layer, files) {
  const findings = [];
  for (const kind of ["styling", "component"]) {
    let result;
    try {
      result = runManifestGate({ projectRoot: root, platform: platformId, kind, layer, files });
    } catch (error) {
      const reason = kind === "styling" ? `empty styling scope: ${error.message}` : error.message;
      findings.push({ kind: "empty-scope", contract: kind, reason });
      continue;
    }
    if (!result.scanned) continue;
    if (result.exitCode === 3) {
      const reason = kind === "styling" ? `empty styling scope: ${result.message ?? "no files in scope"}` : `empty scope: ${result.message ?? kind}`;
      findings.push({ kind: "empty-scope", contract: kind, reason });
    } else if (result.exitCode !== 0) {
      findings.push({
        kind: "contract",
        contract: kind,
        reason: result.message || `${result.violations?.length ?? 0} ${kind} violation(s)`,
      });
    }
  }
  return findings;
}

function pixelFindings(gate) {
  return (gate.violations ?? []).map((violation) => ({
    component: violation.key,
    kind: violation.kind,
    reason: `${violation.key}: ${violation.reason}`,
  }));
}

function requireBuiltStories(config, layer, stories) {
  const findings = [];
  for (const item of itemsOf(config, layer)) {
    const id = componentId(layer, item.name);
    if (item.status === "pending" || !item.file || !item.story) {
      findings.push({ component: id, kind: "not-built", reason: `${id} is not built` });
      continue;
    }
    if (!stories.some((story) => story.name === item.name)) {
      findings.push({ component: id, kind: "missing-story", reason: `${id}: no story captured` });
    }
  }
  return findings;
}

function discrepancyProblem(discrepancy) {
  if (!discrepancy || !text(discrepancy.description)) return "a discrepancy needs a description";
  if (!discrepancy.accepted) return `unaccepted difference: ${discrepancy.description}`;
  if (!text(discrepancy.acceptedBy) || !text(discrepancy.reason)) {
    return `accepted difference needs a decision and a reason: ${discrepancy.description}`;
  }
  return null;
}

function judgmentProblems(stored, expected) {
  const problems = [];
  if (!stored) {
    problems.push(expected.kind === "contract-review" ? "no contract-review judgment" : "no judgment");
    return problems;
  }
  if (stored.kind !== expected.kind) {
    problems.push(
      expected.kind === "contract-review"
        ? "a component with no frames needs a contract-review judgment"
        : "a contract-review judgment does not cover a component that has frames",
    );
  }
  if (stored.verdict !== "pass") problems.push(`failing verdict: ${stored.verdict}`);
  for (const discrepancy of stored.discrepancies ?? []) {
    const problem = discrepancyProblem(discrepancy);
    if (problem) problems.push(problem);
  }
  for (const key of ["golden", "file", "story", "frames", "render"]) {
    if (stored.hashes?.[key] !== expected.hashes[key]) problems.push(`stale ${key} hash`);
  }
  return problems;
}

function onDiskGoldenDigest(root, captureCfg, layer, name) {
  const goldens = inventoryDir(root, captureCfg.goldens).filter((golden) => golden.layer === layer && golden.name === name);
  if (goldens.length === 0) return null;
  return digestFiles(goldens.map((golden) => golden.full));
}

function previousLayerBlock(config, receipt, layer) {
  if (layer === "scaffold") return null;
  const index = LAYERS.indexOf(layer);
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const earlier = LAYERS[cursor];
    if (itemsOf(config, earlier).length === 0) continue;
    const key = LAYER_GATE[earlier];
    const passed = config.gates?.[key] === "passed" && receipt.layers?.[key];
    if (!passed) return `${layer} is refused: ${earlier} is not passed`;
    return null;
  }
  return null;
}

function writeJsonAtomic(file, value) {
  ensureDir(dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
  renameSync(tmp, file);
}

function layerGateKeys(layer) {
  if (layer === "scaffold") return ["scaffold"];
  const key = LAYER_GATE[layer];
  return [key, `${key}_styling_contract`, `${key}_component_contract`, `${key}_capture`];
}

function commitPass({ root, manifest, platformId, receipt, goldens }) {
  const receiptPath = gateReceiptFile(root, platformId);
  const manifestPath = manifestFile(root);
  ensureDir(dirname(receiptPath));
  const receiptTmp = `${receiptPath}.${process.pid}.tmp`;
  const manifestTmp = `${manifestPath}.${process.pid}.tmp`;
  writeFileSync(receiptTmp, JSON.stringify(receipt, null, 2) + "\n");
  writeFileSync(manifestTmp, JSON.stringify(manifest, null, 2) + "\n");
  if (goldens) goldens();
  renameSync(receiptTmp, receiptPath);
  renameSync(manifestTmp, manifestPath);
}

function report(command, exit, message, extra = {}) {
  return { command, exit, message, findings: [], ...extra };
}

export function runItem(root, { platform, layer, name }) {
  if (!LAYERS.includes(layer)) throw new GateConfigError(`--layer must be a component layer, got ${JSON.stringify(layer)}`);
  const before = readFileSync(manifestFile(root));
  const { manifest, id, config } = openProject(root, platform);
  const item = itemsOf(config, layer).find((entry) => entry.name === name);
  if (!item) throw new GateConfigError(`${componentId(layer, name)} is not recorded on platform ${id}`);
  const idText = componentId(layer, name);
  const findings = [];
  if (!item.file || !existsSync(join(root, item.file))) findings.push({ component: idText, kind: "missing-file", reason: `${idText}: component file is missing` });
  if (!item.story || !existsSync(join(root, item.story))) findings.push({ component: idText, kind: "missing-story", reason: `${idText}: story file is missing` });
  const captureCfg = captureConfig(config, id);
  if (findings.length === 0 && item.file) findings.push(...contractFindings(root, id, null, [item.file]).map((finding) => ({ ...finding, component: idText })));
  let captured = null;
  if (findings.length === 0) {
    captured = captureComponent(root, captureCfg, layer, name);
    if (captured.stories.length === 0) {
      findings.push({ component: idText, kind: "missing-story", reason: `${idText}: no story captured` });
    } else {
      findings.push(...pixelFindings(captured.gate).map((finding) => ({ ...finding, component: idText })));
    }
  }
  if (findings.length > 0) {
    return report("item", 1, findings.map((finding) => finding.reason).join("; "), { platform: id, layer, name, findings, manifestWritten: false });
  }
  item.status = "built";
  writeJsonAtomic(manifestFile(root), manifest);
  return report("item", 0, `${idText} is built`, { platform: id, layer, name, status: "built", manifestWritten: true });
}

function readSubmitted(file) {
  const judgment = readJson(file, file);
  if (!judgment || typeof judgment !== "object" || Array.isArray(judgment)) throw new GateConfigError(`${file} is not a judgment object`);
  return judgment;
}

function submittedIsBound(judgment, expected) {
  const hashes = judgment.hashes;
  if (!hashes || typeof hashes !== "object") return "judgment is not bound to the golden, the component file, the story file, and the frames";
  for (const key of ["golden", "file", "story", "frames"]) {
    if (!text(hashes[key])) return `judgment is not bound to the ${key} hash`;
  }
  if (!text(hashes.render)) return "judgment is not bound to the render hash";
  if (hashes.render !== expected.hashes.render) return "render hash does not match the capture";
  for (const key of ["golden", "file", "story", "frames"]) {
    if (hashes[key] !== expected.hashes[key]) return `judgment ${key} hash does not match`;
  }
  if (judgment.kind !== expected.kind) {
    return expected.kind === "contract-review"
      ? "a component with no frames needs a contract-review judgment"
      : "a contract-review judgment does not cover a component that has frames";
  }
  if (!["pass", "fail"].includes(judgment.verdict)) return "judgment verdict must be pass or fail";
  if (!text(judgment.reviewer) || !text(judgment.reason)) return "judgment needs a reviewer and a reason";
  if (!Array.isArray(judgment.discrepancies)) return "judgment discrepancies must be a list";
  for (const discrepancy of judgment.discrepancies) {
    if (!discrepancy || !text(discrepancy.description)) return "each discrepancy needs a description";
    if (discrepancy.accepted && (!text(discrepancy.acceptedBy) || !text(discrepancy.reason))) {
      return "an accepted difference needs a decision and a reason";
    }
  }
  return null;
}

export function runRecord(root, { platform, layer, name, judgment: judgmentPath }) {
  if (!LAYERS.includes(layer)) throw new GateConfigError(`--layer must be a component layer, got ${JSON.stringify(layer)}`);
  if (!judgmentPath) throw new GateConfigError("record needs --judgment");
  const { manifest, id, config } = openProject(root, platform);
  const captureCfg = captureConfig(config, id);
  const captured = captureComponent(root, captureCfg, layer, name);
  const idText = componentId(layer, name);
  if (captured.stories.length === 0) {
    return report("record", 1, `${idText}: no story captured`, { platform: id, component: idText, findings: [{ component: idText, kind: "missing-story", reason: "no story captured" }] });
  }
  const expected = expectedHashes(root, manifest, config, captureCfg, layer, name, captured.stories, captured.stagingAbs);
  const submitted = readSubmitted(resolve(judgmentPath));
  const problem = submittedIsBound(submitted, expected);
  if (problem) {
    return report("record", 1, problem, { platform: id, component: idText, findings: [{ component: idText, kind: "unbound", reason: problem }] });
  }
  const onDisk = onDiskGoldenDigest(root, captureCfg, layer, name);
  const stored = {
    version: 1,
    component: idText,
    kind: expected.kind,
    verdict: submitted.verdict,
    reviewer: submitted.reviewer,
    reason: submitted.reason,
    discrepancies: submitted.discrepancies,
    hashes: { ...expected.hashes, goldenOnDisk: onDisk ?? "none" },
  };
  const file = judgmentFile(root, id, layer, name);
  writeJsonAtomic(file, stored);
  return report("record", 0, `${idText} judgment recorded`, { platform: id, component: idText, judgment: file, hashes: expected.hashes });
}

function readStoredJudgment(root, platformId, layer, name) {
  const file = judgmentFile(root, platformId, layer, name);
  if (!existsSync(file)) return null;
  return readJson(file, file);
}

export function runLayer(root, { platform, layer }) {
  if (layer !== "scaffold" && !LAYERS.includes(layer)) {
    throw new GateConfigError("--layer must be atoms, molecules, organisms, screens, or scaffold");
  }
  const before = readFileSync(manifestFile(root));
  const unchanged = () => before.equals(readFileSync(manifestFile(root)));
  const { manifest, id, config } = openProject(root, platform);
  const receipt = readGateReceipt(root, id);
  const captureCfg = captureConfig(config, id);
  const blocked = previousLayerBlock(config, receipt, layer);
  if (blocked) {
    return report("layer", 1, blocked, { platform: id, layer, findings: [{ kind: "out-of-order", reason: blocked }], manifestUnchanged: unchanged() });
  }
  if (layer !== "scaffold" && itemsOf(config, layer).length === 0) {
    const reason = `empty scope: ${layer} has no recorded items`;
    return report("layer", 1, reason, { platform: id, layer, findings: [{ kind: "empty-scope", reason }], manifestUnchanged: unchanged() });
  }

  const captured = runCapture(root, captureCfg, layer === "scaffold" ? null : layer);
  const stagingAbs = join(root, captureCfg.staging);
  const gate = gateCapture(captured.stories, stagingAbs, captureCfg, captured.ignoredFiles);
  const findings = [];
  if (layer === "scaffold") {
    if (captured.stories.length === 0) findings.push({ kind: "empty-capture", reason: "scaffold captured no story" });
    findings.push(...pixelFindings(gate));
    const pngOk = captureCfg.pixels === "none" || captured.stories.some((story) => story.png && existsSync(story.png));
    if (captured.stories.length > 0 && !pngOk) findings.push({ kind: "missing-png", reason: "scaffold has no real PNG" });
  } else {
    findings.push(...requireBuiltStories(config, layer, captured.stories));
    findings.push(...contractFindings(root, id, layer));
    findings.push(...pixelFindings(gate));
    for (const item of itemsOf(config, layer)) {
      const stories = storiesFor(captured.stories, item.name);
      if (stories.length === 0 || item.status === "pending") continue;
      let expected;
      try {
        expected = expectedHashes(root, manifest, config, captureCfg, layer, item.name, stories, stagingAbs);
      } catch (error) {
        findings.push({ component: componentId(layer, item.name), kind: "config", reason: error.message });
        continue;
      }
      const onDisk = onDiskGoldenDigest(root, captureCfg, layer, item.name) ?? "none";
      const stored = readStoredJudgment(root, id, layer, item.name);
      const problems = judgmentProblems(stored, expected);
      const recordedDisk = stored?.hashes?.goldenOnDisk ?? "none";
      if (onDisk !== "none" && onDisk !== expected.hashes.golden && onDisk !== recordedDisk) problems.push("stale golden hash");
      for (const problem of problems) {
        findings.push({ component: componentId(layer, item.name), kind: "judgment", reason: `${componentId(layer, item.name)}: ${problem}` });
      }
    }
  }
  if (findings.length > 0) {
    const named = findings.map((finding) => finding.reason).join("; ");
    return report("layer", 1, named, { platform: id, layer, findings, manifestUnchanged: unchanged() });
  }

  const stories = layer === "scaffold" ? captured.stories : captured.stories.filter((story) => itemsOf(config, layer).some((item) => item.name === story.name));
  const plan = planGoldens(root, captureCfg, stories);
  config.gates = config.gates ?? {};
  const keys = layerGateKeys(layer);
  for (const key of keys) {
    config.gates[key] = "passed";
    receipt.layers[key] = { items: layer === "scaffold" ? [] : itemsOf(config, layer).map((item) => item.name) };
  }
  if (layer !== "scaffold") {
    for (const item of itemsOf(config, layer)) item.status = "verified";
  }
  const entries = {};
  for (const story of stories) {
    entries[storyKey(story)] = receiptEntry(root, captureCfg, story, "baseline", gate.pixel.evidence.get(storyKey(story)) ?? null);
  }
  commitPass({
    root,
    manifest,
    platformId: id,
    receipt,
    goldens: () => {
      writeGoldenSet(root, captureCfg, stories.filter((story) => plan.added.includes(storyKey(story)) || plan.changed.includes(storyKey(story)) || plan.unchanged.includes(storyKey(story))));
      writeReceipts(root, captureCfg, entries, readReceipts(root, captureCfg));
    },
  });
  return report("layer", 0, `${layer} passed`, {
    platform: id,
    layer,
    manifestWritten: true,
    receipt: gateReceiptFile(root, id),
    catalogReceipt: join(captureCfg.goldens, "receipt.json"),
  });
}

function handTypedPasses(config, receipt) {
  const findings = [];
  for (const [key, value] of Object.entries(config.gates ?? {})) {
    if (value !== "passed") continue;
    if (!receipt.layers?.[key]) findings.push({ kind: "hand-typed-passed", reason: `hand-typed passed: ${key}` });
  }
  return findings;
}

function outOfOrderFindings(config) {
  const findings = [];
  for (let index = 1; index < LAYERS.length; index += 1) {
    const layer = LAYERS[index];
    const earlierWithItems = LAYERS.slice(0, index).filter((candidate) => itemsOf(config, candidate).length > 0);
    const blocked = earlierWithItems.find((earlier) => config.gates?.[LAYER_GATE[earlier]] !== "passed");
    const laterVerified = itemsOf(config, layer).some((item) => item.status === "verified") || config.gates?.[LAYER_GATE[layer]] === "passed";
    if (blocked && laterVerified) {
      findings.push({
        kind: "out-of-order",
        reason: `${layer} verified while ${blocked} were pending`,
      });
    }
  }
  return findings;
}

function recordedBefore(config) {
  const findings = [];
  for (const layer of LAYERS) {
    for (const item of itemsOf(config, layer)) {
      if (item.status !== "verified") continue;
      findings.push({
        component: componentId(layer, item.name),
        kind: "recorded-before-10",
        reason: `${componentId(layer, item.name)} recorded before 10.0, not judged`,
      });
    }
  }
  return findings;
}

function auditPlatform(root, id, config) {
  let captureCfg;
  const findings = [];
  try {
    captureCfg = captureConfig(config, id);
  } catch (error) {
    findings.push({ kind: "missing-pixels", reason: `no pixels: ${error.message}` });
    captureCfg = {
      platform: id,
      goldens: config.capture?.goldens || `design/goldens/${id}`,
      pixels: "required",
      pixelsReason: null,
      items: {},
    };
  }
  let catalog = { empty: [], unreceipted: [], noPixelEvidence: [], exit: 0, message: "" };
  try {
    catalog = auditGoldens(root, config, id);
  } catch (error) {
    if (!findings.some((finding) => finding.reason.includes(error.message))) {
      findings.push({ kind: "missing-pixels", reason: `no pixels: ${error.message}` });
    }
  }
  for (const golden of catalog.empty ?? []) findings.push({ component: golden.key, kind: "empty-golden", reason: `empty golden: ${golden.key}` });
  for (const golden of catalog.unreceipted ?? []) findings.push({ component: golden.key, kind: "copied-golden", reason: `copied golden: ${golden.key} (${golden.reason})` });
  if ((catalog.unreceipted ?? []).length) findings.push({ kind: "copied-golden", reason: `goldens without a receipt (${catalog.unreceipted.length})` });
  else if (inventoryDir(root, captureCfg.goldens).length && !existsSync(join(root, captureCfg.goldens, "receipt.json"))) {
    findings.push({ kind: "copied-golden", reason: "goldens without a receipt" });
  }
  for (const golden of catalog.noPixelEvidence ?? []) findings.push({ component: golden.key, kind: "missing-pixels", reason: `missing pixels: ${golden.key}` });
  const dialogs = inventoryDir(root, captureCfg.goldens).filter((golden) => /dialog/i.test(golden.name));
  const emptyDialogs = dialogs.filter((golden) => !/role="dialog"|<dialog\b/i.test(readFileSync(golden.full, "utf8")));
  if (emptyDialogs.length) {
    findings.push({
      kind: "empty-dialog",
      reason: `${emptyDialogs.length} empty dialog captures: ${emptyDialogs.map((golden) => golden.key).join(", ")}`,
    });
  }
  if (captureCfg.pixels !== "none" && inventoryDir(root, captureCfg.goldens).length > 0 && !(catalog.noPixelEvidence ?? []).length && !existsSync(join(root, captureCfg.goldens, "receipt.json"))) {
    findings.push({ kind: "missing-pixels", reason: `no pixels: ${id} has goldens and no pixel evidence` });
  }
  findings.push(...outOfOrderFindings(config).map((finding) => ({ ...finding, reason: `${id}: ${finding.reason}` })));
  findings.push(...contractFindings(root, id, null).filter((finding) => finding.contract === "styling"));
  const receipt = existsSync(gateReceiptFile(root, id)) ? readGateReceipt(root, id) : { version: 1, platform: id, layers: {} };
  findings.push(...handTypedPasses(config, receipt));
  const judged = new Set();
  for (const layer of LAYERS) {
    for (const item of itemsOf(config, layer)) {
      if (existsSync(judgmentFile(root, id, layer, item.name))) judged.add(componentId(layer, item.name));
    }
  }
  findings.push(...recordedBefore(config).filter((finding) => !judged.has(finding.component)));
  return { catalog, findings };
}

export function runAudit(root, { platform } = {}) {
  const manifest = loadManifest(root);
  const ids = platform
    ? [resolvePlatform(manifest, platform).id]
    : Object.keys(manifest.platforms && typeof manifest.platforms === "object" ? manifest.platforms : { default: manifest });
  const findings = [];
  let catalogExit = 0;
  for (const id of ids) {
    const config = manifest.platforms?.[id] ?? manifest;
    let result;
    try {
      result = auditPlatform(root, id, config);
    } catch (error) {
      findings.push({ kind: "config", reason: `${id}: ${error.message}` });
      continue;
    }
    catalogExit = Math.max(catalogExit, result.catalog.exit ?? 0);
    findings.push(...result.findings);
  }
  const exit = findings.length > 0 || catalogExit === 1 ? 1 : catalogExit === 3 && findings.length === 0 ? 3 : 0;
  const message = findings.length ? findings.map((finding) => finding.reason).join("; ") : "audit clean";
  return report("audit", exit, message, { platform: platform ?? ids.join(","), captured: false, findings, catalogExit });
}

function take(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new GateConfigError(`${flag} needs a value`);
  return value;
}

function parseArgs(argv) {
  const command = argv[0];
  if (!COMMANDS.has(command)) throw new GateConfigError(`unknown command ${JSON.stringify(command ?? "")}`);
  const parsed = { command, position: [], platform: null, layer: null, name: null, judgment: null, help: false };
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "-h" || token === "--help") parsed.help = true;
    else if (token === "--platform") parsed.platform = take(argv, index, token), index += 1;
    else if (token === "--layer") parsed.layer = take(argv, index, token), index += 1;
    else if (token === "--name") parsed.name = take(argv, index, token), index += 1;
    else if (token === "--judgment") parsed.judgment = take(argv, index, token), index += 1;
    else if (token.startsWith("--")) throw new GateConfigError(`unknown option ${token}`);
    else parsed.position.push(token);
  }
  return parsed;
}

export function main(argv) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`USAGE ERROR: ${error.message}\n${USAGE}`);
    return 2;
  }
  if (parsed.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (parsed.position.length !== 1) {
    process.stderr.write(`USAGE ERROR: a project root is required\n${USAGE}`);
    return 2;
  }
  const root = resolve(parsed.position[0]);
  if (!existsSync(root)) {
    process.stderr.write(`CONFIG ERROR: project root not found: ${root}\n`);
    return 2;
  }
  try {
    let result;
    if (parsed.command === "item" || parsed.command === "record") {
      if (!parsed.layer || !parsed.name) throw new GateConfigError(`${parsed.command} needs --layer and --name`);
      result = parsed.command === "item"
        ? runItem(root, parsed)
        : runRecord(root, parsed);
    } else if (parsed.command === "layer") {
      if (!parsed.layer) throw new GateConfigError("layer needs --layer");
      result = runLayer(root, parsed);
    } else {
      result = runAudit(root, parsed);
    }
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.stderr.write(`${result.exit === 0 ? "✓" : "✗"} gate ${parsed.command}: ${result.message}\n`);
    return result.exit;
  } catch (error) {
    const label = error instanceof GateConfigError || error.name === "GateError" ? "CONFIG ERROR" : "CONFIG ERROR";
    process.stderr.write(`${label}: ${error.message}\n`);
    return 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
