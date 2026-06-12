# Story 03: Multi-Team Feature

## Loop
Work Loop

## Description
A feature spans both the library and the webapp. The PM must coordinate across two teams, ensuring library work completes before the webapp can integrate it.

## Initial Conditions

- **Work queue:** Empty
- **Input:** "Add a dashboard page that shows issue statistics pulled from the library API"
- **agentrack state:** No existing issues

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives the cross-team feature request.
2. The PM identifies that this requires library API work first, then webapp integration.
3. The PM creates a top-level parent with two major sub-epics — one for each team.
4. Within each epic, the standard 4 phases are applied.
5. Cross-team blockages ensure the webapp can't start until the library work is done.

## Expected Output

```
Initiative: "Add dashboard page with issue statistics" (tag: initiative, assigned: project-manager, status: in-progress)
│
├── Epic: "Library API for issue statistics" (tag: epic, assigned: project-manager, status: in-progress)
│   │
│   └── Feature: "Issue statistics API" (tag: feature, assigned: project-manager, status: in-progress)
│       ├── Task: "Design issue statistics API" (tag: task, assigned: library-architect, status: todo, phase: planning)
│       ├── Task: "Implement issue statistics API" (tag: task, assigned: library-developer, status: todo, phase: development)
│       │   └── Blocked by "Design" task
│       ├── Task: "Validate issue statistics API" (tag: task, assigned: library-validator, status: todo, phase: validation)
│       │   └── Blocked by "Implement" task
│       ├── Task: "Release issue statistics API" (tag: task, assigned: library-releaser, status: todo, phase: release)
│       │   └── Blocked by "Validate" task
│       └── Task: "Verify statistics API complete" (tag: task,sync, assigned: project-manager, status: todo)
│           └── Blocked by "Release" task
│
├── Epic: "Webapp dashboard page" (tag: epic, assigned: project-manager, status: in-progress)
│   │
│   └── Feature: "Dashboard page UI" (tag: feature, assigned: project-manager, status: in-progress)
│       ├── Task: "Plan dashboard page integration" (tag: task, assigned: webapp-developer, status: todo, phase: planning)
│       │   └── Blocked by library "Release" task (can't plan integration until API is released)
│       ├── Task: "Implement dashboard page" (tag: task, assigned: webapp-developer, status: todo, phase: development)
│       │   └── Blocked by "Plan" task
│       ├── Task: "Polish dashboard page design" (tag: task, assigned: webapp-styler, status: todo, phase: styling)
│       │   └── Blocked by "Implement" task
│       ├── Task: "Validate dashboard page" (tag: task, assigned: webapp-validator, status: todo, phase: validation)
│       │   └── Blocked by "Polish" task
│       └── Task: "Verify dashboard page complete" (tag: task,sync, assigned: project-manager, status: todo)
│           └── Blocked by "Validate" task
│
└── Task: "Verify dashboard initiative complete" (tag: task,sync, assigned: project-manager, status: todo)
    └── Blocked by both feature sync trackers (both epics must complete)
```

**4-level hierarchy: Initiative → Epic → Feature → Task**
This story uses all 4 levels because it's a multi-team initiative:
- **Initiative** groups the two team-level epics
- **Epic** groups each team's work (one per team)
- **Feature** is the deliverable with a full Plan→Dev→Validate→Release lifecycle
- **Task** is individual phase work assigned to worker agents

The hierarchy is strict: no skipping levels. Tasks always live inside Features, Features inside Epics, Epics inside Initiatives.

**Assignment rationale:**

*Library Epic:*
- **Planning → `library-architect`**: Statistics API needs proper design (endpoints, data shapes, query capabilities). Architect creates the spec.
- **Development → `library-developer`**: Implements the API from the architect's spec.
- **Validation → `library-validator`**: Writes tests for the new API endpoints. Reports any bugs to PM (doesn't fix them).
- **Release → `library-releaser`**: Runs full test suite, generates docs, builds, publishes.

*Webapp Epic:*
- **Planning → `webapp-developer`**: Plans the dashboard page — how to consume the library API, component structure, data flow. Blocked until library is released.
- **Development → `webapp-developer`**: Builds the dashboard page, integrates the API, creates components. Functional but not polished.
- **Styling → `webapp-styler`**: Polishes the dashboard visually — layout, colors, spacing, responsive design. Works AFTER developer builds the feature. Uses playwright-cli to visually inspect.
- **Validation → `webapp-validator`**: Writes E2E and unit tests for the dashboard. Tests the full user flow. Does NOT fix bugs — reports issues to PM.

*Cross-team dependency:*
- The webapp epic is blocked by the library release — the webapp developer can't even plan the integration until the API is available and documented.

**Key behaviors:**
- The PM recognizes cross-team dependencies and models them with blockages
- Each team follows the 4-phase structure independently
- The library release must complete before the webapp can start planning its integration
- The `webapp-styler` is an additional phase unique to webapp work — it comes after development but before validation
- The PM uses a 3-level hierarchy: Feature → Epic → Task
- **PM sets parent and epics to `in-progress`** after creating all children — prevents re-waking. Each level has its own sync tracker. See Story 01 for the single-epic lifecycle example.
- Blockages resolve automatically when an agent marks its issue `done`, cascading through the chain across both teams

## Notes
- This is the most complex planning scenario — cross-team coordination
- The styler is webapp-specific — library features don't have a styling phase
- The webapp has no separate "releaser" — styling is the last phase before validation
- If validation finds bugs in either epic, the validator reassigns to PM who creates a new dev task in the correct epic
