# agentrack

Issue tracker designed for AI agents — file-backed, event-sourced, git-friendly.

Every issue is an append-only event log stored as JSON. State is computed by replaying events, so the full history of every issue is always preserved. All data lives in a `.agentrack/` directory inside your project, making it easy to version-control alongside your code.

## Features

- **File-backed** — all state is JSON in `.agentrack/`, ready for `git add`
- **Event-sourced** — every change is an immutable event; full history is always available
- **CLI + Programmatic API** — use from the shell or import as a library, same JSON output
- **Issue hierarchy** — parent/child relationships with automatic status propagation
- **Blockage tracking** — dependency graph with cycle detection and auto-resolution
- **Comments** — add, update, delete per issue, computed from events
- **Auth modes** — `open`, `read-only`, or `strict` token-based authentication
- **Git worktree sync** — `.agentrack/` lives on a dedicated orphan branch, shared across all code branches via `agt push`/`agt pull`
- **Zero runtime deps** (besides `commander` for CLI parsing)

## Install

```bash
npm install agentrack
```

Requires Node.js >= 20 or Bun >= 1.0.

## Quick Start

### CLI

```bash
# Initialize a tracker in the current directory
npx agentrack init

# Create an issue
npx agentrack create "Fix login bug" --priority 2 --tags bug,auth

# List open issues
npx agentrack list

# Get the recommended next issue to work on for a user
npx agentrack next alice

# View an issue
npx agentrack view <issueId>

# Update an issue
npx agentrack update <issueId> --status in-progress --assignee alice

# List an issue's raw events (optionally filter by type)
npx agentrack events list <issueId>
npx agentrack events list <issueId> --type comment

# Record a custom event on an issue
npx agentrack events add <issueId> '{"type":"flag","content":{"reason":"blocked on QA"}}'

# Sync issue data to remote
npx agentrack push

# Sync issue data from remote
npx agentrack pull
```

### Comments

```bash
npx agentrack comments add <issueId> --content "Reproduced on staging"
npx agentrack comments list <issueId>
npx agentrack comments update <issueId> <commentId> --content "Updated note"
npx agentrack comments delete <issueId> <commentId>
```

### Blockages

```bash
# Mark issue A as blocked by issue B
npx agentrack blockages add <blockedId> --by <blockerId>

# View what blocks / is blocked by an issue
npx agentrack blockages list <issueId>

# Resolve a blockage (also happens automatically when blocker is done/closed)
npx agentrack blockages resolve <blockedId> --by <blockerId>

# Remove a blockage entirely
npx agentrack blockages delete <blockedId> --by <blockerId>
```

### Users & Auth

```bash
# Register a user and get a token
npx agentrack users register alice

# List registered users
npx agentrack users list

# Revoke a user
npx agentrack users revoke alice

# Regenerate token (self-service, requires your own token)
AGT_USER_TOKEN=tk_xxxxxxxx npx agentrack users regenerate alice
```

### Sync

```bash
# Commit and push local changes to the remote _agentrack branch
npx agentrack push

# Push with a custom commit message
npx agentrack push --message "reviewed all open issues"

# Pull latest changes from the remote _agentrack branch
npx agentrack pull
```

### Programmatic API

```typescript
import { Tracker } from "agentrack";

const tracker = new Tracker(); // resolves .agentrack/ from cwd

// Initialize
await tracker.init();

// Create an issue
const { id } = await tracker.create({
  title: "Fix login bug",
  priority: 2,
  tags: ["bug", "auth"],
});

// List issues
const issues = await tracker.list({ status: "open" });

// Get the recommended next issue to work on
const nextIssue = await tracker.next("alice");
// Returns the highest-priority, unblocked issue assigned to alice

// View an issue with full computed state
const issue = await tracker.view(id);

// Update an issue
await tracker.update(id, { status: "in-progress", assignee: "alice" });

// List an issue's raw events (optionally filtered by type)
const events = await tracker.eventsList(id);
const comments = await tracker.eventsList(id, { type: "comment" });

// Record a custom event (type must not collide with a reserved agentrack type)
await tracker.eventsAdd(id, {
  type: "flag",
  content: { reason: "needs review" },
});

// `tracker.history(id)` remains available as a deprecated alias of `eventsList`.
```

