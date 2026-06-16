# Webapp E2E test isolation and the leaked-seed cleanup

## When To Use This

Any task touching the webapp Playwright E2E suite, test data isolation, the `AGENTRACK_CWD` env var, leaked seed issues, `global-setup`, the `webServer` config, or the e2e data worktree: "clean up leaked seeds", "harden e2e isolation", "test data leaked into the real tracker", "url-filter seed issues", "startup cwd assertion", "reuseExistingServer", "e2e ports 3001/5174", "validation .e2edata".

## Mental Model

The webapp runs a Playwright E2E suite that creates throwaway issues (seeds) to drive the UI tests. To keep that test data out of the real agentrack tracker, the suite runs against an **isolated data directory** instead of the repo root.

### Isolation boundary (the core invariant)

- The backend reads **`AGENTRACK_CWD`** to decide which tracker directory to use. Set it to the e2e data dir and the backend is isolated; leave it unset and the backend binds to `process.cwd()` (the real repo root) and every seed lands in the real tracker.
- The isolated data dir lives under `validation/.e2edata` (a git worktree managed by the setup helpers).
- The isolation boundary uses **distinct ports**: backend `3001`, frontend `5174` — intentionally different from production `3000` / `5173` so a stray prod server can't be mistaken for the test server.

### How the pieces connect

- `packages/webapp/playwright.config.ts` — defines two `webServer` entries (backend + frontend). The backend entry sets `AGENTRACK_CWD` in its `env`. Its header comment warns: **never add `reuseExistingServer: true`**. With it absent (the correct state), Playwright fails loudly if port `3001` is already taken — a colliding manual dev server crashes the run rather than silently being reused.
- `packages/webapp/e2e/global-setup.ts` — runs `ensureE2EWorktree()` then `resetWorktreeData()` before every run. **Gap:** it never verifies the spawned backend actually resolves `AGENTRACK_CWD` to the e2e dir. This is the root-cause hole — if a non-isolated server is somehow serving `3001`, seeds leak into the real tracker and the suite doesn't notice.
- `packages/webapp/e2e/setup.ts` — shared helpers for the worktree reset (`ensureE2EWorktree`, `resetWorktreeData`).
- `packages/webapp/server/utils/tracker.ts` — the singleton `Tracker` instance; resolves cwd from `AGENTRACK_CWD` **once at module load**.
- `packages/webapp/server/routes/health.ts` + `sync.ts` — `health` returns `{ status, tracker }` only (no cwd echo); `sync` reads `AGENTRACK_CWD`.
- `packages/webapp/e2e/*.spec.ts` — seed helpers. `seedIssues()` in `url-filters-validation.spec.ts` (~lines 40–62) `request.post`s to `/api/issues` with title/status/assignee only: **no tag, no `afterEach`/`afterAll` cleanup**. The same pattern repeats across `phase2`, `phase3`, `phase4`, and `dashboard-roots` specs — which is why a leak spreads far beyond the 50 UrlFilter seeds.

### The leak

Roughly 200 leaked seed issues ended up in the **real** tracker. Because `reuseExistingServer` is absent, a silent collision is unlikely under the current config; the plausible triggers are (a) the leak predates the isolation work, or (b) a worker agent ran an e2e spec or a manual server outside the Playwright harness (so `AGENTRACK_CWD` was never set). The fix is defense-in-depth so the suite is self-protecting regardless of how it's invoked.

## The review decision (architect, 2026-06-16)

Authored on review task **`mqh1ghz42s`** (parent idea **`mqh0su9kgq`**), posted as comment `mqh1mbh9kf`. **Decision: ACCEPT both work items**, with refinements. Implementation is handed off to the PM to split into children of `mqh0su9kgq`.

