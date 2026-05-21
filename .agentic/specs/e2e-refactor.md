# E2E Test Strategy Refactor: Shared Worktree in validation/

**Date**: 2026-05-21
**Source**: User request to analyze moving from per-test git repos to a shared worktree approach
**Author**: library-validator agent
**Updated**: 2026-05-21 — Incorporated test type split and resolved concerns

---

## Proposal

Replace the current E2E test strategy (each test creates its own git repo + worktree) with a shared worktree approach:

1. Run `agt init --branch <branch_name>` from the `validation/` folder
2. All tests run with `cwd=validation/`
3. `resolveTrackerDir()` finds `validation/.agentrack/` first (before walking up to the project root)
4. Before running the suite, delete the remote branch to ensure clean initial conditions

This eliminates the overhead of creating/destroying git repos per test.

---

## Library Code Prerequisites (not implemented yet)

These changes are needed in `packages/library/src/` before the test refactor is possible:

### 1. `agt init --branch <name>` flag

**Current state**: `runner.ts` registers the `init` command with no options. `initAction()` takes no arguments.

**Needed**: Add `--branch <name>` option to the init command that overrides the default `_agentrack` branch name.

### 2. Parameterize `worktree.ts`

**Current state**: `WORKTREE_BRANCH = "_agentrack"` is a hardcoded constant referenced **12 times** across the module.

**Functions affected**:
| Function | References | Change needed |
|---|---|---|
| `checkPreconditions()` | line 192 | Accept `branch` param, check against it |
| `detectInitScenario()` | line 208 | Accept `branch` param, ls-remote for it |
| `initFreshWorktree()` | lines 260, 266, 279, 299 | Accept `branch` param, create/mount that branch |
| `initJoinWorktree()` | lines 318, 330, 334, 350 | Accept `branch` param, fetch/track that branch |
| `initWorktree()` | delegates | Thread `branch` param through |

**Default**: All functions should default to `WORKTREE_BRANCH` (`"_agentrack"`) when no branch is specified — backward compatible.

### 3. Thread branch name through `initAction()`

`initAction()` must read `--branch` from Commander opts and pass it to `initWorktree(cwd, branch)`.

---

## Two Test Types

The E2E tests split into two categories with different isolation strategies:

### Type A: Git Operation Tests (`agt init`, `agt pull`, `agt push`)

These tests exercise git-dependent operations that need a **clean git environment** — no existing worktree, no existing branch.

**Isolation strategy**: Delete the remote branch and remove the worktree after each test. Re-create via `agt init --branch <name>` at the start of the next test. This is acceptable because there will be relatively few of these tests (estimated 10-15).

**What gets tested**:
- `agt init` — fresh init, already initialized, gitignore handling, join scenario
- `agt pull` — pull updates, already up to date, pull failure
- `agt push` — push changes, no changes to push, push failure

**What does NOT need E2E testing**:
- `agt init` in a non-git repository — this can be covered by unit tests

**Pattern**:
```typescript
describe("E2E: init", () => {
  beforeEach(async () => {
    // Ensure clean state: delete remote branch + remove worktree
    await teardownE2EWorktree(branch);
    await deleteRemoteBranch(branch);
  });

  afterEach(async () => {
    await teardownE2EWorktree(branch);
  });

  test("fresh init creates worktree", async () => {
    const result = await runAgt(["init", "--branch", branch], validationDir);
    assertSuccess(result);
    // ... verify worktree exists, config files created, etc.
  });
});
```

### Type B: Tracker Operation Tests (all other commands)

These tests exercise issue CRUD, comments, blockages, hierarchy, auth, etc. They need an **initialized agentrack instance** but never call `agt init`, `agt pull`, or `agt push`.

**Isolation strategy**: Keep the worktree alive for the entire test suite. Between tests, **reset the data files** (index.json, dependencies.json, users.json, config.json) to defaults and **delete all issue event files**. This is fast — just file writes and deletions, no git operations.

**What gets tested**:
- `create`, `update`, `list`, `view`, `history`, `next`
- `comments add/update/delete/list`
- `blockages add/resolve/delete/list`
- `users register/list/revoke/regenerate`
- Auth mode enforcement
- Full lifecycle workflows

**Pattern**:
```typescript
describe("E2E: create", () => {
  beforeEach(async () => {
    // Fast reset: overwrite data files with defaults, delete issue event files
    resetWorktreeData(validationDir);
  });

  // No afterEach needed — beforeEach resets for next test

  test("creates an issue with default values", async () => {
    const result = await runAgt(["create", "Test Issue"], validationDir);
    assertSuccess(result);
    // ...
  });
});
```

### NOT_INITIALIZED Tests: No E2E Needed

