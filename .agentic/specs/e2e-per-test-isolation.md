# Spec: Per-test ephemeral worktree isolation for the library E2E suite

**Date**: 2026-06-17
**Author**: library-architect
**Parent issue**: `mqib4kqx2y` — Rework library E2E suite for per-test ephemeral worktree isolation
**Plan task**: `mqicl1n3so` · **Dev task**: `mqicl1m8uw` · **Validate task**: `mqibohp1zk` · **Release task**: `mqiboor9kc`
**Supersedes**: `.agentic/specs/e2e-refactor.md` (2026-05-21, which proposed a *shared* `validation/` worktree — that direction was reversed in favor of per-test isolation).

---

## 1. Goal

Make `packages/library/tests/e2e` fully parallel-safe and self-cleaning so that:

1. No test ever writes to a repo path (`validation/`, project root, real `.agentrack/`).
2. Tests never observe state produced by another test or a prior run.
3. The suite runs cleanly under `bun test`'s default parallelism (no `--jobs 1`).
4. The suite can be re-included in the publish-gate coverage command.

## 2. Current state (verified 2026-06-17)

A first-cut implementation already landed in commit `73c81ae` ("E2E tests in place"):

- `packages/library/tests/e2e/setup.ts` — helpers: `createEphemeralDir`, `rmEphemeralDir`, `initGitRepo`, `withEphemeralWorktree`, `ensureE2EWorktree`, `resetWorktreeData`, `runAgt`, `uniqueBranch`.
- `packages/library/tests/e2e/README.md` — documents the isolation contract and the two test shapes.
- All 17 spec files refactored onto this infrastructure.
- A clean run passes: **100/100, 497 expect() calls, 17 files, ~15s, default parallelism** (verified by the architect during planning).

**This spec therefore formalizes the design, settles the open `AGENTRACK_CWD` question raised in the parent, and scopes the remaining hardening/verification work for the dev and validate tasks.** It is not a green-field design.

## 3. The `AGENTRACK_CWD` decision

The parent issue prescribed: *"Point the subprocess at the worktree via the `AGENTRACK_CWD` env var (verify the CLI respects it; if not, file a prerequisite)."*

**Finding: the library CLI does NOT read `AGENTRACK_CWD`.** `resolveTrackerDir()` (`src/core/resolution.ts`) walks up from `cwd` looking for a `.agentrack.json` pointer (then falls back to `.agentrack/`). The `Tracker` constructor (`src/core/tracker.ts`) defaults `cwd` to `process.cwd()`. There is no env-var override path anywhere in `packages/library/src/`. (`AGENTRACK_CWD` is a **webapp** concept — read once in `packages/webapp/server/utils/tracker.ts`.)

**Decision: do NOT add `AGENTRACK_CWD` support to the library and do NOT block on it.** Isolation is achieved the idiomatic way: `runAgt()` spawns the subprocess with `cwd = <ephemeral dir>`, and the CLI's existing cwd resolution finds the pointer we wrote via `ensurePointer()` / `ensureE2EWorktree()`. This is simpler, exercises the same code path real users hit, and avoids a library API change purely for test plumbing.

> **For the dev task (`mqicl1m8uw`)**: the task title mentions `AGENTRACK_CWD`. Treat that as "isolate the subprocess" — the `cwd` mechanism already in `setup.ts` satisfies the intent. Do **not** wire `AGENTRACK_CWD` into the library. If anyone later wants a library-level env override (e.g. for the programmatic API), that is a separate feature — file it as an `idea`, it is out of scope here.

## 4. Design

### 4.1 Two test shapes

