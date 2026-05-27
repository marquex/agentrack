# Mentions Feature Spec

**Status: REVIEWED**

**Review date**: 2026-05-27
**Reviewers**: library-developer (feasibility), library-validator (testability)
**Result**: Approved with clarifications (see Clarifications section at bottom)

## Summary

Add @agent-name mention support to issue comments. When a comment is created or updated, mentions are extracted from the content, validated against the user registry, and stored in a dedicated `mentions.json` index file. Agents can list their mentions (with read/unread filtering), view the source comment, and toggle read status. This enables cross-agent notification and workflow coordination.

## Requirements

### AC1: Mention extraction from comments

- Comments containing `@<user-name>` patterns are parsed for mentions.
- Only registered users (present in `users.json`) generate mention entries. Unregistered names are silently ignored.
- Regex pattern: `/(?:^|(?<=[^@\w]))@([\w-]+)/g` — matches `@name` at start of string or after any character that is not `@` and not a word character. This avoids matching email addresses (`foo@bar`) and double-@ typos (`@@name`).
- Multiple mentions in a single comment produce multiple mention entries (one per unique mentioned user).
- Duplicate mentions of the same user in one comment produce only one mention entry.
- Self-mentions (author mentioning themselves) are allowed and indexed normally.

### AC2: Mention index file

- New file: `.agentrack/mentions.json`
- Structure: object keyed by `mentionedUser` (lowercase), each value is an array of mention entries sorted by ID (which encodes creation time).

```json
{
  "alice": [
    {
      "id": "mpmvd123ab",
      "createdAt": "2026-05-27T10:00:00.000Z",
      "mentionedUser": "alice",
      "mentionedBy": "bob",
      "issueId": "mpgqtsxcvh",
      "commentId": "c1a2b3d4",
      "isRead": false
    }
  ],
  "bob": [...]
}
```

- Each mention entry has:
  - `id` — 10-char ID (same format as issue IDs: `Date.now().toString(36).slice(0,6) + Math.random().toString(36).slice(-4)`)
  - `createdAt` — ISO 8601 timestamp when the mention was created
  - `mentionedUser` — the user who was mentioned (lowercase)
  - `mentionedBy` — the user who wrote the comment (lowercase)
  - `issueId` — the issue where the comment lives
  - `commentId` — the comment that contains the mention
  - `isRead` — boolean, defaults to `false`

### AC3: Automatic indexing on comment operations

- **commentsAdd**: After appending the comment event, extract mentions and add entries to the index.
- **commentsUpdate**: After appending the comment-update event, remove all mentions for that `commentId`, then re-extract from the updated content.
- **commentsDelete**: After appending the comment-delete event, remove all mentions for that `commentId`.
- Index updates happen after event writes (same pattern as blockages). If the process crashes between event write and index update, the index becomes stale. The `rebuild` command (AC9) serves as the recovery mechanism.

### AC4: `agt mentions list <agent-name>`

- Returns mentions for the specified agent name.
- **Default behavior**: returns only unread mentions (`isRead === false`).
- **`--include-reads` flag**: includes mentions with `isRead === true` alongside unread ones.
- Results sorted by `createdAt` descending (newest first).
- Each result enriched with `issueTitle` from the index (no issue file reads needed).
- Returns empty array if agent has no mentions.
- Returns `USER_NOT_FOUND` error if the agent name is not a registered user.
- Returns `NOT_INITIALIZED` error if the tracker is not initialized.

**Output (unread only)**:
```json
[
  {
    "id": "mpmvd123ab",
    "mentionedBy": "bob",
    "issueId": "mpgqtsxcvh",
    "issueTitle": "Fix login bug",
    "commentId": "c1a2b3d4",
    "createdAt": "2026-05-27T10:00:00.000Z",
    "isRead": false
  }
]
```

### AC5: `agt mentions view <id>`

- Looks up the mention by ID across all users' mention arrays.
- Resolves the `issueId` + `commentId` to the actual comment content by replaying the issue events.
- Returns the full comment object with issue context.

