# Recipe: Add A New Event Type

## Trigger

Task requires storing new structured data in the event stream that doesn't fit existing event types.

## Preconditions

- The new event type represents a distinct occurrence in issue history
- Existing event types (Creation, Update, Comment, CommentUpdate, CommentDelete, BlockageAdded, BlockageResolved, BlockageDeleted) don't cover the need

## Steps

1. **Define the event interface** in `src/types/event.ts`
   - Follow naming convention: `<Noun><Verb>Event` (e.g., `BlockageAddedEvent`)
   - Include: `type` discriminator string, `timestamp`, `issueId`, and domain-specific fields

2. **Add to the Event union type** in `src/types/event.ts`
   - `export type Event = ... | NewEventType`

3. **Update computeState()** in `src/core/events.ts` (if the event affects ComputedIssue)
   - Add a case in the replay switch for the new event type
   - Update the appropriate computed fields

4. **OR create a new compute function** (if the event adds a new domain, like computeComments)
   - New function in `src/core/events.ts`
   - Replay relevant events and return computed result type

5. **Add appendEvent usage** in Tracker method
   - Call `appendEvent(trackerDir, issueId, newEvent)`
   - Update index if the event changes indexed fields

6. **Add tests**
   - Unit test for the new compute function or computeState case
   - Tracker integration test for the method that creates the event
   - CLI test if user-facing

7. **Verify**: `bun run quality`

## Relevant Files

- `src/types/event.ts` — event type definitions and Event union
- `src/core/events.ts` — replay and compute functions
- `src/core/tracker.ts` — methods that create events

## Known Pitfalls

- Events are append-only — never modify existing event structure
- computeState must handle all event types, including new ones, or explicitly skip them
- Two events on creation (CreationEvent + UpdateEvent) is the established pattern for initial field values
- New event types must not break replay of existing event files
