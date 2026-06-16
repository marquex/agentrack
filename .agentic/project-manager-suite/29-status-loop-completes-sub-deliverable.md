# Story 29: Status Loop Completes a Sub-Deliverable — Mark Done, Then Cascade the Epic

## Loop
Project Status Loop

## Description
An Epic contains two Feature sub-deliverables. One Feature's children are all `done`; the other Feature is already `done`. The status loop wakes the PM. The PM must first mark the just-finished Feature `done` (it HAS a parent — the Epic — so it is NOT closed), then recognize the Epic itself now has all children `done` and complete it too. Since the Epic has no parent (top-level), the PM closes the Epic and closes every child (including the already-`done` Features). This tests the done-vs-closed distinction and the cascading completion up the hierarchy.

## Initial Conditions

- **agentrack state:**
  - Issue #320 (Epic): "Add offline caching" — status: `in-progress`, assignee: `project-manager`, no parent (top-level)
  - Issue #321 (Feature): "Add on-device cache store" — status: `done`, assignee: `project-manager`, parent: #320 (already completed by a previous status-loop cycle)
  - Issue #322 (Task): "Design cache store" — status: `done`, parent: #321
  - Issue #323 (Task): "Implement cache store" — status: `done`, parent: #321
  - Issue #324 (Task): "Validate cache store" — status: `done`, parent: #321
  - Issue #330 (Feature): "Add cache invalidation API" — status: `in-progress`, assignee: `project-manager`, parent: #320
  - Issue #331 (Task): "Design cache invalidation API" — status: `done`, assignee: `backend-architect`, parent: #330
  - Issue #332 (Task): "Implement cache invalidation API" — status: `done`, assignee: `backend-developer`, parent: #330
  - Issue #333 (Task): "Validate cache invalidation API" — status: `done`, assignee: `backend-validator`, parent: #330
  - Issue #334 (Task): "Release cache invalidation API" — status: `done`, assignee: `devops-engineer`, parent: #330
  - #334 was marked `done` a short while ago; no other open issues

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Current state |
|---|---|
| `backend-architect` | Idle — completed #331 |
| `backend-developer` | Idle — completed #332 |
| `backend-validator` | Idle — completed #333 |
| `devops-engineer` | Idle — completed #334 |

## User Story

1. The PM is awakened by the status loop to review the issues assigned to it.
2. The PM finds Issue #330 (`in-progress`, assigned to itself) and lists its children (#331–#334) — ALL `done`.
3. The PM marks #330 `done` (it HAS a parent — the Epic #320 — so it is NOT closed).
4. The PM then looks at #320 (the Epic, also `in-progress` and assigned to it) and lists its children (#321, #330) — BOTH now `done`.
5. The Epic has NO parent → the PM closes the Epic and closes every child (the two Features and their tasks).

## Expected Output

The PM should:

1. View Issue #330 and list children (#331–#334) → all `done`.
2. Recognize: #330 HAS a parent (#320) → mark it `done` (not closed):
   - `agt update 330 --status done`
   - `agt comments add 330 --content "Feature complete — all phases done. Marking done so the parent Epic can cascade."`
3. Now scan #320 (the Epic). It is `in-progress`, assigned to the PM. List its children: #321 (`done`) and #330 (now `done`). ALL children `done`.
4. Recognize: #320 has NO parent → close it AND close every child/descendant:
   - `agt update 320 --status closed`
   - `agt update 321 --status closed` (Feature, was `done`)
   - `agt update 322 --status closed`, `agt update 323 --status closed`, `agt update 324 --status closed` (Feature #321's tasks)
   - `agt update 330 --status closed` (Feature, was `done`)
   - `agt update 331 --status closed`, `agt update 332 --status closed`, `agt update 333 --status closed`, `agt update 334 --status closed` (Feature #330's tasks)
   - `agt comments add 320 --content "Epic complete — all sub-deliverables done. Closing epic and all descendants."`

**Key behaviors:**
- **Sub-deliverable (HAS a parent) → `done`.** The PM marks #330 `done`, NOT closed. It stays visible so the parent can see all its children are done.
- **Top-level (NO parent) → `closed` + close all descendants.** Once the Epic's children are all `done`, the PM closes the Epic and recursively closes every descendant (the Features and their tasks).
- The cascade runs up the hierarchy: a sub-deliverable going to `done` can trigger its parent's completion in the same status-loop pass.
- The PM does NOT leave a finished sub-deliverable at `in-progress`, and does NOT close it (closing is for top-level only).
- The PM does NOT require a verification child or a manual review beyond confirming the children's statuses — all `done` is decisive.
- The PM processes completion in parent-order: complete the child first, then re-check the parent (which may now also be completable).

## Notes
- This story complements Story 28 (top-level close) by testing the `done` branch and the cascade.
- The done-vs-closed rule: `done` = finished but stays in the tracker (sub-deliverable, parent will cascade); `closed` = finished and cleared (top-level deliverable, plus all its descendants).
- A sub-deliverable is NEVER closed by the status loop — only its top-level ancestor is. When the top-level closes, it sweeps its already-`done` descendants to `closed`.
- The PM must not stop after marking #330 `done` — it must re-scan its other in-progress parents (#320) in the same pass, because #330 going to `done` may have unblocked the Epic's completion.
- If #321 had still been `in-progress`, the Epic would NOT be completable yet — only #330 would be marked `done`, and the Epic would wait for a future cycle.
