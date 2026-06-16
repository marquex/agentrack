# Plan: Isolated E2E Data for Webapp Validation

## Context

The webapp-validator runs 114+ Playwright E2E tests that create issues through the webapp API (`POST /api/issues`). Since there's no delete API, test data accumulates permanently in the main `.agentrack/` — recently requiring manual deletion of 416 test issues. The library-validator already solved this with `validation/.e2edata/` (an isolated git worktree). The webapp needs to use the same isolated directory.

**Key insight:** The webapp server already supports an env var in `packages/webapp/server/utils/tracker.ts` (line 8):

```typescript
const cwd = process.env.AGENTACK_CWD || process.cwd();
```

However, the env var is misnamed — the project is **agentrack**, not "agentack". This plan includes renaming it to `AGENTRACK_CWD` as part of the changes.

No other server code changes needed — only Playwright config + test setup.

---

## Changes

### 1. Rename env var: `AGENTACK_CWD` → `AGENTRACK_CWD`

**File: `packages/webapp/server/utils/tracker.ts`**

```typescript
// Before:
const cwd = process.env.AGENTACK_CWD || process.cwd();

// After:
const cwd = process.env.AGENTRACK_CWD || process.cwd();
```

Also update the JSDoc comment to match.

Check if `AGENTACK_CWD` is referenced anywhere else in the codebase (other packages, docs, tests) and update those too.

---

### 2. Create `packages/webapp/e2e/setup.ts` — Webapp E2E helpers

Replicate the essential helpers from `packages/library/tests/e2e/setup.ts` (not exportable from the library package). Pure filesystem operations — no import from `agentrack` package.

**Functions to implement:**

- **`getValidationDir()`** — Resolve `validation/` relative to project root via `git rev-parse --show-toplevel` (same pattern as library setup.ts lines 44-49).
- **`getE2EDataDir()`** — Returns `join(getValidationDir(), ".e2edata")`.
- **`resetWorktreeData()`** — Overwrite these files to empty defaults:
  - `index.json` → `{"open": [], "closed": [], "childrenOf": {}}`
  - `dependencies.json` → `{"blockedBy": {}, "blocks": {}}`
  - `users.json` → `{"users": []}`
  - `config.json` → `{"auth": {"mode": "open", "defaultUser": "anonymous"}, "branch": "_e2edata"}`
  - Also: delete all files in `issues/` directory, ensure pointer file at `validation/.agentrack.json` with `{"branch": "_e2edata"}`.
  - Same as library's `resetWorktreeData` at line 348-387 of `tests/e2e/setup.ts`. ~1ms, no git ops.
- **`ensureE2EWorktree()`** — Idempotent: check if `validation/.e2edata/` exists, if not run `agt init --branch e2edata` with `cwd=validation/`. Same as library's `ensureE2EWorktree` at line 313-342.

---

### 3. Create `packages/webapp/e2e/global-setup.ts` — Playwright globalSetup

```typescript
import { ensureE2EWorktree, resetWorktreeData } from "./setup";

export default async function globalSetup() {
  ensureE2EWorktree();
  resetWorktreeData();
}
```

Runs once before all tests, before the server starts. No race condition.

---

### 4. Modify `packages/webapp/playwright.config.ts`

Two additions:

**4a. Add `globalSetup` field:**
```typescript
globalSetup: require.resolve("./e2e/global-setup"),
```

**4b. Add `env` to the backend webServer config:**
```typescript
import { execSync } from "node:child_process";
import { join } from "node:path";

const projectRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
const validationDir = join(projectRoot, "validation");

// In webServer config:
{
  command: "bun run dev:server",
  port: 3000,
  timeout: 10_000,
  env: { AGENTRACK_CWD: validationDir },
},
```

The frontend webServer config stays unchanged.

---

### 5. Update `.claude/agents/webapp-validator.md`

Add an **"E2E Test Data Isolation"** section after "E2E Testing with Playwright" explaining:

- Server uses isolated `validation/.e2edata/` via `AGENTRACK_CWD` in playwright.config.ts
- Data resets before each run via `global-setup.ts`
- Tests must NOT run against main `.agentrack/`
- If `reuseExistingServer` grabs a server without `AGENTRACK_CWD`, restart it

---

### 6. Update `.agentic/expertise/webapp-validator/webapp-validator-index.yaml`

- Remove gotcha: `"No issue deletion API means test data accumulates across runs"` (now solved)
- Update `test_isolation` pattern to mention isolated directory + global-setup reset
- Add pattern about `AGENTRACK_CWD` / isolated data

---

## What does NOT change

- `packages/webapp/server/index.ts` — no changes
- `validation/.e2edata/` — reused as-is
- `validation/.agentrack.json` — reused as-is
- `packages/webapp/e2e/phase*.spec.ts` — all 3 test files unchanged (data-agnostic)

---

## Verification

1. Run `cd packages/webapp && npx playwright test` — all 114 tests pass against isolated data
2. Verify `validation/.e2edata/issues/` contains test-created issues after the run
3. Verify main repo `.agentrack/` is untouched — `agt list` shows only the 11 real issues
