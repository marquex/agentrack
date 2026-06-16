# Story 28: Status Loop Completes a Top-Level Feature — Close Parent and Children

## Loop
Project Status Loop

## Description
A top-level Feature (no parent of its own) is `in-progress` and assigned to the PM. Every one of its phase-task children has been driven to `done` by the worker agents. The status loop wakes the PM to review its in-progress issues, and the PM must recognize that the work is finished and close the deliverable out completely: mark the Feature `closed` AND close every child. This tests that the PM does NOT wait for a verification child (there is none), does NOT leave the Feature lingering at `in-progress`, and does NOT only mark it `done` — a top-level deliverable with no parent is closed, and its children are closed with it.

## Initial Conditions

- **agentrack state:**
  - Issue #310 (Feature): "Add CSV export to the issue list" — status: `in-progress`, assignee: `project-manager`, no parent (top-level)
  - Issue #311 (Task): "Design CSV export API" — status: `done`, assignee: `library-architect`
  - Issue #312 (Task): "Implement CSV export" — status: `done`, assignee: `library-developer`
  - Issue #313 (Task): "Validate CSV export" — status: `done`, assignee: `library-validator`
  - Issue #314 (Task): "Release CSV export" — status: `done`, assignee: `library-releaser`
  - Each child has a completion comment from its assignee; #314 was marked `done` an hour ago
  - There are no other open issues

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Current state |
|---|---|
| `library-architect` | Idle — completed #311 |
| `library-developer` | Idle — completed #312 |
| `library-validator` | Idle — completed #313 |
| `library-releaser` | Idle — completed #314 |

## User Story

1. The PM is awakened by the status loop to review the issues assigned to it.
2. The PM finds Issue #310 (`in-progress`, assigned to itself) and lists its children.
3. The PM sees that ALL children (#311–#314) are `done`.
4. The PM recognizes the work is finished and completes the Feature.
5. Because the Feature has NO parent (it is top-level), the PM closes it — and closes every child.

## Expected Output

The PM should:

1. View Issue #310 and list its children (#311–#314).
2. Confirm every child is `done` (read the completion comments if needed — but the statuses alone are decisive: all `done` = work complete).
3. Recognize: the Feature has NO parent → it is a top-level deliverable → close it AND close every child.
4. Execute:
   - `agt update 310 --status closed`
   - `agt update 311 --status closed`
   - `agt update 312 --status closed`
   - `agt update 313 --status closed`
   - `agt update 314 --status closed`
   - `agt comments add 310 --content "Feature complete — all phases done. Closing feature and children."`
5. Do NOT create any new issue (no verification child), do NOT mark the Feature `done` (that is for deliverables that have a parent), and do NOT leave it `in-progress`.

**Key behaviors:**
- The PM is triggered by the **status loop**, not by a sync-tracker child firing — there is no verification child and there never was one.
- "All children `done`" is the ONLY completion signal the PM needs. It does NOT require a separate verification step.
- **Top-level (no parent) → `closed`**, not `done`. The PM closes the Feature and recursively closes every child beneath it.
- The PM does NOT close only the parent and leave the children as `done` — it closes every descendant.
- The PM does NOT mark a top-level Feature `done` and stop — `done` is reserved for a sub-deliverable that has a parent (so the parent can cascade). A top-level deliverable is fully cleared via `closed`.
- The PM adds a brief closing comment documenting the completion.

## Notes
- This is the canonical "completion via status loop" story for a top-level deliverable.
- Contrast with Story 29: a sub-deliverable (has a parent) is marked `done`, not closed — its parent cascades later.
- The PM must not confuse "all children done" with "still in progress" — once every child is `done`, the parent is completable immediately, no waiting.
- If even one child were still `todo`/`in-progress`, the PM would NOT complete the parent — it would move on (or diagnose a stuck child under the status loop's other job).
- The release being `done` an hour ago is a timing gap, not a reason to wait further — the status loop simply hasn't run until now.
