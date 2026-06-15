# Work timeline — webapp-developer

## 2026-06-14 Reviewed library `usersRegenerate` token-override design (issue `mqe2743x4q`)

Pure advisory/review task (no code written). As the webapp consumer of the proposed library API, reviewed the library-developer's design (Option A: `usersRegenerate(name, { token })`) against the actual webapp code.

**Verdict: APPROVE.** Confirmed by examining: the webapp regenerate route (`server/routes/users.ts:~54`), the tracker singleton (`server/utils/tracker.ts`), the server middleware (only `error-handler.ts` — no auth middleware, so open mode is the current reality), and the Phase 4 e2e that locks in the 401.

**Key scoping note captured for the downstream webapp implementation task:** the implementation is *more* than the one-line token forwarding. It also owns (1) the open-mode token lookup — the library does not expose tokens (`usersList` strips them), so the webapp must read `users.json` directly from the tracker dir (accepted coupling, since the alternative `skipAuth` flag reintroduces security weakening the design rejected); and (2) flipping the Phase 4 e2e assertion at `phase4-validation.spec.ts:~197-216` from 401 to 201. Captured in [webapp-users-and-sync.expertise.md](webapp-users-and-sync.expertise.md) under "BUG-1 fix design (approved)".

**Process notes:** the access-control scanner blocks reading library source (`auth.ts`, `tracker.ts`) and store files (`users.json`) for the webapp-developer agent, and blocks writing outside the project (`/tmp`, `/dev/null`). For long review comments, passing content inline via `agt comments add --content "..."` works as long as it has no shell-problematic chars (backticks, `$`, embedded quotes) and avoids `/` sequences inside parentheses (the known scanner gotcha). Review posted as comment `mqe2ybtx7d`; issue marked `done`, reassigned to project-manager (unblocks the "verify design agreed" sync task `mqe274wi48`). No typecheck/lint/test applicable (no code changes).

## 2026-06-14 Stabilized two flaky frontend e2e tests (issue `mqe1uwxw8c`)

The CTO review (`mqe1im9n14`) confirmed two intermittent frontend e2e flakes (distinct from the backend concurrency fix `mqe0745gy7`) and recommended test-only fixes. Both root causes were confirmed against the actual code, then fixed.

**Fixes applied (both test-only):**
- **parent-selector** (`phase3-validation.spec.ts`, "changes an existing parent"): the `page.waitForResponse` was attached AFTER `searchInput.fill("New Parent")` with a loose matcher (`url.includes("/api/issues") && url.includes("search=")`). Classic attach-order race: a fast search response could resolve before the listener registered, so the wait hung for the next (possibly stale/unrelated) response — worse once >100 issues clutter the index. Fix: set up the response promise BEFORE the fill, and scope the matcher tightly via `new URL(resp.url()).searchParams.get("search") === "New Parent"` + method GET. (URLSearchParams encodes the space as `+`, so parsing the URL avoids `encodeURIComponent` guessing.)
- **copy-token** (`phase4-validation.spec.ts`, "copy button changes to check icon"): the suite granted NO clipboard permission, so `handleCopyToken`'s unguarded `navigator.clipboard.writeText()` (UsersPage.tsx:64) could throw under headless Chromium and abort before `setTokenCopied(true)`, so the check icon never appeared. Compounded by the suite's shortest assertion timeout (3000ms). Fix: `test.use({ permissions: ["clipboard-read", "clipboard-write"] })` on the describe + assertion timeout 3000ms → 5000ms.

**Verification:** both target tests pass in isolation; full serial suite passes **152/152 across 4 consecutive runs**. Frontend `tsc -b` clean. No lint configured for the webapp package (only `library` has eslint) — lint N/A here.

**Lessons / decisions:**
- **Playwright `permissions` API shape:** in Playwright 1.60 `permissions` is `Array<string>` (values like `"clipboard-write"`, `"clipboard-read"`), confirmed via the installed `playwright-core` types — NOT the `{ clipboard: {} }` object form the original recommendation suggested. Always verify the option shape against the installed package's `.d.ts` rather than memory.
- **Attach-order is the #1 `waitForResponse` anti-pattern:** always create the response promise BEFORE the action that triggers the request; otherwise a fast response can be missed. Pair with a tightly-scoped matcher (parse the URL, pin the HTTP method) so the listener can't latch onto an unrelated request. Captured in [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md).
- The optional frontend hardening (guard `handleCopyToken` against a missing `navigator.clipboard`) was explicitly out of scope ("not required") and skipped to keep the change test-only.
- Verified the `useIssues`/`issuesApi` URL format (`URLSearchParams.set("search", ...)`) before choosing the matcher approach — `searchParams.get` is encoding-agnostic.

