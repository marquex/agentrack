# Webapp E2E Tests

End-to-end Playwright suite for the agentrack webapp. These tests boot their
**own** backend + frontend (Playwright manages both `webServer` entries) and
run against a fully isolated data directory so the real `.agentrack/` store is
never touched.

## Data isolation — the invariants

The suite's data isolation rests on a few load-bearing invariants. Breaking
any of them risks writing test fixtures into real project data.

### 1. The backend resolves `AGENTRACK_CWD`

The backend reads the `AGENTRACK_CWD` environment variable
(`server/utils/tracker.ts`) and points its `Tracker` at that directory.
`playwright.config.ts` sets this to `validation/.e2edata/` on the backend
`webServer` entry. This is the primary isolation mechanism — **do not rename
`AGENTRACK_CWD`** without updating both sides.

### 2. The health endpoint echoes the resolved cwd (startup assertion)

`GET /api/health` returns the resolved tracker `cwd`.
`e2e/global-setup.ts` waits for the backend, fetches `/api/health`, and
**asserts** `health.cwd === validation/.e2edata/` before any seed is created.
If a stale dev server (or any server pointed at real `.agentrack/`) is
serving the e2e backend port, the run fails loudly here instead of corrupting
real data. This is the strongest guard.

### 3. Never start a dev server on the e2e ports manually

The dev servers run on **3001** (backend) / **3000** (frontend). The e2e
servers run on **5001** (backend) / **5000** (frontend). These port pairs are
the isolation boundary:

|             | backend | frontend |
|-------------|---------|----------|
| dev         | 3001    | 3000     |
| **e2e**     | **5001**| **5000** |

While the suite is running, do **not** manually start a dev server that could
bind 5001/5000. Do **not** change the e2e ports to 3001/3000 — they must stay
distinct from the dev ports.

> Note: on macOS, port 5000 is used by the AirPlay Receiver. Disable it
> (System Settings → General → AirDrop & Handoff → AirPlay Receiver) before
> running the suite locally.

### 4. Never set `reuseExistingServer: true`

Both `webServer` entries in `playwright.config.ts` must **always** omit
`reuseExistingServer` (or set it to `false`). Adding `reuseExistingServer:
true` would let Playwright attach to an already-running server — which could
be a dev server pointed at real data, silently defeating isolation.

### 5. The worktree reset runs before every run

`e2e/global-setup.ts` calls `ensureE2EWorktree()` + `resetWorktreeData()`,
which wipes `validation/.e2edata/` back to empty defaults before any test
runs. This guarantees a clean slate at the start of every run.

## Self-healing seeds

Every issue created by the specs is tagged `e2e-seed`. A shared
`cleanupE2ESeeds()` helper (`e2e/setup.ts`) lists all `e2e-seed` issues and
deletes them via `DELETE /api/issues/:id`. It is wired as a per-file
`afterAll` in every spec that creates issues, so an interrupted/failed spec
does not leave stale seeds behind for the next one. The helper tolerates
already-deleted ids (the global-setup reset is the authoritative wipe; this
helper is defense-in-depth).

## Running

```bash
# from packages/webapp — always use npx, not bunx (loader quirks)
npx playwright test

# list tests (validates config + specs load without booting servers)
npx playwright test --list
```

The suite runs serially (`workers: 1`) because the file-backed store performs
unlocked read-modify-write cycles; re-enabling parallelism requires per-worker
data isolation.
