# CLI reference

All agentrack CLI commands follow the format `agt <subcommand> [arguments] [flags]`. Commands output JSON to stdout. Errors output JSON to stderr with a non-zero exit code.

## Table of contents

- [init](#agt-init)
- [create](#agt-create)
- [update](#agt-update)
- [list](#agt-list)
- [view](#agt-view)
- [history](#agt-history)
- [next](#agt-next)
- [comments add](#agt-comments-add)
- [comments update](#agt-comments-update)
- [comments delete](#agt-comments-delete)
- [comments list](#agt-comments-list)
- [blockages add](#agt-blockages-add)
- [blockages resolve](#agt-blockages-resolve)
- [blockages delete](#agt-blockages-delete)
- [blockages list](#agt-blockages-list)
- [users register](#agt-users-register)
- [users list](#agt-users-list)
- [users revoke](#agt-users-revoke)
- [users regenerate](#agt-users-regenerate)
- [mentions list](#agt-mentions-list)
- [mentions view](#agt-mentions-view)
- [mentions read](#agt-mentions-read)
- [mentions unread](#agt-mentions-unread)
- [mentions rebuild](#agt-mentions-rebuild)
- [push](#agt-push)
- [pull](#agt-pull)
- [Error codes](#error-codes)

---

## `agt init`

Initialize the agentrack tracker in the current directory. Creates the `.agentrack/` directory on the `_agentrack` orphan branch.

```bash
agt init [--branch <name>]
```

**Flags:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--branch` | string | `"_agentrack"` | Custom branch name. See [Branch names](#branch-names) below. |

**Examples:**

```bash
# Default init (branch: _agentrack, directory: .agentrack/)
agt init

# Custom branch (branch: _testing, directory: .testing/)
agt init --branch testing

# Leading underscores are stripped automatically — same result as above
agt init --branch _testing
```

**Output:**

```json
{ "result": "OK", "scenario": "fresh", "path": "/path/to/project" }
```

If already initialized:

```json
{ "result": "ALREADY_INITIALIZED", "path": "/path/to/project/.testing" }
```

### Branch names

The `--branch` flag lets you run multiple independent tracker instances in the same repository, each on its own branch. The name is normalized as follows:

1. Leading underscores are stripped.
2. The name is validated -- only letters, digits, dots, underscores, and hyphens are allowed. Slashes and spaces are rejected.
3. The branch name is prefixed with `_` and the directory name with `.`.

| `--branch` value | Git branch | Directory | Pointer file |
|------------------|------------|-----------|-------------|
| *(not specified)* | `_agentrack` | `.agentrack/` | No |
| `testing` | `_testing` | `.testing/` | Yes (`.agentrack.json`) |
| `_testing` | `_testing` | `.testing/` | Yes (`.agentrack.json`) |
| `ci-results` | `_ci-results` | `.ci-results/` | Yes (`.agentrack.json`) |

When a non-default branch is used, agentrack writes a `.agentrack.json` file at the repository root so it can discover the correct worktree directory. See [Storing issues in git](./storing-issues-in-git.md) for details.

**Notes:**
- Must be run inside a git repository.
- Idempotent -- running it again with the same branch won't overwrite existing data.
- Handles two scenarios: creates a new orphan branch (fresh) or fetches an existing one (join). See [Storing issues in git](./storing-issues-in-git.md).
- Backward compatible -- repos initialized without `--branch` continue to work as before.

---

## `agt create`

Create a new issue.

```bash
agt create <title> [flags]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `title` | Yes | Short title for the issue |

**Flags:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--description` | string | `""` | Detailed description |
| `--assignee` | string | `null` | User assigned to the issue |
| `--tags` | string | `""` | Comma-separated tags |
| `--status` | string | `"idea"` | Initial status: `idea`, `todo`, `in-progress`, `done`, `closed` |
| `--priority` | number | `3` | Priority 1 (critical) to 5 (trivial) |
| `--parentId` | string | `null` | Parent issue ID for hierarchy |
| `--path` | string | auto | Custom file path for the issue (relative to tracker dir) |

**Example:**

```bash
agt create "Fix login bug" \
  --description "SSO login returns 500 error" \
  --assignee alice \
  --tags "bug,auth" \
  --status todo \
  --priority 2
```

**Output:**

```json
{ "id": "m1x2k9ab" }
```

---

## `agt update`

Update an existing issue. At least one flag must be provided.

```bash
agt update <issue-id> [flags]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `issue-id` | Yes | The ID of the issue to update |

**Flags:**

| Flag | Type | Description |
|------|------|-------------|
| `--title` | string | New title |
| `--description` | string | New description |
| `--status` | string | New status: `idea`, `todo`, `in-progress`, `done`, `closed` |
| `--assignee` | string | New assignee (use `null` to clear) |
| `--tags` | string | New comma-separated tags (replaces existing) |
| `--priority` | number | New priority 1-5 |
| `--parentId` | string | New parent ID (use `null` to detach) |

**Example:**

```bash
agt update m1x2k9ab --status in-progress --assignee bob
```

**Output:**

```json
{ "result": "OK" }
```

**Notes:**
- Updating status triggers hierarchy constraints. See [Hierarchy and blockages](./hierarchy-and-blockages.md).
- Setting status to `done` or `closed` auto-resolves any active blockages where this issue is the blocker.

---

## `agt list`

List issues with optional filters. Returns items from the index (fast, doesn't read individual issue files).

```bash
agt list [flags]
```

**Flags:**

| Flag | Type | Description |
|------|------|-------------|
| `--status` | string | Filter by status. Use `"open"` for all non-closed issues. |
| `--assignee` | string | Filter by assignee |
| `--tags` | string | Filter by tags (AND match -- issue must have all specified tags) |
| `--parentId` | string | Filter by parent ID. Use `null` for top-level issues. |

**Example:**

```bash
agt list --status open --assignee alice
```

**Output:**

```json
[
  {
    "id": "m1x2k9ab",
    "title": "Fix login bug",
    "status": "in-progress",
    "assignee": "alice",
    "tags": ["bug", "auth"],
    "parentId": null,
    "priority": 2
  }
]
```

**Notes:**
- Results are sorted by priority ascending, impact score descending, then `createdAt` ascending.
- The `path` field is intentionally excluded. Use `view` to get full issue details.

---

## `agt view`

Show the computed state of an issue by replaying its event log.

```bash
agt view <issue-id>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `issue-id` | Yes | The ID of the issue to view |

**Example:**

```bash
agt view m1x2k9ab
```

**Output:**

```json
{
  "id": "m1x2k9ab",
  "title": "Fix login bug",
  "description": "SSO login returns 500 error",
  "status": "in-progress",
  "assignee": "alice",
  "tags": ["bug", "auth"],
  "parentId": null,
  "priority": 2,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "createdBy": "alice",
  "updatedAt": "2025-01-15T11:00:00.000Z"
}
```

---

## `agt history`

Show the raw event log for an issue.

```bash
agt history <issue-id>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `issue-id` | Yes | The ID of the issue |

**Example:**

```bash
agt history m1x2k9ab
```

**Output:**

```json
[
  { "timestamp": "2025-01-15T10:00:00.000Z", "type": "creation", "author": "alice" },
  {
    "timestamp": "2025-01-15T10:00:00.000Z",
    "type": "update",
    "author": "alice",
    "content": {
      "title": "Fix login bug",
      "description": "SSO login returns 500 error",
      "status": "todo",
      "assignee": "alice",
      "tags": ["bug", "auth"],
      "priority": 2
    }
  },
  {
    "timestamp": "2025-01-15T11:00:00.000Z",
    "type": "update",
    "author": "alice",
    "content": { "status": "in-progress" }
  }
]
```

See [The issue object](./issue-object.md) for the event sourcing model.

---

## `agt next`

Recommend the next issue for a given user. Returns the highest-priority, unblocked issue assigned to that user, sorted by impact score and creation date.

```bash
agt next <user>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `user` | Yes | The assignee name to find the next issue for |

**Example:**

```bash
agt next alice
```

**Output:**

```json
{
  "id": "m1x2k9ab",
  "title": "Fix login bug",
  "description": "SSO login returns 500 error",
  "status": "todo",
  "assignee": "alice",
  "tags": ["bug", "auth"],
  "parentId": null,
  "priority": 2,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "createdBy": "alice",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

If no issues are available:

```json
{ "result": "NO_ISSUES_AVAILABLE", "message": "No unblocked issues found for alice" }
```

---

## `agt comments add`

Add a comment to an issue.

```bash
agt comments add <issue-id> --content <text>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `issue-id` | Yes | The ID of the issue |
| `--content` | Yes | The comment text |

**Example:**

```bash
agt comments add m1x2k9ab --content "Found the root cause: expired SSO certificate"
```

**Output:**

```json
{ "result": "OK", "commentId": "c1a2b3d4" }
```

---

## `agt comments update`

Edit an existing comment. The original comment event is preserved; a new `comment-update` event is appended.

```bash
agt comments update <issue-id> <comment-id> --content <text>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `issue-id` | Yes | The ID of the issue |
| `comment-id` | Yes | The ID of the comment to update |
| `--content` | Yes | The new comment text |

**Example:**

```bash
agt comments update m1x2k9ab c1a2b3d4 --content "Root cause was expired SSO certificate, now renewed"
```

**Output:**

```json
{ "result": "OK" }
```

---

## `agt comments delete`

Delete a comment. The original event is preserved; a `comment-delete` event is appended. Deleted comments are excluded from `comments list` output.

```bash
agt comments delete <issue-id> <comment-id>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `issue-id` | Yes | The ID of the issue |
| `comment-id` | Yes | The ID of the comment to delete |

**Example:**

```bash
agt comments delete m1x2k9ab c1a2b3d4
```

**Output:**

```json
{ "result": "OK" }
```

---

## `agt comments list`

List all active (non-deleted) comments for an issue, with edits applied.

```bash
agt comments list <issue-id>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `issue-id` | Yes | The ID of the issue |

**Example:**

```bash
agt comments list m1x2k9ab
```

**Output:**

```json
[
  {
    "id": "c1a2b3d4",
    "author": "alice",
    "content": "Root cause was expired SSO certificate, now renewed",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "editedAt": "2025-01-15T10:35:00.000Z"
  },
  {
    "id": "e5f6g7h8",
    "author": "bob",
    "content": "Verified fix in staging",
    "timestamp": "2025-01-15T11:00:00.000Z"
  }
]
```

---

## `agt blockages add`

Block an issue by one or more other issues. Multiple blockers can be specified for atomic dependency creation.

```bash
agt blockages add <blocked-id> --by <blocker-id> [<blocker-id> ...]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `blocked-id` | Yes | The ID of the issue to block |
| `--by` | Yes | One or more blocker IDs |

**Example:**

```bash
# Single blocker
agt blockages add feature-x --by infra-setup

# Multiple blockers (atomic -- all or nothing)
agt blockages add feature-x --by infra-setup db-migration config-update
```

**Output:**

```json
{ "result": "OK" }
```

**Notes:**
- Cycle detection runs for each blocker. If any would create a cycle, the entire batch is rejected.
- Only active blockages participate in cycle detection.

---

## `agt blockages resolve`

Mark one or more blockages as resolved. The entries remain in the index for historical visibility.

```bash
agt blockages resolve <blocked-id> --by <blocker-id> [<blocker-id> ...]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `blocked-id` | Yes | The ID of the blocked issue |
| `--by` | Yes | One or more blocker IDs to resolve |

**Example:**

```bash
agt blockages resolve feature-x --by infra-setup
```

**Output:**

```json
{ "result": "OK" }
```

---

## `agt blockages delete`

Remove one or more blockages entirely from the dependency index. Use when a blockage was added by mistake.

```bash
agt blockages delete <blocked-id> --by <blocker-id> [<blocker-id> ...]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `blocked-id` | Yes | The ID of the blocked issue |
| `--by` | Yes | One or more blocker IDs to delete |

**Example:**

```bash
agt blockages delete feature-x --by wrong-id
```

**Output:**

```json
{ "result": "OK" }
```

**Notes:**
- Unlike resolve, delete removes the entry entirely from the index.
- A `blockage-deleted` event is still appended to the blocked issue for auditability.

---

## `agt blockages list`

List all blockages for an issue -- both what blocks it and what it blocks.

```bash
agt blockages list <issue-id>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `issue-id` | Yes | The ID of the issue |

**Example:**

```bash
agt blockages list feature-x
```

**Output:**

```json
{
  "issueId": "feature-x",
  "blockedBy": [
    { "blockerId": "infra-setup", "status": "active" },
    { "blockerId": "db-migration", "status": "resolved" }
  ],
  "blocks": [
    { "blockedId": "feature-y", "status": "active" }
  ]
}
```

---

## `agt users register`

Register a new user and receive an authentication token.

```bash
agt users register <name>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Unique user name (case-insensitive, stored lowercase) |

**Example:**

```bash
agt users register alice
```

**Output:**

```json
{ "result": "OK", "name": "alice", "token": "tk_k7x2m9p4" }
```

**Notes:**
- No token is required to run this command (it's how you obtain a token).
- The name `anonymous` is reserved.
- Save the returned token -- it won't be shown again.

---

## `agt users list`

List all registered users. Tokens are not included.

```bash
agt users list
```

**Output:**

```json
[
  { "name": "alice", "registeredAt": "2025-01-15T10:00:00.000Z" },
  { "name": "bob", "registeredAt": "2025-01-16T14:30:00.000Z" }
]
```

---

## `agt users revoke`

Revoke a user's token, removing their ability to authenticate.

```bash
agt users revoke <name>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | The user name to revoke |

**Example:**

```bash
export AGT_USER_TOKEN=tk_k7x2m9p4
agt users revoke bob
```

**Output:**

```json
{ "result": "OK" }
```

**Notes:**
- Requires a valid token via `AGT_USER_TOKEN`.

---

## `agt users regenerate`

Generate a new token for an existing user, invalidating the old one.

```bash
agt users regenerate <name>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | The user name to regenerate a token for |

**Example:**

```bash
export AGT_USER_TOKEN=tk_k7x2m9p4
agt users regenerate alice
```

**Output:**

```json
{ "result": "OK", "name": "alice", "token": "tk_r5t1y8u2" }
```

**Notes:**
- The `AGT_USER_TOKEN` must contain the user's current token (self-service only).

---

## `agt mentions list`

List mentions for a given user. By default, returns only unread mentions sorted by `createdAt` descending (newest first).

```bash
agt mentions list <agent-name> [--include-reads]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `agent-name` | Yes | The registered user whose mentions to list |

**Flags:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--include-reads` | boolean | `false` | Include read mentions alongside unread |

**Examples:**

```bash
# List unread mentions for alice
agt mentions list alice

# List all mentions (read and unread)
agt mentions list alice --include-reads
```

**Output:**

```json
[
  {
    "id": "mn3k8x2a",
    "mentionedBy": "bob",
    "issueId": "m1x2k9ab",
    "commentId": "c1a2b3d4",
    "createdAt": "2025-01-15T12:00:00.000Z",
    "isRead": false
  }
]
```

**Notes:**
- The user must be registered. Returns `USER_NOT_FOUND` otherwise.
- Mentions are created automatically when a comment contains `@username` for a registered user.
- The mention object does not include an issue title. Use `mentions view` for full context.

---

## `agt mentions view`

View a single mention with full context — includes the mention entry, the comment content, and the issue title.

```bash
agt mentions view <mention-id>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `mention-id` | Yes | The ID of the mention to view |

**Example:**

```bash
agt mentions view mn3k8x2a
```

**Output:**

```json
{
  "mention": {
    "id": "mn3k8x2a",
    "createdAt": "2025-01-15T12:00:00.000Z",
    "mentionedUser": "alice",
    "mentionedBy": "bob",
    "issueId": "m1x2k9ab",
    "commentId": "c1a2b3d4",
    "isRead": false
  },
  "comment": {
    "id": "c1a2b3d4",
    "author": "bob",
    "content": "@alice can you review the auth module?",
    "timestamp": "2025-01-15T12:00:00.000Z"
  },
  "issue": {
    "id": "m1x2k9ab",
    "title": "Fix login bug"
  }
}
```

**Notes:**
- Returns `MENTION_NOT_FOUND` if the mention ID doesn't exist.
- Returns `COMMENT_NOT_FOUND` if the source comment was deleted.

---

## `agt mentions read`

Mark a mention as read. Only the mentioned user can perform this action.

```bash
agt mentions read <mention-id>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `mention-id` | Yes | The ID of the mention to mark as read |

**Example:**

```bash
agt mentions read mn3k8x2a
```

**Output:**

```json
{ "result": "OK" }
```

**Notes:**
- Requires authentication. The authenticated user must be the mentioned user.
- Returns `MENTION_NOT_FOUND` if the mention ID doesn't exist.
- Returns `MENTION_ACCESS_DENIED` if the authenticated user is not the mentioned user.

---

## `agt mentions unread`

Mark a mention as unread. Only the mentioned user can perform this action.

```bash
agt mentions unread <mention-id>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `mention-id` | Yes | The ID of the mention to mark as unread |

**Example:**

```bash
agt mentions unread mn3k8x2a
```

**Output:**

```json
{ "result": "OK" }
```

**Notes:**
- Requires authentication. The authenticated user must be the mentioned user.
- Returns `MENTION_NOT_FOUND` if the mention ID doesn't exist.
- Returns `MENTION_ACCESS_DENIED` if the authenticated user is not the mentioned user.

---

## `agt mentions rebuild`

Rebuild the entire mentions index from scratch by scanning all issue event files and re-extracting mentions from all non-deleted comments. Useful for fixing index corruption.

```bash
agt mentions rebuild
```

**Example:**

```bash
agt mentions rebuild
```

**Output:**

```json
{ "result": "OK", "mentionCount": 42 }
```

**Notes:**
- No authentication required (system operation).
- Clears the existing index and rebuilds from scratch.

---

## `agt push`

Stage all changes in `.agentrack/`, auto-commit, and push to the remote `_agentrack` branch.

```bash
agt push [--message <text>]
```

**Flags:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--message` | string | `"sync: <ISO-8601>"` | Override the auto-generated commit message |

**Example:**

```bash
agt push
# { "result": "OK", "synced": true, "commitCount": 1 }

agt push --message "Reviewed all open issues"
# { "result": "OK", "synced": true, "commitCount": 1 }

agt push
# { "result": "OK", "synced": false, "message": "No changes to sync" }
```

**Notes:**
- Requires `agt init` to have been run first.
- No authentication required -- operates on git directly.

---

## `agt pull`

Pull the latest changes from the remote `_agentrack` branch.

```bash
agt pull
```

**Output:**

```json
{ "result": "OK", "updated": true }
```

Or if already up to date:

```json
{ "result": "OK", "updated": false }
```

**Notes:**
- Requires `agt init` to have been run first.
- No authentication required -- operates on git directly.

---

## Error codes

### Global errors

| Code | Meaning |
|------|---------|
| `NOT_INITIALIZED` | No `.agentrack/` directory found. Run `agt init`. |
| `NOT_A_GIT_REPO` | Current directory is not inside a git repository. |
| `MIGRATION_REQUIRED` | `.agentrack/` exists but is not a git worktree. Remove it and re-run `agt init`. |
| `INVALID_STATE` | Invalid state for the operation (e.g., currently on the `_agentrack` branch). |
| `INVALID_BRANCH_NAME` | The `--branch` value is empty, contains slashes, or has invalid characters. |
| `PUSH_FAILED` | `agt push` failed. Error message includes git output. |
| `PULL_FAILED` | `agt pull` failed. Error message includes git output. |
| `TOKEN_REQUIRED` | A token is required by the current auth mode but none was provided. |
| `INVALID_TOKEN` | The provided token doesn't match any registered user. |
| `DEFAULT_USER_MISSING` | Auth mode is `open` but no `defaultUser` is configured. |

### Issue errors

| Code | Meaning |
|------|---------|
| `NOT_FOUND` | Issue with the given ID does not exist. |
| `ISSUE_MISSING` | Issue file is missing (deleted manually). Inconsistent state. |

### Comment errors

| Code | Meaning |
|------|---------|
| `COMMENT_NOT_FOUND` | Comment with the given ID doesn't exist or was already deleted. |

### User errors

| Code | Meaning |
|------|---------|
| `USER_ALREADY_EXISTS` | A user with that name is already registered. |
| `USER_NOT_FOUND` | No user with that name exists. |

### Mention errors

| Code | Meaning |
|------|---------|
| `MENTION_NOT_FOUND` | Mention with the given ID doesn't exist. |
| `MENTION_ACCESS_DENIED` | Authenticated user is not the mentioned user (for read/unread). |

## See also

- [Getting started](./getting-started.md) -- First session walkthrough
- [Authentication](./authentication.md) -- Token setup and auth modes
- [The issue object](./issue-object.md) -- Issue properties and status lifecycle
- [Hierarchy and blockages](./hierarchy-and-blockages.md) -- Dependency management
- [JavaScript reference](./javascript-reference.md) -- Programmatic API
