# Webapp developer — Expertise Index

Agent: webapp-developer
Domain: Building and maintaining the Agentrack web UI (React + Vite frontend, Bun server, Playwright e2e validation) under `packages/webapp/`.

## Routing topics

Read every file related to the task at hand.

### Webapp overview, stack, and commands
- File: [webapp-overview.expertise.md](webapp-overview.expertise.md)
- Prompts: "how is the webapp structured", "how do I build/test the webapp", "what stack does the webapp use", "where are the webapp specs"
- Covers: Directory layout, frontend/server split, build & test commands, spec/roadmap locations.

### Webapp frontend pages and layout
- File: [webapp-frontend-layout.expertise.md](webapp-frontend-layout.expertise.md)
- Prompts: "add a page", "change the header", "layout is broken", "duplicate header", "AppLayout", "add a Back to issues link", "breadcrumbs"
- Covers: Page + AppLayout convention, routing in App.tsx, Header, and the duplicate-header gotcha.

### Webapp users & sync (Phase 4)
- File: [webapp-users-and-sync.expertise.md](webapp-users-and-sync.expertise.md)
- Prompts: "users page", "register user", "revoke user", "regenerate token", "sync push", "sync pull", "Phase 4"
- Covers: User management UI + endpoints, sync controls in the Header, known BUG-1/BUG-2.

### Webapp server ports & runtime config
- File: [webapp-server-ports.expertise.md](webapp-server-ports.expertise.md)
- Prompts: "which port does the webapp run on", "e2e port", "playwright baseURL", "PORT", "VITE_PORT", "API_PORT", "port 5000 blocked", "AirPlay", "change a webapp port", "extract shared e2e URL constant", "e2e BACKEND URL refactor", "dedupe http://localhost:5001 in specs", "E2E_BACKEND_URL", "e2e base URL source of truth"
- Covers: Dev vs e2e port layout (dev 3001/3000, e2e 5001/5000), env vars, the macOS AirPlay/port-5000 gotcha that blocks the e2e suite, the invariants for changing ports, and the single-source-of-truth `E2E_BACKEND_URL` in `e2e/setup.ts` (implemented `mqibv7ai6j`, 2026-06-17) that all six e2e specs import.

### Webapp styling, fonts, and theme tokens
- File: [webapp-styling-and-theme.expertise.md](webapp-styling-and-theme.expertise.md)
- Prompts: "change the font", "wire up Geist", "fontsource", "font-family", "update theme colors", "shadcn theme tokens", "the UI looks unpolished"
- Covers: Where base styles live (`index.css` `@layer base`, `main.tsx` side-effect imports), the shadcn theme-token layer, and the pending decision to wire up `@fontsource-variable/geist` (issue `mqh1he4m3q`, child `mqh1hkjvso`).

### Webapp e2e data isolation
- File: [webapp-e2e-isolation.expertise.md](webapp-e2e-isolation.expertise.md)
- Prompts: "how does e2e data stay separate from real data", "e2e worktree", "AGENTRACK_CWD", "validation/.e2edata", "resetWorktreeData", "seeds leaked into .agentrack", "tag e2e seeds", "delete seed issues", "isolation hardening", "health cwd", "Layer A / Layer B / Layer C", "cleanupE2ESeeds", "afterAll cleanup", "DELETE issue route", "e2e README", "parallel DELETE race", "cleanupE2ESeeds race", "seed straggler", "mass-edit spec literals", "perl replacement stripped prefix", "python heredoc for refactor", "shell cwd does not persist", "sandbox blocks perl one-liner"
- Covers: How the `AGENTRACK_CWD` env var + per-run `resetWorktreeData()` isolate test data, plus the **implemented (2026-06-16, `mqh3ss1nfh`)** three-layer hardening: startup health-cwd assertion (Layer A), self-healing `e2e-seed` tags + `cleanupE2ESeeds()` per-file `test.afterAll` + `DELETE /api/issues/:id` route (Layer B), and `e2e/README.md` invariants (Layer C). Includes the `test.afterAll`-not-a-named-export gotcha, the **open** `cleanupE2ESeeds` parallel-DELETE race (fix task `mqib7bbznm`, accepted 2026-06-17), and the **webapp-developer tooling/sandbox gotchas** (access-control scanner quirks, mechanical-refactor lessons: perl `${...}` interpolation, over-broad regex scope, sandbox-friendly `python3` heredoc, shell cwd persistence, `Edit` after `git checkout`).

### Webapp e2e validation workflow
- File: [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md)
- Prompts: "run e2e tests", "validate a phase", "playwright", "test regression", "baseline comparison", "flaky test", "workers", "parallel", "serialize the suite"
- Covers: How to run per-phase validation tests, regression-checking recipe, documented backend bugs the tests expect, the load-bearing serialization invariant (workers:1), remaining frontend flakiness, test-results stash conflict.

### Webapp known gaps (pre-existing failures)
- File: [webapp-known-gaps.expertise.md](webapp-known-gaps.expertise.md)
- Prompts: "phase 1 header test fails", "phase 2 detail page test fails", "phase 3 comments test fails", "phase 3 parent selector flakes", "phase 4 copy token flakes", "pre-existing failures", "flaky test"
- Covers: The 7 pre-existing Phase 1-3 e2e failures (`mqdzlo4ia8`) — note: their "consistent" status is now in doubt (4 full runs during `mqe1uwxw8c` passed all 152). Also documents the now-RESOLVED intermittent frontend flakes (parent-selector + copy-token, `mqe1drwrck`→`mqe1uwxw8c`) and the earlier backend flakiness fix.

### Work timeline
- File: [timeline.expertise.md](timeline.expertise.md)
- Prompts: "what has webapp-developer worked on", "history"
- Covers: Changelog of completed work and lessons learned.
