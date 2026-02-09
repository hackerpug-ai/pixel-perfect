# Skill State

**Reference patterns** for stateful skill execution - progress tracking, checkpointing, resume, crash recovery.

## QUICK REFERENCE

```
LIFECYCLE:  INIT → [CHECKPOINT]* → COMPLETE | ERROR

TRIGGERS:
  --resume    → Load state, skip to checkpoint
  --status    → Display current state (no execution)
  --history   → Show state change history
  (no flag)   → Auto-detect: fresh | resume prompt | overwrite prompt

QUERIES:
  --status --all        → All states in current context
  --status --project    → All states in project
  --status --failed     → All failed states
```

## STATE TRANSITIONS

```
           ┌─────────────────────────────────────┐
           │                                     │
           v                                     │
  [pending] ──INIT──> [in_progress] ──COMPLETE──> [completed]
                            │                         │
                            │ ERROR                   │ (restart)
                            v                         │
                       [failed] ──────────────────────┘
                            │
                            └── RESUME (after fix) ──> [in_progress]
```

## INTEGRATION PATTERNS

### INIT STATE (skill entry point)

```
[INIT STATE skill="{skill}" context="{context}"]
    state_id = "{skill}:{context}"
    existing = check for existing state

    | Condition | Action |
    |-----------|--------|
    | --resume + exists | LOAD → ROUTE to checkpoint |
    | --resume + !exists | ERROR: "No state to resume" |
    | --status | [STATUS] → STOP |
    | exists + status=in_progress | ASK: "Resume phase {N} step {M}?" |
    | exists + status=completed | ASK: "Overwrite completed run?" |
    | exists + status=failed | ASK: "Retry from failure point?" |
    | !exists | INSERT new state |

    UPDATE status='in_progress'
```

### CHECKPOINT (after major steps)

```
[CHECKPOINT phase={N} step={M} artifact="{name}"]
    -- Record history
    -- Update state with current phase/step
    -- Mark artifact complete
```

### COMPLETE (successful finish)

```
[COMPLETE]
    -- Verify no pending artifacts
    -- Record history
    -- Update status = 'completed'
```

### ERROR (on failure)

```
[ERROR msg="{description}"]
    -- Record history
    -- Update status = 'failed'
    -- Store error message and location
```

### STATUS (inspection)

```
[STATUS]
    OUTPUT:
    ═══════════════════════════════════════════════════════
    {skill} | {context}
    ═══════════════════════════════════════════════════════
    Status: {status}
    Progress: Phase {phase_current}/{phase_total}, Step: {step_label}

    Artifacts:
    {foreach artifact: "  [{status}] {name}"}

    Last Update: {updated_at}
    {IF error: "Error: {error.message} at {error.at}"}
    ═══════════════════════════════════════════════════════
```

## LOOP PATTERNS

For design review loops and similar batch operations, use parent/child state records:

```
PARENT: {skill}:{context}
        Tracks overall loop status and summary

CHILDREN: {skill}:{context}:{item_key}
          Each item is its own state record
```

## ADOPTION CHECKLIST

```
REQUIRED CHANGES for adopting skill:

□ QUICK REFERENCE
  + --resume    Continue from checkpoint
  + --status    Show execution state
  + --history   Show state changes

□ ROUTING (add before mode detection)
  IF "--status": [STATUS] → STOP
  IF "--history": [HISTORY] → STOP
  IF "--resume": VALIDATE exists → LOAD → ROUTE
  ELSE: [INIT STATE]

□ EACH MODE entry point
  + [INIT STATE skill="{skill}" context="{context}"]

□ AFTER each major step
  + [CHECKPOINT phase=N step=M artifact="name"]

□ END of successful execution
  + [COMPLETE]

□ CATCH failures
  + [ERROR msg="description"]
```

## ERRORS

| Error | Cause | Fix |
|-------|-------|-----|
| No state found | --resume without prior run | Run without --resume |
| State locked | Concurrent access | Retry or check other processes |
| State not found | No state directory | Create state dir or run from project root |

## RELATED DOCS

- `docs/DESIGN-CONVENTIONS.md` - Core conventions and config schema
- `docs/DESIGN-KEYS.md` - Design key conventions