**Output**:
```json
{
  "mention": {
    "id": "mpmvd123ab",
    "mentionedUser": "alice",
    "mentionedBy": "bob",
    "issueId": "mpgqtsxcvh",
    "commentId": "c1a2b3d4",
    "isRead": false,
    "createdAt": "2026-05-27T10:00:00.000Z"
  },
  "comment": {
    "id": "c1a2b3d4",
    "author": "bob",
    "content": "@alice can you review this?",
    "timestamp": "2026-05-27T10:00:00.000Z"
  },
  "issue": {
    "id": "mpgqtsxcvh",
    "title": "Fix login bug"
  }
}
```

- Returns `MENTION_NOT_FOUND` error if the mention ID doesn't exist.
- Returns `COMMENT_NOT_FOUND` error if the source comment was deleted.
- Returns `NOT_INITIALIZED` error if the tracker is not initialized.

### AC6: `agt mentions read <id>`

- Sets `isRead = true` on the mention.
- **Auth constraint**: only the `mentionedUser` can mark a mention as read (resolved token must match `mentionedUser`).
- Returns `{ "result": "OK" }`.
- Returns `MENTION_NOT_FOUND` if ID doesn't exist.
- Returns `MENTION_ACCESS_DENIED` if the authenticated user is not the mentioned user.
- Returns `TOKEN_REQUIRED` in read-only/strict auth modes if no token provided.
- Returns `NOT_INITIALIZED` error if the tracker is not initialized.

### AC7: `agt mentions unread <id>`

- Sets `isRead = false` on the mention.
- **Auth constraint**: only the `mentionedUser` can mark a mention as unread (resolved token must match `mentionedUser`).
- Returns `{ "result": "OK" }`.
- Returns `MENTION_NOT_FOUND` if ID doesn't exist.
- Returns `MENTION_ACCESS_DENIED` if the authenticated user is not the mentioned user.
- Returns `TOKEN_REQUIRED` in read-only/strict auth modes if no token provided.
- Returns `NOT_INITIALIZED` error if the tracker is not initialized.

### AC8: Init creates empty mentions index

- `agt init` creates `.agentrack/mentions.json` with an empty object `{}`.
- Reading a missing `mentions.json` returns an empty object (upgrade scenario for existing installs).

### AC9: `agt mentions rebuild`

- Rebuilds the entire mentions index from scratch by scanning all issue event files.
- Useful for fixing index corruption after manual edits or crashes.
- Clears the existing index and re-extracts all mentions from all non-deleted comments.
- Requires no auth (system operation, like init).
- Returns `{ "result": "OK", "mentionCount": <number> }`.
- Returns `NOT_INITIALIZED` error if the tracker is not initialized.
- **Rebuild extracts ALL @names regardless of current user registration status**. This preserves historical mentions of revoked users. Incremental mention extraction (during comment add/update) still validates against current registered users.

## API/interface changes

### New types (`src/types/mention.ts`)

```typescript
export interface MentionEntry {
  id: string;
  createdAt: string;
  mentionedUser: string;
  mentionedBy: string;
  issueId: string;
  commentId: string;
  isRead: boolean;
}

export type MentionsFile = Record<string, MentionEntry[]>; // keyed by mentionedUser

export interface MentionResult {
  id: string;
  mentionedBy: string;
  issueId: string;
  issueTitle: string;
  commentId: string;
  createdAt: string;
  isRead: boolean;
}

export interface MentionViewResult {
  mention: MentionEntry;
  comment: {
    id: string;
    author: string;
    content: string;
    timestamp: string;
    editedAt?: string;
  };
  issue: {
    id: string;
    title: string;
  };
}
```

### New module: `src/core/mentions.ts`

Functions:
- `extractMentions(content: string, registeredUsers: string[]): string[]` — returns unique, lowercase, registered usernames mentioned in content. The captured name is lowercased before checking against the registered users list (which is also stored lowercase).
- `readMentionsFile(dir: string): MentionsFile` — reads mentions.json, returns `{}` if missing
- `writeMentionsFile(dir: string, data: MentionsFile): void` — writes mentions.json atomically
- `addMentionEntries(dir: string, entries: MentionEntry[]): void` — adds entries to the correct user arrays, preserving sort
- `removeCommentMentions(dir: string, commentId: string): void` — removes all entries with matching commentId, cleans up empty user keys
- `rebuildMentionsIndex(dir: string, issues: IndexEntry[]): number` — full rebuild from events, returns count. Extracts ALL @names regardless of current registration status (preserves historical mentions of revoked users).
- `findMentionById(dir: string, id: string): { entry: MentionEntry; user: string } | null` — lookup across all user arrays

