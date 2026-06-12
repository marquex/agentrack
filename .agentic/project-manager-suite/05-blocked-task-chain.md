# Story 05: Blocked Task Chain — Sequential Dependencies

## Loop
Work Loop

## Description
Multiple features must be completed in a strict sequence — each depends on the previous one being released. The PM must create an Epic to link the related features, with proper blockage chains between them.

## Initial Conditions

- **Work queue:** Empty
- **Input:** A multi-step migration: "1) Refactor the event store, 2) Add indexing to events, 3) Update CLI commands to use indexed events"
- **agentrack state:** No existing issues

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives a multi-step request with clear sequential dependencies.
2. Each step depends on the previous one completing and being released.
3. The three features are related (same migration goal) — they need an Epic parent to link them.
4. The PM creates an Epic with 3 child Features, each with its own 4-phase lifecycle + sync tracker.

## Expected Output

```
Epic: "Migrate to indexed events" (tag: epic, assigned: project-manager, status: in-progress)
│
├── Chore: "Refactor event store" (tag: chore, assigned: project-manager, status: in-progress)
│   ├── Task: "Design refactored event store" (tag: task, assigned: library-architect, status: todo, phase: planning)
│   ├── Task: "Implement event store refactor" (tag: task, assigned: library-developer, status: todo, phase: development)
│   │   └── Blocked by "Design" task
│   ├── Task: "Validate event store refactor" (tag: task, assigned: library-validator, status: todo, phase: validation)
│   │   └── Blocked by "Implement" task
│   ├── Task: "Release event store refactor" (tag: task, assigned: library-releaser, status: todo, phase: release)
│   │   └── Blocked by "Validate" task
│   └── Task: "Verify refactor complete" (tag: task,sync, assigned: project-manager, status: todo)
│       └── Blocked by "Release" task
│
├── Feature: "Add indexing to events" (tag: feature, assigned: project-manager, status: in-progress)
│   ├── Task: "Design event indexing" (tag: task, assigned: library-architect, status: todo, phase: planning)
│   │   └── Blocked by Chore "Release" task (can't design indexing until refactored store is released)
│   ├── Task: "Implement event indexing" (tag: task, assigned: library-developer, status: todo, phase: development)
│   │   └── Blocked by "Design" task
│   ├── Task: "Validate event indexing" (tag: task, assigned: library-validator, status: todo, phase: validation)
│   │   └── Blocked by "Implement" task
│   ├── Task: "Release event indexing" (tag: task, assigned: library-releaser, status: todo, phase: release)
│   │   └── Blocked by "Validate" task
│   └── Task: "Verify indexing complete" (tag: task,sync, assigned: project-manager, status: todo)
│       └── Blocked by "Release" task
│
├── Feature: "Update CLI commands for indexed events" (tag: feature, assigned: project-manager, status: in-progress)
│   ├── Task: "Design CLI update for indexed events" (tag: task, assigned: library-architect, status: todo, phase: planning)
│   │   └── Blocked by Feature "Release" task (can't plan CLI until indexing is released)
│   ├── Task: "Implement CLI update" (tag: task, assigned: library-developer, status: todo, phase: development)
│   │   └── Blocked by "Design" task
│   ├── Task: "Validate CLI update" (tag: task, assigned: library-validator, status: todo, phase: validation)
│   │   └── Blocked by "Implement" task
│   ├── Task: "Release CLI update" (tag: task, assigned: library-releaser, status: todo, phase: release)
│   │   └── Blocked by "Validate" task
│   └── Task: "Verify CLI update complete" (tag: task,sync, assigned: project-manager, status: todo)
│       └── Blocked by "Release" task
│
└── Task: "Verify migration epic complete" (tag: task,sync, assigned: project-manager, status: todo)
    └── Blocked by all 3 feature sync trackers (all must complete)
```

**3-level hierarchy: Epic → Feature/Chore → Task**
- **Epic** groups the 3 related features. No Initiative needed — there's only one group.
- **Chore/Feature** are the deliverables with full 4-phase lifecycles. The refactoring is tagged `chore` (technical maintenance), the others are `feature` (new capabilities).
- **Task** is individual phase work assigned to worker agents.

**Why Epic instead of Initiative?** An Initiative groups Epics. Here we only have one group of features, so an Epic suffices. If later we had multiple Epics to coordinate, we'd wrap them in an Initiative.

**Why tag the first feature as `chore`?** "Refactor event store" is technical maintenance — no new user-facing capability. It's a chore, not a feature. The other two are features because they add new capabilities (indexing, updated CLI).

**Assignment rationale:**
Each feature follows the same pattern:
- **Planning → `library-architect`**: Each step needs architectural thought — the refactoring design affects how indexing works, which affects how CLI commands change.
- **Development → `library-developer`**: Implementation of each step.
- **Validation → `library-validator`**: Tests for each step.
- **Release → `library-releaser`**: Each step is released independently before the next starts.

**Key behaviors:**
- The PM creates an Epic to link all 3 related features — no orphaned related work
- Each feature has its own sync tracker for the PM to get notified when that feature completes
- The Epic has a sync tracker blocked by all 3 feature sync trackers
- Cross-feature blockages link the release of one to the planning of the next
- Only the first feature (Chore: "Refactor") is immediately actionable — the rest wait
- The chain resolves itself automatically as each feature completes
- Tags make the hierarchy visible: `epic` → `chore`/`feature` → `task`

## Notes
- Without the Epic parent, the 3 features would be orphaned — agents couldn't see they're related
- The hierarchy is strict: Task ← Feature/Chore ← Epic. No levels skipped.
- If this migration were part of a larger effort with other epics, we'd wrap it in an Initiative
