# Configurable Branch Name for `agt init`

**Status: REVIEWED — Updated 2026-05-21 to incorporate review feedback from mpe3pvr2yu and mpe3pv74lo**

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

### AC2: Branch name stored in config + pointer file

After `agt init`, the chosen branch name is recorded in two places:

**1. Inside the worktree config** — `config.json` in the worktree directory:

```json
{
  "version": 1,
  "auth": { "mode": "open" },
  "branch": "_testing"
}
```

**2. As a pointer file in the main repo root** — `.agentrack.json` at the repo root (NOT inside the worktree):

```json
{
  "branch": "_testing"
}
```

This pointer file solves the circular discovery problem: to find the config, you need to know the directory, but the directory comes from the config. The pointer file at a fixed, well-known location (`cwd/.agentrack.json`) breaks the cycle.

- The pointer file is created during `agt init` and must be committed to the main branch (not the worktree branch).
- During `push`/`pull` and all other commands, read `.agentrack.json` to discover which worktree directory to use.
- For backward compatibility: if `.agentrack.json` does not exist, assume branch `_agentrack` and directory `.agentrack/`.
- The existing default init continues to produce `config.json` without a `branch` field (backward compatible — code falls back to `_agentrack` when absent).
- The pointer file is always named `.agentrack.json` regardless of the branch name.

### AC3: `push` and `pull` respect the configured branch

`agt push` and `agt pull` read the branch name from the pointer file (`cwd/.agentrack.json`) and operate on that branch's worktree. They derive the correct directory (`.agentrack/` vs `.testing/` etc.) from the pointer file's `branch` field. If the pointer file is absent, fall back to `_agentrack` / `.agentrack/`.

### AC4: Worktree module reads branch from pointer file

The `worktree.ts` module currently hardcodes `WORKTREE_BRANCH = '_agentrack'` and `WORKTREE_DIR = '.agentrack'`. These become derived from the pointer file:

```typescript
// Before
export const WORKTREE_BRANCH = '_agentrack';
export const WORKTREE_DIR = '.agentrack';

// After: resolved from pointer file or defaults
export const DEFAULT_BRANCH = '_agentrack';
export const DEFAULT_DIR = '.agentrack';

export function normalizeBranchName(input: string): { branch: string; dir: string }
// Strips leading underscores, prepends _ and . respectively
// IMPORTANT: Rejects slashes — see AC8

export function resolveWorktreePaths(cwd: string): { branch: string; dir: string }
// Reads .agentrack.json from cwd to determine active branch/dir
// Falls back to DEFAULT_BRANCH/DEFAULT_DIR if pointer file absent
```

**Important:** During `init`, there's a chicken-and-egg problem — the pointer file doesn't exist yet, so we can't read the branch from it. The `--branch` flag value must be passed through to the worktree init functions explicitly. After init completes, the pointer file is written.

### AC5: `isWorktreeInitialized` and `resolveTrackerDir` must discover the active instance

The current check looks for `.agentrack/` specifically. `resolution.ts` has `const AGENTACK_DIR = ".agentrack"` used by `resolveTrackerDir()` which walks up the filesystem. Both must be generalized:

- **During `init`:** The command already knows the target directory from the `--branch` flag (or default). Check that specific directory.
- **During all other commands:** Read the pointer file (`.agentrack.json`) to discover the branch, derive the directory, then check that path.
- **`resolveTrackerDir()`** must read the pointer file at each level during its walk-up to determine the correct directory name. If no pointer file is found, fall back to `.agentrack/`.

Similarly, `tracker.ts` has `const AGENTACK_DIR = ".agentrack"` for the non-git fallback path. This must also be derived from the pointer file or passed as a parameter.

Do NOT scan for all agentrack directories — just resolve the single active one from the pointer file.

### AC6: Error cases for `--branch`

| Condition | Error code | Message |
|-----------|-----------|---------|
| Branch name contains spaces or invalid git chars | `INVALID_BRANCH_NAME` | "Branch name '<name>' is not a valid git branch name" |
| Branch name is empty | `INVALID_BRANCH_NAME` | "Branch name cannot be empty" |
| Branch name contains slashes | `INVALID_BRANCH_NAME` | "Branch name cannot contain slashes (slashes would create nested directories)" |
| Directory already exists (for that branch) and is not a worktree | `MIGRATION_REQUIRED` | Same as current, but with the specific directory name |
| Branch already exists but with different content | `BRANCH_CONFLICT` | "Branch '<name>' already exists but does not contain agentrack data" |

### AC7: Backward compatibility

