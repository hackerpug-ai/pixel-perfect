// model-step.mjs — the smoke job's one keyed step per harness.
//
// It does the two things that must happen where the credential already is:
//
//   1. records credential PRESENCE with the guard's own reader (names and booleans, never a value),
//      so a harness whose key is not in `harness-smoke` reads could-not-run / missing-api-key; and
//   2. builds the cell. The registry answers first; when the loaded adapter owns the grade, the five
//      invocations run here (where the key is) and the cell is assembled from captured bytes.
//
// It always writes a cell record and always exits 0: the verdict reports, the shell does not.
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { REGISTERED } from "../adapters/registry.mjs";
import { createVersionResolver, loadPins } from "../pins.mjs";
import { resolveCredential } from "../runtime/guard.mjs";
import { DEFAULT_FAILURE_REASON, SMOKE_CELL_DIR, SMOKE_CELL_FILE, bareRecord, isInstantiatedCell, normalizeInstallMode, runCell, writeCell } from "./cell.mjs";
import { readConfigDir, readLoadRecord } from "./install.mjs";

export const BINDING_FILE = "binding.json";
export const FAILURE_FILE = "failure.json";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

/** The credential row: exactly what the guard resolved, as names and booleans. */
export function bindingRow({ harness, env = process.env }) {
  const credential = resolveCredential({ harness, env });
  return {
    harness: credential.harness,
    credential_env: credential.credential_env,
    binding_env: credential.binding_env,
    present: credential.present,
    present_name: credential.present_name,
    checked: credential.checked,
    verdict: credential.present ? "bound" : "could-not-run",
    reason: credential.present ? null : "missing-api-key",
  };
}

/** Runs one model step: the binding row, then the cell. Never throws past the cell write. */
export async function modelStep({
  harness,
  track,
  installMode: requestedInstallMode = "checkout",
  cellDir = SMOKE_CELL_DIR,
  evidenceDir = null,
  env = process.env,
  manifest = null,
  resolver = null,
  run = runCell,
  write = writeCell,
} = {}) {
  mkdirSync(cellDir, { recursive: true });
  const installMode = normalizeInstallMode(requestedInstallMode);
  const row = bindingRow({ harness, env });
  writeFileSync(join(cellDir, BINDING_FILE), `${JSON.stringify(row)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(row)}\n`);

  const file = join(cellDir, SMOKE_CELL_FILE);
  const pins = manifest ?? loadPins().manifest;
  const load = readLoadRecord(cellDir);
  const requestedCliVersion = load?.identity?.requested_cli_version ?? null;

  let cell;
  try {
    cell = await run({
      harness,
      track,
      installMode,
      env,
      adapters: new Set(REGISTERED),
      manifest: pins,
      resolver: resolver ?? createVersionResolver({ manifest: pins }),
      workspace: ROOT,
      configDir: readConfigDir(cellDir),
      requestedCliVersion,
      evidenceDir: evidenceDir ?? join(cellDir, "evidence"),
      // Reuse the identity the install slot measured rather than performing a second load: the
      // load's evidence dir belongs to that step, and re-installing would measure something else.
      loadCell: load ? async () => ({ identity: load.identity, installed: load.installed }) : null,
    });
  } catch (error) {
    cell = bareRecord({ harness, track, installMode, reason: error?.reason ?? DEFAULT_FAILURE_REASON, detail: String(error?.message ?? error) });
  }

  const written = write({ file, cell });
  if (cell.cell_state === "could-not-run") {
    // The record step reads this when the leg wrote nothing it could grade; writing it here keeps
    // the reason the leg actually stopped on, instead of a generic one.
    writeFileSync(join(cellDir, FAILURE_FILE), `${JSON.stringify({ reason: cell.reason ?? DEFAULT_FAILURE_REASON, detail: cell.detail ?? null })}\n`, "utf8");
  }
  return { row, cell, written };
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
    process.stderr.write("usage: model-step.mjs <harness> <track> [--cell-dir D] [--install-mode checkout|published]\n");
    process.exitCode = 2;
  } else {
    const cellDir = flag("cell-dir") ?? SMOKE_CELL_DIR;
  // The leg's captures land beside the cell it writes, so the cell can cite them and the image scan
  // has the bytes the invocation actually produced.
  const evidenceDir = flag("evidence-dir") ?? join(cellDir, "evidence");
    if (!isInstantiatedCell(track)) {
      // Not a real matrix cell: record the credential row and stop, so no cell record claims a
      // track that does not exist.
      mkdirSync(cellDir, { recursive: true });
      const row = bindingRow({ harness });
      writeFileSync(join(cellDir, BINDING_FILE), `${JSON.stringify(row)}\n`, "utf8");
      process.stdout.write(`${JSON.stringify({ ...row, cell: null, why: "unsubstituted-matrix-track" })}\n`);
      process.exit(0);
    }
    const outcome = await modelStep({ harness, track, installMode: flag("install-mode") ?? "checkout", cellDir, evidenceDir });
    process.stdout.write(`${JSON.stringify({ harness, track, verdict: outcome.cell.verdict ?? null, cell_state: outcome.cell.cell_state ?? null, reason: outcome.cell.reason ?? null })}\n`);
    process.exitCode = outcome.written?.ok === false ? 1 : 0;
  }
}
