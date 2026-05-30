# JavaScript reference

Agentrack provides a programmatic JavaScript/TypeScript API via the `Tracker` class and a set of standalone worktree functions. This page documents every public export from the `agentrack` package.

## Installation

```bash
npm install agentrack
```

```javascript
import { Tracker } from "agentrack";
```

## Tracker class

The `Tracker` class is the primary interface for interacting with agentrack programmatically.

### Constructor

```javascript
new Tracker(cwd?: string)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cwd` | string | `process.cwd()` | Base directory for resolving `.agentrack/` |

The constructor does not perform any I/O. It stores the `cwd` and resolves `.agentrack/` by walking up from that directory when methods are called.

```javascript
const tracker = new Tracker(); // uses process.cwd()
const tracker = new Tracker("/path/to/project"); // explicit path
```

### Setup

#### `init()`

Initialize the agentrack tracker in the resolved directory.

```javascript
const result = await tracker.init();
```

**Return type:** `InitResult`

```typescript
type InitResult =
  | { result: "OK"; path: string }
  | { result: "ALREADY_INITIALIZED"; path: string }
```

**Example:**

```javascript
const { result, path } = await tracker.init();
if (result === "OK") {
  console.log("Initialized at", path);
}
```

### Issues

#### `create(params)`

Create a new issue.

```javascript
const { id } = await tracker.create({
  title: "Fix login bug",
  description: "SSO login returns 500 error",
  assignee: "alice",
  tags: ["bug", "auth"],
  status: "todo",
  priority: 2,
  parentId: null,
});
```

**Parameters:** `CreateParams`

| Field | Type | Default | Required | Description |
|-------|------|---------|----------|-------------|
| `title` | string | -- | Yes | Issue title |
| `description` | string | `""` | No | Detailed description |
| `assignee` | string | `null` | No | Assigned user |
| `tags` | string[] | `[]` | No | Tags for categorization |
| `status` | IssueStatus | `"idea"` | No | Initial status |
| `priority` | 1 \| 2 \| 3 \| 4 \| 5 | `3` | No | Urgency level |
| `parentId` | string \| null | `null` | No | Parent issue ID |
| `path` | string | auto | No | Custom file path (relative to tracker dir) |
| `author` | string | resolved | No | Override author |

**Return type:** `CreateResult`

```typescript
type CreateResult = { id: IssueId } | AgentrackError;
```

#### `update(id, params)`

Update an existing issue. At least one field must be provided.

```javascript
await tracker.update("m1x2k9ab", {
  status: "in-progress",
  assignee: "bob",
});
```

**Parameters:** `id: IssueId`, `params: UpdateParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | New title |
| `description` | string | No | New description |
| `status` | IssueStatus | No | New status |
| `assignee` | string \| null | No | New assignee (`null` to clear) |
| `tags` | string[] | No | New tags (replaces existing) |
| `priority` | 1 \| 2 \| 3 \| 4 \| 5 | No | New priority |
| `parentId` | string \| null | No | New parent (`null` to detach) |
| `author` | string | No | Override author |

**Return type:** `UpdateResult`

```typescript
type UpdateResult = { result: "OK" } | AgentrackError;
```

#### `list(params?)`

List issues with optional filters. Returns items from the index (fast lookup).

```javascript
const issues = await tracker.list({
  status: "open",
  assignee: "alice",
  tags: ["bug"],
});
```

**Parameters:** `params?: ListParams`

| Field | Type | Description |
|-------|------|-------------|
| `status` | IssueStatus \| `"open"` | Filter by status. `"open"` = all except closed. |
| `assignee` | string | Filter by assignee |
| `tags` | string[] | AND filter -- issue must have ALL tags |
| `parentId` | string \| null | Filter by parent. `null` = top-level only. |

**Return type:** `ListResult` -- an array of `IndexEntry` objects:

```typescript
interface IndexEntry {
  id: IssueId;
  title: string;
  status: IssueStatus;
  assignee: string | null;
  parentId: IssueId | null;
  tags: string[];
  priority: 1 | 2 | 3 | 4 | 5;
}
```

Results are sorted by priority ascending, impact score descending, then `createdAt` ascending.

#### `view(id)`

View the computed state of an issue by replaying its event log.

```javascript
const issue = await tracker.view("m1x2k9ab");
```

**Parameters:** `id: IssueId`

**Return type:** `ViewResult`

```typescript
type ViewResult = ComputedIssue | AgentrackError;

