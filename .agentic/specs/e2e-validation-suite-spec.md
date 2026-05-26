# E2E Validation Test Suite for Agentrack

**Status: DRAFT**

## Summary

Create an end-to-end test suite in the `validation/` folder that exercises the `agt` CLI against real git repositories and real agentrack instances. The `library-validator` agent has full read/write access to `validation/`, enabling it to `git init` fresh repos, run `agt init --branch=<name>` to create isolated agentrack instances, and execute real CLI commands. This provides the highest-confidence testing layer: real filesystem, real git operations, real CLI invocations — no mocks, no in-memory simulations.

## Requirements

### AC1: Test environment setup

Each test (or test suite) creates a fresh git repository inside `validation/`:

```bash
mkdir -p validation/e2e-<test-name>-<random>
cd validation/e2e-<test-name>-<random>
git init
```

Tests use `agt init --branch=test-<random>` to create an isolated agentrack instance on a dedicated orphan branch. The random suffix prevents collisions between parallel or consecutive runs.

**Environment contract:**
- Working directory: a subdirectory of `validation/`
- Git repo: initialized fresh per test suite
- Agentrack: initialized with a unique branch name
- Cleanup: remove the test directory after tests complete (or leave for debugging on failure)

### AC2: Test structure

Tests live under `validation/` in a dedicated subfolder:

```
validation/
├── README.md                  # Explains purpose and how to run
├── e2e/
│   ├── helpers/
│   │   ├── setup.ts           # Git repo creation, agt init, cleanup
│   │   ├── runner.ts          # Execute agt commands, capture output
│   │   └── assertions.ts      # E2E-specific assertion helpers
│   ├── init.test.ts           # E2E tests for agt init
│   ├── create.test.ts         # E2E tests for agt create
│   ├── update.test.ts         # E2E tests for agt update
│   ├── list.test.ts           # E2E tests for agt list
│   ├── view.test.ts           # E2E tests for agt view
│   ├── history.test.ts        # E2E tests for agt history
│   ├── next.test.ts           # E2E tests for agt next
│   ├── comments.test.ts       # E2E tests for agt comments add/update/delete/list
│   ├── blockages.test.ts      # E2E tests for agt blockages add/resolve/delete/list
│   ├── users.test.ts          # E2E tests for agt users register/list/revoke/regenerate
│   ├── hierarchy.test.ts      # E2E tests for parent-child relationships
│   ├── auth.test.ts           # E2E tests for auth modes (open, read-only, strict)
│   └── lifecycle.test.ts      # Full workflow tests spanning multiple commands
```

### AC3: Command runner

A helper that executes real `agt` CLI commands via `Bun.spawn` (or `child_process`):

```typescript
interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runAgt(args: string[], cwd: string, env?: Record<string, string>): Promise<CommandResult>
```

- Executes the built CLI binary (from `packages/library/`)
- Captures stdout and stderr separately
- Returns exit code for assertion
- Supports passing `AGT_USER_TOKEN` via env for auth tests

### AC4: Test coverage requirements

The E2E suite must cover every CLI command with at minimum:

| Command | Happy path | Error cases | Edge cases |
|---------|-----------|-------------|------------|
| `init` | Fresh init, already initialized, `--branch` flag | Not a git repo, migration required, invalid branch name | Default branch vs custom branch |
| `create` | Create with all flags, create with minimum flags | Not initialized, invalid priority, missing title | Special characters in title, many tags |
| `update` | Update each field individually, update multiple fields | Not found, invalid transition, hierarchy constraint | No-op update (same values) |
| `list` | Empty list, filtered by status/assignee/tags/parentId | Not initialized | Large number of issues |
| `view` | View existing issue | Not found | Issue with many events |
| `history` | View history of issue | Not found | Issue with many events |
| `next` | Returns highest priority todo | No issues available, all blocked | Priority tiebreaking |
| `comments add/update/delete/list` | Full comment lifecycle | Comment not found, issue not found | Delete then re-add |
| `blockages add/resolve/delete/list` | Full blockage lifecycle | Cycle detection, self-block | Blockage chain (A blocks B blocks C) |
| `users register/list/revoke/regenerate` | Full user lifecycle | Duplicate user, not found | Register many users |
| `auth` | open mode, read-only mode, strict mode | Invalid token, missing token | Default user in open mode |
| `hierarchy` | Parent-child CRUD, auto-promotion, auto-close | Closed parent, status constraint | Deep nesting, sibling ordering |

### AC5: Full lifecycle test

At least one test must exercise a realistic multi-step workflow:

```
init → create parent → create child → update child → add comment →
add blockage → resolve blockage → update parent (auto-promotion) →
close parent → verify cascade → list → history → users register →
auth mode change → verify auth enforcement
```

This validates that commands compose correctly and state is consistent across operations.

### AC6: Review of existing tests

Before writing E2E tests, audit the current test suite in `packages/library/tests/`:
- Identify coverage gaps (commands/paths not tested)
- Identify tests that are actually E2E-like but running in unit-test mode
- Document which scenarios are well-covered vs. missing
- Use the findings to prioritize E2E test cases

