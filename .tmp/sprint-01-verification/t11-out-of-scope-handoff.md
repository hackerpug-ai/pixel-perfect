# T11 cycle-2 — the two blockers that are outside T11's write scope

T11's contract (`TASK-T11.contract.json`) allows exactly four paths:

```
test/harness/controls/**
tests/sprint-01/grd-06-missing-key.test.mjs
tests/sprint-01/grd-03-evidence.test.mjs
tests/sprint-01/flow-runner.mjs
```

Every file either blocker needs is owned by another task, so T11 cannot close them without a
guardrail violation. This file is the exact change to request. Re-run

```
node .tmp/sprint-01-verification/t11-controls-wiring.repro.mjs
```

after the patches land: it must print `F-T11-1 dead` and `F-T11-2 dead` and exit 0.

---

## Patch 1 — F-T11-1, owner T1 (`.github/workflows/harness-eval.yml`): a controls producer

The recorder already reads a `controls.json` that arrives in the cells dir
(`test/harness/recorder.mjs:88-91` → `assembleResult({ controls })`), and nothing ever writes one.
Add one artifact carrying that file, and teach the download job to fetch it.

After the `smoke` job, add:

```yaml
  controls:
    name: controls qualification
    needs: smoke
    if: always()
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - name: Check out the dispatch commit
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      # The four rows, written by the module T11 owns. assertControlRows refuses a set that is not
      # exactly the four controls, so an empty or partial array never reaches disk.
      - name: Qualify the four negative controls
        run: |
          set -eu
          mkdir -p controls
          node --input-type=module -e '
          import { qualifyControls, assertControlRows, writeControls } from "./test/harness/controls/index.mjs";
          const observations = JSON.parse(process.env.HARNESS_EVAL_CONTROL_OBSERVATIONS ?? "{}");
          const rows = assertControlRows(qualifyControls({ observations }).rows);
          const written = writeControls({ file: "controls/controls.json", rows });
          if (!written.ok) { console.error("controls.json did not read back: " + JSON.stringify(written.mismatches)); process.exit(1); }
          '

      - name: Upload the controls rows beside this attempt's cells
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: harness-eval-controls-${{ github.run_id }}-${{ github.run_attempt }}
          path: controls/controls.json
          if-no-files-found: error
          retention-days: 90
          overwrite: false
```

`HARNESS_EVAL_CONTROL_OBSERVATIONS` is the T11-owned input shape (`{ "<control_id>": { "verdict",
"reason", "evidence" } }`); whichever step really observes a control exports its row into it. Until
that plumbing exists, passing `{}` is *not* an escape: all four rows come back
`could-not-run`/`control-unobservable`, which is the honest reading of a run that observed nothing.

Then in the `download` job, after the existing download step:

```yaml
      - name: Fetch this attempt's controls rows
        uses: actions/download-artifact@v4
        with:
          name: harness-eval-controls-${{ github.run_id }}-${{ github.run_attempt }}
          path: cells
```

That lands the file at `cells/controls.json`, the exact name `readCellArtifacts` routes into
`artifacts.controls`. No recorder change is needed for the happy path.

## Patch 2 — F-T11-1, owner T8 (`test/harness/recorder.mjs`, `test/harness/recorder/result.mjs`): refuse an empty array

`assembleResult` defaults `controls = []`, so a run that executed controls and published none is
indistinguishable from a run that had none. In `main()`, right after `readCellArtifacts`:

```js
    if (artifacts.controls.length === 0) {
      throw new RecorderRefusal("controls-missing", {
        dir: env.HARNESS_EVAL_CELLS_DIR ?? "cells",
        why: "every run executes the four negative controls; controls.json never arrived, so .controls[] would be empty and the gate would print nothing",
      });
    }
```

and in `assembleResult`, drop the `= []` default:

```js
-export function assembleResult({ cells, pins, context, timestamps, controls = [], laterChecks = [] }) {
+export function assembleResult({ cells, pins, context, timestamps, controls, laterChecks = [] }) {
+  if (!Array.isArray(controls) || controls.length === 0) {
+    throw new RecorderRefusal("controls-missing", { why: "a result with no controls array cannot say what the controls proved" });
+  }
```

Callers in T8/T10's tests that pass no `controls` will need the four rows; `qualifyControls({}).rows`
is the correct unobserved set.

## Patch 3 — F-T11-1, owner T2 (`test/harness/schemas/harness-eval-result.v1.schema.json`)

```diff
-  "required": ["schema", "repository_id", ... "fix"]
+  "required": ["schema", "repository_id", ... "fix", "controls"]
   "controls": {
     "type": "array",
+    "minItems": 4,
+    "maxItems": 4,
```

`minItems` is what makes `controls: []` unvalidatable even if a caller slips past Patch 2.

## Patch 4 — F-T11-2, owner T1 (`.github/workflows/harness-eval.yml`): scope the smoke upload

The smoke job's `Upload this cell even when the smoke step failed` uploads `path: cell/`, so
`cell/binding.json`, `cell/keyless-control.json` and `cell/evidence/*.capture.json` arrive in
`cells/`. `readCellArtifacts` walks recursively and classifies every `*.json` as a cell record, so
`collectCells` refuses the whole run.

```diff
       - name: Upload this cell even when the smoke step failed
         if: always()
         uses: actions/upload-artifact@v4
         with:
           name: harness-eval-cell-${{ github.run_id }}-${{ github.run_attempt }}-${{ matrix.harness }}-${{ matrix.track }}
-          path: cell/
+          # Exactly the cell record. binding.json, the keyless row and the captures are control
+          # evidence, not cell records: they travel in harness-eval-controls-* (Patch 1), because
+          # the recorder classifies every *.json under cells/ as a cell and refuses the run.
+          path: cell/cell.json
           if-no-files-found: warn
```

Do **not** solve this by teaching `readCellArtifacts` to skip unknown `*.json` files: that turns a
real malformed cell (wrong name, truncated write) into a silent omission, and the recorder's
fail-closed guarantee is the thing worth keeping. Scoping the upload keeps the walk strict.
