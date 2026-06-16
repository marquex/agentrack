# Known webapp backend bugs (BUG-1, BUG-2, BUG-3)

## When To Use This

"reproduce BUG-1", "validate the regenerate 401 fix", "reproduce BUG-2", "validate the sync 500 fix", "why does regenerate return 401", "why does sync push return 500", "which Phase 4 tests lock in buggy behavior", "cleanupE2ESeeds leaves stragglers", "parallel DELETE race", "BUG-3 e2e cleanup".

## Mental Model

Two backend bugs in the webapp server (`packages/webapp/server/routes/`) were discovered during Phase 4 validation. Each is **tracked by an issue**, has a **root cause in the route layer**, and is **asserted by an existing Phase 4 e2e test** — so the suite is green even though the behaviors are broken end-to-end. Validating a fix therefore means *rewriting the test* to assert success, not just watching it go green.

### BUG-1 — regenerate returns 401 in open auth mode

- **Tracking issue:** `mqe162cmbi`. **Reproduce task:** `mqe27g2g7o` (done — root cause confirmed).
- **Symptom:** `POST /api/users/:name/regenerate` in open-auth mode returns HTTP `401`, code `INVALID_TOKEN`, message `"You can only regenerate your own token."`. Server log: `[Error] You can only regenerate your own token.` / `--> POST regenerate endpoint 401 1ms`.
- **Root cause:** `packages/webapp/server/routes/users.ts:54` calls `tracker.usersRegenerate(name)` and forwards **no caller identity / user token**. The tracker's `resolveAuthor` then resolves to the default `"anonymous"`, which fails the self-service check inside `usersRegenerate` (caller != target name).
- **Reproduction (manual):** start a dev server (e.g. `bun run --watch server/index.ts`; the session used port **3999**) and `curl -X POST` the regenerate endpoint in open-auth mode → observe the 401 + error message above.
- **E2E lock-in:** `e2e/phase4-validation.spec.ts` around lines **197–216** (test at ~line 198) asserts `expect(status).toBe(401)`. This test currently PASSES against the bug.
- **Fix shape:** route must forward the caller identity/token to the tracker. When fixed, that test must be rewritten to assert `200` + new token returned.

### BUG-2 — sync push/pull returns 500 NOT_INITIALIZED (APPEARS FIXED — stale tests remain)

