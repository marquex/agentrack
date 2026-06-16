# usersRegenerate token override

## When To Use This

"usersRegenerate", "regenerate token", "token override", "add token option to usersRegenerate", "resolveAuthor token", "regenerate returns 401", "open auth mode regenerate", "BUG-1".

## Mental Model

The library's `usersRegenerate` method regenerates a user/author token. It used to take only `name` and never forwarded a caller-supplied token into `resolveAuthor`, which was the root cause of **BUG-1**: regenerating a token returned **401 in open-auth mode** because the caller had no programmatic way to prove identity. (BUG-1 is documented from the webapp side in the webapp-developer expertise.)

### Implemented design

The agreed design is now **implemented** (issue `mqe2745ekb`, 2026-06-16):

- Backward-compatible signature: `usersRegenerate(name: string, params?: UsersRegenerateParams)`.
- `UsersRegenerateParams` is `{ token?: string }` — an explicit token that overrides the ambient `AGT_USER_TOKEN` env var.
- The `token` is forwarded into the existing `resolveAuthor({ token })` call, which already understood `options.token`.
- Existing callers (no `params`) are unaffected.

### Source files touched

- `packages/library/src/core/tracker.ts` — `Tracker.usersRegenerate` method; new `params` argument and conditional token forwarding into `resolveAuthor`.
- `packages/library/src/types/api.ts` — new `UsersRegenerateParams` interface.
- `packages/library/src/types/index.ts` and `packages/library/src/index.ts` — barrel re-exports of `UsersRegenerateParams`.

### Issue chain

- `mqe26nou8f` — parent: "Library: Add token override to usersRegenerate"
- `mqe2745ekb` — implementation task: "Implement: usersRegenerate token override"
- `mqe274wi48` — former blocker: "Verify design agreed" (resolved before this session)
- `mqe1imi4lg` — CTO review (done, ACCEPT, comment `mqe1sgum9m`) where the design was decided

## Related Topics

- [library-overview.expertise.md](library-overview.expertise.md): where `usersRegenerate` and `resolveAuthor` sit in the library API.
- [library-gotchas.expertise.md](library-gotchas.expertise.md): the `exactOptionalPropertyTypes` quirk that shaped how `token` is forwarded.

## Timeline

- 2026-06-14: Implementation task picked up but actively blocked by `mqe274wi48`. Agent investigated context, confirmed design was agreed, commented, and reassigned. No code written.
- 2026-06-16: Blocker cleared; agent implemented the change end-to-end (types, tracker method, barrel exports). Typecheck and lint both passed. **Session was interrupted by `process_end` immediately after kicking off `bun run test`** — the test suite result was never observed, no completion comment was posted, and the issue was not marked `done`. Status is still `in-progress`. A follow-up needs to confirm tests pass and close out the issue.

## Gaps And Validation Needs

- **Test result not confirmed.** The implementation session ended (`process_end`) right after starting `bun run test`. Next pickup must re-run tests, then comment + mark `mqe2745ekb` `done` per the work-issue finish flow.
- **Tests for the new `{ token }` path may still need adding.** The session did not get to write/update unit tests for the token-override branch — verify whether an existing `usersRegenerate` test covers it and add one if not.
- **No CLI wiring.** The CLI under `packages/library/src/cli/commands/users.ts` was NOT updated to expose a `--token` flag; it still relies on `AGT_USER_TOKEN`. If BUG-1 should also be fixable from the CLI surface, that is a separate task.
- **Webapp e2e may assert the old 401.** The webapp Phase 4 suite previously asserted the 401 behavior (see webapp-developer BUG-1 notes). Verify whether any webapp assertion needs flipping now that the library forwards the token.
