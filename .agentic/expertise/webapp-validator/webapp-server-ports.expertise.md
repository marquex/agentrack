# Webapp server ports & runtime config

## When To Use This

"Which port does the webapp run on", "production port", "validation port", "e2e port", "playwright baseURL", "API_PORT", "VITE_PORT", "PORT env var", "how does the frontend reach the backend".

## Mental Model

The webapp has two independent servers (frontend + backend) and runs in two modes (production vs E2E validation) with **deliberately different ports** so an E2E run can never collide with a developer's live dev server or the real `.agentrack/` data.

### Production

| Service | Port | Source |
|---|---|---|
| **Backend (Hono API)** | **3000** | `server/index.ts`: `process.env.PORT || "3000"` |
| **Frontend (Vite)** | **5173** | Vite's default — `frontend/vite.config.ts` only overrides the port when `VITE_PORT` is set. |

Note: `vite preview` (production preview server) defaults to **4173**, a different port again.

### E2E validation (Playwright)

Configured via `webServer` entries in `packages/webapp/playwright.config.ts`:

| Service | Port | Env var |
|---|---|---|
| **Backend** | **3001** | `PORT=3001` (+ `AGENTRACK_CWD` points at the isolated `validation/.e2edata/` worktree) |
| **Frontend (Vite)** | **5174** | `VITE_PORT=5174`, with `API_PORT=3001` for the dev-server proxy |

The Playwright `baseURL` is `http://localhost:5174`. Tests target the frontend on **5174**, which proxies `/api/*` calls to the backend on **3001**.

### Why the offset exists

Both `webServer` entries set `reuseExistingServer: false`. This is a defensive pattern: it guarantees Playwright boots its own servers against the isolated e2e worktree and never grabs a stale dev server pointed at real data. Do not "simplify" this by reusing servers.

## Business Rules And Invariants

- E2E ports (3001/5174) must stay different from production ports (3000/5173) — they encode isolation.
- `reuseExistingServer: false` on both E2E webservers must be preserved unless the isolation strategy intentionally changes.
- The backend reads its port from a single source (`PORT`). The frontend reads its port from `VITE_PORT` and falls back to Vite's default — there is no single shared port config.

## Timeline

- 2026-06-14: First documented during an advisory question about webapp ports. Values sourced from reading `playwright.config.ts`, `server/index.ts`, `frontend/vite.config.ts`, and `frontend/package.json`.

## Gaps And Validation Needs

- Port values were captured from source on 2026-06-14. If a task touches `playwright.config.ts`, `server/index.ts`, or `frontend/vite.config.ts`, re-read those files to confirm the ports and env-var names before reporting them.
- The `/api/*` → backend proxy is set via `API_PORT` in the Vite dev config; confirm the proxy path prefix (`/api`) hasn't changed if proxy behavior is in question.
