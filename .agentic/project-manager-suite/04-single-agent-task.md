# Story 04: Single Agent Task — Minimal Breakdown

## Loop
Work Loop

## Description
A small styling task that only needs the webapp styler. The PM still enforces the phase structure but adapts it to a minimal flow since no implementation is needed (the feature already exists, it just needs polish).

## Initial Conditions

- **Work queue:** Empty
- **Input:** "Polish the login page button styles"
- **agentrack state:** The login page is already built and functional — only visual improvements needed

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives a small styling task.
2. The PM determines it's a single-agent task — the UI already exists, just needs polish.
3. The PM still creates a minimal phase structure adapted to styling work.

## Expected Output

```
Feature: "Polish login page button styles" (tag: feature, assigned: project-manager, status: todo)
├── Task: "Review and plan button style improvements" (tag: task, assigned: webapp-styler, status: todo, phase: planning)
├── Task: "Implement button style improvements" (tag: task, assigned: webapp-styler, status: todo, phase: styling)
│   └── Blocked by "Review" task
└── Task: "Validate button style changes" (tag: task, assigned: webapp-validator, status: todo, phase: validation)
    └── Blocked by "Implement" task
```

**Assignment rationale:**
- **Planning → `webapp-styler`**: The styler uses playwright-cli to inspect the current login page, identifies what needs improvement (spacing, colors, hover states, etc.), and plans the changes.
- **Styling → `webapp-styler`**: Same agent implements the visual improvements — CSS, component tweaks, responsive adjustments. Must visually verify with playwright-cli before marking done.
- **Validation → `webapp-validator`**: Even styling changes should be validated — ensure no visual regressions, responsive breakpoints work, accessibility is maintained. The validator does NOT adjust styles.
- **No release phase** — styling changes deploy with the webapp automatically, no separate release needed.
- **No developer needed** — the feature already exists. The styler works directly on the existing UI.

**Key behaviors:**
- The PM adapts the phases to the task: planning + styling + validation (not the full Plan → Dev → Validate → Release)
- The styler handles both planning and implementation since this is their domain
- Validation is still assigned to the validator — the styler doesn't write tests
- The PM should NOT collapse all phases into a single issue — phases ensure quality
- **PM leaves the parent at `todo`** after creating children — the PM does NOT flip it to `in-progress`. The status loop auto-promotes it to `in-progress` when a child starts. No verification child is created. The status loop completes the parent once validation (the last phase) is `done`. See Story 01 for the full lifecycle explanation.

## Notes
- The PM correctly recognizes that `webapp-developer` is NOT needed here — the feature is already built
- The PM correctly recognizes that `library-*` agents are NOT involved — this is a webapp-only task
- If the styler finds the underlying component needs structural changes (not just CSS), it should report that to PM, who would then create a task for `webapp-developer`
