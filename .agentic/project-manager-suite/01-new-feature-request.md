# Story 01: New Feature Request — Full Lifecycle

## Loop
Work Loop

## Description
A new feature request arrives as an idea or is given to the PM. The PM must plan it through all 4 phases (Planning → Development → Validation → Release) creating the proper issue hierarchy with assignments and blockages. The PM does NOT create a verification child — the status loop completes the parent when all children are done.

## Initial Conditions

- **Work queue:** Empty — no other issues in progress
- **Input:** A new feature request arrives: "Add search functionality to the issue list"
- **agentrack state:**
  - No existing issues related to this feature
  - All agents registered and available

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives the feature request.
2. The PM creates a parent issue for the overall feature.
3. The PM breaks it down into child issues covering all 4 phases.
4. The PM sets the parent to `in-progress` — prevents the work loop from re-waking PM every cycle.
5. From here, **worker agents** drive the child transitions — the status loop completes the parent when every child is `done`.

## Expected Output

### What the PM creates (initial state)

```
Feature: "Add search functionality to the issue list" (tag: feature, assigned: project-manager, status: in-progress)
├── Task: "Design search API for issue list" (tag: task, assigned: library-architect, status: todo, phase: planning)
├── Task: "Implement search functionality" (tag: task, assigned: library-developer, status: todo, phase: development)
│   └── Blocked by Task 1
├── Task: "Validate search functionality" (tag: task, assigned: library-validator, status: todo, phase: validation)
│   └── Blocked by Task 2
└── Task: "Release search functionality" (tag: task, assigned: library-releaser, status: todo, phase: release)
    └── Blocked by Task 3
```

**No verification child.** The PM does NOT create a "Verify complete" child to detect completion. Children are phase tasks only. The **status loop** periodically scans the PM's `in-progress` parents and completes any whose children are ALL `done` — that is the PM's completion alarm.

**Why parent is `in-progress`?** If the parent stays `todo`, the work loop wakes the PM every cycle to "work" on it. `in-progress` signals: "work is happening through children — leave me alone until the status loop finds all children done."

### What happens after — status transitions (driven by worker agents)

```
PM sets parent → in-progress (after creating all children)
       │
       ▼
Step 1: Work loop wakes library-architect (Child 1 is todo, unblocked)
  → Architect sets Child 1: todo → in-progress
  → Architect designs the search API, writes spec
  → Architect sets Child 1: in-progress → done
  → Architect adds comment: "Search API spec complete. Query params: q, limit, offset..."
  → System auto-resolves blockage on Child 2

Step 2: Work loop wakes library-developer (Child 2 is todo, now unblocked)
  → Developer sets Child 2: todo → in-progress
  → Developer reads spec, implements search feature
  → Developer sets Child 2: in-progress → done
  → Developer adds comment: "Search implemented. Supports q, limit, offset params."
  → System auto-resolves blockage on Child 3

Step 3: Work loop wakes library-validator (Child 3 is todo, now unblocked)
  → Validator sets Child 3: todo → in-progress
  → Validator writes tests, runs quality checks
  → Validator sets Child 3: in-progress → done
  → Validator adds comment: "All tests pass. Coverage: 94%. No quality issues found."
  → System auto-resolves blockage on Child 4

Step 4: Work loop wakes library-releaser (Child 4 is todo, now unblocked)
  → Releaser sets Child 4: todo → in-progress
  → Releaser runs tests, generates docs, builds, publishes
  → Releaser sets Child 4: in-progress → done
  → Releaser adds comment: "Released as v2.3.0. Published to npm."
  → All children are now done

Step 5: Status loop runs → finds the Feature in-progress + every child done
  → PM marks Feature: in-progress → done (the feature HAS a parent? No — top-level)
  → Since the Feature has NO parent, PM closes it and closes every child:
      Feature → closed
      Child 1..4 (done) → closed
  → PM adds comment: "Feature complete. All phases done."
```

If any step fails, the worker agent sets the issue back to `todo` and reassigns to `project-manager` with a problem comment. The PM then decides how to proceed. The parent stays `in-progress` (not all children done) until the failing step is resolved.

**Assignment rationale:**
- **Planning → `library-architect`**: Search needs API design (query params, return types, pagination). The architect creates the spec that guides implementation.
- **Development → `library-developer`**: Implementation is a coding task — the developer turns the spec into working TypeScript.
- **Validation → `library-validator`**: The validator writes tests and verifies quality. It does NOT fix bugs — if it finds issues, it reports back to PM who creates a new dev task.
- **Release → `library-releaser`**: The releaser runs the full test suite, generates docs, builds, bumps version, and publishes. It's a gate — if anything fails, it stops and reports back.

**Key behaviors:**
- PM creates parent in `todo`, then immediately sets to `in-progress` after children are created
- PM does NOT create a verification/sync child — children are phase tasks only
- Worker agents drive all child transitions (`todo` → `in-progress` → `done`)
- Blockages resolve automatically when agents mark issues `done`
- PM is NOT woken by a child on completion — the **status loop** detects the parent's children are all `done` and completes it
- A top-level parent (no parent of its own) is `closed` and its children `closed` once all children are `done`; a sub-deliverable (has a parent) is marked `done`

## Notes
- This is the canonical "happy path" for any new library feature
- There is NO completion/verification child — the status loop completes the parent. This applies to ALL stories where the PM creates a parent with children.
- The architect is used for planning because search requires API design decisions
- For simpler features, the developer might handle planning themselves (see Story 04)
- If validation finds bugs, the validator reassigns to PM — PM then creates a new dev task (not a validation task)
- The PM only touches worker child statuses during the **status loop** (fixing stuck issues, see Stories 07-10) or when closing a completed top-level parent
