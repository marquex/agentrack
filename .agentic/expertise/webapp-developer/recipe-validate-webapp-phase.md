# Recipe: Validate a webapp phase change (no regressions)

## Trigger

Finishing any webapp task — a phase implementation, a bug fix, a UI change — before marking the issue `done`.

## Preconditions

- The change is saved (no uncommitted discard in progress).
- You are in the `packages/webapp` directory or use absolute paths.

## Steps

1. **Build + typecheck the frontend:**
   ```bash
   cd packages/webapp/frontend && bun run build
   ```
   `bun run build` runs `tsc -b` then Vite, so a clean build means types pass. There is no separate lint script — this is the closest equivalent.

2. **Run the phase(s) the task touches:**
   ```bash
   cd packages/webapp && npx playwright test e2e/phaseN-validation.spec.ts
   ```
   Expect all tests in the in-scope phase to pass. If failures appear, read the specific asserts before changing code.

3. **Check for regressions across all phases:**
   ```bash
   cd packages/webapp && npx playwright test
   ```

4. **If new failures appear, establish a baseline** (do not assume the change caused them):
   ```bash
   cd /Users/javi/projects/agentrack && git stash
   cd packages/webapp && npx playwright test 2>&1 | grep -E "^\s+\d+ failed" -A 20 | head -25
   # capture the baseline failure set, then restore:
   cd /Users/javi/projects/agentrack && git checkout -- packages/webapp/test-results/ && git stash pop
   ```
   Compare the two failure sets. Only treat a failure as a regression if it is new vs baseline and is not a documented bug. (The backend POST tests used to flake between runs; that is now fixed by suite serialization — see the pitfall below. Two frontend tests still flake intermittently: phase3 parent-selector and phase4 copy-token.)

## Validation

- In-scope phase: 100% pass.
- Full suite: failure set == baseline failure set (no new failures).
- `bun run build` is clean.

## Relevant files

- `packages/webapp/playwright.config.ts` — webServer config (auto-starts servers).
- `packages/webapp/e2e/phaseN-validation.spec.ts` — per-phase validation.
- `packages/webapp/e2e/global-setup.ts`, `packages/webapp/e2e/setup.ts` — worktree setup.
- `packages/webapp/test-results/` — generated artifacts.

## Known pitfalls

- **test-results/ blocks `git stash pop`.** Playwright writes artifacts under `packages/webapp/test-results/` that are tracked by git. After running tests on the stashed baseline, discard them first: `git checkout -- packages/webapp/test-results/` then `git stash pop`. Otherwise the pop fails with a checkout conflict.
- **Documented backend bugs are expected to fail.** Phase 4 asserts BUG-1 (regenerate token 401) and BUG-2 (sync push/pull 500). Do not "fix" the behavior without also updating the test asserts. See [webapp-users-and-sync.expertise.md](webapp-users-and-sync.expertise.md).
- **Suite is serialized — don't re-enable parallelism.** `playwright.config.ts` pins `workers: 1` + `fullyParallel: false` because the agentrack backend does unlocked read-modify-write on a shared file store; parallel phase files race on writes and make the backend POST tests flaky. The full suite takes ~1.4 min serial (was ~32s parallel) — determinism over speed. See [webapp-e2e-validation.expertise.md](webapp-e2e-validation.expertise.md).
- **Two frontend tests still flake intermittently** (phase3 "changes an existing parent" — `waitForResponse` timeout; phase4 "copy button changes to check icon" — clipboard timing). Both pass in isolation and surface variably. A single one flipping is not a regression — re-run to confirm. Tracked in `mqe1drwrck`.
- **Server typecheck via ad-hoc `tsc` flags produces false errors** ("Cannot find name 'process'", etc.). The server runs on Bun with no standalone typecheck script; do not treat those as real errors.
- **`cd` is sticky.** A `cd` in one Bash call does not carry over; use absolute paths or re-`cd` each call.
