# Issue CRUD And Events

## When To Use This

Tasks involving issue creation, updates, deletion, event sourcing, event replay, computeState, computeComments, or the JSON file format for issues. "How are issues stored", "change issue fields", "add event type", "replay logic".

## Mental Model

Issues are stored using event sourcing. Each issue is a JSON file (`issues/[id].json`) containing an array of events. The current state is never stored — it's always computed by replaying events.

**Issue creation** produces two events:
1. A `CreationEvent` (with issue ID, timestamps)
2. An `UpdateEvent` with the initial field values (title, description, status, etc.)

**computeState()** replays all events to produce a `ComputedIssue` with: id, title, description, status, priority, assignee, parentId, tags, createdAt, createdBy, updatedAt.

**computeComments()** replays events to produce an array of `ComputedComment` with content, author, timestamps, and deletion status.

**Issue update** appends an `UpdateEvent`. The update handler in Tracker also manages:
- Index updates (denormalized fields)
- Hierarchy changes (reparenting, cascade)
- Blockage auto-resolution (when transitioning to done/closed)

**Issue delete** appends a `DeleteEvent` and updates the index.

## Code Map

- `src/core/events.ts` — appendEvent, replayEvents, computeState, computeComments
- `src/core/tracker.ts` — create(), update(), delete(), list(), view(), history() methods
- `src/core/index-manager.ts` — maintains sorted open/closed arrays, childrenOf map
- `src/types/event.ts` — all event type definitions
- `src/types/issue.ts` — ComputedIssue, IndexEntry, status enum
- `src/types/api.ts` — API result types for CRUD operations
- `tests/core/events/` — unit tests split by function (append-event, compute-comments, compute-state, replay-events)
- `tests/core/tracker/tracker-crud.test.ts` — tracker CRUD tests
- `tests/e2e/create.test.ts`, `update.test.ts`, `delete.test.ts` — e2e tests

## Related Topics

- [hierarchy-status.expertise.md](hierarchy-status.expertise.md): how CRUD interacts with parent-child constraints
- [dependencies-blockages.expertise.md](dependencies-blockages.expertise.md): auto-resolution during updates
- [patterns/event-sourcing.expertise.md](patterns/event-sourcing.expertise.md): detailed event sourcing conventions
- [patterns/index-manager-pattern.expertise.md](patterns/index-manager-pattern.expertise.md): how the index tracks issues

## Business Rules And Invariants

- Two events on creation: CreationEvent + UpdateEvent with initial fields
- computeState() must produce identical results regardless of replay count
- Index entries are denormalized for fast list/filter (must stay in sync)
- ID format: `Date.now().toString(36).slice(0,6) + Math.random().toString(36).slice(-4)` — always 10 chars
- Init is idempotent: returns ALREADY_INITIALIZED (not an error, exit 0) if dir exists

## Technical Notes

- All file writes use atomic write-to-temp-then-rename pattern via `src/core/file-io.ts`
- Events are appended (never modified in place) — this is core to the sourcing model
- Index manager uses binary search for sorted lookups
