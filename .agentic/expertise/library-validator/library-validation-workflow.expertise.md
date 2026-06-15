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
- Reading the changed source to confirm the signature/behavior matches the design.
- Running the library's unit tests (verify exact command in the repo; the library shares code with the CLI in `packages/library/`).
- Checking backward compatibility — existing callers/signatures must still work.
- Reporting results in a comment, setting `done` on success (reassign to manager) or reporting issues.

> Note: the command for running library tests and the full test layout should be re-verified from the repo on the first unblocked validation; this expertise was bootstrapped from a session that never reached the unblocked state.

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

## Gaps And Validation Needs

- **Exact test command for the library is not yet known.** The bootstrapping session was blocked and never ran tests. On the first unblocked validation, capture the real command (likely under `packages/library/`) and update this file.
- **Line numbers for `usersRegenerate` / `resolveAuthor` are point-in-time (2026-06-14).** Re-read `packages/library/src/core/tracker.ts` and `packages/library/src/core/auth.ts` before citing them.
- **Token override design details** (exact option shape, whether open-mode relaxes the self-service check) should be confirmed against the implementation issue comments and the landed code, not assumed from this pre-implementation session.
