# Dependencies And Blockages

## When To Use This

Tasks involving issue blockages, dependency tracking, cycle detection, impact scoring, auto-resolution of blockages, or the dependencies.json file. "Block an issue", "resolve blockage", "cycle in dependencies", "how blocked issues sort".

## Mental Model

Blockages model "issue A is blocked by issue B". Data is persisted in two places:
1. **dependencies.json** — global blockage state (blocker→blocked mappings)
2. **Issue event files** — `BlockageAddedEvent`, `BlockageResolvedEvent`, `BlockageDeletedEvent` appended to the blocked issue's event stream

**Key operations**:
- `addBlockage` — appends BlockageAddedEvent to issue events + writes dependencies.json. Supports batch mode (multiple blockages in one call with single cycle-check pass).
- `resolveBlockage` — appends BlockageResolvedEvent
- `deleteBlockage` — appends BlockageDeletedEvent
- `getImpactScore(blockedIssueId)` — recursive BFS counting all transitively blocked issues (via children hierarchy). Returns count.
- `detectCycle(sourceId, targetId, deps)` — DFS from targetId through blockedBy edges. Returns true if path reaches sourceId.

**Auto-resolution**: When `tracker.update()` transitions an issue to done/closed, all active blockages pointing to that issue as the blocker are auto-resolved.

**List sort**: Impact score used as tiebreaker — higher impact = earlier in list.

**Sync read**: `readDependenciesSync(trackerDir)` is a private sync helper in tracker.ts using `readFileSync`. Needed inside sort comparators where async is not possible.

## Code Map

- `src/core/dependency-manager.ts` — all dependency/blockage functions (CRUD, BFS impact, DFS cycle)
- `src/core/tracker.ts` — blockagesAdd (with batch), blockagesResolve, blockagesDelete, blockagesList, auto-resolution in update()
- `src/types/dependency.ts` — dependency-related types
- `tests/core/dependency-manager.test.ts` — unit tests
- `tests/core/tracker/tracker-blockages.test.ts` — tracker integration tests
- `tests/e2e/blockages.test.ts` — e2e tests

## Related Topics

- [hierarchy-status.expertise.md](hierarchy-status.expertise.md): impact score traverses children hierarchy
- [next-recommendation.expertise.md](next-recommendation.expertise.md): next excludes blocked issues

## Business Rules And Invariants

- Cycle detection prevents circular blockage dependencies
- Batch blockage operations do a single cycle-check pass over accumulated proposed edges
- Auto-resolution fires on done/closed status transitions only
- BLOCKAGE_CYCLE error when a cycle would be created
- Impact score counts transitively blocked issues via children (not blockage chains)
