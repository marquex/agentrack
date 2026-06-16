# Webapp overview, stack, and commands

## When To Use This

Starting any webapp task: "how is the webapp structured", "how do I build/test the webapp", "where are the specs", "what stack does the webapp use".

## Mental Model

The webapp lives in `packages/webapp/` and has three parts:

- **Frontend** (`packages/webapp/frontend/`): React + Vite + TypeScript. Uses TanStack Query for server state and React Router for routing. Entry/routing at `frontend/src/App.tsx`.
- **Server** (`packages/webapp/server/`): Bun-run TypeScript server. Entry at `server/index.ts`, route handlers in `server/routes/` (e.g. `users.ts`, `sync.ts`). Runs via `bun run --watch server/index.ts`. Bun does not strictly typecheck at runtime.
- **E2e tests** (`packages/webapp/e2e/`): Playwright, one validation spec per roadmap phase (`phase1-validation.spec.ts`, `phase2-validation.spec.ts`, etc.), plus `global-setup.ts` and `setup.ts`. Config at `packages/webapp/playwright.config.ts`.

Frontend source layout under `frontend/src/`:

- `api/` — typed API client functions (e.g. `users.ts`, `sync.ts`).
- `hooks/` — TanStack Query hooks wrapping the API clients (e.g. `use-users.ts`, `use-sync.ts`).
- `pages/` — route components (`IssuesPage.tsx`, `IssueDetailPage.tsx`, `UsersPage.tsx`).
- `components/layout/` — `AppLayout.tsx`, `Header.tsx`.
- `types/index.ts` — shared types.

## Commands

- **Build (includes typecheck):** `cd packages/webapp/frontend && bun run build` — runs `tsc -b` then Vite. This is the project's effective typecheck; a clean build means types pass.
- **Run e2e tests:** `cd packages/webapp && npx playwright test [e2e/phaseN-validation.spec.ts]` (or `npm run test:e2e`). The Playwright config spins up the webServer automatically — no manual server start needed. **Use `npx`, not `bunx`** — see the gotcha below.
- **Lint:** There is no lint script configured anywhere in the project (root, `packages/webapp`, or `frontend`). When a workflow asks for "lint or equivalent", the `tsc -b` inside `bun run build` is the closest equivalent.

## Gotchas

- **Do not run the e2e suite with `bunx playwright test`.** It can intermittently fail to load test files (`Error: Only URLs with a scheme in file, data, and node are supported by the default ESM loader. Received protocol bun:` / `Error: Playwright Test did not expect test.describe to be called here` / `Error: No tests found`) after repeated invocations or a `Saved lockfile` re-save event — the suite then exits 0 having run zero tests. Use `npx playwright test` (or `npm run test:e2e`) for deterministic runs. The webapp **server** still runs on Bun; only the Playwright **test runner** invocation moves to `npx`. Playwright is an npm devDependency (`@playwright/test ^1.60.0`), so `npx` is the canonical runner and sidesteps Bun's experimental `bun:` protocol ESM loader. Tracked in parent issue `mqe32t3er6` (decision: `mqgvczj5ua`).
- Do not try to typecheck the server with ad-hoc `tsc` flags (e.g. `--moduleResolution bundler --target esnext`). It produces false errors like "Cannot find name 'process'" because Bun provides those globals at runtime and the server has no standalone tsconfig typecheck script. Rely on `bun run build` for the frontend and on the e2e tests for end-to-end behavior.
- `cd` in Bash changes the working directory for subsequent commands. Use absolute paths or re-`cd` as needed.
- Specs that drive webapp work live at `.agentic/specs/webapp-spec.md` and `.agentic/specs/webapp-roadmap.md`. Roadmap phases map 1:1 to `e2e/phaseN-validation.spec.ts` files.

## Related Topics

- [webapp-frontend-layout.expertise.md](webapp-frontend-layout.expertise.md): how pages and AppLayout fit together.
- [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md): how to run and interpret the validation tests.
