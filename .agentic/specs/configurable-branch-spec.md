# Configurable Branch Name for `agt init`

**Status: DRAFT**

## Summary

Add a `--branch <name>` flag to the `agt init` subcommand, allowing users to specify which orphan branch stores the agentrack data. The default remains `_agentrack`. This enables multiple agentrack instances per repository (each on its own branch), and allows the library's own test suite to initialize a dedicated test branch rather than colliding with the project's real `_agentrack` data.

## Requirements

### AC1: `--branch` flag on `agt init`

`agt init` accepts an optional `--branch <name>` flag. When provided, the specified branch name is used instead of `_agentrack` for all worktree operations (orphan branch creation, worktree mount, push, pull).

When omitted, the behavior is identical to today: branch name is `_agentrack`.

```
agt init                    # branch: _agentrack,  dir: .agentrack/
agt init --branch testing   # branch: _testing,    dir: .testing/
agt init --branch _ci       # branch: _ci,         dir: .ci/
agt init --branch myproject # branch: _myproject,  dir: .myproject/
```

**Normalization rules:**

1. Strip leading underscores from user input
2. Prepend `_` for branch name, `.` for directory name
3. This means `--branch testing` and `--branch _testing` produce the same result
4. Default (no flag): branch `_agentrack`, directory `.agentrack/`

| Flag value | Branch name | Directory name |
|------------|-------------|----------------|
| (none)     | `_agentrack` | `.agentrack/` |
| `testing`  | `_testing`   | `.testing/` |
| `_ci`      | `_ci`        | `.ci/` |
| `myproject`| `_myproject` | `.myproject/` |

Each branch/directory pair is independent, allowing multiple agentrack instances per repository (each mounted at its own path).

### AC2: Branch name stored in config

After `agt init`, the chosen branch name is recorded in `config.json`:

```json
{
  "version": 1,
  "auth": { "mode": "open" },
  "branch": "_testing"
}
```

The existing default init continues to produce `config.json` without a `branch` field (backward compatible — code falls back to `_agentrack` when absent).

### AC3: `push` and `pull` respect the configured branch

`agt push` and `agt pull` read the branch name from `config.json` and operate on that branch's worktree. They must resolve the correct directory (`.agentrack/` vs `.testing/` etc.) based on the stored config.

### AC4: Worktree module reads branch from config

The `worktree.ts` module currently hardcodes `WORKTREE_BRANCH = '_agentrack'` and `WORKTREE_DIR = '.agentrack'`. These become derived from config:

```typescript
// Before
export const WORKTREE_BRANCH = '_agentrack';
export const WORKTREE_DIR = '.agentrack';

// After: resolved per-operation from config.json (or defaults)
export function getDefaultBranch(): { branch: string; dir: string }
// Returns { branch: '_agentrack', dir: '.agentrack' } when no config exists

export function resolveWorktreePaths(cwd: string): { branch: string; dir: string }
// Reads config.json from cwd/.agentrack/config.json (or tries to find the config)
// Falls back to defaults if no config or no branch field
```

**Important:** During `init`, there's a chicken-and-egg problem — config.json doesn't exist yet, so we can't read the branch from it. The `--branch` flag value must be passed through to the worktree init functions explicitly.

### AC5: `isWorktreeInitialized` must discover the active instance

The current check looks for `.agentrack/` specifically. It must be generalized:

- **During `init`:** The command already knows the target directory from the `--branch` flag (or default). Check that specific directory.
- **During `push`/`pull` and other commands:** Read `config.json` to discover the branch, derive the directory, then check that path.

Do NOT scan for all agentrack directories — just resolve the single active one from config.

### AC6: Error cases for `--branch`

| Condition | Error code | Message |
|-----------|-----------|---------|
| Branch name contains spaces or invalid git chars | `INVALID_BRANCH_NAME` | "Branch name '<name>' is not a valid git branch name" |
| Branch name is empty | `INVALID_BRANCH_NAME` | "Branch name cannot be empty" |
| Directory already exists (for that branch) and is not a worktree | `MIGRATION_REQUIRED` | Same as current, but with the specific directory name |
| Branch already exists but with different content | `BRANCH_CONFLICT` | "Branch '<name>' already exists but does not contain agentrack data" |

### AC7: Backward compatibility

All existing behavior is preserved:
- `agt init` without `--branch` works exactly as before
- Existing repos with `_agentrack` branch and `.agentrack/` directory continue to work
- `config.json` files without a `branch` field are treated as `_agentrack`

## API / Interface Changes

### CLI changes

```bash
agt init [--branch <name>]
```

The `--branch` flag is optional. When provided, `<name>` is normalized per AC1.

