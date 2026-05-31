# Index Manager Pattern

## When To Use This

Understanding or changing how issues are indexed, sorted, or looked up. Working with the childrenOf map, binary search operations, or denormalized index entries.

## Mental Model

The index manager maintains fast lookup structures in `index.json`:
- **open[]** — sorted array of open issue IndexEntry
- **closed[]** — sorted array of closed issue IndexEntry
- **childrenOf** — `Record<string, string[]>` mapping parent ID to child IDs

**IndexEntry** is denormalized for fast list/filter: id, title, path, status, assignee, parentId, tags, priority.

**Operations** use binary search for sorted lookups:
- Insert/update entries in sorted position
- Find/remove entries by ID
- AddChild/removeChild/getChildren for the childrenOf map

Index entries are updated on create/update/delete. The index is the primary data structure for `list()` operations, avoiding full event replay.

## Code Map

- `src/core/index-manager.ts` — all index management functions
- `src/types/index-file.ts` — IndexFile, IndexEntry types
- `tests/core/index-manager.test.ts` — unit tests

## Related Topics

- [issue-crud-events.expertise.md](issue-crud-events.expertise.md): how index stays in sync with events
- [hierarchy-status.expertise.md](hierarchy-status.expertise.md): childrenOf map for parent-child tracking