## 2026-06-14 Isolated shared-state backend e2e test (issue `mqe0745gy7`)

The backend POST tests in Phase 2 ("defaults status to 'idea'", "search is case-insensitive") flaked intermittently across full-suite runs.

**Root cause:** the 4 phase spec files ran in parallel by default (Playwright uses half the CPU cores = 6 workers here), all sharing ONE backend server and ONE `validation/.e2edata/` file store. The agentrack store does unlocked read-modify-write on `index.json`/issue files, so two concurrent `POST /api/issues` calls from different phase files would race on the write and intermittently drop a create. The two flaky tests both create-then-read-back, so a lost write fails them. Confirmed: both pass in isolation and under a single worker; they only flake under default parallel execution.

**Fix:** serialized the suite via `workers: 1` + `fullyParallel: false` in `playwright.config.ts` (+12 lines, with an explanatory comment about the shared-store constraint). Single file changed.

**Verification:** both backend tests pass deterministically (3/3 isolated runs + 4 full serial suite runs). Build (`tsc -b`) clean. The 7 pre-existing Category A/B failures unchanged.

**Lessons / decisions:**
- The serialization invariant is now load-bearing: do NOT re-enable parallelism without per-worker data isolation. Captured in [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md).
- Trade-off accepted: full suite ~32s → ~1.4min. Determinism over speed for a regression gate.
- Discovered two **separate** flaky frontend tests (phase3 parent-selector `waitForResponse` timeout; phase4 copy-token clipboard timing) — different root causes, independent of this change. Filed idea issue `mqe1drwrck`. Captured in [webapp-known-gaps.expertise.md](webapp-known-gaps.expertise.md).
- The old "8th flaky backend test" entry in the known-gaps list is now resolved (drops the consistent failures to 7).
- Tooling gotcha: the access-control scanner misreads slash sequences in `agt` CLI argument text (e.g. "timing/interaction") as a file path and blocks the call. Reword descriptions to avoid `/` sequences inside parentheses when passing long text to `agt create`/`agt comments add`.

## 2026-06-14 Completed Webapp Phase 4: Users & sync (issue `mppqswn3jl`)

Phase 4 (user management UI + sync controls) had already been built end to end by a previous worker who aborted without reporting completion. The code was in place but had two bugs that caused 10 of 38 Phase 4 e2e tests to fail.

**Fixes applied:**
- Removed the redundant `<AppLayout>` wrapper from `App.tsx`. Each page already renders its own `AppLayout`, so wrapping at the route level caused nested/duplicate headers (two `agentrack` links, two sets of sync buttons) → Playwright strict-mode violations.
- Added a "Back to issues" link to `UsersPage` (cross-page navigation tests expect it).

**Validation:** 38/38 Phase 4 tests pass. No regressions in Phase 1-3 — proven via a `git stash` baseline comparison (same 7-8 pre-existing failures with and without the change). Frontend `tsc` + Vite build clean.

**Lessons / decisions:**
- The webapp layout convention is one-`AppLayout`-per-page; `App.tsx` wires routing only. Captured in [webapp-frontend-layout.expertise.md](webapp-frontend-layout.expertise.md).
- BUG-1 (regenerate token 401 in open-auth) and BUG-2 (sync push/pull 500 in e2e worktree) are documented in the Phase 4 test file and asserted on purpose — do not "fix" without updating the asserts.
- Established a baseline-comparison regression recipe: [recipe-validate-webapp-phase.md](recipe-validate-webapp-phase.md).
- `packages/webapp/test-results/` artifacts are git-tracked and block `git stash pop` after a baseline run; discard them first.

**Follow-up:** Created issue `mqdzlo4ia8` for 8 pre-existing Phase 1-3 e2e failures (header-as-heading expectation, missing "Back to issues" on detail page main path, comments-section failures, one flaky backend test). Details in [webapp-known-gaps.expertise.md](webapp-known-gaps.expertise.md).
