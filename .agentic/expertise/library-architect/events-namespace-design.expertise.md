# Events namespace and the event-sourced model

## When To Use This

Any task touching `agt events`, `agt history`, the `Event` union, custom event types, event filtering, or the compute engine: "events list", "events add", "custom event", "reserved event type", "Event union", "computeState", "computeComments", "appendEvent", "replayEvents", "HistoryResult", "history(id)".

## Mental Model

Agentrack issues are **event-sourced**. Each issue is a JSONL append-only log of events; the current issue state and its comments are *computed* by replaying the log. This is why a custom event that the engine ignores is safe to store alongside reserved events.

### Reserved event types (the 8 that agentrack interprets)

`creation`, `update`, `comment`, `comment-update`, `comment-delete`, `blockage-added`, `blockage-resolved`, `blockage-deleted`. These have string-literal `type` fields and form a TypeScript discriminated union in `types/event.ts`.

### Compute engine (`core/events.ts`)

- `replayEvents(issueFilePath)` → reads the JSONL log, returns the raw `Event[]`.
- `computeState(events)` → folds events into the current `IssueProperties` (title, status, assignee, tags, priority, parentId, timestamps). `updatedAt` keys off the **last event's timestamp**, regardless of type.
- `computeComments(events)` → folds comment/comment-update/comment-delete events into the comment list.
- `appendEvent(issueFilePath, event)` → appends one event to the log.

The engine only inspects specific literal `type` values; unknown/custom types fall through silently. There is **no `default` branch that throws** — this must stay true for custom events to be safe.

### `Tracker.history(id)` and `agt history <id>`

Today `core/tracker.ts` exposes `history(id)` (around lines 885–935): it does auth/index/missing-file checks, calls `replayEvents`, and returns the raw `Event[]` (`HistoryResult`). The CLI wires this as `agt history <issueId>` in `cli/commands/history.ts` + `cli/runner.ts`. The spec below **removes** the CLI command and replaces the tracker method with `eventsList` + `eventsAdd`.

## The `agt events` spec (DESIGN — not yet implemented)

Authored on issue `mqgxdtmenb` (2026-06-16) and posted there as a comment (`mqh0m511il`). Implementation is tracked on the blocked child issue **`mqgxdt9me7`**, assigned to library-developer. **Verify every detail below against the actual implementation once `mqgxdt9me7` lands** — the spec may have been adjusted during implementation.

Key decisions:

1. **New `CustomEvent` variant** in `types/event.ts`: `{ type: string; content: Record<string, unknown> }` extending `BaseEvent`. Widens the discriminated union; existing literal switches still discriminate correctly because `CustomEvent.type` is the catch-all `string`.
2. **`RESERVED_EVENT_TYPES`** frozen list + `ReservedEventType` type + `isReservedEventType(type)` helper, exported from both barrels.
3. **New error code** `RESERVED_EVENT_TYPE` (exit 22) when a custom event collides with a reserved type. Reuse `INVALID_PARAMS` (exit 10) for malformed payloads (non-object content, empty/non-string type, bad JSON).
4. **`tracker.eventsList(id, { type? })`** — same checks as `history()`; if `type` is set, filter `events.filter(e => e.type === type)`.
5. **`tracker.eventsAdd(id, { type, content, author? })`** — re-validates (non-empty type, not reserved, content is a plain object), builds a `CustomEvent` with `new Date().toISOString()` timestamp and resolved author, calls `appendEvent`.
6. **Back-compat**: keep `tracker.history(id)` as a `@deprecated` alias delegating to `this.eventsList(id)`. Library consumers must not break.
7. **CLI**: remove `agt history`; add `agt events list <issueId> [--type <type>]` and `agt events add <issueId> <event-json>` under a new `cli/commands/events.ts`, wired in `cli/runner.ts`.
8. **Semantic invariant**: a `CustomEvent` MUST NOT alter `computeState` (except `updatedAt`, which legitimately bumps) and MUST NOT appear in `computeComments`.

New api types (`types/api.ts`): `EventsListParams`, `EventsListResult`, `EventsAddParams`, `EventsAddResult`; `HistoryResult` aliased to `EventsListResult` and marked deprecated.

The full acceptance criteria (9 items), test plan, and migration note live in the comment on `mqgxdtmenb`.

## Related Topics

- [architect-overview.expertise.md](architect-overview.expertise.md): how this spec was investigated and delivered.
- [command-scanner-gotcha.expertise.md](command-scanner-gotcha.expertise.md): why posting the spec as a comment took several attempts.
- library-developer's `library-overview.expertise.md`: the three-file export pattern (`tracker.ts` + `types/api.ts` + both barrels) that this spec follows.

## Timeline

- 2026-06-16: Spec designed and posted on `mqgxdtmenb`. Implementation handed off to library-developer via `mqgxdt9me7`.

## Gaps And Validation Needs

- **Spec not yet implemented.** Treat the API shapes above as the intended design, not as code that exists. Re-read `types/event.ts`, `core/tracker.ts`, `cli/commands/events.ts` once `mqgxdt9me7` is done and update this file with any divergences.
- The line range cited for `history()` (~885–935 in `tracker.ts`) was accurate as of this session; `tracker.ts` is large and shifts — re-locate with `grep -n "history"` before quoting line numbers again.
- Whether `computeState`/`computeComments` truly have no throwing `default` branch was inferred from the design discussion, not verified line-by-line; confirm when implementation work begins.