interface ComputedIssue {
  id: IssueId;
  title: string;
  description: string;
  status: IssueStatus;
  assignee: string | null;
  parentId: IssueId | null;
  tags: string[];
  priority: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}
```

#### `history(id)`

Retrieve the raw event log for an issue.

```javascript
const events = await tracker.history("m1x2k9ab");
```

**Parameters:** `id: IssueId`

**Return type:** `HistoryResult`

```typescript
type HistoryResult = Event[] | AgentrackError;
```

Each event has:

```typescript
interface Event {
  timestamp: string;   // ISO 8601
  type: string;        // "creation", "update", "comment", etc.
  author: string;
  content?: any;       // Varies by event type
}
```

#### `next(assignee)`

Get the recommended next issue for a given user. Returns the highest-priority, unblocked issue assigned to that user.

```javascript
const nextIssue = await tracker.next("alice");
```

**Parameters:** `assignee: string`

**Return type:** `NextResult`

```typescript
type NextResult = ComputedIssue | { result: "NO_ISSUES_AVAILABLE"; message: string };
```

#### `issueDelete(id, params?)`

Delete an issue and all its descendants. This is a hard delete — event files are removed from disk and the index is cleaned up.

```javascript
const { deletedIds } = await tracker.issueDelete("m1x2k9ab");
console.log(`Deleted ${deletedIds.length} issue(s)`);
```

**Parameters:** `id: IssueId`, `params?: IssueDeleteParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `author` | string | No | Override author |

**Return type:** `IssueDeleteResult`

```typescript
type IssueDeleteResult =
  | { result: "OK"; deletedIds: IssueId[] }
  | AgentrackError;
```

**Notes:**
- Hard delete — the event file is removed from disk, not just marked deleted.
- Cascades to all descendants depth-first, leaves-first. All children and their children are deleted before the target issue.
- `deletedIds` contains descendant IDs first, then the target ID last.
- Cleans up blockages, mentions, and parent-child references for all deleted issues.
- Throws `NOT_FOUND` if the issue ID doesn't exist in the index.
- Throws `NOT_INITIALIZED` if the tracker has not been initialized.
- Requires write authentication.

### Comments

#### `commentsAdd(id, params)`

Add a comment to an issue.

```javascript
const { commentId } = await tracker.commentsAdd("m1x2k9ab", {
  content: "Found the root cause: expired SSO certificate",
});
```

**Parameters:** `id: IssueId`, `params: CommentAddParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Comment text |
| `author` | string | No | Override author |

**Return type:** `CommentAddResult`

```typescript
type CommentAddResult = { result: "OK"; commentId: CommentId } | AgentrackError;
```

#### `commentsUpdate(id, commentId, params)`

Edit an existing comment. Appends a `comment-update` event.

```javascript
await tracker.commentsUpdate("m1x2k9ab", "c1a2b3d4", {
  content: "Updated: the root cause was a configuration error",
});
```

**Parameters:** `id: IssueId`, `commentId: CommentId`, `params: CommentUpdateParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | New comment text |
| `author` | string | No | Override author |

**Return type:** `CommentUpdateResult`

```typescript
type CommentUpdateResult = { result: "OK" } | AgentrackError;
```

#### `commentsDelete(id, commentId, params?)`

Delete a comment. Appends a `comment-delete` event. The comment is excluded from future list output.

```javascript
await tracker.commentsDelete("m1x2k9ab", "c1a2b3d4");
```

**Parameters:** `id: IssueId`, `commentId: CommentId`, `params?: CommentDeleteParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `author` | string | No | Override author |

**Return type:** `CommentDeleteResult`

```typescript
type CommentDeleteResult = { result: "OK" } | AgentrackError;
```

#### `commentsList(id)`

List all active (non-deleted) comments for an issue, with edits applied.

```javascript
const comments = await tracker.commentsList("m1x2k9ab");
```

**Parameters:** `id: IssueId`

**Return type:** `CommentsListResult`

```typescript
type CommentsListResult = ComputedComment[] | AgentrackError;

