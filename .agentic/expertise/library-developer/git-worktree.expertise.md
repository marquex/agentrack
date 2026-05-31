# Git Integration And Worktree

## When To Use This

Tasks involving push/pull sync, orphan branch setup, git worktree operations, or init with git. "Push agentrack data", "pull from remote", "worktree setup", "orphan branch", "init with --branch".

## Mental Model

Agentrack stores its data on a dedicated orphan branch (default: `_agentrack`) mounted as a git worktree. This keeps issue tracking data versioned alongside the repo without polluting the main branch history.

**Key operations**:
- `pushWorktree()` — stages all changes in the worktree, commits with auto-generated or custom message, pushes to remote
- `pullWorktree()` — pulls latest from remote into the worktree
- `init` with git — creates the orphan branch, sets up worktree, initializes Tracker data dir
- `init` without git — creates a plain `.agentrack/` directory (no git involved)

**Important**: push/pull are NOT Tracker methods. They are standalone functions exported from `src/core/worktree.ts`. The CLI commands call them directly, not through Tracker.

**Pointer file**: `.agentrack.json` at the repo root stores the branch and directory name, enabling discovery without circular dependencies.

## Code Map

- `src/core/worktree.ts` — pushWorktree, pullWorktree, worktree setup functions, deprecated WORKTREE_BRANCH/WORKTREE_DIR aliases
- `src/core/branch-config.ts` — DEFAULT_BRANCH, DEFAULT_DIR, normalizeBranchName, readBranchPointer, writeBranchPointer, resolveWorktreeOptions
- `src/cli/commands/push.ts` — push CLI action
- `src/cli/commands/pull.ts` — pull CLI action
- `src/cli/commands/init.ts` — init with git/non-git paths
- `tests/core/worktree.test.ts` — worktree unit tests
- `tests/core/branch-config.test.ts` — branch config tests
- `tests/e2e/push.test.ts`, `tests/e2e/pull.test.ts`, `tests/e2e/init.test.ts` — e2e tests

## Related Topics

- [branch-config.expertise.md](branch-config.expertise.md): configurable branch names and normalization
- [resolution-discovery.expertise.md](resolution-discovery.expertise.md): how the pointer file is used for dir discovery

## Business Rules And Invariants

- push accepts optional `--message` to override auto-generated commit message
- worktree operations handle .gitignore auto-entries
- `.agentrack.json` pointer file must be committed alongside gitignore changes
- WORKTREE_BRANCH/WORKTREE_DIR are deprecated aliases (backward compat)

## Gaps And Validation Needs

- Concurrent init race condition identified in spec review — both processes may detect "fresh" state simultaneously
