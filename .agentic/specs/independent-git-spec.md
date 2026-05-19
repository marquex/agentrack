# Independent Git Branch for Issue Storage

**Status: DRAFT**

## Summary

Store `.agentrack/` issue data on a dedicated orphan branch (`_agentrack`) mounted as a git worktree. This makes the issue pool independent of the code branch — everyone sees the same issues regardless of whether they're on `main`, `feature-x`, or any other branch. The branch management is handled by three CLI commands: `agt init` (worktree setup), `agt push` (commit + sync to remote), and `agt pull` (sync from remote).

## Requirements

### AC1: `agt init` — fresh setup (no remote `_agentrack` branch)

When run in a git repo where no `_agentrack` branch exists remotely:

1. Creates an orphan branch `_agentrack` containing initial data files (`config.json`, `index.json`, `dependencies.json`, `users.json`, `issues/`) — using git plumbing commands to avoid modifying the working tree.
2. Pushes the branch to `origin`.
3. Adds `/.agentrack/` to `.gitignore` on the current code branch (if not already present), commits the change.
4. Mounts the worktree: `git worktree add .agentrack _agentrack`.
5. Initializes the data files inside the worktree using the existing `tracker.init()` logic.
6. Auto-commits the initialized data to the `_agentrack` branch.

Output:
```json
{ "result": "OK", "scenario": "fresh", "path": "/abs/path/to/.agentrack" }
```

### AC2: `agt init` — join existing (remote `_agentrack` branch exists)

When run in a git repo where `_agentrack` already exists on `origin`:

1. Fetches the remote branch: `git fetch origin _agentrack`.
2. Creates a local tracking branch: `git branch _agentrack origin/_agentrack`.
3. Ensures `/.agentrack/` is in `.gitignore` (add if missing, but do NOT commit the change — the first person already committed it; just guard against a missing entry).
4. Mounts the worktree: `git worktree add .agentrack _agentrack`.

Output:
```json
{ "result": "OK", "scenario": "join", "path": "/abs/path/to/.agentrack" }
```

### AC3: `agt init` — already initialized

When `.agentrack/` is already a valid worktree for `_agentrack`:

Output:
```json
{ "result": "ALREADY_INITIALIZED", "path": "/abs/path/to/.agentrack" }
```

### AC4: `agt init` — preconditions and errors

| Condition | Error code | Message |
|-----------|-----------|---------|
| Not inside a git repo | `NOT_A_GIT_REPO` | "Not inside a git repository" |
| `.agentrack/` exists but is NOT a worktree (legacy directory) | `MIGRATION_REQUIRED` | ".agentrack/ exists but is not a git worktree. Remove it manually and re-run init." |
| `_agentrack` branch exists locally but is checked out as the current branch | `INVALID_STATE` | "Cannot init: currently on the _agentrack branch. Switch to a code branch first." |
| No remote configured and scenario A | Warn but proceed | Create local branch only, skip push |

### AC5: `agt push` — commit and sync to remote

1. Resolves `.agentrack/` worktree location.
2. Stages all changes inside `.agentrack/`: `git add -A`.
3. If there are staged changes, auto-commits with message `sync: <ISO-8601-timestamp>` (or `--message` flag value).
4. Pushes to `origin/_agentrack`.
5. If nothing to commit AND nothing to push → report no changes.

Output (changes synced):
```json
{ "result": "OK", "synced": true, "commitCount": 1 }
```

Output (nothing to sync):
```json
{ "result": "OK", "synced": false, "message": "No changes to sync" }
```

Flags:
- `--message <string>` — override auto-generated commit message

Error cases:
| Condition | Error code | Message |
|-----------|-----------|---------|
| Not initialized (no worktree) | `NOT_INITIALIZED` | "Agentrack not initialized. Run `agt init` first." |
| Push fails (conflict, no remote, etc.) | `PUSH_FAILED` | Include git error output |

### AC6: `agt pull` — sync from remote

1. Resolves `.agentrack/` worktree location.
2. Runs `git pull` inside `.agentrack/` (which operates on the `_agentrack` branch).
3. Reports whether updates were received.

Output (updates received):
```json
{ "result": "OK", "updated": true }
```

Output (already up to date):
```json
{ "result": "OK", "updated": false }
```

