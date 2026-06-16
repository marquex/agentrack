# Webapp e2e data isolation

## When To Use This

"how does e2e data stay separate from real data", "e2e worktree", "AGENTRACK_CWD", "validation/.e2edata", "resetWorktreeData", "global-setup", "seeds leaked into .agentrack", "tag e2e seeds", "delete seed issues", "isolation hardening", "health cwd", "Layer A / Layer B / Layer C", "mqh3sj0wn5", "mqh3ss1nfh".

## Mental Model

The e2e suite must never mutate the project's real `.agentrack/` data. Isolation rests on **one env var** plus a **per-run reset**, now (as of 2026-06-16, issue `mqh3ss1nfh`) reinforced by a **three-layer hardening**: a startup cwd assertion, self-healing tagged seeds, and docs.

### How isolation works (implemented 2026-06-16)

1. **`AGENTRACK_CWD` is the primary isolation boundary.** `playwright.config.ts` sets `AGENTRACK_CWD` in the backend webServer's `env` to point at an isolated worktree data dir under `validation/.e2edata/` (computed by `getE2EDataDir()` in `e2e/setup.ts`). The backend's `server/utils/tracker.ts` reads `const cwd = process.env.AGENTRACK_CWD || process.cwd()` at module load and passes it to `new Tracker(cwd)`.
2. **Layer A — startup cwd assertion (strongest guard).** `server/utils/tracker.ts` now **exports `cwd`**; `GET /api/health` echoes it as `HealthResponse.cwd`; `e2e/global-setup.ts` is `async`, waits for the backend, and asserts `health.cwd === getE2EDataDir()` **before any seed is created**. A stale/wrong server on the e2e port fails the run loudly instead of corrupting real data. This closes the old trust-based gap.
3. **Layer B — self-healing tagged seeds.** Every e2e-created issue is tagged `e2e-seed` (the `E2E_SEED_TAG` constant in `e2e/setup.ts`). A shared `cleanupE2ESeeds()` helper lists all `e2e-seed` issues (`GET /api/issues?tags=e2e-seed`) and deletes each via `DELETE /api/issues/:id`, tolerant of already-deleted ids. It is wired as a **per-file `test.afterAll`** in every spec that creates issues (url-filters, phase2, phase3, dashboard-roots). The global-setup reset remains the authoritative per-run wipe; this is defense-in-depth for mid-run leaks.
4. **`resetWorktreeData()` still runs ONCE per run** in `e2e/global-setup.ts` (after `ensureE2EWorktree()`), wiping the e2edata dir before any spec runs. It does **not** run per test/spec — seeds accumulate within a run, which is why the Layer B `afterAll` matters.
5. **Neither webServer sets `reuseExistingServer`** — intentionally absent so Playwright boots its own servers against the isolated worktree and never grabs a stale dev server. (See [webapp-server-ports.expertise.md](webapp-server-ports.expertise.md).)
6. **The backend ports are the secondary boundary** — e2e uses 5001/5000, distinct from dev 3001/3000. See [webapp-server-ports.expertise.md](webapp-server-ports.expertise.md).
7. **Layer C — docs.** `packages/webapp/e2e/README.md` records all the invariants above.

## Main moving parts

- `packages/webapp/playwright.config.ts` — sets `AGENTRACK_CWD` (and `PORT=5001`, `VITE_PORT=5000`) on the backend webServer; defines the two `webServer` entries (no `reuseExistingServer`).
- `packages/webapp/e2e/setup.ts` — `getE2EDataDir()`, `ensureE2EWorktree()`, `resetWorktreeData()`, plus (Layer B) the `E2E_SEED_TAG = "e2e-seed"` constant and the `cleanupE2ESeeds()` helper. `resetWorktreeData` shells out via `execSync` and assumes `agt` is on PATH (global-setup runs `agt init`).
- `packages/webapp/e2e/global-setup.ts` — `async`; calls the setup helpers, then waits for the backend and asserts `health.cwd === getE2EDataDir()` (Layer A). Reads `E2E_BACKEND_PORT` env (default `5001`).
- `packages/webapp/server/utils/tracker.ts` — computes and **exports `cwd`** (`process.env.AGENTRACK_CWD || process.cwd()`); constructs the `Tracker` with it.
- `packages/webapp/server/routes/health.ts` — returns `{ status, tracker, cwd }`. Imports `cwd` from `utils/tracker.ts`.
- `packages/webapp/server/types.ts` — `HealthResponse` now has `cwd: string`.
- `packages/webapp/server/routes/issues.ts` — the issues API, now including **`DELETE /api/issues/:id`** (calls `tracker.issueDelete(id)`, the same primitive as `agt delete`). Used by `cleanupE2ESeeds()`.
- `packages/webapp/e2e/README.md` — Layer C docs; the canonical statement of the isolation invariants.
- The 4 seeding specs (`url-filters`, `phase2`, `phase3`, `dashboard-roots`) — each has a top-level `test.afterAll(async () => { await cleanupE2ESeeds(); })` and every issue-creation `data: { ... }` block carries `tags: ["e2e-seed", ...]`.

## How Layer B tagging was applied (implemented 2026-06-16)

