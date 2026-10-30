// install.mjs — the smoke job's install slot, for real.
//
// Keyless, exact and auditable: resolve the version the track asks for (the pin for `pinned`, the
// run's frozen newest lookup for `newest`), install it exactly with auto-update off, then perform the
// keyless checkout load into an isolated `CLAUDE_CONFIG_DIR` and record the identity it measured.
//
// Two refusals are recorded rather than thrown: a harness with no adapter in this tree has nothing to
// install, and a newest lookup that resolved nothing cannot be installed. Both leave a named
// `install.json` and the step exits 0 — the cell, not the shell, reports.
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as claudeCode from "../adapters/claude-code.mjs";
import { REGISTERED } from "../adapters/registry.mjs";
import { createVersionResolver, loadPins } from "../pins.mjs";
import { createCapture, spawnCaptured } from "../runtime/capture.mjs";
import { isInstantiatedCell, normalizeInstallMode } from "./cell.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

export const INSTALL_FILE = "install.json";
export const LOAD_FILE = "load.json";
export const CONFIG_FILE = "config.json";

/** Runs one install step and writes its record. Never throws: a refusal is a named record. */
export async function installStep({
  harness,
  track,
  installMode: requestedInstallMode = "checkout",
  workspace = ROOT,
  cellDir = "cell",
  manifest = null,
  resolver = null,
  env = process.env,
  spawn = spawnCaptured,
}) {
  mkdirSync(cellDir, { recursive: true });
  const installMode = normalizeInstallMode(requestedInstallMode);
  if (!isInstantiatedCell(track)) {
    // Nothing is installed for a track the matrix never instantiated: spawning an exact-version
    // install off an unsubstituted template would run the install slot for no cell at all.
    const refused = { harness, track, install_mode: installMode, requested_cli_version: null, adapter_loaded: REGISTERED.includes(harness), installed: false, exit_code: null, reason: "install-track-unsubstituted" };
    writeFileSync(join(cellDir, INSTALL_FILE), `${JSON.stringify(refused, null, 2)}\n`, "utf8");
    return refused;
  }
  const pins = manifest ?? loadPins().manifest;
  const pin = pins.harnesses?.[harness] ?? null;
  const requested =
    track === "newest"
      ? (resolver ?? createVersionResolver({ manifest: pins })).resolve(harness)
      : (pin?.pinned_cli_version ?? null);

  const record = {
    harness,
    track,
    install_mode: installMode,
    requested_cli_version: requested,
    adapter_loaded: REGISTERED.includes(harness),
    installed: false,
    exit_code: null,
    reason: null,
  };

  const write = (extra = {}) => {
    const body = { ...record, ...extra };
    writeFileSync(join(cellDir, INSTALL_FILE), `${JSON.stringify(body, null, 2)}\n`, "utf8");
    return body;
  };

  if (!record.adapter_loaded) {
    // No adapter in this tree: there is no CLI to install, and inventing one would be a lie about
    // what the cell measured. The model step's registry answer names this harness's own reason.
    return write({ reason: `${harness}-adapter-not-implemented` });
  }
  if (typeof requested !== "string" || requested.length === 0) {
    return write({ reason: track === "newest" ? "newest-version-not-resolved" : "pinned-version-missing" });
  }

  const plan = claudeCode.installPlan({ track, requested_cli_version: requested, installMode });
  if (plan.refusal) return write({ reason: plan.refusal.reason });
  const step = plan.steps[0];
  const capture = createCapture({ harness, check_id: step.name, cwd: workspace, timeout_ms: 600_000, argv: step.argv });
  const status = await spawn({ command: step.argv[0], args: step.argv.slice(1), cwd: workspace, env: { ...env, ...step.env }, capture, timeout_ms: 600_000 });
  capture.finish(status);
  capture.persist(join(cellDir, "evidence", "install"));
  const installed = status.exit_code === 0;
  write({ installed, exit_code: status.exit_code ?? null, reason: installed ? null : (status.spawn_error ?? "install-failed"), argv: step.argv });

  // The keyless load: marketplace add + plugin install + `plugin details`, in a config dir that
  // belongs to this run only. Its identity is what the graded invocations are attributed to.
  const configDir = join(resolve(cellDir), "claude-config");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(cellDir, CONFIG_FILE), `${JSON.stringify({ harness, track, config_dir: configDir }, null, 2)}\n`, "utf8");
  const load = await claudeCode.executeLoad({ workspace, configDir, env, installMode });
  writeFileSync(
    join(cellDir, LOAD_FILE),
    `${JSON.stringify(
      {
        identity: load.identity,
        installed: load.installed,
        claims: load.claims,
        command_names: load.command_list.deduped,
        evidence_dir: load.evidence_dir,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return { ...record, installed, exit_code: status.exit_code ?? null, reason: null, identity: load.identity };
}

/** The load record a model step reuses, or null when the install slot left none. */
export function readLoadRecord(cellDir = "cell") {
  try {
    return JSON.parse(readFileSync(join(cellDir, LOAD_FILE), "utf8"));
  } catch {
    return null;
  }
}

/** The config dir the install slot created, or null. */
export function readConfigDir(cellDir = "cell") {
  try {
    return JSON.parse(readFileSync(join(cellDir, CONFIG_FILE), "utf8")).config_dir ?? null;
  } catch {
    return null;
  }
}

// `process.argv[1]` may be reached through a symlinked tree (the locked flows run a step body in a
// sandbox whose `test/` is a symlink), so both sides are resolved to their real path before compare.
const isMain =
  process.argv[1] !== undefined &&
  (() => {
    try {
      return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
    } catch {
      return false;
    }
  })();
if (isMain) {
  const [harness, track, ...rest] = process.argv.slice(2);
  const flag = (name) => {
    const index = rest.indexOf(`--${name}`);
    return index === -1 ? undefined : rest[index + 1];
  };
  if (!harness || !track) {
    process.stderr.write("usage: install.mjs <harness> <track> [--cell-dir D] [--install-mode checkout|published] [--workspace W]\n");
    process.exitCode = 2;
  } else {
    let outcome;
    try {
      outcome = await installStep({
        harness,
        track,
        installMode: flag("install-mode") ?? "checkout",
        workspace: flag("workspace") ?? ROOT,
        cellDir: flag("cell-dir") ?? "cell",
      });
    } catch (error) {
      outcome = { harness, track, installed: false, reason: "install-step-failed", detail: String(error?.message ?? error) };
      mkdirSync(flag("cell-dir") ?? "cell", { recursive: true });
      writeFileSync(join(flag("cell-dir") ?? "cell", INSTALL_FILE), `${JSON.stringify(outcome, null, 2)}\n`, "utf8");
    }
    process.stdout.write(`${JSON.stringify({ harness, track, installed: outcome.installed === true, reason: outcome.reason ?? null })}\n`);
    process.exitCode = 0;
  }
}
