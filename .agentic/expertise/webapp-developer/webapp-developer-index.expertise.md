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
