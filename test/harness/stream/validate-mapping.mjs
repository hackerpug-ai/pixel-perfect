// The per-version mapping validator: refuses to grade from an unqualified capture.
//
// Coverage has two levels and the validator keeps them apart, because conflating them is how a
// "pass" gets printed for a table nobody ever checked against real bytes:
//
//   * TABLE COVERAGE — does every required fact have a rule that maps it to a CanonicalEvent type,
//     with the source event path recorded? A permissive catch-all cannot satisfy this: the
//     `harness_specific` fallback is rejected outright as a rule.
//   * CAPTURE COVERAGE — do THIS capture's bytes actually show those facts, tile exactly, rebuild
//     byte-identically, and come from the version the table is written for?
//
// A capture validates only when both pass. A capture from another CLI version is `could-not-run`
// even when every shape inside it matches, because the table's promise is version-scoped.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { StreamError, loadTable, tableCoverage } from "./table.mjs";
import { lossless, normalise } from "./normalise.mjs";

/** Reads the bytes a capture record cites. A record without its bytes is a refusal. */
export function bytesOf(recordPath) {
  const path = resolve(recordPath);
  const record = JSON.parse(readFileSync(path, "utf8"));
  const name = (record.evidence_paths ?? [])
    .map((entry) => entry.split(/[\\/]/).pop())
    .find((entry) => entry?.endsWith(".stdout.bin"));
  if (!name) throw new StreamError("captured-bytes-uncited", { recordPath: path });
  const stdoutPath = join(dirname(path), name);
  if (!existsSync(stdoutPath)) throw new StreamError("captured-bytes-absent", { stdoutPath });
  return { record, bytes: readFileSync(stdoutPath), stdoutPath };
}

/**
 * Validates one capture against the table for one exact version.
 *
 * @param {object} options
 * @param {string} options.version the CLI version the table must be written for
 * @param {Buffer} options.bytes  the raw captured stdout
 * @param {object} [options.record] the capture record, when one exists
 * @param {string[]|null} [options.required_read_paths]
 * @param {object} [options.table] a pre-loaded table (tests inject a mutated copy)
 */
export function validateMapping({ version, bytes, record = null, required_read_paths = null, table = null, harness = "claude-code" } = {}) {
  const resolved = table ?? loadTable({ harness, version });
  const coverage = tableCoverage(resolved);
  const stream = normalise({ bytes, table: resolved, invocation_id: record?.invocation_id ?? null, required_read_paths });
  const intact = lossless(stream.events, bytes);
  const expectedVersion = resolved.cli_version;
  const observedVersion = stream.observed.cli_version;
  const versionQualified = typeof observedVersion === "string" && observedVersion === expectedVersion;

  const reasons = [];
  if (coverage.verdict !== "pass") reasons.push({ reason: "required-fact-unmapped", missing: coverage.missing });
  if (!stream.tiling.ok) reasons.push({ reason: "capture-not-tiled", tiling: stream.tiling });
  if (!intact.ok) reasons.push({ reason: "capture-not-lossless", rebuilt: intact.sha256, captured: intact.expected });
  if (!versionQualified) reasons.push({ reason: "version-not-qualified", observed: observedVersion, expected: expectedVersion });
  if (stream.missing.length > 0) reasons.push({ reason: "capture-fact-unobserved", missing: stream.missing });

  return {
    flow: "FLOW-GRD-03-FILES-AND-STREAM",
    table: { id: resolved.id, cli_version: resolved.cli_version, path: resolved.path, qualified: coverage.qualified, unqualified_reason: coverage.unqualified_reason },
    table_coverage: coverage,
    capture: {
      invocation_id: record?.invocation_id ?? null,
      byte_length: bytes.length,
      sha256: intact.expected,
      observed_cli_version: observedVersion,
      session_id: stream.observed.session_id,
      version_qualified: versionQualified,
      tiling: stream.tiling,
      lossless: { ok: intact.ok, rebuilt_sha256: intact.sha256 },
      unknown_lines: stream.unknown_lines,
      event_count: stream.events.length,
      facts: stream.facts,
      missing: stream.missing,
    },
    verdict: reasons.length === 0 ? "pass" : "could-not-run",
    reason: reasons[0]?.reason ?? null,
    reasons,
  };
}

/** A one-line verdict for a terminal, and the whole report for an artifact. */
export function formatVerdict(report) {
  const head = report.verdict === "pass" ? `pass ${report.table.id}` : `could-not-run: ${report.reason}`;
  const facts = report.table_coverage.facts
    .map((fact) => `${fact.fact_id}=${fact.mapped ? "mapped" : "UNMAPPED"}${observedMark(report, fact.fact_id)}`)
    .join(" ");
  return `${head} | table ${report.table_coverage.verdict} (${report.table_coverage.facts.length} required facts) ${facts}`;
}

const observedMark = (report, factId) => {
  const fact = report.capture.facts.find((entry) => entry.fact_id === factId);
  return fact?.observed ? "@observed" : "";
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const index = args.indexOf(`--${name}`);
    return index === -1 ? undefined : args[index + 1];
  };
  const version = flag("version");
  const capturePath = flag("capture");
  const json = args.includes("--json");
  try {
    if (!version) throw new StreamError("version-required", { usage: "--version <x.y.z> [--capture <record|capture.stdout.bin>] [--json]" });
    const table = loadTable({ harness: flag("harness") ?? "claude-code", version });
    if (!capturePath) {
      const coverage = tableCoverage(table);
      const report = { table: { id: table.id, cli_version: table.cli_version, qualified: coverage.qualified, unqualified_reason: coverage.unqualified_reason }, table_coverage: coverage };
      process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : `table ${table.id}: ${coverage.verdict} (${coverage.facts.filter((fact) => fact.mapped).length}/${coverage.facts.length} required facts mapped, qualified=${coverage.qualified})\n`);
      process.exitCode = coverage.verdict === "pass" ? 0 : 1;
    } else {
      const resolved = resolve(capturePath);
      const loaded = resolved.endsWith(".stdout.bin") ? { record: null, bytes: readFileSync(resolved) } : bytesOf(resolved);
      const report = validateMapping({ version, bytes: loaded.bytes, record: loaded.record, table });
      process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : `${formatVerdict(report)}\n`);
      process.exitCode = report.verdict === "pass" ? 0 : 1;
    }
  } catch (error) {
    process.stderr.write(`${error.reason ?? "error"}: ${error.message}\n`);
    process.exitCode = 2;
  }
}
