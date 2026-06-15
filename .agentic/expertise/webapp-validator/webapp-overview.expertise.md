# Webapp overview, stack, and commands

## When To Use This

Starting any webapp validation task: "how is the webapp structured", "how do I build/test the webapp", "what stack does the webapp use", "where does the webapp live", "where are the webapp specs".

## Mental Model

The webapp lives in `packages/webapp/` and has three parts:

- **Frontend** (`packages/webapp/frontend/`): React + Vite + TypeScript. Uses TanStack Query for server state and React Router for routing. Entry/routing at `frontend/src/App.tsx`.
- **Server** (`packages/webapp/server/`): Bun-run TypeScript server (Hono). Entry at `server/index.ts`, route handlers in `server/routes/`. Bun does not strictly typecheck at runtime.
- **E2e tests** (`packages/webapp/e2e/`): Playwright, one validation spec per roadmap phase (`phase1-validation.spec.ts`, `phase2-validation.spec.ts`, etc.), plus `global-setup.ts` and `setup.ts`. Config at `packages/webapp/playwright.config.ts`.

The validator agent's role is advisory + verification: answer questions about webapp config/behavior and confirm build/test health. The webapp-developer agent owns implementation; this agent should not edit product code.

## Commands

- **Build (includes typecheck):** `cd packages/webapp/frontend && bun run build` — runs `tsc -b` then Vite. A clean build means frontend types pass.
- **Run e2e tests:** `cd packages/webapp && bunx playwright test [e2e/phaseN-validation.spec.ts]`. The Playwright config spins up the webServer automatically — no manual server start needed.
- **Lint:** No lint script is configured anywhere in the project. The `tsc -b` inside `bun run build` is the closest equivalent when a workflow asks for "lint or equivalent".

## Related Topics

- [webapp-server-ports.expertise.md](webapp-server-ports.expertise.md): port numbers for production and E2E runs.
- [webapp-validator-gotchas.md](webapp-validator-gotchas.md): sandbox restrictions that affect how commands must be written.

## Gaps And Validation Needs

- A more detailed webapp knowledge base (frontend layout, users & sync, known pre-existing test failures, baseline-comparison regression recipe) is maintained by the `webapp-developer` agent under `.agentic/expertise/webapp-developer/`. This agent cannot read that folder during retrieval; if deep implementation detail is needed, ask the webapp-developer or re-derive from source.
- Specs that drive webapp work live at `.agentic/specs/webapp-spec.md` and `.agentic/specs/webapp-roadmap.md`. Roadmap phases map 1:1 to `e2e/phaseN-validation.spec.ts` files.
