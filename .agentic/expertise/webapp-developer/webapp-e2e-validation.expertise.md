# Webapp e2e validation workflow

## When To Use This

"run e2e tests", "validate a phase", "playwright", "test regression", "baseline comparison", "flaky test", finishing any webapp task that needs validation.

## Mental Model

Validation tests live in `packages/webapp/e2e/phaseN-validation.spec.ts`, one per roadmap phase. The Playwright config at `packages/webapp/playwright.config.ts` starts the webServer automatically, so no manual server boot is needed. Tests run against an isolated e2e worktree set up by `global-setup.ts` / `setup.ts`.

Run a single phase:

```bash
cd packages/webapp && bunx playwright test e2e/phase4-validation.spec.ts
```

Run several phases:

```bash
cd packages/webapp && bunx playwright test e2e/phase1-validation.spec.ts e2e/phase2-validation.spec.ts e2e/phase3-validation.spec.ts
```

Run everything (use sparingly — slow):

```bash
cd packages/webapp && bunx playwright test
```

## Documented backend bugs the tests expect

The Phase 4 suite asserts the current buggy behavior on purpose. Do not "fix" the behavior without also updating the test asserts:

- **BUG-1:** regenerate-token returns 401 in open-auth mode (server does not forward the user token).
- **BUG-2:** sync push/pull returns 500 in the e2e worktree because `AGENTRACK_CWD` points to the worktree dir.

See [webapp-users-and-sync.expertise.md](webapp-users-and-sync.expertise.md).

## Concurrency model — suite is serialized (load-bearing)

The e2e suite runs **serialized through a single Playwright worker** (`workers: 1`, `fullyParallel: false` in `playwright.config.ts`). This is deliberate and load-bearing:

- The agentrack backend persists to a shared file store (`validation/.e2edata/`) and performs **unlocked read-modify-write** cycles on `index.json` / issue files.
- When the phase files ran in parallel (the Playwright default = half the CPU cores, 6 workers here), two specs issuing `POST /api/issues` at the same moment would race on those writes and intermittently drop a create. That surfaced as flaky failures in the create-then-read-back backend tests ("defaults status to 'idea'", "search is case-insensitive") — both pass in isolation and under a single worker.
- Serializing removes all concurrency against the shared store and makes those backend tests deterministic (issue `mqe0745gy7`, resolved 2026-06-14).

**Invariant:** do NOT re-enable parallelism (bump `workers` / `fullyParallel`) without first giving the suite per-worker data isolation (separate dirs + backend instances). The single-worker + single-shared-store model is what keeps it deterministic.

**Trade-off:** full suite ≈ 1.4 min serial vs ≈ 32s parallel. Determinism over speed is the right call for a regression gate.

## Remaining flakiness (frontend, not concurrency) — RESOLVED 2026-06-14

Two frontend tests used to flake intermittently despite serialization — different root causes (frontend timing, not backend concurrency). Tracked in idea issue **`mqe1drwrck`** → implementation child **`mqe1uwxw8c`**. **Both are now fixed and verified stable across 4 full serial-suite runs (152 passing each).** Details and confirmed root causes in [webapp-known-gaps.expertise.md](webapp-known-gaps.expertise.md).

- **phase3 "Frontend: Parent Selector › changes an existing parent"** — **fixed.** The `waitForResponse` was attached AFTER the triggering `fill()` with a loose matcher, an attach-order race. Fix: set up the response promise BEFORE the fill and scope the matcher to the exact search term (`new URL(resp.url()).searchParams.get("search") === "New Parent"`, method GET).
- **phase4 "Frontend: Copy Token › copy button changes to check icon after register"** — **fixed.** The suite granted no clipboard permission, so the unguarded `navigator.clipboard.writeText()` in `handleCopyToken` could throw under headless Chromium and abort before the check-icon state was set. Fix: `test.use({ permissions: ["clipboard-read", "clipboard-write"] })` on the describe + assertion timeout 3000ms → 5000ms.

> API note: in Playwright 1.60 the `permissions` option is an `Array<string>` (e.g. `"clipboard-write"`, `"clipboard-read"`), NOT the `{ clipboard: {} }` object form. Confirmed via the installed `playwright-core` types.

## Referenced Recipe

- [recipe-validate-webapp-phase.md](recipe-validate-webapp-phase.md): the full build → run-phase → regression-check → baseline-compare workflow. Use it whenever finishing a webapp change.

## Timeline

- 2026-06-14: Established the baseline-comparison workflow during Phase 4 — used `git stash` to capture the pre-change failure set and prove zero regressions.
- 2026-06-14: Isolated the shared-state backend flakiness (`mqe0745gy7`). Root cause = parallel phase files racing on the unlocked file store. Fix = `workers: 1` + `fullyParallel: false` in `playwright.config.ts`. Backend POST tests now deterministic. Discovered two separate frontend flaky tests (parent-selector timeout, copy-token clipboard) — filed `mqe1drwrck`.
- 2026-06-14: Both frontend flaky tests resolved in `mqe1uwxw8c`. Root causes confirmed in code: (1) attach-order race on `waitForResponse` + loose matcher in the parent-selector test; (2) missing clipboard permission + short assertion timeout in the copy-token test. Verified stable across 4 full serial-suite runs (152 passing each).

## Gaps And Validation Needs

- No lint script is configured; `tsc -b` inside `bun run build` is the de facto typecheck.
- See [webapp-known-gaps.expertise.md](webapp-known-gaps.expertise.md) for the pre-existing Phase 1-3 failures that exist on a clean baseline.