interface ComputedComment {
  id: CommentId;
  author: string;
  content: string;
  timestamp: string;     // ISO 8601
  editedAt: string | null; // ISO 8601, or null if never edited
}
```

### Blockages

#### `blockagesAdd(blockedId, params)`

Block an issue by one or more other issues. The operation is atomic -- if cycle detection fails for any blocker, no changes are written.

```javascript
await tracker.blockagesAdd("feature-x", {
  blockerIds: ["infra-setup", "db-migration"],
});
```

**Parameters:** `blockedId: IssueId`, `params: BlockagesAddParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `blockerIds` | IssueId[] | Yes | IDs of the blocking issues |
| `author` | string | No | Override author |

**Return type:** `BlockagesAddResult`

```typescript
type BlockagesAddResult = { result: "OK" } | AgentrackError;
```

#### `blockagesResolve(blockedId, params)`

Mark one or more blockages as resolved. Entries remain in the index for historical visibility.

```javascript
await tracker.blockagesResolve("feature-x", {
  blockerIds: ["infra-setup"],
});
```

**Parameters:** `blockedId: IssueId`, `params: BlockagesResolveParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `blockerIds` | IssueId[] | Yes | IDs of the blockers to resolve |
| `author` | string | No | Override author |

**Return type:** `BlockagesResolveResult`

```typescript
type BlockagesResolveResult = { result: "OK" } | AgentrackError;
```

#### `blockagesDelete(blockedId, params)`

Remove blockages entirely from the dependency index. A `blockage-deleted` event is still appended for auditability.

```javascript
await tracker.blockagesDelete("feature-x", {
  blockerIds: ["wrong-id"],
});
```

**Parameters:** `blockedId: IssueId`, `params: BlockagesDeleteParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `blockerIds` | IssueId[] | Yes | IDs of the blockers to delete |
| `author` | string | No | Override author |

**Return type:** `BlockagesDeleteResult`

```typescript
type BlockagesDeleteResult = { result: "OK" } | AgentrackError;
```

#### `blockagesList(id)`

List all blockages for an issue -- both what blocks it and what it blocks.

```javascript
const info = await tracker.blockagesList("feature-x");
console.log(info.blockedBy); // what blocks this issue
console.log(info.blocks);    // what this issue blocks
```

**Parameters:** `id: IssueId`

**Return type:** `BlockagesListResult`

```typescript
type BlockagesListResult = BlockageInfo | AgentrackError;

interface BlockageInfo {
  issueId: IssueId;
  blockedBy: Array<{ blockerId: IssueId; status: "active" | "resolved" }>;
  blocks: Array<{ blockedId: IssueId; status: "active" | "resolved" }>;
}
```

### Users

#### `usersRegister(name)`

Register a new user and receive a token.

```javascript
const { name, token } = await tracker.usersRegister("alice");
console.log(`Token for ${name}: ${token}`);
```

**Parameters:** `name: string`

**Return type:** `UsersRegisterResult`

```typescript
type UsersRegisterResult =
  | { result: "OK"; name: string; token: string }
  | { result: "USER_ALREADY_EXISTS"; message: string }
```

#### `usersList()`

List all registered users. Tokens are never included.

```javascript
const users = await tracker.usersList();
```

**Return type:** `UsersListResult`

```typescript
type UsersListResult = UserInfo[];

interface UserInfo {
  name: string;
  registeredAt: string; // ISO 8601
}
```

#### `usersRevoke(name)`

Revoke a user's token, removing their ability to authenticate.

```javascript
await tracker.usersRevoke("bob");
```

**Parameters:** `name: string`

**Return type:** `UsersRevokeResult`

```typescript
type UsersRevokeResult =
  | { result: "OK" }
  | { result: "USER_NOT_FOUND"; message: string }
```

#### `usersRegenerate(name)`

Generate a new token for an existing user. The old token is invalidated.

```javascript
const { token } = await tracker.usersRegenerate("alice");
```

**Parameters:** `name: string`

**Return type:** `UsersRegenerateResult`

```typescript
type UsersRegenerateResult =
  | { result: "OK"; name: string; token: string }
  | { result: "USER_NOT_FOUND"; message: string }
  | { result: "INVALID_TOKEN"; message: string }
```

### Mentions

When a comment contains `@username` for a registered user, a mention is automatically created. Mentions are stored in `mentions.json` keyed by the mentioned user, and each mention tracks read/unread status.

