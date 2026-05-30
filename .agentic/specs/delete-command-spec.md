# Spec: `agt delete <issue-id>` Command

## Overview

Implement a hard delete command that removes an issue and all its descendants from agentrack, cleaning up all references across index, dependencies, and mentions data stores.

## Motivation

Currently there is no way to remove an issue from agentrack. Issues that were created by mistake, test issues, or issues that are no longer relevant cannot be cleaned up. This command fills that gap.

## Command Interface

```
agt delete <issue-id>
```

**Output on success:**
```json
{ "result": "OK", "deletedIds": ["child1", "child2", "target"] }
```

`deletedIds` lists ALL issue IDs that were deleted, in deletion order: children first (depth-first, leaves first), then the target last.

**Output on error (not found):**
```json
{ "result": "NOT_FOUND", "message": "Issue `xyz` not found in index." }
```

## Implementation Steps

### 1. Types (`types/api.ts`)

Add:

```typescript
/** Parameters for deleting an issue. */
export interface IssueDeleteParams {
  /** Override author (resolved by auth layer if not provided). */
  author?: string;
}

/** Result of deleting an issue. */
export type IssueDeleteResult =
  | { result: "OK"; deletedIds: IssueId[] }
  | AgentrackError;
```

Export from `types/index.ts`.

### 2. Mentions cleanup (`core/mentions.ts`)

Add new exported function:

```typescript
/**
 * Remove all mention entries for a given issue ID.
 * Cleans up empty user keys.
 */
export async function removeIssueMentions(dir: string, issueId: string): Promise<void>
```

Implementation: scan all user arrays in mentions.json, filter out entries where `issueId` matches, delete user keys with empty arrays, write back if changed.

### 3. Blockages cleanup (`core/dependency-manager.ts`)

Add new exported function:

```typescript
/**
 * Remove ALL blockage entries involving a given issue ID.
 * Removes from both blockedBy and blocks maps, including counterpart cleanup.
 */
export function removeAllBlockagesForIssue(
  deps: DependenciesFile,
  issueId: IssueId,
): DependenciesFile
```

Implementation:
1. For each entry in `blockedBy[issueId]` (issue was blocked): remove counterpart from `blocks[entry.blockerId]`
2. For each entry in `blocks[issueId]` (issue was blocker): remove counterpart from `blockedBy[entry.blockedId]`
3. Delete `blockedBy[issueId]` key
4. Delete `blocks[issueId]` key
5. Clean up empty arrays (delete keys)
6. Return new immutable DependenciesFile

### 4. Tracker method (`core/tracker.ts`)

Add method: `async issueDelete(id: IssueId, params?: IssueDeleteParams): Promise<IssueDeleteResult>`

Implementation order:
1. `resolveAuthor(params?.author)` for audit context
2. Resolve tracker dir
3. Read `index.json`
4. Find entry in index — throw `NOT_FOUND` if missing
5. Collect ALL descendants recursively using `getChildren` (depth-first, build flat array)
6. Read `dependencies.json`
7. **For each descendant** (bottom-up: leaves first, parents last):
   a. `deps = removeAllBlockagesForIssue(deps, descendantId)`
   b. `await removeIssueMentions(trackerDir, descendantId)`
   c. Delete event file from disk (`unlink` the issue path)
   d. If descendant has parentId: `updatedIndex = removeChild(updatedIndex, parentId, descendantId)`
   e. `updatedIndex = removeEntry(updatedIndex, descendantId)`
8. **For the TARGET issue:**
   a. `deps = removeAllBlockagesForIssue(deps, id)`
   b. `await removeIssueMentions(trackerDir, id)`
   c. Delete event file from disk (`unlink`)
   d. If target has parentId: `updatedIndex = removeChild(updatedIndex, parentId, id)`
   e. Delete `childrenOf[id]` key from index (cleanup)
   f. `updatedIndex = removeEntry(updatedIndex, id)`
9. Write `index.json` and `dependencies.json`
10. Return `{ result: "OK", deletedIds: [...descendantIds, id] }`

### 5. CLI command (`cli/commands/delete.ts`)

New file following the pattern of `create.ts`:
- Import `Tracker`, `AgentrackError`, `writeStdout`, `writeStderr`
- Export `async function deleteAction(issueId: string): Promise<void>`
- Create Tracker, call `tracker.issueDelete(issueId)`
- Handle AgentrackError → `writeStderr` + `process.exit`
- Success → `writeStdout` + `process.exit(0)`

### 6. CLI registration (`cli/runner.ts`)

Add after the `update` command registration:

```typescript
import { deleteAction } from "./commands/delete";

// ...

program
  .command("delete <issueId>")
  .description("Delete an issue and all its children")
  .action(deleteAction);
```

## Constraints & Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Hard delete** — no event appended | Soft-delete would leave zombie entries; hard delete is simpler and matches user intent |
| **Cascade delete children** | Orphaned children would be inconsistent state |
| **Depth-first, leaves first** | Ensures parent-child relationships are valid during deletion |
| **No confirmation prompt** | CLI is for agents, not humans |
| **No --force flag** | Delete always works on any status |
| **deletedIds in response** | Gives caller full visibility into cascade effects |
| **Not atomic across files** | Acceptable for delete; if it fails partway, re-running is safe |
| **Works on open and closed** | No reason to restrict deletion by status |

## Files Changed

| File | Change |
|------|--------|
| `types/api.ts` | Add `IssueDeleteParams`, `IssueDeleteResult` |
| `types/index.ts` | Export new types |
| `core/mentions.ts` | Add `removeIssueMentions()` |
| `core/dependency-manager.ts` | Add `removeAllBlockagesForIssue()` |
| `core/tracker.ts` | Add `issueDelete()` method |
| `cli/commands/delete.ts` | New file — CLI action |
| `cli/runner.ts` | Register `delete` command |
