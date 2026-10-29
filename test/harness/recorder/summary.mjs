// The Actions summary: the twelve-cell table the maintainer actually reads (UC-GRD-01).
//
// It is rendered from the same validated record that is uploaded, so the page and the artifact can
// never disagree, and nothing is re-derived for the page except the two labels this module owns —
// the release effect of a row and the exit consequence of the run.
import { recorderExit } from "./result.mjs";

/** The release effect of one cell, per the release truth table in 04-api-design.md. */
export function releaseEffect(cell) {
  if (cell.verdict === "could-not-run") return "Blocks release (could-not-run)";
  if (cell.verdict === "fail" && cell.track === "pinned") return "Blocks release (pinned check failed)";
  if (cell.verdict === "fail") return "Newest warning — does not block release";
  return "No effect";
}

const cellText = (value) => String(value ?? "").replace(/\|/g, "\\|");
const version = (cell) => cell.installation?.observed_cli_version ?? "not observed";

/** Renders the summary markdown for one validated result record. */
export function renderSummary(result) {
  const cells = result.cells ?? [];
  const exit = recorderExit({ cells });
  const lines = [
    `## harness-eval — run ${result.run_id ?? "?"} attempt ${result.run_attempt ?? "?"}`,
    "",
    "| field | value |",
    "|---|---|",
    `| event | ${cellText(result.event)} |`,
    `| install mode | ${cellText(result.install_mode)} |`,
    `| candidate sha | ${cellText(result.candidate_sha ?? "null (published)")} |`,
    `| head sha | ${cellText(result.head_sha)} |`,
    `| pins_sha256 | \`${cellText(result.pins_sha256)}\` |`,
    `| evaluation started | ${cellText(result.evaluation_started_at)} |`,
    `| evaluation completed | ${cellText(result.evaluation_completed_at)} |`,
    "",
    "| harness | track | verdict | observed CLI version | reason | release effect |",
    "|---|---|---|---|---|---|",
    ...cells.map(
      (cell) =>
        `| ${cellText(cell.harness)} | ${cellText(cell.track)} | ${cellText(cell.verdict)} | ${cellText(version(cell))} | ${cellText(
          cell.reason ?? "—",
        )} | ${releaseEffect(cell)} |`,
    ),
    "",
    `**Cells:** ${cells.length} · **Harnesses:** ${new Set(cells.map((cell) => cell.harness)).size} · **Exit:** ${exit.code} (${exit.reason})`,
    "",
  ];
  if (exit.code !== 0) {
    lines.push(
      `This run exits ${exit.code} because ${exit.reason}. A could-not-run cell is not a pass, and a pinned failure is never converted to a pass: the framework refusing is the result.`,
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}