### Config schema change

`config.json` gains an optional `branch` field:

```typescript
interface Config {
  version: number;
  auth: AuthConfig;
  branch?: string;  // NEW — defaults to '_agentrack' when absent
}
```

### Worktree module changes

The hardcoded constants become dynamic:

```typescript
// Before
export const WORKTREE_BRANCH = '_agentrack';
export const WORKTREE_DIR = '.agentrack';

// After
export const DEFAULT_BRANCH = '_agentrack';
export const DEFAULT_DIR = '.agentrack';

export function normalizeBranchName(input: string): { branch: string; dir: string }
// Strips leading underscores, prepends _ and . respectively

export function resolveWorktreePaths(cwd: string): { branch: string; dir: string }
// Reads config to determine active branch/dir, falls back to defaults

export function getWorktreeDir(branch: string): string
// Converts branch name to directory name: _agentrack → .agentrack
```

All worktree functions that currently use the constants must accept `{ branch, dir }` as a parameter (or resolve it internally via config).

### Modified files

| File | Change |
|------|--------|
| `src/cli/init.ts` | Parse `--branch` flag, pass normalized branch/dir to worktree init, store in config |
| `src/core/worktree.ts` | Replace hardcoded constants with parameterized branch/dir; add normalization and resolution functions |
| `src/cli/push.ts` | Resolve branch from config instead of using constant |
| `src/cli/pull.ts` | Resolve branch from config instead of using constant |
| `src/types/config.ts` (or wherever Config is defined) | Add optional `branch` field |
| `src/core/tracker.ts` (if init stores config) | Write `branch` field to config.json during init |

### New error codes

| Code | HTTP exit code | When |
|------|---------------|------|
| `INVALID_BRANCH_NAME` | 1 | Invalid characters in branch name |
| `BRANCH_CONFLICT` | 1 | Branch exists but isn't an agentrack branch |

## Implementation Notes

### Flag parsing

The CLI uses `commander` (or similar). Add the option to the init subcommand:

```typescript
program
  .command('init')
  .option('--branch <name>', 'branch name for agentrack data')
  .action(async (options) => {
    const branchInput = options.branch;
    // ... normalize and pass to worktree init
  });
```

### Normalization implementation

```typescript
export function normalizeBranchName(input: string): { branch: string; dir: string } {
  // Strip leading underscores
  const cleaned = input.replace(/^_+/, '');
  if (!cleaned) throw new AgentrackError('INVALID_BRANCH_NAME', 'Branch name cannot be empty', 1);

  // Validate: no spaces, no special chars that git rejects
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(cleaned)) {
    throw new AgentrackError('INVALID_BRANCH_NAME', `"${input}" is not a valid branch name`, 1);
  }

  return {
    branch: `_${cleaned}`,
    dir: `.${cleaned}`,
  };
}
```

### Config write during init

After worktree setup and `tracker.init()`, the init command must ensure `config.json` includes the `branch` field:

```typescript
// After init completes
const config = readConfig(worktreeDir);
config.branch = normalizedBranch;  // '_testing' etc.
writeConfig(worktreeDir, config);
```

Then auto-commit the updated config to the branch.

### Worktree function signature changes

Current worktree functions take `cwd: string`. They need to also know which branch/dir to target:

```typescript
// Option 1: Explicit params
export async function initFreshWorktree(cwd: string, branch: string, dir: string): Promise<WorktreeInitResult>;

// Option 2: Options object
export interface WorktreeOptions { branch: string; dir: string; }
export async function initFreshWorktree(cwd: string, opts: WorktreeOptions): Promise<WorktreeInitResult>;
```

Option 2 is cleaner and more extensible.

### Gitignore handling

The gitignore entry must match the actual directory. Currently hardcoded as `/.agentrack/`. Must become dynamic:

```typescript
function gitignoreEntry(dir: string): string {
  return `/${dir}/`;
}
```

### Testing strategy

This is a key motivator for the feature. The library's test suite can now:

1. Create a test branch (e.g., `--branch _test-${random}`) in a temp git repo
2. Run full integration tests against it
3. Clean up by removing the worktree and branch

This avoids tests interfering with the project's real agentrack data.

## Out of scope

- **Multiple simultaneous instances** — while the feature enables this, the init command doesn't check for or manage multiple instances. Each `agt init` targets one branch/directory.
- **Switching between instances** — no `agt switch` or similar. User manages worktrees manually via git.
- **Remote name configuration** — still assumes `origin`.
- **Migration from default to custom branch** — no tooling to move data from `_agentrack` to a custom branch.
- **GUI/interactive selection of branches** — flag-only, no interactive prompts.