Tests for `NOT_INITIALIZED` error conditions do **not** need E2E coverage. The resolution logic (`resolveTrackerDir()`) and error handling are thoroughly covered by unit tests. Removing these from E2E eliminates the need for `createIsolatedDir()` entirely.

---

## Test Infrastructure Changes

### Helpers to Remove

| Helper | Reason |
|---|---|
| `createTestRepo()` | No longer creating git repos per test |
| `cleanupTestRepo()` | No longer tearing down git repos per test |
| `createIsolatedDir()` | NOT_INITIALIZED tests removed from E2E |
| `cleanupIsolatedDir()` | Same as above |

### Helpers to Keep (unchanged)

| Helper | Reason |
|---|---|
| `parseJson()`, `assertSuccess()`, `assertError()`, `extractId()` | Assertion helpers unchanged |

### New Helpers Needed

| Helper | Purpose | Used by |
|---|---|---|
| `getValidationDir()` | Returns absolute path to `validation/` directory | All tests |
| `initE2EWorktree(branch)` | Deletes remote branch, removes old worktree, runs `agt init --branch <branch>` from validation/ | Type A tests (beforeEach) |
| `teardownE2EWorktree(branch)` | `git worktree remove -f .agentrack` + `git worktree prune` + optionally delete remote branch | Type A tests (afterEach) |
| `resetWorktreeData(dir)` | Overwrites index.json, dependencies.json, users.json, config.json with defaults; deletes all issue event files | Type B tests (beforeEach) |
| `setAuthMode(dir, mode, defaultUser?)` | Writes config.json with specified auth mode | Auth tests |

### Test File Reorganization

| Current file | Type | Changes |
|---|---|---|
| `init.test.ts` | **Type A** | Rewrite to use `initE2EWorktree`/`teardownE2EWorktree`. Remove non-git repo tests. |
| `create.test.ts` | **Type B** | Rewrite beforeEach to use `resetWorktreeData`. Remove NOT_INITIALIZED test. |
| `update.test.ts` | **Type B** | Same pattern. Remove NOT_INITIALIZED test. |
| `list.test.ts` | **Type B** | Same pattern. |
| `view.test.ts` | **Type B** | Same pattern. Remove NOT_INITIALIZED test. |
| `history.test.ts` | **Type B** | Same pattern. |
| `next.test.ts` | **Type B** | Same pattern. |
| `comments.test.ts` | **Type B** | Same pattern. |
| `blockages.test.ts` | **Type B** | Same pattern. |
| `users.test.ts` | **Type B** | Same pattern. |
| `hierarchy.test.ts` | **Type B** | Same pattern. |
| `auth.test.ts` | **Type B** | Same pattern. Uses `setAuthMode()` to switch modes. |
| `lifecycle.test.ts` | **Type B** | Same pattern. |
| *(new)* `push.test.ts` | **Type A** | New tests for `agt push` command. |
| *(new)* `pull.test.ts` | **Type A** | New tests for `agt pull` command. |

---

## Data Reset Implementation (Type B)

The `resetWorktreeData(dir)` helper needs to:

1. **Write default index.json**: `{ "open": [], "closed": [], "childrenOf": {} }`
2. **Write default dependencies.json**: `{ "blockedBy": {}, "blocks": {} }`
3. **Write default users.json**: `{ "users": [] }`
4. **Write default config.json**: `{ "auth": { "mode": "open", "defaultUser": "anonymous" } }`
5. **Delete all issue event files**: Scan `validation/.agentrack/issues/` (or wherever per-issue data is stored) and remove all files

This is a pure file-system operation — no git commands needed. It should take <5ms per test.

---

## Impact Summary

| Category | What | Effort |
|---|---|---|
| Library code | `--branch` flag + worktree.ts parameterization | ~15 touch points |
| Test helpers | Rewrite setup.ts | 1 file, ~100 lines |
| Test files — Type A | init.test.ts rewrite + new push/pull tests | 3 files |
| Test files — Type B | Update beforeEach to `resetWorktreeData` | 11 files |
| Tests removed from E2E | NOT_INITIALIZED tests (4-5), non-git init test (1) | ~6 tests (covered by unit tests) |

---

## Recommendation

1. **Phase 1**: Implement `--branch` flag in library code
2. **Phase 2**: Implement new helpers (`initE2EWorktree`, `teardownE2EWorktree`, `resetWorktreeData`)
3. **Phase 3**: Rewrite Type A tests (init, push, pull)
4. **Phase 4**: Rewrite Type B tests (all other commands)
5. **Phase 5**: Remove old helpers (`createTestRepo`, `cleanupTestRepo`, `createIsolatedDir`)