### Tracker methods (`src/core/tracker.ts` additions)

```typescript
mentionsList(userName: string, options?: { includeReads?: boolean }): MentionResult[]  // lowercases userName before lookup
mentionsView(mentionId: string): MentionViewResult
mentionsRead(mentionId: string): { result: string }
mentionsUnread(mentionId: string): { result: string }
mentionsRebuild(): { result: string; mentionCount: number }
```

### CLI commands (`src/cli/commands/mentions.ts`)

```
agt mentions list <agent-name> [--include-reads]
agt mentions view <mention-id>
agt mentions read <mention-id>
agt mentions unread <mention-id>
agt mentions rebuild
```

### Error codes

- `MENTION_NOT_FOUND` — mention with the given ID doesn't exist
- `MENTION_ACCESS_DENIED` — authenticated user is not the mentioned user (for read/unread commands)
- `COMMENT_NOT_FOUND` — source comment was deleted (for mentionsView)
- `TOKEN_REQUIRED` — no token provided for commands requiring identity verification (read/unread in read-only/strict modes, and in open mode)
- `USER_NOT_FOUND` — specified agent name is not a registered user (for mentionsList)
- `NOT_INITIALIZED` — tracker has not been initialized (all mention commands)

## Implementation notes

1. **Follow the dependency-manager pattern**: separate index file maintained incrementally. File I/O functions in `mentions.ts`, not in `file-io.ts`.

2. **Integration points in tracker.ts**:
   - `commentsAdd` → after event append, call `extractMentions` + `addMentionEntries`
   - `commentsUpdate` → after event append, call `removeCommentMentions` + `extractMentions` + `addMentionEntries`
   - `commentsDelete` → after event append, call `removeCommentMentions`

3. **User validation**: load `users.json` to check if a mentioned name is registered. Only registered users get mention entries.

4. **findMentionById**: iterate all user arrays in the MentionsFile. At agent scale (< 1000 mentions total), this is fine. If needed later, add a secondary index.

5. **Auth for read/unread**: Add an optional `requiresIdentity: true` flag to `resolveAuthor()` in auth.ts. When true, skip the open-mode fallback and return `TOKEN_REQUIRED` if no token is present, regardless of auth mode. Use this flag in mentionsRead and mentionsUnread. This means even in open auth mode, these two commands require a valid token.

6. **Init update**: add `mentions.json` creation alongside existing `dependencies.json` and `users.json` creation.

7. **Barrel exports**: export new types from `src/types/index.ts` and `src/index.ts`.

8. **Rebuild command**: uses `computeComments` (already exists in events.ts) to get active comments for each issue, then re-extracts mentions.

9. **Edge case — comment already deleted when view is called**: the mention exists in the index but the comment was soft-deleted. Return `COMMENT_NOT_FOUND` in this case.

10. **Edge case — mention of revoked user**: the user was registered when mentioned but later revoked. The mention stays in the index as historical data. `mentions list <revoked-user>` still works if the user name is passed (the data is still there), but since the user is no longer in `users.json`, the `USER_NOT_FOUND` error should NOT apply to `mentions list` — the data is still valid. However, for `mentions read/unread`, the auth check requires a valid token, and a revoked user has no valid token, so they can't toggle. This is acceptable.

## Out of scope

- **Real-time notifications** — this is a polling-based system. Agents check mentions periodically.
- **Email/webhook integration** — no external notification delivery.
- **Mention autocomplete** — no suggestion system.
- **Group mentions** (`@all`, `@team`) — not supported.
- **Mentions in issue descriptions** — only comments are supported for now.
- **Mention deletion** — mentions are removed when the source comment is deleted. No standalone delete.
- **Markdown-aware extraction** — `@decorator`, `@import`, and other code-like patterns in markdown will produce false mentions. Acceptable for v1.
- **Self-query convenience** — `mentions list` without an argument (defaults to authenticated user) is not supported. Pass the agent name explicitly.
- **Webapp integration** — this is CLI-only for now.

## Test plan

### Unit tests: `tests/core/mentions.test.ts`

