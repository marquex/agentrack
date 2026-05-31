# Event Sourcing Pattern

## When To Use This

Understanding or changing the event sourcing model. Adding new event types. Understanding how events are stored, appended, and replayed.

## Mental Model

Issues are event-sourced: each issue is stored as a JSON array of events in `issues/[id].json`. Current state is never stored — always computed by replaying events.

**Event types** (union in src/types/event.ts):
- `CreationEvent` — initial event for every issue
- `UpdateEvent` — field changes (title, desc, status, priority, assignee, parentId, tags)
- `CommentEvent` — new comment
- `CommentUpdateEvent` — comment edit
- `CommentDeleteEvent` — soft delete of comment
- `BlockageAddedEvent` — issue blocked by another
- `BlockageResolvedEvent` — blockage resolved
- `BlockageDeletedEvent` — blockage deleted

**Issue creation** produces two events: CreationEvent + UpdateEvent with initial fields.

**Replay functions** in `src/core/events.ts`:
- `appendEvent()` — appends event to issue file
- `replayEvents()` — replays all events for an issue
- `computeState()` — produces ComputedIssue from event stream
- `computeComments()` — produces ComputedComment[] from event stream

**Adding a new event type**:
1. Define the type in `src/types/event.ts`
2. Add to the Event union type
3. Add a case in `computeState()` or create a new compute function
4. Add a Tracker method that calls `appendEvent()` with the new event type
5. Add CLI command and tests

## Code Map

- `src/core/events.ts` — appendEvent, replayEvents, computeState, computeComments
- `src/types/event.ts` — all event type definitions and the Event union

## Referenced Recipes

- [recipes/add-event-type.expertise.md](recipes/add-event-type.expertise.md): step-by-step for adding new event types
