# Branch Configuration

## When To Use This

Tasks involving the --branch flag, custom branch names, branch normalization, or the pointer file mechanism. "Change branch naming", "custom branch", "--branch flag behavior", "normalize branch name".

## Mental Model

The `--branch <name>` flag on `agt init` allows configuring a custom orphan branch name instead of the default `_agentrack`.

**Normalization rules**:
- Strip leading underscores from the user-provided name
- Prepend `_` for the branch name (e.g., "mybranch" → branch `_mybranch`)
- Prepend `.` for the directory name (e.g., "mybranch" → dir `.mybranch`)
- Slashes are explicitly rejected (prevents nested dirs like `.feature/foo/`)
- Default: `_agentrack` branch, `.agentrack` directory

**Pointer file** (`.agentrack.json` at repo root):
- Written only for non-default branches (backward compatibility)
- Stores branch and dir name
- Breaks the circular discovery problem (resolution can read this without needing to know the dir first)

**Branch-config module** (`src/core/branch-config.ts`) centralizes all branch constants and operations: DEFAULT_BRANCH, DEFAULT_DIR, normalizeBranchName(), readBranchPointer(), writeBranchPointer(), resolveWorktreeOptions().

## Code Map

- `src/core/branch-config.ts` — all branch configuration logic
- `src/core/worktree.ts` — parameterized with branch/dir from config
- `src/core/resolution.ts` — uses readBranchPointer() during walk-up
- `src/core/tracker.ts` — init() accepts optional dirName, falls back to resolveWorktreeOptions()
- `src/cli/commands/init.ts` — passes opts.dir to tracker.init(), conditional writeBranchToConfig
- `tests/core/branch-config.test.ts` — normalization and config tests
- `tests/core/branch-resolution-pointer.test.ts` — pointer file resolution tests
- `tests/core/worktree-branch.test.ts` — worktree with custom branch tests

## Related Topics

- [git-worktree.expertise.md](git-worktree.expertise.md): how branch config integrates with worktree operations
- [resolution-discovery.expertise.md](resolution-discovery.expertise.md): pointer file used during dir walk-up

## Business Rules And Invariants

- Slash in branch names is rejected with dedicated error message
- Pointer file only written for non-default branches (AC7 backward compat)
- tracker.ts has no hardcoded AGENTACK_DIR constant (removed during implementation)
- commitGitignoreChange also stages/commits .agentrack.json pointer file when present