#### `mentionsList(userName, options?)`

List mentions for a given user. Returns mentions sorted by `createdAt` descending (newest first).

```javascript
const mentions = await tracker.mentionsList("alice");
// Only unread mentions by default

const allMentions = await tracker.mentionsList("alice", {
  includeReads: true,
});
```

**Parameters:** `userName: string`, `options?: { includeReads?: boolean }`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `includeReads` | boolean | `false` | Include read mentions alongside unread |

**Return type:** `MentionsListResult`

```typescript
type MentionsListResult = MentionResult[] | AgentrackError;

interface MentionResult {
  id: string;
  mentionedBy: string;
  issueId: string;
  commentId: string;
  createdAt: string;  // ISO 8601
  isRead: boolean;
}
```

#### `mentionsView(mentionId)`

View a single mention with full context -- includes the mention entry, the comment content, and the issue title.

```javascript
const view = await tracker.mentionsView("mn3k8x2a");
console.log(view.comment.content);  // The comment that triggered the mention
console.log(view.issue.title);      // The issue where the comment was posted
```

**Parameters:** `mentionId: string`

**Return type:** `MentionsViewResult`

```typescript
type MentionsViewResult = MentionViewResult | AgentrackError;

interface MentionViewResult {
  mention: MentionEntry;
  comment: {
    id: string;
    author: string;
    content: string;
    timestamp: string;    // ISO 8601
    editedAt?: string;    // ISO 8601
  };
  issue: {
    id: string;
    title: string;
  };
}
```

#### `mentionsRead(mentionId)`

Mark a mention as read. Only the mentioned user can perform this action -- the authenticated user must match the mentioned user.

```javascript
await tracker.mentionsRead("mn3k8x2a");
```

**Parameters:** `mentionId: string`

**Return type:** `MentionsReadResult`

```typescript
type MentionsReadResult = { result: "OK" } | AgentrackError;
```

**Notes:**
- Requires authentication. Returns `MENTION_ACCESS_DENIED` if the authenticated user is not the mentioned user.

#### `mentionsUnread(mentionId)`

Mark a mention as unread. Only the mentioned user can perform this action.

```javascript
await tracker.mentionsUnread("mn3k8x2a");
```

**Parameters:** `mentionId: string`

**Return type:** `MentionsUnreadResult`

```typescript
type MentionsUnreadResult = { result: "OK" } | AgentrackError;
```

**Notes:**
- Requires authentication. Returns `MENTION_ACCESS_DENIED` if the authenticated user is not the mentioned user.

#### `mentionsRebuild()`

Rebuild the entire mentions index from scratch by scanning all issue event files and re-extracting mentions from all non-deleted comments. Useful for fixing index corruption.

```javascript
const { mentionCount } = await tracker.mentionsRebuild();
console.log(`Rebuilt ${mentionCount} mentions`);
```

**Return type:** `MentionsRebuildResult`

```typescript
type MentionsRebuildResult = { result: "OK"; mentionCount: number } | AgentrackError;
```

**Notes:**
- No authentication required (system operation).
- Clears the existing index and rebuilds from scratch.

## Worktree functions

These standalone functions manage the git worktree where agentrack stores issue data. They are exported separately from the `Tracker` class.

### `pushWorktree(cwd, message?)`

Stage all changes in `.agentrack/`, auto-commit, and push to the remote `_agentrack` branch.

```javascript
import { pushWorktree } from "agentrack";

const result = await pushWorktree(process.cwd());
console.log(result);
// { synced: true, commitCount: 1 }
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cwd` | string | required | Project directory |
| `message` | string | `"sync: <ISO-8601>"` | Commit message override |

**Return type:** `WorktreeSyncResult`

```typescript
interface WorktreeSyncResult {
  synced: boolean;
  commitCount?: number;
  message?: string;
}
```

### `pullWorktree(cwd)`

Pull the latest changes from the remote `_agentrack` branch.

```javascript
import { pullWorktree } from "agentrack";

const result = await pullWorktree(process.cwd());
console.log(result);
// { updated: true }
```

**Parameters:** `cwd: string`

**Return type:** `WorktreePullResult`

```typescript
interface WorktreePullResult {
  updated: boolean;
}
```

### `initWorktree(cwd)`

