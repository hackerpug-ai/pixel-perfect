# The `harness-smoke` environment — credential bindings

The evaluator grades real harnesses, so it needs real keys. This page is the whole rule: which
environment holds them, which five names exist, which step each one may appear on, and who is
allowed to create or rotate them. Nothing else in the workflow may widen it.

## The environment

- Name: **`harness-smoke`**. It attaches to the **smoke matrix job only**
  (`.github/workflows/harness-eval.yml`, `jobs.smoke.environment`).
- No other job declares an environment. The `drift` proof, the `download` cell transfer and the
  `grade` recorder hold no environment and no model key, so they cannot read one.
- No package-manager cache step exists on the smoke matrix. A cache on a secret-bearing job is
  prohibited.

## Who may create, rotate or delete a secret

**No agent creates, rotates or deletes a secret, and no agent ever prints one.** Adding or
rotating a binding is an owner-only action, taken in the repository's environment settings. The
only thing any agent, step or test may do with a secret is read its **name**:

```
gh api repos/hackerpug-ai/pixel-perfect/environments/harness-smoke/secrets --jq '[.secrets[].name]|sort'
```

That projection returns names. Anything that would return a value is refused.

## The five bindings

Each row is the *only* place that secret may appear, and the variable is the one its CLI actually
consumes. The environment secret is mapped to that variable in the step's own `env:` block:

| Harness | Environment secret | Step variable | Notes |
|---|---|---|---|
| claude-code | `SMOKE_CLAUDE_KEY` | `ANTHROPIC_API_KEY` | graded live this sprint |
| codex | `SMOKE_CODEX_KEY` | `CODEX_API_KEY` | adapter in a later sprint |
| grok | `SMOKE_GROK_KEY` | `XAI_API_KEY` | no `--trust` in any keyed step |
| opencode | `SMOKE_OPENCODE_KEY` | `ANTHROPIC_API_KEY` | pinned Anthropic provider; no `--auto` |
| pi | `SMOKE_PI_KEY` | `GEMINI_API_KEY` | provider `google`; exact model in `pins.json` |
| cursor | *(absent)* | `CURSOR_API_KEY` | `could-not-run` / `missing-api-key` — never omitted |

`ANTHROPIC_API_KEY` is a **step variable**, not a repository secret: it is mapped from
`SMOKE_CLAUDE_KEY` (and from `SMOKE_OPENCODE_KEY` in the opencode cell). Never add it as a secret.

`test/harness/pins.json` is the grading authority for the same table (`credential_env` and
`binding_env` per harness); the flow module cross-checks the two so neither can drift alone.

## Where a key may appear

- On the step named **`Smoke model step <harness> ${{ matrix.track }}`** for that harness, and
  nowhere else. That step is gated with `if: matrix.harness == '<harness>'`, so the other eleven
  cells do not run it and never receive its key.
- **Never** on an install, marketplace, plugin-install, command-list, recorder, upload, download or
  drift-proof step. Those steps must have no `env:` entry for any credential name and no
  `secrets.` reference in their `run:` body, `with:` input or step name.
- **Never** at job level or workflow level: an `env:` map above step level binds the key into every
  step that inherits it, which is exactly the leak the per-step rule prevents.

## How absence is asserted, and why a missing key cannot read as a pass

`jobs.smoke` carries one extra step, `Keyless control - a missing credential must refuse`. It runs
beside the authenticated claude-code cells (`if: matrix.harness == 'claude-code' && matrix.track ==
'pinned'`) and does two things in order:

1. **Assert absence in-step**, for the consumed key and for every permitted fallback:

   ```
   for name in ANTHROPIC_API_KEY CODEX_API_KEY XAI_API_KEY GEMINI_API_KEY CURSOR_API_KEY; do
     if [ -n "${!name:-}" ]; then
       echo "::error::the keyless control is invalid: $name is present on this step, so absence would prove nothing"
       exit 1
     fi
   done
   ```

   If a key were present the step fails loudly instead of "proving" a refusal it did not earn.

2. **Ask the real guard** (`test/harness/runtime/guard.mjs`, `guardInvocation`) what a keyless
   invocation is. It answers `could-not-run` / `missing-api-key` with **zero model requests**,
   because the guard refuses before spawning anything. The step writes that row to
   `cell/keyless-control.json` and fails if the answer is anything else.

The per-cell model steps use the same guard (`resolveCredential`), so a harness whose key is not in
the environment records `could-not-run` / `missing-api-key` from the same code path Cursor uses —
one reason string, one guard, no special cases. Cursor's key is not in `harness-smoke` and none is
invented for it; that honest refusal is the day-one result, not a gap to paper over.

## Adding a harness later

Adding a key for a harness that has none (Cursor, when the owner decides) is an owner action:
create the secret in `harness-smoke`, add exactly one `Smoke model step <harness>` with a single
`env:` entry naming that variable, add the variable to the keyless control's absence loop, and
update `pins.json` and the table above. Do not reuse another harness's binding, and do not add a
login cache or an alternate-provider fallback: there are none, by design.
