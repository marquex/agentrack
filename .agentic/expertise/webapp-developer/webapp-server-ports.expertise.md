# Webapp server ports & runtime config

## When To Use This

"Which port does the webapp run on", "what port does the e2e suite use", "playwright baseURL", "API_PORT", "VITE_PORT", "PORT env var", "how does the frontend reach the backend", "port 5000 blocked", "AirPlay", "change a webapp port".

## Mental Model

The webapp has two independent servers (frontend Vite + backend Hono/Bun) and runs in two modes (dev vs e2e validation) with **deliberately different ports** so an e2e run can't collide with a developer's live dev server or the real `.agentrack/` data.

### Current port layout (since 2026-06-16 standardization, issue `mqh2hwulrt`)

| Mode | Service | Port | Source |
|---|---|---|---|
| **Dev** | Backend (Hono API) | **3001** | `server/index.ts`: `process.env.PORT || "3001"` |
| **Dev** | Frontend (Vite) | **3000** | Vite default — `frontend/vite.config.ts` only overrides when `VITE_PORT` is set |
| **E2E** | Backend | **5001** | `playwright.config.ts` webServer `PORT=5001` (+ `AGENTRACK_CWD` → isolated `validation/.e2edata/`) |
| **E2E** | Frontend (Vite) | **5000** | `playwright.config.ts` webServer `VITE_PORT=5000` with `API_PORT=5001` dev proxy |

The Playwright `baseURL` is `http://localhost:5000`. Tests target the frontend on **5000**, which proxies `/api/*` to the backend on **5001**.

Prior to 2026-06-16 the layout was dev backend 3000 / Vite default 5173, and e2e backend 3001 / frontend 5174. The old `webapp-validator/webapp-server-ports.expertise.md` still documents those stale values.

### Why dev and e2e ports differ

Neither e2e `webServer` entry sets `reuseExistingServer` — the flag is intentionally absent so Playwright's default (`false`) applies. This guarantees Playwright boots its own servers against the isolated e2e worktree and never grabs a stale dev server pointed at real data. **Never add `reuseExistingServer: true`.**

## Business Rules And Invariants

- E2E ports (5001/5000) must stay different from dev ports (3001/3000) — they encode isolation.
- The `reuseExistingServer` flag must stay ABSENT from the e2e webservers.
- The backend reads its port from a single env var (`PORT`). The frontend reads its port from `VITE_PORT` and falls back to Vite's default — there is no single shared port config.
- When changing a port, sweep ALL of: `server/index.ts`, `frontend/vite.config.ts`, `playwright.config.ts`, every `e2e/*.spec.ts` (inline URLs + `BASE` constants), and the spec docs at `.agentic/specs/webapp-spec.md`. The e2e specs mix double-quoted and template-literal port strings — a single `sed` over `http://localhost:<old>` is the safe mechanical replacement.

## Gotchas

- **Port 5000 is held by macOS ControlCenter (AirPlay Receiver)** on this machine. The e2e frontend webServer cannot bind 5000 while AirPlay Receiver is on, so `npx playwright test` fails to boot the frontend and the full suite can't run locally until you disable AirPlay Receiver (System Settings → General → AirDrop & Handoff → AirPlay Receiver) or free the port. This is an environment constraint, not a code bug. The backend (5001) binds fine; `npx playwright test --list` still validates the config and specs load. Issue `mqh2hwulrt` first documented this.
- `.agentic/specs/` is **read-only** for the webapp-developer agent — doc updates there can't be applied directly; file an idea issue for the project-manager/library-architect to update specs instead.

## Related Topics

- [webapp-overview.expertise.md](webapp-overview.expertise.md): where the config files live.
- [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md): running the suite (also affected by the port-5000 AirPlay gotcha).

## Timeline

- 2026-06-16: Standardized webapp ports in `mqh2hwulrt` per prescription `mqh2nfnt2o` (plan `mqh2hw1wl3`, parent `mqh2h99uob`). Dev API 3000→3001, dev Vite default→3000, e2e 3001/5174→5001/5000. Touched `server/index.ts`, `frontend/vite.config.ts`, `playwright.config.ts`, and all six e2e specs (phase1–4, dashboard-roots, url-filters). Could not run the full e2e suite because port 5000 is held by macOS AirPlay Receiver — verified config via `playwright test --list` (176 specs load), backend binds 5001, Vite default 3000 works. Could not update `.agentic/specs/webapp-spec.md` (read-only domain). Filed an idea issue for the docs/expertise updates.

## Gaps And Validation Needs

- Port values were set in code on 2026-06-16. If a task touches `playwright.config.ts`, `server/index.ts`, or `frontend/vite.config.ts`, re-read those files to confirm before reporting.
- The full e2e regression run after the port change has **not** been completed locally due to the AirPlay/port-5000 conflict. The next time AirPlay Receiver is off (or 5000 is otherwise free), run the full suite to confirm zero regressions on the new ports.
- The follow-up issue `mqh2nk7khi` exists for properly extracting a shared `BASE` constant in `phase2-validation.spec.ts` (the standardization only did a mechanical `sed` port replacement there, not the BASE refactor).