Initialize the git worktree for agentrack. Called internally by `Tracker.init()`.

```javascript
import { initWorktree } from "agentrack";

const result = await initWorktree(process.cwd());
```

**Return type:** `WorktreeInitResult`

```typescript
interface WorktreeInitResult {
  scenario: "fresh" | "join" | "already_initialized";
  path: string;
}
```

### `initFreshWorktree(cwd)`

Initialize a new orphan branch worktree. Throws if one already exists.

### `initJoinWorktree(cwd)`

Join an existing `_agentrack` branch from the remote. Throws if no remote branch exists.

### `detectInitScenario(cwd)`

Detect whether the tracker should be initialized fresh or should join an existing remote setup.

### `isWorktreeInitialized(cwd)`

Check whether the agentrack worktree is already set up. Returns `true` or `false`.

### Constants

```javascript
import { WORKTREE_BRANCH, WORKTREE_DIR } from "agentrack";

WORKTREE_BRANCH; // "_agentrack"
WORKTREE_DIR;    // ".agentrack"
```

## Exported types

Agentrack exports TypeScript types for all parameters, results, and internal data structures. Import them as types:

```typescript
import type {
  // Core types
  IssueId,
  IssueStatus,
  IssueProperties,
  ComputedIssue,
  AgentrackError,

  // API params and results
  CreateParams,
  CreateResult,
  UpdateParams,
  UpdateResult,
  ListParams,
  ListResult,
  ViewResult,
  HistoryResult,
  NextResult,
  InitResult,
  IssueDeleteParams,
  IssueDeleteResult,

  // Comments
  CommentAddParams,
  CommentAddResult,
  CommentUpdateParams,
  CommentUpdateResult,
  CommentDeleteParams,
  CommentDeleteResult,
  CommentsListResult,
  ComputedComment,
  CommentId,

  // Blockages
  BlockagesAddParams,
  BlockagesAddResult,
  BlockagesResolveParams,
  BlockagesResolveResult,
  BlockagesDeleteParams,
  BlockagesDeleteResult,
  BlockagesListResult,
  BlockageInfo,

  // Users
  UsersRegisterResult,
  UsersListResult,
  UsersRevokeResult,
  UsersRegenerateResult,
  UserInfo,

  // Mentions
  MentionsListResult,
  MentionsViewResult,
  MentionsReadResult,
  MentionsUnreadResult,
  MentionsRebuildResult,
  MentionResult,
  MentionEntry,
  MentionViewResult,

  // Worktree
  WorktreeInitResult,
  WorktreeSyncResult,
  WorktreePullResult,

  // Events
  Event,
  CreationEvent,
  UpdateEvent,
  CommentEvent,
  CommentUpdateEvent,
  CommentDeleteEvent,
  BlockageAddedEvent,
  BlockageResolvedEvent,
  BlockageDeletedEvent,
  BlockageEntry,

  // Index
  IndexEntry,
  IndexFile,
  ConfigFile,
  DependenciesFile,
  UsersFile,
} from "agentrack";
```

## Error handling

All methods that can fail return an `AgentrackError` instead of throwing. Check the `result` field to detect errors:

```javascript
const issue = await tracker.view("nonexistent");
if ("result" in issue && issue.result !== "OK") {
  // It's an error
  console.error(issue.result);   // Error code, e.g. "NOT_FOUND"
  console.error(issue.message);  // Human-readable message
} else {
  // It's a ComputedIssue
  console.log(issue.title);
}
```

Common error codes:

| Code | Meaning |
|------|---------|
| `NOT_FOUND` | Issue ID doesn't exist |
| `NOT_INITIALIZED` | Tracker not initialized |
| `TOKEN_REQUIRED` | Auth mode requires a token |
| `INVALID_TOKEN` | Token doesn't match any user |
| `MENTION_NOT_FOUND` | Mention ID doesn't exist |
| `MENTION_ACCESS_DENIED` | Authenticated user is not the mentioned user |

## See also

- [Overview](./overview.md) -- What agentrack is and how to use it
- [Getting started](./getting-started.md) -- Your first session with the JavaScript API
- [CLI reference](./cli-reference.md) -- The `agt` command-line tool
- [The issue object](./issue-object.md) -- Issue properties and event sourcing
- [Authentication](./authentication.md) -- Token-based auth modes
