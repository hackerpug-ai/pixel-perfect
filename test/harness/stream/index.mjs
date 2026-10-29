// The stream layer's public surface: mapping tables, the CanonicalEvent normaliser, the
// question-boundary rules and the per-version validator. Graders import from here rather than
// reaching into the table files, so the fail-closed rules travel with the call.
export {
  CANONICAL_TYPES,
  STREAM_DIR,
  TABLE_DIR,
  TOOL_CLASSIFICATIONS,
  StreamError,
  classifyTool,
  contentBlocks,
  extractValue,
  listTables,
  loadTable,
  ruleMatches,
  tableCoverage,
  tableId,
  validateTable,
} from "./table.mjs";

export { eventsOfType, firstEvent, lossless, measureLines, normalise, reconstruct, tilingReport } from "./normalise.mjs";

export { ASK_POLICIES, boundaryStopCheck, gradeAskNothing, gradeMustAsk, gradeQuestionPolicy, mustAskFacts, questionBoundary, questions } from "./question-boundary.mjs";

export { bytesOf, formatVerdict, validateMapping } from "./validate-mapping.mjs";

export { gradeStreamCheck, captureIntegrity, provisionalInstallation, streamAnswer, streamDenials } from "./grade-stream.mjs";

export { CAPTURE_DIR, PROBE_ARGV, archive, captureFirstTurn, claudeOnPath, readArchived } from "./archive-capture.mjs";
