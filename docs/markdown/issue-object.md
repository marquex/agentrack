# The issue object

An issue in agentrack is a set of properties that describe a unit of work, plus an append-only event log that records every change. The current state of an issue is computed by replaying its events from beginning to end.

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | auto-generated | A unique 10-character identifier, time-sortable and random |
| `title` | string | required | Short description of the issue |
| `description` | string | `""` | Detailed description, supports any text |
| `status` | string | `"idea"` | Current position in the lifecycle (see below) |
| `assignee` | string \| null | `null` | User or agent assigned to work on the issue |
| `parentId` | string \| null | `null` | ID of the parent issue for hierarchy (see [Hierarchy and blockages](./hierarchy-and-blockages.md)) |
| `tags` | string[] | `[]` | Arbitrary labels for categorization and filtering |
| `priority` | 1 \| 2 \| 3 \| 4 \| 5 | `3` | Urgency: 1 = critical, 5 = trivial |

### Computed fields

These fields are not stored directly but are derived from the event log:

| Field | Type | Description |
|-------|------|-------------|
| `createdAt` | string (ISO 8601) | Timestamp of the `creation` event |
| `createdBy` | string | Author of the `creation` event (the user who created the issue) |
| `updatedAt` | string (ISO 8601) | Timestamp of the most recent event |

### ID format

Issue IDs are 10-character strings generated from a timestamp plus randomness:

```javascript
Date.now().toString(36).slice(0, 6) + Math.random().toString(36).slice(-4)
```

This produces IDs like `m1x2k9ab3c` that are:
- **Sortable by creation time** -- the first 6 characters encode the timestamp
- **Collision-resistant** -- the last 4 characters add randomness
- **Short enough** to reference in conversations, commit messages, and CLI commands

### Priority guide

| Priority | Label | Use for |
|----------|-------|---------|
| 1 | Critical | Production outages, blocking issues |
| 2 | Important | Must-do tasks for current milestone |
| 3 | Normal | Standard work (default) |
| 4 | Low | Nice-to-have improvements |
| 5 | Trivial | Minor cleanup, documentation typos |

## Status lifecycle

Issues progress through five statuses in order:

```
idea --> todo --> in-progress --> done --> closed
```

| Status | Meaning |
|--------|---------|
| `idea` | A thought or proposal. Not yet committed to. |
| `todo` | Accepted and planned. Ready to be picked up. |
| `in-progress` | Someone is actively working on it. |
| `done` | The work is complete. Awaiting review or verification. |
| `closed` | Final state. The issue is resolved, abandoned, or no longer relevant. |

### Status constraints

The lifecycle is not freely reversible. When an issue has children or is involved in a hierarchy, additional rules apply:

- A parent cannot be set to `done` or `closed` if it has children that are not `done` or `closed`.
- When a child advances past its parent's status, the parent is automatically promoted.
- Closing a parent automatically closes all `done` children.

See [Hierarchy and blockages](./hierarchy-and-blockages.md) for the full hierarchy rules.

### The `open` filter

When listing issues, `--status open` is a special filter that matches all statuses except `closed`:

```bash
agt list --status open
```

This returns issues in `idea`, `todo`, `in-progress`, or `done` status.

## Event sourcing model

Agentrack uses an event sourcing architecture. Instead of storing the current state of an issue, it stores a sequence of immutable events. The current state is computed by replaying the events in order.

### Event structure

Each event has:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string (ISO 8601) | When the event occurred |
| `type` | string | The kind of event |
| `author` | string | The user who performed the action |
| `content` | object \| string | Event-specific data (varies by type) |

### Event types

| Type | When it occurs |
|------|---------------|
| `creation` | Issue is created (no content -- just a marker) |
| `update` | Issue properties are changed (title, status, assignee, etc.) |
| `comment` | A comment is added |
| `comment-update` | A comment is edited |
| `comment-delete` | A comment is deleted |
| `blockage-added` | The issue is blocked by another issue |
| `blockage-resolved` | A blockage on the issue is resolved |
| `blockage-deleted` | A blockage is removed entirely |

### How state is computed

When you run `agt view <id>`, agentrack:

1. Reads the issue's JSON file (an array of events).
2. Starts with an empty state.
3. Applies each event in order:
   - `creation` sets the initial timestamp and author.
   - `update` events merge their `content` into the current state.
4. Returns the final computed state.

This means:
- **No data is ever overwritten.** Every change is preserved.
- **You can always see what happened.** `agt history <id>` shows the full event log.
- **The event log is the source of truth.** The index file and computed state are derived.

### Example event log

```json
[
  {
    "timestamp": "2025-01-15T10:00:00.000Z",
    "type": "creation",
    "author": "alice"
  },
  {
    "timestamp": "2025-01-15T10:00:00.000Z",
    "type": "update",
    "author": "alice",
    "content": {
      "title": "Fix login bug",
      "description": "Users cannot log in with SSO",
      "status": "todo",
      "assignee": "bob",
      "tags": ["bug", "auth"],
      "priority": 2
    }
  },
  {
    "timestamp": "2025-01-15T11:00:00.000Z",
    "type": "update",
    "author": "bob",
    "content": { "status": "in-progress" }
  },
  {
    "timestamp": "2025-01-15T14:00:00.000Z",
    "type": "comment",
    "author": "bob",
    "content": { "id": "c1a2b3", "content": "Found the issue: expired SSO certificate" }
  },
  {
    "timestamp": "2025-01-15T15:00:00.000Z",
    "type": "update",
    "author": "bob",
    "content": { "status": "done" }
  }
]
```

## View output example

Running `agt view <id>` on the above event log would return:

```json
{
  "id": "m1x2k9ab",
  "title": "Fix login bug",
  "description": "Users cannot log in with SSO",
  "status": "done",
  "assignee": "bob",
  "tags": ["bug", "auth"],
  "parentId": null,
  "priority": 2,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "createdBy": "alice",
  "updatedAt": "2025-01-15T15:00:00.000Z"
}
```

## See also

- [Hierarchy and blockages](./hierarchy-and-blockages.md) -- How issues relate to each other
- [CLI reference](./cli-reference.md) -- Commands for creating, viewing, and updating issues
- [JavaScript reference](./javascript-reference.md) -- Tracker methods and types
- [Storing issues in git](./storing-issues-in-git.md) -- How event files are persisted on the git branch
