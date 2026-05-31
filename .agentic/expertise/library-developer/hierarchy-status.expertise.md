# Hierarchy And Status

## When To Use This

Tasks involving parent-child issue relationships, status ordering, status cascade behavior, upward auto-promotion, reparenting, closing issues with children, or hierarchy validation. "Parent-child constraints", "cascade on close", "promote parent", "change parentId".

## Mental Model

Issues can have a `parentId` forming a tree hierarchy. Status ordering is strict: **open < in-progress < done < closed**.

**Downward cascade**: When a parent transitions to done/closed, all children that can be closed are auto-closed. `getClosableChildren()` determines which children qualify.

**Upward auto-promotion**: When a child advances past its parent's status, the parent is automatically promoted to match. `computeUpwardPromotions()` calculates this recursively up the tree. Promotion is currently uncapped (parent can be promoted to done/closed).

**Reparenting**: Changing `parentId` on update triggers constraint checks via `validateNewChild()`. The old parent loses the child from its childrenOf map, the new parent gains it.

**Hierarchy constraints**:
- Parent must exist and not be closed when adding a child
- Closed items cannot have children added
- Changing parent status must not violate children's status ordering

The `hierarchy.ts` module contains pure functions only — no side effects, no file I/O. All mutation happens in `tracker.ts` which calls hierarchy functions for validation.

## Code Map

- `src/core/hierarchy.ts` — isStatusAfter, validateNewChild, validateParentStatusChange, getClosableChildren, computeUpwardPromotions
- `src/core/tracker.ts` — create() validates parentId, update() handles cascade + promotion + reparenting
- `src/core/index-manager.ts` — addChild, removeChild, getChildren for childrenOf map
- `tests/core/hierarchy.test.ts` — unit tests for pure hierarchy functions
- `tests/core/tracker/tracker-hierarchy.test.ts` — tracker integration tests for hierarchy behavior
- `tests/e2e/hierarchy.test.ts` — e2e tests

## Related Topics

- [issue-crud-events.expertise.md](issue-crud-events.expertise.md): how hierarchy changes interact with event sourcing
- [spec-reviews.expertise.md](spec-reviews.expertise.md): cap-upward-promotion spec (proposed capping at in-progress)

## Business Rules And Invariants

- Status order: open < in-progress < done < closed
- Closed items cannot have children added
- Parent must exist and not be closed when creating a child
- Upward promotion is recursive (grandparent affected too)
- HIERARCHY_CONSTRAINT error (exit code 12) on constraint violations

## Gaps And Validation Needs

- Cap-upward-promotion spec reviewed but not implemented — promotion currently uncapped (parent can go to done/closed)
- Reparenting uses same computeUpwardPromotions function — changes to promotion affect reparenting too
