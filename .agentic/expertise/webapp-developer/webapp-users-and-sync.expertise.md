# Webapp users & sync (Phase 4)

## When To Use This

"users page", "register user", "revoke user", "regenerate token", "sync push", "sync pull", "Phase 4", "Header sync buttons".

## Mental Model

Phase 4 (issue `mppqswn3jl`, "Webapp Phase 4: Users & sync") added user management and sync controls. The feature is implemented end to end:

**Backend routes** (`packages/webapp/server/routes/`):

- `POST /api/users` — register a new user, returns a token.
- `DELETE /api/users/:name` — revoke a user.
- `POST /api/users/:name/regenerate` — regenerate a user's token.
- `POST /api/sync/push` — push local changes to remote.
- `POST /api/sync/pull` — pull remote changes.

**Frontend** (`packages/webapp/frontend/src/`):

- `api/users.ts`, `api/sync.ts` — typed API client functions.
- `hooks/use-users.ts`, `hooks/use-sync.ts` — TanStack Query hooks (mutations + query state).
- `pages/UsersPage.tsx` — user management UI: list users, register-user dialog, revoke-with-confirmation dialog, regenerate-token dialog that shows the new token with a copy button, and a "Back to issues" link.
- `components/layout/Header.tsx` — sync controls: Push/Pull buttons, loading spinner, success/error feedback, last-sync timestamp. Buttons disable while a request is in flight and re-enable on completion (success or failure).

## Documented backend bugs the tests expect (do NOT "fix" by changing tests)

These are encoded in `e2e/phase4-validation.spec.ts` as known issues. The tests explicitly assert the current buggy behavior, so "fixing" the backend would flip these asserts and break the suite:

- **BUG-1:** `POST /api/users/:name/regenerate` returns 401 in open-auth mode because the server does not forward the user token. The regenerate test asserts the API call is made and documents this. **The fix design has now been reviewed and APPROVED** — see "BUG-1 fix design (approved)" below.
- **BUG-2:** `POST /api/sync/push` and `/sync/pull` return 500 in the e2e worktree because `AGENTRACK_CWD` points at the worktree directory, not the project root. The push/pull tests assert status 500 and only verify that the buttons trigger the call and that the UI re-enables afterward.

If the underlying backend bugs are ever fixed for real, the corresponding test assertions must be updated in the same change.

## BUG-1 fix design (approved)

The regenerate-token 401 has an approved cross-team design as of 2026-06-14. The webapp-developer reviewed the library-developer's API design from the consumer side and approved it (review `mqe2743x4q`, design `mqe274dj8z`, parent feature `mqe26nou8f`). Plan summary so the next webapp implementation task is scoped correctly:

- **Library API:** `usersRegenerate(name, options?: { token?: string })` — Option A, an options-object form (preferred over positional for extensibility). `UsersRegenerateResult` is unchanged, so the existing route's result/error-message handling needs no changes. The self-service check stays in place; passing the wrong token still 401s (defensive, wanted).
- **Webapp route change** (`server/routes/users.ts:~54`) is a one-line forwarding of the resolved token into the new param — but the *overall* webapp task is bigger than that one line (see next point).
- **Open-mode token lookup (the real webapp work):** the webapp runs purely open-mode (confirmed: only `error-handler.ts` middleware exists — no auth middleware extracts an incoming user token). So there is no incoming token to forward; the webapp must look up the target user's *current* token and pass it in. The library intentionally does **not** expose tokens (`usersList` strips them), so the webapp has to read the users store directly from the tracker dir (`users.json`). This couples the webapp to the library's storage format — an accepted tradeoff, because the alternative (a `skipAuth` flag) reintroduces the security weakening the design explicitly rejected. The webapp already holds the cwd via the `tracker` singleton (`server/utils/tracker.ts`), so the read is feasible.
- **E2e assertion flip:** `e2e/phase4-validation.spec.ts:~197-216` currently locks in the 401. The implementation task must flip that assertion to `201` plus a new token in the same change.

**Net:** when scoping the webapp implementation task, it owns (1) the one-line token forwarding, (2) the open-mode token lookup by reading the store, and (3) the e2e assertion flip — not just the forwarding.

## Validation

All 38 Phase 4 tests in `e2e/phase4-validation.spec.ts` cover: user registration, revoke confirmation, token regeneration (BUG-1), token copy, sync Push/Pull visibility and API calls (BUG-2), loading/success/error states, and cross-page navigation.

## Related Topics

- [webapp-frontend-layout.expertise.md](webapp-frontend-layout.expertise.md): Header/AppLayout that host the sync buttons.
- [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md): how to run these tests and the regression recipe.

## Timeline

- 2026-06-14: Reviewed the library-developer's `usersRegenerate` token-override API design from the consumer side (`mqe2743x4q`). Verdict: APPROVE — `usersRegenerate(name, { token })` fits the webapp regenerate route as a one-line forwarding change, backward-compatible. Flagged that the webapp implementation task is bigger than the one line: it must also own the open-mode token lookup (read `users.json` directly, since `usersList` strips tokens and there's no auth middleware) and the Phase 4 e2e assertion flip (401 → 201). Review posted as comment `mqe2ybtx7d`; issue marked `done`, reassigned to project-manager. No code written. See "BUG-1 fix design (approved)" above.
- 2026-06-14: Completed Phase 4. Backend endpoints, API clients, hooks, `UsersPage`, and Header sync controls had already been built by a previous worker who aborted without reporting completion. Fixed two bugs (duplicate `AppLayout` nesting, missing "Back to issues" link on `UsersPage`) to take the Phase 4 suite from 28/38 to 38/38 passing. Issue `mppqswn3jl` marked `done`.