| Shape | Commands under test | Isolation unit | Lifecycle |
|-------|---------------------|----------------|-----------|
| **Type B** (tracker ops) | `create`, `update`, `list`, `view`, `history`, `next`, `comments`, `blockages`, `users`, `hierarchy`, `auth`, `lifecycle`, `mentions`, `delete` | **One ephemeral dir per file** | `beforeAll`: `createEphemeralDir` + `initGitRepo` + `ensureE2EWorktree`. `beforeEach`: `resetWorktreeData` (fast file-only reset). `afterAll`: `rmEphemeralDir`. |
| **Type A** (git ops) | `init`, `push`, `pull` | **One ephemeral dir per test** | Inside the test body via `withEphemeralWorktree(branch, fn, opts)` (or manual `createEphemeralDir` + `try/finally rmEphemeralDir` when asserting on `init`'s own output). Push/pull pass `{ withRemote: true }`. |

**Rationale for the split.** Type B tests need an initialized tracker but never mutate git state, so reusing one dir per file and resetting only the JSON data files (~1 ms, no git ops) is far cheaper than re-init per test. Type A tests *are* the ones that mutate the git worktree, so they must each start from a clean repo — and there are few of them (~3 files), so the cost is negligible.

### 4.2 Directory layout

- Every ephemeral dir is created with `fs.mkdtempSync(join(os.tmpdir(), "agt-e2e-"))` — never under the repo.
- Each is a fresh git repo: `git init`, stable `user.name`/`user.email`, a bootstrap commit on `main` so branch/push ops behave predictably. Push/pull tests also create a local bare `origin` at `<dir>/remote.git` — zero dependence on any real remote.
- The tracker lives at `<dir>/.<branch>/` (e.g. `.e2edata/`, `.e2egit/`), and a `.agentrack.json` pointer `{ "branch": "_<branch>" }` is written at `<dir>/` so `resolveTrackerDir` finds it. See `ensurePointer()`.

### 4.3 Parallel safety

- Files may run concurrently (`bun test` default). Within a file, tests run sequentially — that's fine because Type B shares one dir and Type A creates per-test dirs.
- No branch collisions: Type B uses the constant branch `e2edata` (scoped to its own dir, so other files using the same name are in different repos entirely). Type A uses `uniqueBranch(base)` → `${base}-${pid}-${random}` purely as a defensive measure; it is not strictly required because each dir is its own repo, but it aids debugging.
- **No shared mutable state outside the per-file/per-test `dir`.** This is the cardinal rule and must be documented in the README (it is).

### 4.4 Subprocess safety

- `runAgt(args, cwd, env?, timeoutMs = 30_000)` is the single chokepoint for spawning. `cwd` is **required** — there is no default, so a missing target cannot silently fall back to the runner's `process.cwd()` (the repo root, which has no init and would yield a confusing `NOT_INITIALIZED`).
- A 30 s kill timer guards against hung children stalling CI; on timeout the proc is killed and an `Error` is thrown identifying the command and cwd. The dev task may expose the timeout override (already the 4th arg).
- Spawned via `bun run <BIN_PATH>` where `BIN_PATH` points at `src/bin.ts` (TypeScript source) — no build step required to run E2E.

### 4.5 Cleanup contract

- `rmEphemeralDir` is **best-effort and ENOENT-tolerant**: `rmSync(dir, { recursive: true, force: true })` wrapped in try/catch that swallows errors. A test killed mid-run may leave `agt-e2e-*` dirs under `os.tmpdir()`; the README documents a manual sweep command. This is accepted; OS tmpdir reaping and the per-run reset make it harmless.
- Type B's `afterAll` and Type A's `finally` both call `rmEphemeralDir`. The dev task must confirm every spec file wires cleanup correctly (see §5 gap list).

## 5. Scope for the dev task (`mqicl1m8uw`)

Since the infrastructure already exists and passes, the dev task is **audit + harden + reconcile**, not green-field:

1. **Spec the title to the design.** Update `mqicl1m8uw`'s understanding: isolation uses `cwd`, not `AGENTRACK_CWD` (per §3). Do not implement `AGENTRACK_CWD`.
2. **Audit every spec file** in `tests/e2e/` against §4: confirm each uses `createEphemeralDir`/`withEphemeralWorktree`, passes `dir` to every `runAgt` call, and wires `afterAll`/`finally` cleanup. Fix any drift.
3. **Remove any residual `validation/`-based assumptions.** Search for `validation`, `getValidationDir`, `ensureE2EWorktree` (the *old* shared-worktree variant) — nothing in the e2e suite should reference repo paths. (The webapp e2e suite is a separate concern and is NOT in scope.)
4. **Confirm `resetWorktreeData` resets every data file.** It currently resets `index.json`, `dependencies.json`, `users.json`, `config.json`, `mentions.json`, and deletes `issues/*`. If new data files have been added to the tracker since, add them here.
5. **Delete the stale spec** `.agentic/specs/e2e-refactor.md` (it proposes the abandoned shared-`validation/` approach and will mislead future readers). This file supersedes it.
6. **No changes to `package.json` test scripts are required for dev.** `test:e2e` (`bun test tests/e2e`) already runs parallel; there is no `--jobs 1` to remove (the parent issue's serial requirement was already dropped). Re-inclusion in `test:coverage` / publish-gate is the **Release** task's call (`mqiboor9kc`).

## 6. Acceptance criteria (for the Validate task `mqibohp1zk`)

The validate task must demonstrate ALL of:

- [ ] **3 consecutive clean parallel runs** of `bun test tests/e2e` from `packages/library/` on a clean checkout — zero failures across all three.
- [ ] **No repo pollution.** After the 3 runs, `git status` at the repo root is clean (no new/modified files under `validation/`, `.agentrack/`, or anywhere else). `find "$(os tmpdir)" -name 'agt-e2e-*'` may show leftover dirs only if a run was interrupted — acceptable per §4.5.
- [ ] **Parallelism confirmed.** The suite passes without any `--jobs 1` / `fullyParallel: false` flag.
- [ ] **Cleanup tolerance.** Manually verify `rmEphemeralDir` swallows a missing dir (call it on a bogus path — must not throw).
- [ ] **Spawn timeout works.** Confirmed present in `runAgt` (30 s default, override via 4th arg); validate by inspection — do not actually inject a 30 s hang into CI.
- [ ] **No `AGENTRACK_CWD` dependency.** `grep -r AGENTRACK_CWD packages/library/tests packages/library/src` returns nothing (the library does not read it; tests must not rely on it).
- [ ] **Stale spec removed.** `.agentic/specs/e2e-refactor.md` no longer exists; this file is the source of truth.

## 7. Out of scope

- The **webapp** Playwright E2E suite (`packages/webapp/e2e/`) — that suite has its own isolation model (`validation/.e2edata/` worktree, `AGENTRACK_CWD`, `webServer` config). It is tracked by a separate line of work (review `mqh1ghz42s`, idea `mqh0su9kgq`); do not touch it here.
- Adding `AGENTRACK_CWD` support to the library CLI/programmatic API. File as a separate `idea` if desired.
- Performance optimization of `git init` in `initGitRepo` (current cost is acceptable; the whole suite runs in ~15 s).

## 8. Risk assessment

- **Low.** The design is already implemented and passing. Residual risk is residual drift (a spec file not yet migrated, a new data file not reset) — caught by the §6 acceptance criteria.
- **Flake sources** are confined to subprocess spawn + fs cleanup, both already mitigated (30 s timeout, ENOENT-tolerant cleanup). The validate task's 3× clean-run requirement is the backstop.