- extractMentions: single mention, multiple, duplicates, unregistered, no mentions, start/mid/end of string, bare @, email exclusion, empty content, hyphens/underscores, mixed
- addMentionEntries: single, multiple, no mentions, preserves existing, no mutate, appends, self-mention, unregistered
- removeCommentMentions: removes target, preserves others, removes empty user key, empty file, no mutate, nonexistent comment
- rebuildMentionsIndex: rebuilds correctly, empty index, missing files, multiple issues, unregistered users
- readMentionsFile: missing file returns empty object
- findMentionById: found, not found, multiple users

### Integration tests: `tests/core/tracker/tracker-mentions.test.ts`

- Init creates empty mentions.json
- commentsAdd with mentions (single, multi, unregistered, no mention, duplicates)
- commentsUpdate with mentions (change target, remove all)
- commentsDelete with mentions (removes, preserves others)
- mentionsList (enriched, sorted, empty, USER_NOT_FOUND, NOT_INITIALIZED, include-reads flag)
- mentionsView (found, MENTION_NOT_FOUND, COMMENT_NOT_FOUND)
- mentionsRead (success, MENTION_NOT_FOUND, MENTION_ACCESS_DENIED, wrong user)
- mentionsUnread (success, MENTION_NOT_FOUND, MENTION_ACCESS_DENIED, wrong user)
- mentionsRebuild (rebuilds, idempotent, NOT_INITIALIZED)
- Edge cases: self-mention, update-removes, empty-content

### E2E tests: `tests/e2e/mentions.test.ts`

- mentions list (empty, with mention, USER_NOT_FOUND, sorted, include-reads)
- mentions view (found, not found, deleted comment)
- mentions read (success, wrong user)
- mentions unread (success, wrong user)
- mentions rebuild
- Integration: add-indexes, delete-removes, update-changes

## Files to create

- `src/types/mention.ts` — type definitions
- `src/core/mentions.ts` — core mention operations
- `src/cli/commands/mentions.ts` — CLI command handlers
- `tests/core/mentions.test.ts` — unit tests
- `tests/core/tracker/tracker-mentions.test.ts` — integration tests
- `tests/e2e/mentions.test.ts` — E2E tests

## Files to modify

- `src/types/api.ts` — add API types for mentions commands
- `src/types/index.ts` — re-export mention types
- `src/index.ts` — barrel exports
- `src/core/tracker.ts` — integrate mentions into comment methods + add mention methods
- `src/core/events.ts` — no changes expected (computeComments already exists)
- `src/core/errors.ts` — add MENTION_NOT_FOUND, MENTION_ACCESS_DENIED error codes
- `src/cli/runner.ts` — register mentions subcommand
- `src/cli/commands/init.ts` — create empty mentions.json on init (if not already)

## Clarifications (from review)

These clarifications address findings from the developer feasibility and quality/testability reviews.

### CL1: mentionsList is intentionally cross-agent visible

`mentionsList` takes any `userName` and returns their mentions without auth checks. This is intentional for the polling model — agents check their own mentions and agents can check mentions of their subordinates. The privacy trade-off (any agent can see who mentioned another agent) is acceptable in the agent-to-agent coordination context. No auth restriction needed for v1.

### CL2: Updating a comment resets isRead for re-mentioned users

When a comment is updated (AC3), all old mentions for that commentId are removed and new ones are created with `isRead: false`. This means if Alice had marked a mention as read, and Bob updates the comment, Alice gets re-notified. This is the desired behavior — the comment content changed, so the mention is effectively new.

### CL3: rebuildMentionsIndex extracts all @names, not just registered users

During rebuild, the function extracts all @names from comments regardless of whether the user is currently registered. This preserves historical mentions of users who were later revoked. The incremental path (commentsAdd/Update) still validates against current registered users — only rebuild is unconditional.

### CL4: Both init paths must create mentions.json

Both `Tracker.init()` (classic) and the worktree init path (in worktree.ts/init.ts via git plumbing) must create `mentions.json`. Check both code paths when implementing AC8.

### CL5: mentions.json must be added to E2E test reset

The `resetWorktreeData()` function in E2E test setup (setup.ts) must include `mentions.json` in its reset list alongside `index.json`, `dependencies.json`, `users.json`, and `config.json`.

### CL6: Stale index after git pull

After `agt pull`, `mentions.json` may be stale if the remote had new comments with mentions. This is the same situation as `dependencies.json`. Recommendation: document that `agt mentions rebuild` should be run after pull if cross-agent mentions matter. No automatic trigger needed for v1.
