# Hierarchy and blockages

Agentrack supports two mechanisms for organizing and constraining issues: **hierarchy** (parent-child relationships) and **blockages** (dependency tracking). These work together to help you model complex projects where tasks depend on each other.

## Issue hierarchy

Issues can form a tree structure through the `parentId` property. A parent issue can have multiple children, and children can themselves have children, allowing unlimited nesting depth.

### Creating parent-child relationships

Use `--parentId` when creating or updating an issue:

```bash
# Create an epic
agt create "User authentication feature" --status todo
# { "id": "abc123" }

# Create a sub-task under the epic
agt create "Implement login endpoint" --status todo --parentId abc123
# { "id": "def456" }

# Create a sub-sub-task
agt create "Write unit tests for login" --status idea --parentId def456
# { "id": "ghi789" }
```

In JavaScript:

```javascript
const { id: epicId } = await tracker.create({
  title: "User authentication feature",
  status: "todo",
});

const { id: taskId } = await tracker.create({
  title: "Implement login endpoint",
  status: "todo",
  parentId: epicId,
});

// Reparent an existing issue
await tracker.update("ghi789", { parentId: taskId });
```

### Detaching from a parent

To remove an issue from a hierarchy, set `parentId` to null:

```bash
agt update ghi789 --parentId null
```

### Listing children

Filter by `parentId` to see children of a specific issue:

```bash
agt list --parentId abc123
```

### Hierarchy structure

The index file maintains a `childrenOf` map for efficient parent-to-children lookups:

```json
{
  "childrenOf": {
    "abc123": ["def456"],
    "def456": ["ghi789"]
  }
}
```

This map is updated automatically when issues are created, reparented, or deleted.

## Status constraints

The hierarchy enforces constraints in both directions to keep the tree's lifecycle coherent.

### Upward constraints (children restrict parent)

**A parent cannot be set to `done` or `closed` if it has children that are not `done` or `closed`.** This is a hard block. Marking a parent complete while subtasks remain open is always an error.

```bash
# Parent has a child in "todo" status
agt update abc123 --status done
# Error: parent cannot be done while children are still open
```

**When a child advances past its parent's status, the parent is automatically promoted.** For example, if a child moves to `in-progress` but the parent is still `todo`, the parent is silently moved to `in-progress` as well.

```bash
# Parent "abc123" is "todo", child "def456" is "todo"
agt update def456 --status in-progress
# Child moves to in-progress
# Parent "abc123" is auto-promoted to in-progress
```

The auto-promotion event is recorded on the parent with the author `"system"`:

```json
{
  "timestamp": "2025-01-15T11:00:00.000Z",
  "type": "update",
  "author": "system",
  "content": {
    "status": "in-progress",
    "reason": "auto-promoted: child def456 moved to in-progress"
  }
}
```

### Downward constraints (parent restricts children)

**Children cannot be created under or reparented to a `closed` parent.** A closed issue represents abandoned or fully concluded work. To attach children, the parent must be reopened first.

```bash
# Parent "abc123" is "closed"
agt create "New subtask" --parentId abc123
# Error: cannot create child under a closed parent
```

**Closing a parent automatically closes all `done` children.** When a parent is moved to `closed`, any children in `done` status are automatically moved to `closed`. This cascades through the entire subtree -- if a `done` child has `done` grandchildren, they are all closed.

Children that are not in `done` or `closed` status **block** the operation entirely. The parent cannot be closed until those children are completed or closed individually.

### Allowed transitions

These are allowed without restriction:

- **Creating children under a parent in `idea` status.** While the parent represents uncommitted work, exploratory subtasks are legitimate.
- **Creating children under a parent in `done` status.** Follow-up subtasks discovered after completion are common. The upward constraint will prevent the parent from staying `done` once the new child exists in an open state.

### Example: Epic with stories

```bash
# Create the epic
agt create "Search feature" --status todo
# { "id": "epic1" }

# Create stories
agt create "Design search API" --status todo --parentId epic1 --priority 1
agt create "Implement search indexing" --status todo --parentId epic1 --priority 2
agt create "Build search UI" --status idea --parentId epic1 --priority 3

# Start working on the first story
agt update story1id --status in-progress
# epic1 is auto-promoted to in-progress

# Complete the first story
agt update story1id --status done

# Complete the epic -- only allowed when all children are done/closed
agt update story2id --status done
agt update story3id --status done
agt update epic1 --status done
```

## Blockages

Blockages model dependencies between issues: an issue can be **blocked by** one or more other issues. A blocked issue should not be worked on until its blockers are resolved.

### Adding a blockage

```bash
agt blockages add <blocked-id> --by <blocker-id> [<blocker-id> ...]
```

You can specify multiple blockers in a single command for atomic dependency creation:

```bash
agt blockages add feature-x --by infra-setup db-migration
```