**Work Item 1 — Bulk cleanup (unblocked, proceed immediately):**
- Broaden scope from the 50 UrlFilter seeds to ~200 across all specs.
- Step 1.1 Enumerate every seed-creation call site under `packages/webapp/e2e` and list every distinct title prefix (known: `UrlFilterIdea/Todo/InProgress/Done/Closed`, `Phase2 Test`, `Blocker Issue`, plus Tag/Comment/Parent/search seeds).
- Step 1.2 Identification heuristic (require ALL): title starts with an enumerated prefix + dash + machine stamp, no parent, empty/near-empty description, no tags (or test tags only), assigned to `webapp-validator`.
- Step 1.3 Prefer **delete** over close (seeds have no historical value; closed seeds still pollute the closed dashboard). Dry-run first (list id/title/status), confirm, then delete. Non-terminal states first.
- Step 1.4 Scope guard: the script must refuse to run if `AGENTRACK_CWD` is set (never clean inside the isolated worktree).

**Work Item 2 — Root-cause guard (three layers; A and B mandatory):**
- **Layer A (mandatory, strongest) — Startup cwd assertion.** Extend `/api/health` to echo the resolved cwd (or add a test-only `api/debug/cwd` route), then in `global-setup.ts` GET that endpoint after the backend is up and assert the path equals `validation/.e2edata`; throw on mismatch. This catches the exact leak trigger.
- **Layer B (mandatory) — Self-healing tagged seeds.** Every seed call site tags its issues `e2e-seed` and captures ids; a shared `afterEach`/per-spec `afterAll` in `setup.ts` lists and deletes tagged issues. Tolerant of already-deleted ids.
- **Layer C (cheap) — README invariant.** Document: never start a dev server on 3001 during runs; never set `reuseExistingServer: true`; ports 3001/5174 are the isolation boundary.

### Invariants the implementer must not break

- `AGENTRACK_CWD` spelling is consistent across setter and readers — **do not rename**.
- `reuseExistingServer` must stay **absent** from both `webServer` entries.
- E2E ports 3001 (backend) + 5174 (frontend) stay distinct from prod 3000/5173.
- The `ensureE2EWorktree` + `resetWorktreeData` reset in global-setup must keep running before every run.

## Source map (webapp)

The architect's first foray into `packages/webapp/**`. All files reached via `bash cat`/`grep`/`sed` (the `Read` tool was not attempted for webapp files this session — verify whether `Read` is also blocked here, but `bash` reads worked cleanly):

- `packages/webapp/playwright.config.ts` — webServer env + isolation invariants.
- `packages/webapp/e2e/global-setup.ts` — the place to add the Layer A assertion.
- `packages/webapp/e2e/setup.ts` — shared helpers; the place to add the Layer B cleanup helper.
- `packages/webapp/e2e/url-filters-validation.spec.ts` — canonical `seedIssues()` pattern to fix.
- `packages/webapp/e2e/{phase2,phase3,phase4,dashboard-roots}-validation.spec.ts` — other seed call sites to enumerate.
- `packages/webapp/server/utils/tracker.ts` — singleton Tracker, `AGENTRACK_CWD` reader.
- `packages/webapp/server/routes/health.ts` — endpoint to extend for Layer A.
- `packages/webapp/server/routes/sync.ts` — second `AGENTRACK_CWD` reader.

## Related Topics

- [architect-overview.expertise.md](architect-overview.expertise.md): this was the architect's first **review** task (ACCEPT/refine an idea) rather than a from-scratch design spec.
- [command-scanner-gotcha.expertise.md](command-scanner-gotcha.expertise.md): the long decision comment posted **first try** because the workaround was applied proactively.

## Timeline

- 2026-06-16: Reviewed idea `mqh0su9kgq` on task `mqh1ghz42s`. ACCEPTED both work items (bulk cleanup + 3-layer isolation guard), posted comment `mqh1mbh9kf`, marked done, reassigned to project-manager for task splitting.

## Gaps And Validation Needs

- The decision is **design only** — none of Work Items 1/2 are implemented yet. Once the PM spawns children and they land, re-read `global-setup.ts`, `setup.ts`, `health.ts`, and `url-filters-validation.spec.ts` to confirm the actual shapes and update this file with divergences.
- Whether the `Read` tool is blocked for `packages/webapp/**` was not tested this session (only `bash` reads were used). Probe before assuming.
- The ~200 leak count and the full set of seed prefixes are estimates from the PM's comment + the UrlFilter spec; the implementer must grep all specs to enumerate them completely before the cleanup script runs.
