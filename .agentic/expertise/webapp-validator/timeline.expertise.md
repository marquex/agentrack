# Work timeline — webapp-validator

## 2026-06-14 Answered webapp ports question (advisory task)

First task for this agent: answered "In which port does the webapp run for production and for validation?" by reading `packages/webapp/playwright.config.ts`, `server/index.ts`, `frontend/vite.config.ts`, and `frontend/package.json`.

**Findings captured:**
- Production: backend **3000** (`process.env.PORT || "3000"`), frontend **5173** (Vite default).
- E2E: backend **3001** (`PORT`), frontend **5174** (`VITE_PORT`, with `API_PORT=3001` proxy). Playwright `baseURL` = `http://localhost:5174`.
- Both E2E webservers use `reuseExistingServer: false` for isolation — intentional, do not change.

**Lessons / decisions:**
- Hit the sandbox `/dev/null` restriction twice (`2>/dev/null` rejected). Workaround: prefer the `Read` tool, or drop the redirect. Captured in [webapp-validator-gotchas.md](webapp-validator-gotchas.md).
- Bootstrapped the agent's expertise folder: overview, ports, gotchas, and this timeline. Port values are sourced-from-source as of today and should be re-verified if config files change (see [webapp-server-ports.expertise.md](webapp-server-ports.expertise.md)).
- Deep webapp implementation knowledge (layout, users & sync, known test failures, regression recipe) lives with the `webapp-developer` agent, not here.

## 2026-06-14 Phase 4 validation (mppqt90kot)

Validated the Phase 4 (Users & sync) webapp work. Result: **Phase 4 frontend fully validated (38/38 tests pass)**, but 3 of 6 acceptance criteria only partially met due to 2 untracked backend bugs.

**Findings captured:**
- Phase 4 e2e: **38/38 pass**. Covers users API (list/register/revoke/regenerate), sync API (push/pull), Users Page UI, register/revoke/regenerate flows, sync buttons, cross-page nav, copy token.
- E2E isolation: clean — main `.agentrack/` untouched, test data in `validation/.e2edata/`, `config.json` reset to `_e2edata` branch defaults by global-setup.
- Frontend typecheck + production build: pass.
- **2 documented-but-untracked backend bugs** (both in webapp server, `packages/webapp/server/routes/`):
  - **BUG-1** (`users.ts:54`): regenerate returns 401 in open auth mode — server doesn't forward user token, `resolveAuthor` returns "anonymous" != target name. Created issue `mqe162cmbi`.
  - **BUG-2** (`sync.ts:4,11,21`): sync push/pull returns 500 NOT_INITIALIZED — passes `AGENTRACK_CWD` (worktree dir) to `pushWorktree`/`pullWorktree` instead of project root. Created issue `mqe162svv5`.
- Phase 1-3 pre-existing failures: **7 consistent + flaky tests** (already tracked in PM epic `mqdzlo4ia8`, Deliverables A/B/C). Developer reported "8" (= 7 + 1 flaky); full-suite runs can surface up to 3 flaky failures from shared-state ordering. All flaky ones PASS in isolation.

**Lessons / decisions:**
- **Trap for future validators:** Phase 4 tests *assert the buggy behavior* (`expect(status).toBe(401)` / `toBe(500)`). When BUG-1/BUG-2 are fixed, those 5 tests will START FAILING and must be updated to assert success. Do not interpret a green Phase 4 suite as "sync/regenerate work end-to-end."
- **Leftover webServer gotcha:** Playwright's spawned webServers (bun on :3001, vite on :5174) sometimes survive a finished run and block the next run ("port already used"). Fix: `pkill -f "bun run dev:server"; pkill -f "vite.*5174"` before re-running. Captured in gotchas.
- To distinguish a real Phase 1-3 regression from flakiness: re-run the single failing test with `--grep`; if it passes in isolation, it's the shared-state flakiness (Deliverable C), not a regression.