- **Tracking issue:** `mqe162svv5`. (Not yet independently reproduced in a dedicated task.)
- **Original symptom:** sync push / pull returned HTTP `500 NOT_INITIALIZED`.
- **Original root cause (from Phase 4 validation):** `packages/webapp/server/routes/sync.ts` (lines ~4, 11, 21) passes `AGENTRACK_CWD` (the webapp server's worktree dir) into `pushWorktree` / `pullWorktree` instead of the actual project root, so the tracker sees an uninitialized cwd.
- **Status as of 2026-06-16 (mqguhe7eyw full-suite run):** the Phase 4 sync tests that assert `expect(...).toBe(500)` now **FAIL because sync push/pull returns `200` instead of `500`**. This strongly suggests BUG-2 has been **fixed** in the server code. The tests themselves are now **stale** and must be rewritten to assert success (200 + end-to-end sync behavior). This has been flagged for the PM to route back to webapp-developer.
- **Fix shape (for the tests, not the code):** rewrite the Phase 4 sync tests to assert `200` and verify sync actually works end-to-end, rather than asserting the old `500`.

### BUG-3 — `cleanupE2ESeeds()` parallel-DELETE race leaves stragglers (non-blocking)

- **Tracking issue:** idea `mqh5aew5am` (also covers the `${BACKEND_PORT}` cosmetic bug). **Found during:** `mqh3syrrnb` (E2E isolation hardening validation), 2026-06-16.
- **Symptom:** `cleanupE2ESeeds()` in `packages/webapp/e2e/setup.ts` issues parallel DELETEs via `Promise.all` against the agentrack backend. The backend's file store performs unlocked read-modify-write cycles on `index.json` / issue files, so concurrent DELETEs race and some are silently dropped.
- **Reproduction (validated against an isolated backend on 5001 with `AGENTRACK_CWD=validation/.e2edata`):** seed 3 issues tagged `e2e-seed`; run `cleanupE2ESeeds()` once (parallel `Promise.all` of DELETEs); **2 of 3 tagged issues REMAINED**. A second cleanup pass removed the rest.
- **Impact:** NON-BLOCKING. Does NOT cause real-data leakage — Layer A (cwd assertion), the `e2e-seed` tag, the `validation/.e2edata/` isolation dir, and `global-setup`'s authoritative `resetWorktreeData()` all still hold. Stragglers only accumulate briefly inside `validation/.e2edata/` until the next run's global-setup reset wipes them. But the README claim "an interrupted/failed spec does not leave stale seeds behind for the next spec" is **weaker than reality** — a single `afterAll` can leave stragglers.
- **Suggested fix:** serialize the DELETEs in `cleanupE2ESeeds()` (a `for...of await` loop), or loop the list-then-delete-until-empty pattern until a `listByTag` pass returns 0, or add a short retry loop per delete.
- **Adjacent cosmetic bug (same idea `mqh5aew5am`):** the Layer A guard error message in `packages/webapp/e2e/global-setup.ts` contains a literal `${BACKEND_PORT}` because the second concatenated string uses regular double quotes (`"..."`) instead of a backtick template literal, so the port number is not interpolated. Cosmetic only; the guard still fires correctly.

## Related Topics

- [webapp-validator-gotchas.md](webapp-validator-gotchas.md): the "Phase 4 tests assert KNOWN-BUGGY behavior" trap points here.
- [webapp-overview.expertise.md](webapp-overview.expertise.md): e2e spec layout and commands.
- [timeline.expertise.md](timeline.expertise.md): when each bug was found and reproduced.

## Timeline

- 2026-06-14: Both bugs discovered during Phase 4 validation; issues `mqe162cmbi` and `mqe162svv5` created.
- 2026-06-16: BUG-1 independently reproduced (`mqe27g2g7o`); root cause confirmed at `users.ts:54` (no auth context forwarded). BUG-2 still only documented, not separately reproduced.
- 2026-06-16: During URL-filtering validation (`mqguhe7eyw`), the full E2E suite showed the BUG-2 Phase 4 sync tests now **fail with `Expected 500, Received 200`**. BUG-2 appears to have been fixed in code; the tests are stale and need rewriting to assert success. Flagged to PM for routing to webapp-developer.
- 2026-06-16: BUG-3 discovered while validating E2E isolation hardening (`mqh3syrrnb`). `cleanupE2ESeeds()` parallel DELETEs race on the unlocked file store; empirically 2 of 3 tagged seeds survived one cleanup pass. Filed as idea `mqh5aew5am` (also covers the `${BACKEND_PORT}` cosmetic bug in the Layer A guard message). Non-blocking — no real-data leakage.

## Gaps And Validation Needs

- BUG-2 appears to have been fixed (sync now returns 200, per the 2026-06-16 full-suite run). The remaining work is **test maintenance**, not a code fix. Verify against `server/routes/sync.ts` to confirm the fix and identify which Phase 4 sync tests assert the old `500` and need updating to `200`.
- BUG-3 (`mqh5aew5am`) is non-blocking but weakens the Layer B self-healing guarantee. When validating a fix, confirm a single `cleanupE2ESeeds()` pass removes 100% of tagged seeds (serialize the DELETEs, or loop list-then-delete-until-empty). Reproduction harness pattern is in the BUG-3 entry above.
- Line numbers in `users.ts` / `sync.ts` / `e2e/setup.ts` / `global-setup.ts` and the Phase 4 spec drift as code changes — re-open the file rather than trusting the number.
- Deep tracker internals (`resolveAuthor`, `usersRegenerate`, `pushWorktree`/`pullWorktree`, the file-store RMW) live in the library source (`packages/library/`) which this agent cannot read; re-derive from source or ask the webapp-developer / library-developer if the mechanism is unclear.
