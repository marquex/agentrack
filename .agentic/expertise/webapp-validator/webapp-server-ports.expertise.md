# Webapp server ports & runtime config

## When To Use This

"Which port does the webapp run on", "production port", "dev port", "validation port", "e2e port", "playwright baseURL", "API_PORT", "VITE_PORT", "PORT env var", "how does the frontend reach the backend", "port 5000 AirPlay".

## Mental Model

The webapp has two independent servers (frontend + backend) and runs in two modes (dev vs E2E validation) with **deliberately different ports** so an E2E run can never collide with a developer's live dev server or the real `.agentrack/` data.

### Dev mode (manual / `bun run dev`)

| Service | Port | Source |
|---|---|---|
| **Backend (Hono API)** | **3001** | `server/index.ts` default `PORT` (was 3000 before the 2026-06-16 port change). |
| **Frontend (Vite)** | **3000** | `frontend/vite.config.ts` default `VITE_PORT` (was 5173 before the change). |
| **API proxy** | → 3001 | Vite dev proxy forwards `/api/*` to `localhost:3001` (`API_PORT` default). |

Both dev servers boot and proxy correctly (verified 2026-06-16: backend health → 200, frontend root → 200, proxy forwards `/api/issues` and `/api/users` → 200).

### E2E validation (Playwright)

Configured via `webServer` entries in `packages/webapp/playwright.config.ts`:

| Service | Port | Env var |
|---|---|---|
| **Backend** | **5001** | `PORT=5001` (+ `AGENTRACK_CWD` points at the isolated `validation/.e2edata/` worktree) |
| **Frontend (Vite)** | **5000** | `VITE_PORT=5000` (with `strictPort: true`), `API_PORT=5001` for the dev-server proxy |

The Playwright `baseURL` is `http://localhost:5000`. Tests target the frontend on **5000**, which proxies `/api/*` calls to the backend on **5001**.

E2E ports (5001/5000) deliberately differ from dev ports (3001/3000) — they encode isolation.

### ⚠️ Port 5000 is held by macOS AirPlay Receiver (known environment constraint)

**Port 5000 is occupied by the macOS AirPlay Receiver** (`AirPlayUIAgent` / ControlCenter). This is NOT a code bug — it is a documented environment constraint (deliberate per prescription `mqh2nfnt2o`; captured in `webapp-developer`'s ports expertise). Vite uses `strictPort: true`, so it **cannot fall back** to another port; `npx playwright test` aborts with `http://localhost:5000 is already used` (EADDRINUSE) whenever AirPlay is active.

Verified 2026-06-16 via a Node `net.createServer` probe: 5000 = BUSY (EADDRINUSE), 5001/3000/3001 = FREE.

**Workaround:** disable macOS AirPlay Receiver (System Settings → General → AirDrop & Handoff → AirPlay Receiver), or otherwise free port 5000 before running the E2E suite. The full E2E regression cannot run until 5000 is free.

### Why `reuseExistingServer` is absent

Neither `webServer` entry sets `reuseExistingServer` — the flag is intentionally absent so Playwright's default (`false`) applies. This guarantees Playwright boots its own servers against the isolated e2e worktree and never grabs a stale dev server pointed at real data. Never add `reuseExistingServer: true`.

## Business Rules And Invariants

- E2E ports (5001/5000) must stay different from dev ports (3001/3000) — they encode isolation.
- The `reuseExistingServer` flag must stay ABSENT from the E2E webservers (Playwright's default `false` must apply). Never set it to `true`.
- The backend reads its port from a single source (`PORT`). The frontend reads its port from `VITE_PORT` and falls back to the Vite default — there is no single shared port config.
- Port 5000 collides with macOS AirPlay Receiver by design; the environment-side workaround (disable AirPlay) is the expected path, not a port change.

## Related Topics

- [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md): how the `AGENTRACK_CWD` override and the port layout together keep E2E data out of real `.agentrack/`. **The seed-data leak history references port 3001 — read the gap note there about how the port change affects the leak vector.**
- [webapp-validator-gotchas.md](webapp-validator-gotchas.md): the "Playwright webServers survive a finished run" gotcha now references E2E ports 5001/5000 and dev ports 3001/3000.

## Timeline

- 2026-06-14: First documented during an advisory question about webapp ports. Original layout: dev backend 3000 / frontend 5173; E2E backend 3001 / frontend 5174.
- 2026-06-16: **Port layout changed** (implementation `mqh2hwulrt`, prescription `mqh2nfnt2o`). New layout: dev backend **3001** / frontend **3000**; E2E backend **5001** / frontend **5000**. Validated by `mqh2hwglif`: dev mode PASS, E2E config internally correct (176 tests load, isolation intact, `reuseExistingServer` absent), but E2E **runtime blocked** by macOS AirPlay holding port 5000. Webapp source is clean of stale 5173/5174 references; the spec doc and (this) expertise file had stale references — expertise updated in this entry, spec-doc cleanup tracked by idea `mqh326adbp`.

## Gaps And Validation Needs

- Port values were re-verified from source on 2026-06-16. If a task touches `playwright.config.ts`, `server/index.ts`, or `frontend/vite.config.ts`, re-read those files to confirm the ports and env-var names before reporting them.
- **The full E2E regression has NOT been run since the port change** because port 5000 is held by AirPlay. Once 5000 is freed, run the full suite to confirm no regressions beyond the known stale BUG-2 sync tests (see [webapp-known-backend-bugs.expertise.md](webapp-known-backend-bugs.expertise.md)).
- The `/api/*` → backend proxy is set via `API_PORT` in the Vite dev config; confirm the proxy path prefix (`/api`) hasn't changed if proxy behavior is in question.
