# Storing issues in git

Agentrack stores all tracker data in a `.agentrack/` directory that lives on its own git branch, separate from your code. This approach gives you the benefits of git-based storage (version history, distributed sync, no server) without the downsides (merge conflicts with code changes, cluttering your working tree).

## How it works

When you run `agt init`, agentrack:

1. Creates a git worktree -- a separate checkout of the repository at `.agentrack/` that points to an orphan branch called `_agentrack`.
2. Sets up the directory structure inside the worktree.
3. Adds `.agentrack/` to your main branch's `.gitignore` so it doesn't interfere with your code.

The `_agentrack` branch has no shared history with your code branches. It's a completely independent branch that only contains tracker data.

```
Your repo/
  main branch:        src/, package.json, .gitignore (includes .agentrack/)
  _agentrack branch:  .agentrack/ (index.json, config.json, issues/, etc.)
```

This means:
- **No merge conflicts** -- Issue files never conflict with code files because they live on different branches.
- **Branch-independent access** -- You can read and write issues from any code branch.
- **Standard git sync** -- Push and pull use regular git operations.

## Directory structure

The `.agentrack/` directory contains:

```
.agentrack/
  config.json          # Auth mode, default user
  index.json           # Issue index (open + closed arrays, childrenOf map)
  dependencies.json    # Blockage relationships (blockedBy + blocks maps)
  users.json           # Registered users and tokens
  issues/
    m1x2k9ab.json      # Event log for issue m1x2k9ab
    def456gh.json      # Event log for issue def456gh
    ...
```

### config.json

Global configuration, created by `agt init`:

```json
{
  "auth": {
    "mode": "read-only",
    "defaultUser": "anonymous"
  }
}
```

See [Authentication](./authentication.md) for auth mode details.

### index.json

The issue index with two sorted arrays and a hierarchy map:

```json
{
  "open": [
    { "id": "m1x2k9ab", "title": "Fix login bug", "status": "todo", "assignee": "alice", "parentId": null, "tags": ["bug"], "priority": 2 }
  ],
  "closed": [],
  "childrenOf": {}
}
```

The index enables fast lookups without reading individual issue files. See [The issue object](./issue-object.md) for field descriptions.

### dependencies.json

Bidirectional blockage map:

```json
{
  "blockedBy": {
    "feat1": [{ "blockerId": "infra1", "status": "active" }]
  },
  "blocks": {
    "infra1": [{ "blockedId": "feat1", "status": "active" }]
  }
}
```

See [Hierarchy and blockages](./hierarchy-and-blockages.md) for how blockages work.

### users.json

User registry with tokens:

```json
{
  "users": [
    { "name": "alice", "token": "tk_k7x2m9p4", "registeredAt": "2025-01-15T10:00:00.000Z" }
  ]
}
```

See [Authentication](./authentication.md) for user management.

### Issue files

Each issue is a JSON file containing an array of events:

```json
[
  { "timestamp": "2025-01-15T10:00:00.000Z", "type": "creation", "author": "alice" },
  { "timestamp": "2025-01-15T10:00:00.000Z", "type": "update", "author": "alice", "content": { "title": "Fix login bug", "status": "todo" } },
  { "timestamp": "2025-01-15T11:00:00.000Z", "type": "update", "author": "bob", "content": { "status": "in-progress" } }
]
```

See [The issue object](./issue-object.md) for the event sourcing model.

## Syncing with remote

Since issues live on a git branch, you use standard git operations to sync between machines and team members. Agentrack provides two commands for this.

### `agt push` -- Sync to remote

Stage all changes in `.agentrack/`, auto-commit, and push to the remote `_agentrack` branch:

```bash
agt push
# { "result": "OK", "synced": true, "commitCount": 1 }

agt push --message "Reviewed all open issues"
# { "result": "OK", "synced": true, "commitCount": 1 }
```

If there are no changes:

```bash
agt push
# { "result": "OK", "synced": false, "message": "No changes to sync" }
```

### `agt pull` -- Sync from remote

Pull the latest changes from the remote `_agentrack` branch:

```bash
agt pull
# { "result": "OK", "updated": true }

agt pull
# { "result": "OK", "updated": false }  # already up to date
```

In JavaScript:

```javascript
import { Tracker } from "agentrack";
const tracker = new Tracker();

// Push local changes to remote
const result = await tracker.pushWorktree(cwd);
// { synced: true, commitCount: 1 }

// Pull remote changes
const pullResult = await tracker.pullWorktree(cwd);
// { updated: true }
```

## Init scenarios

`agt init` handles two scenarios automatically:

### Fresh setup

When no `_agentrack` branch exists on the remote:

```bash
agt init
# Creates a new orphan branch, sets up the directory, pushes to remote
# { "result": "OK", "path": "/path/to/project" }
```

### Joining an existing setup

When the remote already has an `_agentrack` branch (e.g., a teammate already initialized the tracker):

```bash
agt init
# Fetches the existing branch, checks out the worktree
# { "result": "OK", "path": "/path/to/project" }
```

In both cases, the result is the same: a `.agentrack/` directory ready to use.

## Resolution order

Agentrack resolves the `.agentrack/` directory by walking up from the current working directory:

1. Check `cwd/.agentrack/` -- if it exists, use it.
2. Check `parent/.agentrack/` -- if it exists, use it.
3. Continue walking up until reaching the filesystem root.
4. If no `.agentrack/` is found, return a `NOT_INITIALIZED` error.

This means you can run `agt` commands from any subdirectory in your project. It also supports monorepos -- different subdirectories can have their own `.agentrack/` trackers.

## Team workflow example

Here's how a team of agents collaborates using git sync:

```bash
# Agent 1: Create issues and push
agt create "Implement user auth" --status todo --assignee coder
agt create "Write auth tests" --status todo --assignee tester
agt push

# Agent 2: Pull and start working
agt pull
agt update m1x2k9ab --status in-progress
agt push

# Agent 3: Pull and add comments
agt pull
agt comments add m1x2k9ab --content "Use JWT for session management"
agt push

# Agent 1: Pull to see updates
agt pull
agt list --status open
```

The worktree approach means agents can read and write concurrently without blocking each other, similar to how git handles concurrent edits on different branches.

## See also

- [Getting started](./getting-started.md) -- Running `agt init` and your first session
- [The issue object](./issue-object.md) -- What's stored in issue files
- [Hierarchy and blockages](./hierarchy-and-blockages.md) -- What's in `dependencies.json`
- [CLI reference](./cli-reference.md) -- `agt init`, `agt push`, `agt pull` commands
- [JavaScript reference](./javascript-reference.md) -- Worktree functions and the Tracker class