In JavaScript:

```javascript
await tracker.blockagesAdd("feature-x", {
  blockerIds: ["infra-setup", "db-migration"],
});
```

The operation is **atomic**: if adding any of the blockers would create a circular dependency, the entire operation is rejected and no changes are written.

### Bidirectional tracking

Blockages are tracked in both directions in `dependencies.json`:

- **`blockedBy`** -- "What blocks this issue?" (looking up from the blocked issue)
- **`blocks`** -- "What does this issue block?" (looking up from the blocker)

```json
{
  "blockedBy": {
    "feature-x": [
      { "blockerId": "infra-setup", "status": "active" },
      { "blockerId": "db-migration", "status": "active" }
    ]
  },
  "blocks": {
    "infra-setup": [
      { "blockedId": "feature-x", "status": "active" }
    ],
    "db-migration": [
      { "blockedId": "feature-x", "status": "active" }
    ]
  }
}
```

### Listing blockages

```bash
agt blockages list <issue-id>
```

Output:

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

In JavaScript:

```javascript
const blockages = await tracker.blockagesList("feature-x");
// blockages.blockedBy -- what blocks this issue
// blockages.blocks -- what this issue blocks
```

### Resolving a blockage

Manually mark a blockage as resolved:

```bash
agt blockages resolve feature-x --by infra-setup
```

In JavaScript:

```javascript
await tracker.blockagesResolve("feature-x", {
  blockerIds: ["infra-setup"],
});
```

Resolved blockages remain in the index for historical visibility but no longer prevent the issue from being worked on.

### Deleting a blockage

Remove a blockage entirely (use when it was added by mistake):

```bash
agt blockages delete feature-x --by wrong-id
```

Unlike resolving, deleting removes the entry from the index entirely. A `blockage-deleted` event is still appended to the blocked issue's event log for auditability.

### Blockage lifecycle

```
added (active) --> resolved
                --> deleted
```

| Action | Effect on index | Effect on event log |
|--------|----------------|---------------------|
| Add | Creates entry in `blockedBy` and `blocks` | `blockage-added` event on blocked issue |
| Resolve | Changes status to `resolved` (keeps entry) | `blockage-resolved` event on blocked issue |
| Delete | Removes entry entirely | `blockage-deleted` event on blocked issue |

### Automatic resolution

When an issue transitions to `done` or `closed` status, any `active` blockages where that issue is the blocker are automatically resolved:

1. The system looks up `blocks[issueId]` for all active entries.
2. For each entry, the status changes to `resolved` in both `blockedBy` and `blocks`.
3. A `blockage-resolved` event is appended to each previously-blocked issue.

This means completing a blocker automatically unblocks its dependents without manual intervention.

### Cycle detection

Agentrack prevents circular dependencies. When adding a blockage, the system walks the `blockedBy` graph transitively from the proposed blocker. If the walk reaches the blocked issue, a cycle exists and the operation is rejected.

When adding multiple blockages at once (`--by id1 id2 id3`), cycle detection runs against the projected state that includes earlier blockages in the same batch. If any pair introduces a cycle, the **entire batch** is rejected.

Only `active` entries participate in cycle detection. Resolved blockages do not.

### Impact score

When two unblocked issues have the same priority, the one that unblocks more downstream work should be picked first. The **impact score** of an issue is the count of active entries in `blocks[issueId]` -- how many issues are waiting on it.

The default sort order for listing issues:

1. **Priority ascending** (1 first)
2. **Impact score descending** (most unblocking first)
3. **`createdAt` ascending** (oldest first)

This ensures that agents picking up the "next issue to work on" naturally gravitate toward high-impact, high-priority work.

### Example: Feature blocked by infrastructure

```bash
# Create the infrastructure task
agt create "Set up CI pipeline" --status todo --priority 1
# { "id": "infra1" }

# Create the feature that depends on it
agt create "Add automated tests" --status todo --priority 2
# { "id": "feat1" }

# Block the feature by the infrastructure task
agt blockages add feat1 --by infra1

# The feature is now blocked
agt blockages list feat1
# { "blockedBy": [{ "blockerId": "infra1", "status": "active" }], "blocks": [] }

# Complete the infrastructure task
agt update infra1 --status done
# The blockage on feat1 is automatically resolved

# Verify
agt blockages list feat1
# { "blockedBy": [{ "blockerId": "infra1", "status": "resolved" }], "blocks": [] }
```

## See also

- [The issue object](./issue-object.md) -- Issue properties and the status lifecycle
- [CLI reference](./cli-reference.md) -- Commands for managing hierarchy and blockages
- [JavaScript reference](./javascript-reference.md) -- API methods for blockages and hierarchy
- [Storing issues in git](./storing-issues-in-git.md) -- How the dependency index is persisted