Error cases:
| Condition | Error code | Message |
|-----------|-----------|---------|
| Not initialized (no worktree) | `NOT_INITIALIZED` | "Agentrack not initialized. Run `agt init` first." |
| Pull fails (conflict, no remote) | `PULL_FAILED` | Include git error output |

### AC7: Worktree awareness in existing commands

All existing commands (`create`, `update`, `list`, `view`, `history`, `comments`, `blockages`, `users`, `next`) must continue to work without modification. The `.agentrack/` directory is a real directory with real files — the file-io layer reads and writes files the same way regardless of whether the directory is a worktree or a plain directory.

**No changes required to the Tracker class or file-io layer.**

### AC8: Directory structure after init

```
repo/
├── .git/
├── .gitignore              # contains "/.agentrack/"
├── src/                    # tracked on main
└── .agentrack/             # git worktree → _agentrack branch
    ├── .git                # FILE (pointer to ../.git/worktrees/.agentrack)
    ├── config.json
    ├── index.json
    ├── dependencies.json
    ├── users.json
    └── issues/
```

## API / Interface Changes

### New module: `src/worktree.ts`

```typescript
export const WORKTREE_BRANCH = '_agentrack';
export const WORKTREE_DIR = '.agentrack';

export interface WorktreeInitResult {
  scenario: 'fresh' | 'join';
  path: string;
}

export interface WorktreeSyncResult {
  synced: boolean;
  commitCount?: number;
  message?: string;
}

export interface WorktreePullResult {
  updated: boolean;
}

// Detect which init scenario applies
export async function detectInitScenario(cwd: string): Promise<'fresh' | 'join'>;

// Scenario A: create orphan branch with initial data, push, mount worktree
export async function initFreshWorktree(cwd: string): Promise<WorktreeInitResult>;

// Scenario B: fetch remote branch, mount worktree
export async function initJoinWorktree(cwd: string): Promise<WorktreeInitResult>;

// Check if .agentrack/ is a valid worktree
export async function isWorktreeInitialized(cwd: string): Promise<boolean>;

// Stage all, auto-commit, push
export async function pushWorktree(cwd: string, message?: string): Promise<WorktreeSyncResult>;

// Pull latest from remote
export async function pullWorktree(cwd: string): Promise<WorktreePullResult>;
```

### New CLI commands

| Command | Flags | Auth | Output |
|---------|-------|------|--------|
| `agt push` | `--message <string>` (optional) | None | `WorktreeSyncResult` as JSON |
| `agt pull` | None | None | `WorktreePullResult` as JSON |

### Modified CLI command

`agt init` — enhanced to perform worktree setup before initializing data files. The existing `tracker.init()` call is preserved but runs inside the mounted worktree.

### New files

| File | Purpose |
|------|---------|
| `src/worktree.ts` | Git worktree operations (init, push, pull, status queries) |
| `src/cli/push.ts` | CLI handler for `agt push` |
| `src/cli/pull.ts` | CLI handler for `agt pull` |

### Modified files

| File | Change |
|------|--------|
| `src/cli/init.ts` | Call worktree setup before `tracker.init()`, then auto-commit initial files |
| `src/runner.ts` | Register `push` and `pull` commands |
| `src/errors.ts` | Add new error codes: `NOT_A_GIT_REPO`, `MIGRATION_REQUIRED`, `INVALID_STATE`, `PUSH_FAILED`, `PULL_FAILED` |

## Implementation Notes

### Git plumbing for Scenario A (safe working-tree approach)

The orphan branch must be created WITHOUT modifying the user's working tree. Use git plumbing commands:

```bash
# 1. Create blob objects for initial files (in-memory content, no disk writes to working tree)
BLOB_CONFIG=$(printf '{"version":1,"auth":{"mode":"open"}}' | git hash-object -w --stdin)
BLOB_INDEX=$(printf '{"issues":[]}' | git hash-object -w --stdin)
BLOB_DEPS=$(printf '{"blockerToBlocked":{},"blockedByBlocker":{}}' | git hash-object -w --stdin)
BLOB_USERS=$(printf '{"users":[]}' | git hash-object -w --stdin)

# 2. Create a tree object referencing these blobs
TREE=$(printf "100644 blob %s\tconfig.json\n100644 blob %s\tindex.json\n100644 blob %s\tdependencies.json\n100644 blob %s\tusers.json" \
  "$BLOB_CONFIG" "$BLOB_INDEX" "$BLOB_DEPS" "$BLOB_USERS" | git mktree)

# 3. Create a commit from the tree
COMMIT=$(git commit-tree "$TREE" -m "init _agentrack branch")

# 4. Create the _agentrack branch ref
git branch _agentrack "$COMMIT"

# 5. Push to remote
git push -u origin _agentrack
```

