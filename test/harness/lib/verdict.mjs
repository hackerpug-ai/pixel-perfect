// Verdict vocabulary and the aggregation order a grade record must obey.
//
// could-not-run before fail before pass (03-data-schema.md § HarnessCell / HarnessGrade). The exit
// code is never an input to a verdict, so `exitCodeVerdict` exists only as the named sin a control
// can refuse: any record whose verdict equals its own exit-code mapping is a bug, not a grade.
export const VERDICTS = ["pass", "fail", "could-not-run"];

/** Aggregate order: the first entry that appears wins. */
export const AGGREGATE_ORDER = ["could-not-run", "fail", "pass"];

/** The exit-code mapping the framework forbids. Exported so a control can prove the sin is refused. */
export function exitCodeVerdict(processExitCode) {
  if (!Number.isInteger(processExitCode)) return "could-not-run";
  return processExitCode === 0 ? "pass" : "fail";
}

/** Aggregate a set of block verdicts: could-not-run > fail > pass. Never throws on an empty set. */
export function worstVerdict(verdicts) {
  const present = verdicts.filter((verdict) => VERDICTS.includes(verdict));
  for (const verdict of AGGREGATE_ORDER) {
    if (present.includes(verdict)) return verdict;
  }
  return "could-not-run";
}