All existing behavior is preserved:
- `agt init` without `--branch` works exactly as before
- Existing repos with `_agentrack` branch and `.agentrack/` directory continue to work
- `config.json` files without a `branch` field are treated as `_agentrack`
- Repos without a `.agentrack.json` pointer file fall back to `_agentrack` / `.agentrack/`
- `WORKTREE_BRANCH` and `WORKTREE_DIR` exports are replaced with `DEFAULT_BRANCH` and `DEFAULT_DIR` (breaking change acceptable at 0.x)

### AC8: No slashes in branch names

Branch names containing `/` are explicitly rejected by the normalization function. While git supports slash-separated branch names (e.g., `feature/foo`), allowing them would create nested directories (`.feature/foo/`) which:
- May have non-existent parent directories
- Complicate git worktree operations
- Break the walk-up resolution in `resolution.ts`

Users who want hierarchical naming can use dashes: `--branch feature-test` → `_feature-test` / `.feature-test/`.

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
| `src/cli/init.ts` | Parse `--branch` flag, pass normalized branch/dir to worktree init, write pointer file, store branch in config |
| `src/core/worktree.ts` | Replace hardcoded constants with parameterized branch/dir; add normalization and resolution functions; reject slashes |
| `src/core/resolution.ts` | Replace hardcoded `AGENTACK_DIR` with pointer-file-based discovery; read `.agentrack.json` during walk-up |
| `src/core/tracker.ts` | Replace hardcoded `AGENTACK_DIR` with pointer-file-based discovery or parameter |
| `src/cli/push.ts` | Resolve branch from pointer file instead of using constant |
| `src/cli/pull.ts` | Resolve branch from pointer file instead of using constant |
| `src/types/config.ts` (or wherever Config is defined) | Add optional `branch` field |
| `src/core/pointer.ts` **(NEW)** | Read/write `.agentrack.json` pointer file; `readPointerFile(cwd)` → `{ branch, dir }` or null; `writePointerFile(cwd, branch)` |
| `src/index.ts` | Update exports: replace `WORKTREE_BRANCH`/`WORKTREE_DIR` with `DEFAULT_BRANCH`/`DEFAULT_DIR` |

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

  // Reject slashes — they create nested directories
  if (cleaned.includes('/')) {
    throw new AgentrackError('INVALID_BRANCH_NAME', 'Branch name cannot contain slashes (would create nested directories)', 1);
  }

  // Validate: no spaces, no special chars that git rejects
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(cleaned)) {
    throw new AgentrackError('INVALID_BRANCH_NAME', `"${input}" is not a valid branch name`, 1);
  }

  return {
    branch: `_${cleaned}`,
    dir: `.${cleaned}`,
  };
}
```

### Pointer file implementation

```typescript
// src/core/pointer.ts
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const POINTER_FILE = '.agentrack.json';

export interface PointerFile {
  branch: string;
}

export async function readPointerFile(cwd: string): Promise<{ branch: string; dir: string } | null> {
  try {
    const content = await readFile(join(cwd, POINTER_FILE), 'utf-8');
    const pointer: PointerFile = JSON.parse(content);
    if (!pointer.branch) return null;
    // Derive dir from branch: _testing → .testing
    const dir = '.' + pointer.branch.replace(/^_/, '');
    return { branch: pointer.branch, dir };
  } catch {
    return null; // File doesn't exist or is invalid — use defaults
  }
}

export async function writePointerFile(cwd: string, branch: string): Promise<void> {
  const pointer: PointerFile = { branch };
  await writeFile(join(cwd, POINTER_FILE), JSON.stringify(pointer, null, 2) + '\n', 'utf-8');
}

// Convenience: resolve with fallback to defaults
export async function resolveBranch(cwd: string): Promise<{ branch: string; dir: string }> {
  const resolved = await readPointerFile(cwd);
  return resolved ?? { branch: '_agentrack', dir: '.agentrack' };
}
```

### Config write during init

After worktree setup and `tracker.init()`, the init command must:

1. Write the `branch` field to `config.json` inside the worktree:

```typescript
// After init completes
const config = readConfig(worktreeDir);
config.branch = normalizedBranch;  // '_testing' etc.
writeConfig(worktreeDir, config);
```

2. Write the pointer file at the repo root:

```typescript
await writePointerFile(repoRoot, normalizedBranch);
```

3. Auto-commit both changes: the updated config to the worktree branch, and the pointer file to the main branch.

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

The gitignore entry must match the actual directory. Currently hardcoded as `/.agentrack/`. Must become dynamic and support multiple entries:

```typescript
function gitignoreEntry(dir: string): string {
  return `/${dir}/`;
}
```

If multiple agentrack instances exist (multiple inits with different `--branch`), each directory gets its own gitignore entry. The gitignore matching logic must also be parameterized to check for the specific directory name rather than hardcoding `.agentrack`.

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