### AC7: No interference with main project

Tests must NEVER:
- Modify the project's own `.agentrack/` directory
- Create branches in the project's git repo
- Depend on the project's real agentrack data

The `validation/` folder should be gitignored to prevent test artifacts from being committed.

## API / Interface Changes

None — this is a testing-only initiative. No library code changes.

## Implementation Notes

### Building the CLI before E2E tests

E2E tests run against the built CLI binary. The test helper should:

1. Build the library first: `cd packages/library && bun run build`
2. Use the built binary: `node packages/library/dist/bin.js` or `bun packages/library/src/bin.ts`

**Recommendation:** Use `bun packages/library/src/bin.ts` directly — no build step needed since Bun can execute TypeScript directly. This is simpler and faster for testing.

### Test isolation strategy

Each `describe` block or test file creates its own git repo:

```typescript
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Or use a fixed location under validation/
const testDir = join(process.cwd(), "validation", `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
```

Using `validation/` directly (rather than `tmpdir()`) is preferred because:
1. The library-validator has guaranteed access to `validation/`
2. Leftover directories help with debugging failures
3. The folder is gitignored so no risk of committing

### Executing agt commands

```typescript
import { spawnSync } from "node:child_process";

function runAgt(args: string[], cwd: string, env?: Record<string, string>): CommandResult {
  const result = spawnSync("bun", ["run", "packages/library/src/bin.ts", ...args], {
    cwd: projectRoot,  // root of the agentrack project
    env: { ...process.env, ...env },
    encoding: "utf-8",
  });

  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}
```

Note: The `cwd` for spawn should be the test's git repo directory, not the project root. The agt binary resolves its own working directory.

Actually — careful. The `bun run packages/library/src/bin.ts` needs to be run from the project root (so the path resolves). But `agt` determines the working directory from `process.cwd()`. So we need to either:
- Set `cwd` to the test directory when spawning, and use an absolute path to the bin
- Or use the globally installed `agt` command

**Best approach:** Use absolute path to the bin.ts file:

```typescript
const binPath = join(projectRoot, "packages/library/src/bin.ts");
const result = spawnSync("bun", [binPath, ...args], {
  cwd: testDir,  // agt commands run as if cwd is the test git repo
  env: { ...process.env, ...env },
  encoding: "utf-8",
});
```

### Cleanup

After each test suite, remove the test directory:

```typescript
afterEach(() => {
  // Also clean up git worktrees to avoid "has active worktrees" errors
  try {
    spawnSync("git", ["worktree", "remove", "--force", join(testDir, ".agentrack")], { cwd: testDir });
  } catch {}
  rmSync(testDir, { recursive: true, force: true });
});
```

### Running the E2E suite

Add a script to the root `package.json`:

```json
{
  "test:e2e": "bun test validation/e2e/"
}
```

Or keep it independent and just run from the project root:

```bash
bun test validation/e2e/
```

### Gitignore

Add to root `.gitignore`:

```
validation/e2e-*/
```

This ensures test artifacts are never committed while keeping the `validation/` folder structure itself tracked.

### Files to create

| File | Purpose |
|------|---------|
| `validation/e2e/helpers/setup.ts` | Git repo creation, agt init, cleanup utilities |
| `validation/e2e/helpers/runner.ts` | Command execution and output capture |
| `validation/e2e/helpers/assertions.ts` | E2E-specific assertion helpers (JSON output parsing, etc.) |
| `validation/e2e/init.test.ts` | Init command E2E tests |
| `validation/e2e/create.test.ts` | Create command E2E tests |
| `validation/e2e/update.test.ts` | Update command E2E tests |
| `validation/e2e/list.test.ts` | List command E2E tests |
| `validation/e2e/view.test.ts` | View command E2E tests |
| `validation/e2e/history.test.ts` | History command E2E tests |
| `validation/e2e/next.test.ts` | Next command E2E tests |
| `validation/e2e/comments.test.ts` | Comments command E2E tests |
| `validation/e2e/blockages.test.ts` | Blockages command E2E tests |
| `validation/e2e/users.test.ts` | Users command E2E tests |
| `validation/e2e/hierarchy.test.ts` | Hierarchy E2E tests |
| `validation/e2e/auth.test.ts` | Auth mode E2E tests |
| `validation/e2e/lifecycle.test.ts` | Full workflow E2E tests |

## Out of scope

- **Modifying existing tests** — the audit may reveal issues in `packages/library/tests/` but those are reported, not fixed
- **Performance testing** — this suite validates correctness, not speed
- **CI integration** — the E2E suite can be run locally; CI wiring is a separate task
- **Test parallelization** — tests run sequentially to avoid git conflicts; parallelization can be added later
- **Cross-platform testing** — assumes macOS/Linux (Bun + git); Windows is not in scope
- **Library code changes** — if bugs are discovered, they are reported as issues, not fixed by this task