This approach:
- Never switches branches
- Never writes to the working tree
- Creates the orphan branch purely via object database operations
- Safe regardless of the user's working tree state (dirty, staged, etc.)

### Executing git commands

Use `child_process.execFileSync('git', [...args], { cwd, encoding: 'utf-8' })` for all git operations. This is synchronous (matching the codebase's sync patterns for file-io) and avoids shell injection issues.

**Do NOT use `execSync` with string interpolation** — always use array-based argument passing.

### Scenario detection

```typescript
async function detectInitScenario(cwd: string): Promise<'fresh' | 'join'> {
  try {
    const result = execFileSync('git', ['ls-remote', '--heads', 'origin', WORKTREE_BRANCH], {
      cwd, encoding: 'utf-8'
    });
    return result.trim().length > 0 ? 'join' : 'fresh';
  } catch {
    // No remote or no connectivity → fresh
    return 'fresh';
  }
}
```

### Worktree check

To determine if `.agentrack/` is already a valid worktree:

```typescript
async function isWorktreeInitialized(cwd: string): Promise<boolean> {
  try {
    const worktreeList = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      cwd, encoding: 'utf-8'
    });
    return worktreeList.includes(`worktree ${cwd}/.agentrack`);
  } catch {
    return false;
  }
}
```

Also check if `.agentrack/` exists as a regular directory (legacy) to emit `MIGRATION_REQUIRED`.

### Gitignore handling

For Scenario A: programmatically append `/.agentrack/` to `.gitignore` if not already present. Stage and commit on the current code branch.

For Scenario B: verify the entry exists; add if missing (but don't commit — this was already handled by the first person).

Check logic:
```typescript
function gitignoreHasEntry(content: string): boolean {
  return content.split('\n').some(line =>
    line === '/.agentrack/' || line === '.agentrack/' || line === '/.agentrack'
  );
}
```

### Auto-commit after init

After `tracker.init()` creates the initial data files inside the worktree:

```bash
cd .agentrack
git add -A
git commit -m "init agentrack data"
```

Then optionally push (if remote is configured).

### `agt push` implementation

```bash
cd .agentrack
git add -A
# Check for staged changes
if git diff --cached --quiet; then
  # Check if ahead of remote
  if [ $(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo 0) -eq 0 ]; then
    # Nothing to sync
    exit with synced: false
  fi
else
  git commit -m "$MESSAGE"
fi
git push
```

### `agt pull` implementation

```bash
cd .agentrack
git pull
# Parse output to determine if updates were received
```

### Current branch detection for Scenario A

Save the current branch before any operations:

```typescript
function getCurrentBranch(cwd: string): string {
  return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd, encoding: 'utf-8'
  }).trim();
}
```

This is used to: (1) check we're not already on `_agentrack`, (2) return to the original branch after any branch-switching operations.

### Error handling for git operations

All git command failures should be caught and wrapped in `AgentrackError` with the appropriate error code. Include the git stderr in the message for debugging:

```typescript
try {
  execFileSync('git', args, opts);
} catch (err: any) {
  throw new AgentrackError(
    'PUSH_FAILED',
    `git push failed: ${err.stderr || err.message}`,
    1
  );
}
```

## Out of scope

- **Migration tooling** — converting an existing non-worktree `.agentrack/` to a worktree. Manual migration instructions in the error message are sufficient for now.
- **`agt status`** — a command showing worktree sync state. Can be added later.
- **Branch name configuration** — `_agentrack` is hardcoded. Making it configurable adds complexity with minimal benefit.
- **Remote name configuration** — `origin` is assumed. Users with non-standard remote names can set it up manually.
- **Auto-commit on every `agt create`/`update`** — explicit `agt push` is the sync point. Automatic commits on every write would be noisy and potentially slow.
- **Merge conflict resolution** — conflicts on `agt pull` are surfaced as `PULL_FAILED` with git's error message. Manual resolution expected (append-only event log format minimizes conflicts).
- **Offline mode** — `agt init` and `agt push`/`agt pull` require remote connectivity. Local-only operation (no remote) is partially supported (branch created locally, sync commands fail gracefully).
