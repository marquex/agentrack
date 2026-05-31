# Comments And Mentions

## When To Use This

Tasks involving comment CRUD, mention extraction, @mention handling, comment event format, or computeComments. "Add a comment", "edit comment", "delete comment", "mention a user", "@mention in issue".

## Mental Model

Comments are stored as events in the issue's event file. There is no separate comments file — comments are part of the event stream.

**Comment operations**:
- `commentsAdd` — appends CommentEvent
- `commentsUpdate` — appends CommentUpdateEvent
- `commentsDelete` — appends CommentDeleteEvent (soft delete)
- `commentsList` — replays events via computeComments() to produce ComputedComment[]

**Mentions**: When a comment contains `@username` patterns, mentions are extracted and tracked. The mentions system identifies which users are referenced in comments.

`computeComments()` in events.ts replays all comment-related events to produce the final comment state, including deletion status.

## Code Map

- `src/core/events.ts` — computeComments replay function
- `src/core/tracker.ts` — commentsAdd, commentsUpdate, commentsDelete, commentsList methods
- `src/core/mentions.ts` — mention extraction logic
- `src/types/event.ts` — CommentEvent, CommentUpdateEvent, CommentDeleteEvent types
- `src/types/mention.ts` — mention-related types
- `src/cli/commands/comments.ts` — CLI action handlers for comments subcommands
- `src/cli/commands/mentions.ts` — CLI action handler for mentions list
- `tests/core/events/compute-comments.test.ts` — comment replay tests
- `tests/core/tracker/tracker-comments.test.ts` — tracker comment integration
- `tests/core/mentions.test.ts` — mention unit tests
- `tests/core/tracker/tracker-mentions.test.ts` — tracker mention integration
- `tests/e2e/comments.test.ts`, `tests/e2e/mentions.test.ts` — e2e tests

## Related Topics

- [issue-crud-events.expertise.md](issue-crud-events.expertise.md): events model and replay
- [auth-users.expertise.md](auth-users.expertise.md): comment authors resolved via auth system

## Business Rules And Invariants

- Comments are soft-deleted (CommentDeleteEvent, not removal from array)
- computeComments must handle interleaved add/update/delete events correctly
- Mentions are extracted from comment content, not stored as separate entities in the event stream