### Worktree Sync API

```typescript
import {
  initWorktree,
  pushWorktree,
  pullWorktree,
  isWorktreeInitialized,
} from "agentrack";

// Initialize git worktree (usually called by `agt init`)
const result = initWorktree(process.cwd());
// result: { scenario: "fresh" | "join" | "already_initialized", path: "/abs/path/to/.agentrack" }

// Stage, commit, and push changes to remote
const syncResult = pushWorktree(process.cwd());
// syncResult: { synced: true, commitCount: 1 } or { synced: false, message: "No changes to sync" }

// Pull latest from remote
const pullResult = pullWorktree(process.cwd());
// pullResult: { updated: true } or { updated: false }
```

## How It Works

Running `agt init` creates a `.agentrack/` directory in your project. The directory is mounted as a **git worktree** on a dedicated orphan branch (`_agentrack`), which means issue data is independent of your code branches — everyone sees the same issues regardless of whether they're on `main`, `feature-x`, or any other branch.

```
repo/
├── .git/                  # main repository
├── .gitignore             # contains "/.agentrack/"
├── src/                   # tracked on your code branch
└── .agentrack/            # git worktree → _agentrack branch
    ├── config.json        # Auth mode and defaults
    ├── index.json         # Sorted index of all issues (open + closed)
    ├── dependencies.json  # Blockage graph (blockedBy + blocks)
    ├── users.json         # Registered users and tokens
    └── issues/
        └── l0j3k2a9b7.json  # One file per issue — append-only event log
```

Use `agt push` to sync local changes to the remote and `agt pull` to fetch updates from collaborators.

Each issue file is an array of events:

```json
[
  { "type": "creation", "timestamp": "...", "author": "alice" },
  { "type": "update", "timestamp": "...", "author": "alice", "content": { "status": "in-progress" } },
  { "type": "comment", "timestamp": "...", "author": "bob", "content": { "id": "m4n5o6p7q8", "content": "Looking into it" } },
  { "type": "update", "timestamp": "...", "author": "alice", "content": { "status": "done" } }
]
```

The current state of an issue is always computed by replaying its event log. There is no mutable state — only events.

## Issue Status Flow

```
idea → todo → in-progress → done → closed
```

Hierarchical constraints are enforced:

- A `closed` parent cannot have new children added
- When a parent is closed, all `done` children are automatically closed (downward cascade)
- When all children of a parent are `done` or `closed`, the parent is auto-promoted to `done` (upward promotion)

Blockages are auto-resolved when the blocking issue moves to `done` or `closed`.

## Configuration

Auth mode is set in `.agentrack/config.json`:

| Mode | Behavior |
|------|----------|
| `open` | Writes use `defaultUser` if no token provided |
| `read-only` | Reads are open, writes require a token |
| `strict` | All operations require a token |

Default on `init` is `open` with `defaultUser: "anonymous"`.

## Developing agentrack

If you're contributing to agentrack itself, you can link the local build so the `agt` CLI points to your working copy:

```bash
# From the repo root
cd packages/library
npm link            # creates a global symlink to packages/library/dist/bin.js
cd ../..

# Verify it works
agt --version   # → 0.1.0

# Initialize dogfooding (issues tracked in this repo)
agt init

# After making code changes, rebuild to pick them up
cd packages/library && bun run build && cd ../..

# Create issues to track development work
agt create "Add feature X" --priority 2 --tags enhancement
```

The `.agentrack/` directory at the repo root is committed to git — issues live alongside the code they describe.

## License

[MIT](LICENSE)
