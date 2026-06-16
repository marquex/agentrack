# Library validation workflow

## When To Use This

"validate library change", "how do validation tasks work", "blocked by implementation", "what to check when validating a library task", or any `/work-issue` assignment whose title starts with "Validate:".

## Mental Model

The library-validator checks that library implementation work landed correctly. Validation tasks follow a predictable shape in the agentrack issue graph:

### Task lifecycle

- A library change (e.g. "Library: Add token override to usersRegenerate") is planned by the project-manager as a parent issue.
- The parent spawns (at least) two children:
  1. An **implementation task** ("Implement: ...") assigned to `library-developer`.
  2. A **validation task** ("Validate: ...") assigned to `library-validator`, **blocked by** the implementation task.
- The validator cannot start until the implementation sibling reaches `done`. This blockage is the normal, intended dependency — not an error.

### When the validation task is blocked

On `/work-issue`, if the implementation sibling is still `todo`/`in-progress`, the validation task has an **active blockage**. Per the skill workflow this means: comment, reassign to `project-manager`, and exit.

**Recommended behavior (demonstrated 2026-06-14):** before reporting blocked, briefly verify the actual code state so the comment is informed rather than mechanical. Confirm the change really hasn't landed, cite the file/line/signature you checked, and state exactly what would need to be true for validation to proceed. This makes the hand-back useful to the manager and the developer.

### When the validation task is unblocked

Once the implementation sibling is `done`, validate by:
- Reading the implementation issue's comments for what was delivered and any caveats.
- Reading the changed source (`git diff <file>` plus reading the file) to confirm the signature/behavior matches the design.
- Running the library's quality checks: **typecheck, lint, then tests** (commands below).
- Checking backward compatibility — existing callers/signatures must still work.
- Reporting results in a comment, setting `done` on success (reassign to manager) or reporting issues.

### Library quality-check commands

Run from inside `packages/library/` (the scripts live in `packages/library/package.json`):

- Tests: `bun test` (script `test`). Also `test:coverage` = `bun test --coverage`, and `test:watch`.
- Typecheck: `bun run typecheck` → runs `tsc --noEmit`.
- Lint: `bun run lint` → runs `eslint src/ tests/`.

A normal unblocked validation runs all three: typecheck, lint, `bun test`. Demonstrated 2026-06-16 (typecheck + lint clean; the test run started but the session was interrupted before results — see timeline).

### Pitfall: shell cwd persists across Bash calls

The Bash tool keeps the working directory across calls within a session. If you `cd packages/library && ...` once, a later `cd packages/library && ...` fails with `no such file or directory: packages/library` because you're already there.

Recovery shown 2026-06-16: run `pwd && ls` to confirm where you are, then drop the `cd` prefix on subsequent commands. Prefer checking `pwd` once at the start of the quality-check phase rather than prefixing every command with `cd packages/library`.

### Inspecting the real dogfood `.agentrack/` tracker

Sometimes a human asks the library-validator an advisory question about the real dogfood tracker (e.g. "did you create test data in `.agentrack/`?"). To answer, you must inspect the live tracker — but there are access and CLI constraints to know about first.

- **`library-validator` has no access rule covering `.agentrack/`.** A direct `ls .agentrack/...` / file read returns `agent 'library-validator' has no access rule covering '.agentrack'`. Don't treat this as a dead end: route through the `agt` CLI instead, which the agent is allowed to run.
- Useful inspection commands: `agt list` (JSON issue list), `agt users list` (JSON user list), `agt me` (current resolved user). Pipe through `head`/`python3 -c`/`grep` to slice the JSON.
- **`agt list` has no `--limit` flag** (`error: unknown option '--limit'`). Use `agt list | head -N` to bound output. Run `agt <command> --help` if unsure which flags exist.
- This agent's own validation work does **not** seed fixture data into the real tracker — library tests run via `bun test` in `packages/library/` with isolated fixtures. So if you see test pollution in `.agentrack/`, it almost certainly came from another agent/suite (observed 2026-06-16: webapp E2E test data was the source — see timeline).

## Auth & user model in the library

The validator has already needed to reason about the auth/user subsystem. Key pieces observed (verify line numbers before relying on them — they shift as the file changes):

- `usersRegenerate(name)` lives in `packages/library/src/core/tracker.ts` (around line 1883 as of 2026-06-14). It regenerates a user's token.
- It calls `resolveAuthor({ config, users, requiresWrite: true })` (imported from `./auth`, i.e. `packages/library/src/core/auth.ts`) to identify the caller from the global `AGENTRACK_TOKEN` env var.
- It enforces a **self-service check**: the resolved caller must equal the target user whose token is being regenerated. A caller cannot regenerate another user's token.
- The "token override" feature (in progress as of 2026-06-14, issue `mqe2745ekb`) aims to let a caller pass a `{ token }` option that forwards into `resolveAuthor` instead of reading `AGENTRACK_TOKEN`, and/or relaxes the self-service check in open auth mode. This had **not been implemented** at validation time.

## Related Topics

- [timeline.expertise.md](timeline.expertise.md) — record of work on these tasks.

## Timeline

- 2026-06-14: Bootstrapped from a blocked validation session. The agent verified `usersRegenerate` had no token-override option in code, reported the active blockage against `mqe2745ekb`, and reassigned to `project-manager`. See timeline for details.
- 2026-06-16: First **unblocked** validation (`mqe2xmdugp`, worktree sync push/pull). Captured the real quality-check commands (typecheck/lint/`bun test`) and the persistent-shell-cwd pitfall. Session was interrupted during the test run before completion. See timeline for details.
- 2026-06-16: Advisory session on dogfood-tracker pollution. Captured the `.agentrack/` access restriction (use `agt` CLI, not direct file reads) and the `agt list --limit` invalid-flag gotcha. See timeline for details.

## Gaps And Validation Needs

- **Line numbers for `usersRegenerate` / `resolveAuthor` are point-in-time (2026-06-14).** Re-read `packages/library/src/core/tracker.ts` and `packages/library/src/core/auth.ts` before citing them.
- **Token override design details** (exact option shape, whether open-mode relaxes the self-service check) should be confirmed against the implementation issue comments and the landed code, not assumed from this pre-implementation session.
- **The 2026-06-16 worktree-sync validation was interrupted before `bun test` returned.** The full test result for that change is unknown — the next run should re-run `bun test` and confirm the sync push/pull behavior end-to-end (the dev task also noted phase4 tests still needed updating by `webapp-developer`).
