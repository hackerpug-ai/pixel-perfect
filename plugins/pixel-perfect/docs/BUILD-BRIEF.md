# Component Build Brief

## Why

A component build fails at the hand-off. The orchestrating model paraphrases the designer prompt, drops frame paths, and forgets the rules after context compaction. So the orchestrator never writes a component's assignment. `scripts/brief.mjs build` assembles it from files on disk: the packaged designer prompt, the design contract, and the task below, filled from the manifest, the inventory, and the frames index. The script prints one line that names the file, and the orchestrator passes that line to the child, nothing more.

The task holds only what is specific to one item. A section that does not apply is removed. The script exits 2 if any placeholder is left unfilled.

## The task

```text
You are the designer for one component: <<ITEM_ID>> on platform <<PLATFORM>>.

Pixel Perfect started you with this brief, and it is your whole assignment. The agent prompt above holds your standing rules. The design contract above sets the bar.

## Item

These are the inventory entry's facts. Every state and variant it lists needs a story.

<<ITEM>>

## Frames

These are the pixels to match. Read every image listed.

<<FRAMES>>

## Stack

What you build on. Read every adapter doc listed, before you write.

<<STACK>>

## Files

<<FILES>>

<<COMPOSES>>

## Render

<<RENDER>>

## Gates

<<GATES>>

<<PRIOR_FINDINGS>>

## Steps

1. Read every frame image under Frames. If Frames says no frame shows this item, read the design contract and the theme tokens instead.
2. Scan for reuse before you write a line: the components this brief lists to build on (if it lists any), the library primitive named under Stack, the theme tokens, and the helpers beside your file. Record what you found in notes.
3. Write the component in its file, and its story in its story file. Use realistic fixed data, and show every state and variant the Item lists. Build on the library's primitive. Never re-implement a primitive the library provides.
4. Run every command under Gates. Fix each failure in your own files, then run it again. If a hard-fail gate still fails after your fixes, return status blocked with reason gate-failed, and put the gate's output in notes.
5. Run the command under Render. If Render says no render command is configured, return status blocked with reason no-render-command, and stop.
6. Look at each render the command wrote, and look at its frame beside it. Compare in this order: overall size and proportions; typeface, weight, and size; colour and contrast; borders, radii, and shadows; spacing and alignment; the words; anything missing or extra; anything cut off or wider than the viewport.
7. Fix every difference, and go back to step 4. Make at most three rounds of fix and render. After the third round, list each difference that remains.
8. Return ONE JSON object, and nothing after it:

    {"status": "complete" | "blocked", "item": "<<ITEM_ID>>", "files_written": [], "renders": [{"state": "", "path": ""}], "compared": [{"frame": "", "render": "", "differences_fixed": [], "differences_remaining": []}], "needs": [], "flags": [], "notes": ""}

If status is blocked, add a "reason" string that names what is missing. Report every difference that remains. Never report a match you did not see.
```
