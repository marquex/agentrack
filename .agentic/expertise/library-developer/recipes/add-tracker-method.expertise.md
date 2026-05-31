# Recipe: Add A New Tracker Method

## Trigger

Task asks to add new business logic to the Tracker class that is exposed as a public API method.

## Preconditions

- The event types (if needed) are defined in `src/types/event.ts`
- Result types are defined in `src/types/api.ts`
- The method's domain is clear (CRUD, comments, blockages, users, etc.)

## Steps

1. **Define result type** in `src/types/api.ts`
   - Use discriminated union with `result` field for multi-outcome methods
   - Follow existing naming: `<Domain><Action>Result` (e.g., `CommentsAddResult`)
   - Include `| AgentrackError` for methods that can fail

2. **Add method to Tracker class** in `src/core/tracker.ts`
   - Validate init state (throw if not initialized)
   - Check auth (read vs write using resolveAuthor)
   - Perform business logic
   - Use `appendEvent()` for event-sourced operations
   - Update index manager for indexed fields
   - Return result type

3. **Export result type** from `src/types/index.ts` and `src/index.ts`

4. **Add unit tests** in appropriate test file under `tests/core/tracker/`
   - Test success cases
   - Test error cases (not initialized, auth failures, constraint violations)
   - Test edge cases

5. **Add CLI command** (see add-cli-command recipe if user-facing)

6. **Verify**: `bun run quality`

## Relevant Files

- `src/core/tracker.ts` — Tracker class
- `src/types/api.ts` — result types
- `src/core/events.ts` — appendEvent, computeState, computeComments
- `src/core/index-manager.ts` — index operations
- `src/core/errors.ts` — error codes

## Known Pitfalls

- Init validation must happen before any file I/O
- Auth check level depends on operation (read-only for reads, write for mutations)
- Index updates must stay in sync with event appends
- If the method needs to be called from a sort comparator, you need a sync version (see readDependenciesSync pattern)
- All file writes must go through file-io.ts atomic write utilities
