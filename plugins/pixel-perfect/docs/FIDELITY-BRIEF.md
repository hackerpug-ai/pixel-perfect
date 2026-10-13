# Fidelity Brief

## Why

A builder checking its own render confirms what it remembers. The judge is a separate agent. It did not write the component. `scripts/brief.mjs judge` assembles this assignment from the manifest, the capture folder, and the frames index, and the orchestrator passes the printed line to the child unchanged.

One brief holds at most six components. The script exits 2 if any placeholder is left unfilled. The same project state produces the same bytes.

## The task

```text
You are the judge for <<COUNT>> components on layer <<LAYER>>, platform <<PLATFORM>>.

You did not build them. Open every render PNG beside every frame PNG named under that component. List every difference. Then return the JSON below.

<<REMAINING>>

<<COMPONENTS>>

## JSON verdict

Return one JSON object per component, in the order above, and nothing after the last object. Each object has this shape:

<<VERDICT>>
```
