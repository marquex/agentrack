# E2E test suite

End-to-end tests that exercise the `agt` CLI as a real subprocess. Each test
spawns the TypeScript CLI (`src/bin.ts`) via `bun run` and asserts on its
stdout/stderr/exit-code.

## Isolation contract

Every test runs against its own **ephemeral directory** created under
`os.tmpdir()` with the `agt-e2e-` prefix. No test ever writes to repo paths
(`validation/`, project root, etc.).

Two test shapes:

- **Type B — tracker operations** (most files: `create`, `update`, `list`,
  `view`, `history`, `next`, `comments`, `blockages`, `users`, `hierarchy`,
  `auth`, `lifecycle`, `mentions`, `delete`). One ephemeral directory is shared
  across all tests in a file. The directory is created in `beforeAll`, the
  tracker data files are reset in `beforeEach` (`resetWorktreeData`), and the
  directory is removed in `afterAll`.

- **Type A — git operations** (`init`, `push`, `pull`). One ephemeral directory
  per **test**, created and destroyed inside the test body via the
  `withEphemeralWorktree(branch, fn, opts?)` wrapper. Push/pull tests pass
  `{ withRemote: true }` so a local bare `origin` is set up at `<dir>/remote.git`
  — no dependence on any real project remote.

Each ephemeral directory is a fresh git repo (`git init` + bootstrap commit).
Branch names are scoped to that repo, so parallel files never collide.

## How to add a new test

Pick the shape that matches the command(s) you're testing:

### Type B (most common)

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  createEphemeralDir,
  ensureE2EWorktree,
  initGitRepo,
  resetWorktreeData,
  rmEphemeralDir,
  runAgt,
} from "./setup";

describe("E2E: my-command", () => {
  let dir: string;

  beforeAll(async () => {
    dir = createEphemeralDir();
    initGitRepo(dir);
    await ensureE2EWorktree(dir, E2E_DATA_BRANCH);
  });
  beforeEach(() => resetWorktreeData(dir, E2E_DATA_BRANCH));
  afterAll(() => rmEphemeralDir(dir));

  test("does the thing", async () => {
    const result = await runAgt(["my-command", "..."], dir);
    expect(result.exitCode).toBe(0);
  });
});
```

**Always pass `dir` as the second argument to `runAgt`.** The helper requires it
explicitly — a missing `cwd` would silently fall back to the test runner's
`process.cwd()` (the repo root, which has no agentrack init) and produce a
confusing `NOT_INITIALIZED`.

### Type A (testing init/push/pull)

```ts
test("...", async () => {
  await withEphemeralWorktree(
    E2E_GIT_BRANCH,
    async (dir) => {
      const result = await runAgt(["push"], dir);
      // ...
    },
    { withRemote: true }, // only for push/pull
  );
});
```

For tests that need to inspect the result of `agt init` itself (e.g. asserting
on the `scenario: "fresh"` output), use `createEphemeralDir` + `initGitRepo` +
an explicit `runAgt(["init", ...], dir)` instead of the wrapper, and wrap the
body in `try { ... } finally { rmEphemeralDir(dir); }`.

## Parallelism

Tests are parallel-safe by default — `bun test` may run files concurrently.
Do **not** introduce shared mutable state outside the per-file `dir`.

## Cleanup

`rmEphemeralDir` is best-effort and tolerant of missing directories. If a test
run is killed, leftover `agt-e2e-*` directories may remain under `os.tmpdir()`
and can be swept manually:

```sh
rm -rf "$(mktemp -d)/"/../../../agt-e2e-* 2>/dev/null || true
# or more simply:
find "$(dirname "$(mktemp -u)")" -maxdepth 1 -name 'agt-e2e-*' -exec rm -rf {} +
```

Each `runAgt` call also has a 30s per-spawn timeout (override via the fourth
argument) so a hung `agt` subprocess cannot stall CI indefinitely.
