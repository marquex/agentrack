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
- Prompts: "which port does the webapp run on", "production port", "validation port", "e2e port", "playwright baseURL", "API_PORT", "VITE_PORT"
- Covers: Production vs E2E port numbers, env vars that control them, the deliberate isolation pattern, the frontend→backend proxy.

### Webapp validator gotchas
- File: [webapp-validator-gotchas.expertise.md](webapp-validator-gotchas.md)
- Prompts: "permission denied /dev/null", "bash redirect blocked", "cannot access outside project"
- Covers: Agent sandbox restrictions that bite during validation work (e.g. `/dev/null` is off-limits), and the workarounds.

### Work timeline
- File: [timeline.expertise.md](timeline.expertise.md)
- Prompts: "what has webapp-validator worked on", "history"
- Covers: Changelog of completed work and lessons learned.