- Tagging was done mechanically via a one-shot Python script (`_tag_seeds.py`, since deleted) that brace-matched every `data: { ... }` block containing a `title:` key (issue-creation blocks; comments use `content:`, users use `name:`, blockages use `blockerId:`/`by:` — none collide). For blocks with an existing `tags:` array it prepended `"e2e-seed"` inside the `[`; otherwise it inserted `tags: ["e2e-seed"],` after the opening brace.
- Actual counts tagged: **phase2 29, phase3 70, dashboard-roots 21, url-filters 1 (the `seedIssues` helper, covering all its call sites) = 121 blocks**. (The planning estimate of ~136 was a grep upper bound; the script's `title:`-key check is the precise count. Re-run a similar script if specs change.)
- Validation-error POSTs (blank/non-string `title`) also got the tag; harmless because the server validates `title` first and returns 400 before reading `tags`.

## Business Rules And Invariants

- **`AGENTRACK_CWD` is load-bearing** — set in `playwright.config.ts` webServer.env, read in `server/utils/tracker.ts`. Do NOT rename it without updating both sides.
- **Never add `reuseExistingServer: true`** to either webServer — it would let Playwright grab a stale dev server pointed at real data.
- E2E ports (5001/5000) must stay distinct from dev (3001/3000) — they encode isolation.
- The serialization invariant (`workers: 1`) is separate but related — see [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md). Do not re-enable parallelism without per-worker data isolation.

## Gotchas

- **`afterAll` is NOT a named export of `@playwright/test`.** It must be called as `test.afterAll(...)`. Importing `{ afterAll }` throws `SyntaxError: ... does not provide an export named 'afterAll'` at load time (the whole suite fails to list). Verified with the installed Playwright 1.60 types.
- The access-control scanner blocks the webapp-developer from `/tmp`, `/dev/null`, and folders without an explicit access rule; `.agentic/specs/` is read-only; bare globbing (`find ... -name tsc ...`) is blocked as "Bash call without resolvable path". To post long markdown comments to `agt comments add`, write the content to a scratch file inside `packages/webapp/` (writable), then pass it via `--content "$(cat file)"`, then delete the scratch file. Avoid path-like substrings (e.g. `server/index.ts:`) and shell-special chars (backticks, `$`) inside `--content` strings — the scanner misreads them.
- `resetWorktreeData` runs once per run, not per test. Don't assume a clean store between specs within a run — that's why the Layer B `test.afterAll` cleanup exists.
- The webapp package has **no configured typecheck/lint script** (the server is run by bun). `bunx tsc --noEmit` on server files works for a smoke check but always reports pre-existing errors (missing `@types/node`, the `isWorktreeInitialized` runtime method the library types don't expose). Use it only to confirm *new* errors aren't introduced, not as a clean gate.

## Related Topics

- [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md): how to run the suite, the serialization invariant, flakiness history.
- [webapp-server-ports.expertise.md](webapp-server-ports.expertise.md): the port layout that forms the secondary isolation boundary, and the AirPlay/port-5000 gotcha that blocks running the suite locally.

## Timeline

- 2026-06-16: Planning task `mqh3sj0wn5` ("Plan E2E isolation hardening") produced the three-layer plan (comment `mqh3zp17o3`), verified against source. Marked done, reassigned to project-manager; unblocks implementation child `mqh3ss1nfh`. Discovered: no DELETE route on the server, `Tracker.cwd` is private, ~136 inline seed-POSTs with no shared helper, no webapp README, stale port numbers in the spec text.
- 2026-06-16: **Implemented all three layers in `mqh3ss1nfh`** (comment `mqh4u7h8aq`, marked done → project-manager). (A) exported `cwd` from `server/utils/tracker.ts`, added `cwd` to `HealthResponse` + health route, made `global-setup.ts` async with the health-cwd assertion. (B) Added `DELETE /api/issues/:id` (option B1 — exposes library `issueDelete`), the `cleanupE2ESeeds()` helper + `E2E_SEED_TAG` in `setup.ts`, tagged 121 issue-creation blocks across 4 specs via a one-shot Python script, wired `test.afterAll(cleanupE2ESeeds)` per file. (C) Created `e2e/README.md`. Deviation: kept the real e2e ports 5001/5000 (task text wrongly said 3001/5174) and documented them. Verified: 176 tests load via `playwright test --list`; no new tsc errors. Full regression NOT run locally — port 5000 held by AirPlay. Lesson: `afterAll` is `test.afterAll`, not a named `@playwright/test` export.

## Gaps And Validation Needs

- **Full e2e regression after hardening is NOT yet run.** Port 5000 is held by macOS AirPlay Receiver on this machine. The webapp-validator should run the suite in an environment where 5000/5001 are free to confirm the `afterAll` cleanup + health assertion don't introduce flakiness or slow the suite meaningfully.
- **No shared `createSeedIssue()` helper.** Tagging was applied inline across 121 call sites. Future seed additions must remember to add `tags: ["e2e-seed"]` manually (or a helper should be introduced to make it automatic). If a new seeding spec is added, it must wire `test.afterAll(cleanupE2ESeeds)` itself.
- `bunx tsc --noEmit` on server files shows pre-existing errors (`isWorktreeInitialized` not in library types, missing `@types/node`) — not blockers because bun provides these at runtime, but confirm the library's public types if the server's tsconfig is ever added.
