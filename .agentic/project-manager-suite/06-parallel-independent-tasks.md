# Story 06: Parallel Independent Tasks

## Loop
Work Loop

## Description
Two unrelated features need to be worked on simultaneously. They have no dependencies between them and involve different teams. The PM must create them without cross-blockages so they can proceed in parallel.

## Initial Conditions

- **Work queue:** Empty
- **Input:** Two unrelated requests:
  1. "Add pagination to the issue list CLI command"
  2. "Fix the dark mode toggle on the webapp"
- **agentrack state:** No existing issues

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives two independent requests.
2. The PM identifies they have no dependencies between them and involve different codebases.
3. The PM creates two separate parent issues, each with their own 4-phase lifecycle.
4. No blockages are created between the two features — they can run in parallel.

## Expected Output

```
Feature: "Add pagination to issue list CLI" (tag: feature, assigned: project-manager, status: in-progress)
├── Task: "Plan pagination implementation" (tag: task, assigned: library-developer, status: todo, phase: planning)
├── Task: "Implement pagination" (tag: task, assigned: library-developer, status: todo, phase: development)
│   └── Blocked by "Plan" task
├── Task: "Validate pagination" (tag: task, assigned: library-validator, status: todo, phase: validation)
│   └── Blocked by "Implement" task
└── Task: "Release pagination" (tag: task, assigned: library-releaser, status: todo, phase: release)
    └── Blocked by "Validate" task
    No blockages to or from Bug below

Bug: "Fix dark mode toggle on webapp" (tag: bug, assigned: project-manager, status: in-progress)
├── Task: "Reproduce and diagnose dark mode issue" (tag: task, assigned: webapp-validator, status: todo, phase: reproduction)
├── Task: "Implement dark mode fix" (tag: task, assigned: webapp-developer, status: todo, phase: development)
│   └── Blocked by "Reproduce" task
└── Task: "Validate dark mode fix" (tag: task, assigned: webapp-validator, status: todo, phase: validation)
    └── Blocked by "Implement" task
    No separate release (webapp deploys automatically)
    No blockages to or from Feature above
```

**Why no Initiative grandparent?** These two items are completely unrelated — different teams, different codebases, no dependencies. They don't share a goal, so no linking is needed. Only related work gets an Initiative wrapper.

**Assignment rationale:**

*Pagination (Library):*
- **Planning → `library-developer`**: Pagination is a straightforward feature — the developer can plan the implementation without needing an architect. (For comparison, see Story 01 where search needed architect involvement for API design.)
- **Development → `library-developer`**: Standard implementation.
- **Validation → `library-validator`**: Writes tests for pagination behavior.
- **Release → `library-releaser`**: Builds and publishes.

*Dark mode fix (Webapp):*
- **Planning → `webapp-developer`**: Bug fix — developer diagnoses and plans the fix.
- **Development → `webapp-developer`**: Fixes the dark mode toggle.
- **Validation → `webapp-validator`**: Writes tests to prevent regression.
- **No styler needed** — this is a bug fix, not a visual polish task. The toggle should already look correct; it just doesn't work.
- **No release** — webapp has no separate release phase.

**Key behaviors:**
- Both features are immediately actionable — the work loop can pick up both
- Different teams work on different features simultaneously (library team vs webapp team)
- No cross-feature blockages
- Each feature follows the 4-phase structure independently
- The PM correctly recognizes pagination is simple enough for the developer to plan (no architect needed)
- The PM correctly recognizes the dark mode fix is a bug, not a styling task (no styler needed)
- **PM sets each parent to `in-progress`** after creating children — no verification child on either. Each parent is completed independently by the status loop once its children are all `done`. See Story 01 for the full lifecycle explanation.
- **Bug fix in Parent B** starts with reproduction by the validator (see Story 02), not planning by the developer.

## Notes
- This tests that the PM doesn't create unnecessary dependencies
- The PM should recognize when tasks are truly independent AND involve different codebases
- If both features touched the same codebase, the PM might want to sequence them to avoid merge conflicts
