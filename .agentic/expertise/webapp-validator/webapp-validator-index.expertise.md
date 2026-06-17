# Webapp validator — Expertise Index

Agent: webapp-validator
Domain: Validating the Agentrack web UI (`packages/webapp/`) — answering questions about its runtime/E2E configuration, running Playwright validation suites, and checking build health.

## Routing topics

Read every file related to the task at hand.

### Webapp overview, stack, and commands
- File: [webapp-overview.expertise.md](webapp-overview.expertise.md)
- Prompts: "how is the webapp structured", "how do I build/test the webapp", "what stack does the webapp use", "where does the webapp live"
- Covers: Directory layout (frontend/server/e2e), build & test commands, where specs/roadmaps live, the validator's role.

### Webapp server ports & runtime config
- File: [webapp-server-ports.expertise.md](webapp-server-ports.expertise.md)
- Prompts: "which port does the webapp run on", "dev port", "production port", "validation port", "e2e port", "playwright baseURL", "API_PORT", "VITE_PORT", "port 5000 AirPlay"
- Covers: Dev (backend 3001 / frontend 3000) vs E2E (backend 5001 / frontend 5000) port numbers, the env vars that control them, the deliberate isolation pattern, the frontend→backend proxy, and the **macOS AirPlay Receiver collision on port 5000** that blocks the E2E suite from running.

### E2E data isolation & test-pollution risk
- File: [webapp-e2e-data-isolation.expertise.md](webapp-e2e-data-isolation.expertise.md)
- Prompts: "test data in `.agentrack/`", "did tests pollute real data", "AGENTRACK_CWD", "AGENTACK_CWD typo", "validation worktree", "UrlFilter seed issues", "is the assigned issue real or test pollution"
- Covers: The worktree isolation model, the "never touch real `.agentrack/`" invariant, and the **three-layer isolation hardening (LANDED + VALIDATED 2026-06-16 in `mqh3syrrnb`)** that closed the recurring `UrlFilter*` seed leak. Layer A = `global-setup.ts` asserts `/api/health` cwd before any seed (verified fail-closed by negative test); Layer B = every seed tagged `e2e-seed` + `afterAll(cleanupE2ESeeds)` self-healing (one non-blocking defect: parallel-DELETE race, `mqh5aew5am`); Layer C = README docs all invariants. The leak is RESOLVED — real tracker is clean (historical 50 leaked seeds cleaned up). Read before investigating any report of stray test issues in real data, when an assigned issue looks like generated test data, before running any Playwright E2E suite, or when validating changes to the isolation guards. The file also preserves the full historical leak narrative (vector, identifying heuristic, pre-flight `ps aux` check) in case a regression ever recurs.

### Webapp validator gotchas
- File: [webapp-validator-gotchas.expertise.md](webapp-validator-gotchas.md)
- Prompts: "permission denied /dev/null", "bash redirect blocked", "cannot access outside project", "timeout command not found", "can't write temp file", "can't read packages/library", "bunx playwright test fails to load test files", "No tests found exit 0", "bun protocol ESM loader", "should I use bunx or npx for playwright"
- Covers: Agent sandbox restrictions that bite during validation work (`/dev/null`, `/tmp`, `.agentrack/_tmp_*` off-limits; `timeout` unavailable; only `packages/webapp/` readable) and the workarounds; and the **`bunx playwright test` → `npx playwright test` runner rule** (Bun's `bun:` protocol ESM loader intermittently drops test files with exit-0-zero-tests; the webapp server stays on Bun, only the test runner moves to `npx`).

### Known webapp backend bugs (BUG-1, BUG-2, BUG-3)
- File: [webapp-known-backend-bugs.expertise.md](webapp-known-backend-bugs.expertise.md)
- Prompts: "reproduce BUG-1", "regenerate returns 401", "validate the regenerate fix", "reproduce BUG-2", "sync push returns 500", "which Phase 4 tests lock in buggy behavior", "BUG-2 sync tests failing", "cleanupE2ESeeds leaves stragglers", "parallel DELETE race", "BUG-3"
- Covers: Root cause, reproduction steps, tracking issues, and the e2e tests that assert the buggy behavior for BUG-1 (regenerate 401) and BUG-2 (sync 500, appears fixed — stale tests). **BUG-3** (new, `mqh5aew5am`, non-blocking): `cleanupE2ESeeds()` parallel DELETEs race on the unlocked file store and drop some deletes; found during `mqh3syrrnb` validation. Read before validating a fix to any of the three.

### shadcn / Tailwind v4 theme tokens missing (frontend CSS bug)
- File: [webapp-shadcn-theme-tokens.expertise.md](webapp-shadcn-theme-tokens.expertise.md)
- Prompts: "shadcn styles not applied", "inputs render transparent", "bg-background / border-input do nothing", "validate missing theme tokens fix", "reproduce `mqgza7xio7`", "Tailwind v4 semantic utilities not generated", "@theme inline"
- Covers: Why every `components/ui/*` component renders unstyled — `src/index.css` is missing the `@theme inline` / `:root` / `.dark` blocks that Tailwind v4 requires to emit shadcn semantic utilities. Includes the build-then-grep-dist-CSS proof technique and remediation pointers. Read before validating any fix to webapp styling/theme tokens.

### URL-driven dashboard filtering
- File: [webapp-url-dashboard-filtering.expertise.md](webapp-url-dashboard-filtering.expertise.md)
- Prompts: "validate URL filtering", "dashboard filter URL params", "deep-link filters", "open meta-status", "status search assignee URL", "bookmark issue filters"
- Covers: How filter state flows from controls → URL search params → API, the `open` meta-status (frontend filters out `idea` client-side), verified behaviors, the `url-filters-validation.spec.ts` E2E coverage (12 tests), and the cosmetic dropdown-label defect (`mqgxk7rj2a`). Read before re-validating dashboard filtering or filter-related changes.

### Work timeline
- File: [timeline.expertise.md](timeline.expertise.md)
- Prompts: "what has webapp-validator worked on", "history"
- Covers: Changelog of completed work and lessons learned.
