# Story 15: Agent Reports a Problem — Architectural Blocker

## Loop
Work Loop + Project Status Loop

## Description
An agent working on an issue encounters an unresolvable problem — a prerequisite capability doesn't exist. The agent marks the issue as `todo` and reassigns it back to the PM with a detailed technical description. The PM recognizes the architectural nature of the blocker and asks the team lead for a solution before creating any new issues.

## Initial Conditions

- **agentrack state:**
  - Issue #120: "Implement real-time sync" — status: `todo`, assignee: `project-manager`
    - Has a comment from `library-developer`: "Cannot implement real-time sync — the event store doesn't support subscriptions. Need to add a pub/sub layer first. The current architecture only supports polling. This is outside the scope of this issue."
    - Reassigned back to PM by the developer
  - Issue #120 was blocked by nothing (blockages clear)
  - No pub/sub infrastructure exists in the codebase

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Relevance |
|---|---|
| `library-developer` | Reported the blocker on #120 — needs architectural solution before it can implement real-time sync |
| `library-architect` | **Team lead** — must analyze the blocker and propose a solution |
| `library-validator` | Would validate whichever task gets created |
| `library-releaser` | Would release whichever task gets created |

## User Story

1. The PM picks up Issue #120 (reassigned to it by the developer).
2. The PM reads the comment and understands the blocker.
3. The PM recognizes this is an architectural problem — but does NOT design the solution itself.
4. The PM asks the team lead (`library-architect`) to analyze the blocker and propose a solution.
5. The architect responds with a proposed approach.
6. Based on the architect's proposal, the PM creates the prerequisite work.

## Expected Output

### Phase 1: PM Asks the Architect

The PM should:

1. View Issue #120 and read the developer's comment
2. Analyze the problem: the feature requires infrastructure that doesn't exist
3. Recognize this is an **architectural** need — but the PM does NOT decide what the solution is
4. Create a consultation task for the architect under Issue #120:
   ```
   Issue #120: "Implement real-time sync" (status: in-progress, assigned: project-manager)
   ├── Task: "Analyze blocker: event store lacks subscription support" (tag: task, assigned: library-architect, status: todo)
   └── Task: "Check architect's solution for real-time sync blocker" (tag: task,sync, assigned: project-manager, status: todo)
       └── Blocked by analysis task
   ```
5. Add a comment to Issue #120: "Developer reports architectural blocker — event store doesn't support subscriptions. Asking library-architect (team lead) to analyze and propose a solution."

### Phase 2: Architect Analyzes and Proposes

6. Work loop picks up the analysis task, wakes `library-architect`
7. Architect investigates the codebase and the developer's report
8. Architect adds comment with proposed solution: "The event store needs a pub/sub layer. I recommend adding an EventEmitter-based subscription system to the event store — it's lightweight, fits the existing architecture, and can be extended later. The developer should implement a `subscribe()` method on the store that emits events on mutation."
9. Architect marks analysis task as `done`
10. System auto-resolves blockage on sync tracker

### Phase 3: PM Acts on Architect's Proposal

11. Work loop picks up sync tracker, wakes PM
12. PM reads the architect's proposal
13. PM marks sync tracker as `done`
14. Based on the architect's proposed solution, PM creates the prerequisite Feature:
    ```
    Feature: "Add pub/sub layer to event store" (tag: feature, assigned: project-manager, status: in-progress)
    ├── Task: "Design pub/sub architecture" (tag: task, assigned: library-architect, status: todo, phase: planning)
    ├── Task: "Implement pub/sub layer" (tag: task, assigned: library-developer, status: todo, phase: development)
    │   └── Blocked by "Design" task
    ├── Task: "Validate pub/sub layer" (tag: task, assigned: library-validator, status: todo, phase: validation)
    │   └── Blocked by "Implement" task
    ├── Task: "Release pub/sub layer" (tag: task, assigned: library-releaser, status: todo, phase: release)
    │   └── Blocked by "Validate" task
    └── Task: "Verify pub/sub layer complete" (tag: task,sync, assigned: project-manager, status: todo)
        └── Blocked by "Release" task
    ```
15. Create a blockage: Issue #120 (original) is blocked by the pub/sub Feature's sync tracker (the prerequisite must complete before the original issue resumes)
16. Add a comment to Issue #120: "Based on architect's recommendation, creating prerequisite Feature: 'Add pub/sub layer to event store.' This issue will resume after the pub/sub layer is implemented and released."

**Assignment rationale:**
- The PM correctly identifies that this is an **architectural gap** — but doesn't design the solution itself
- The `library-architect` (team lead) analyzes the problem and proposes the approach
- Only after the architect's proposal does the PM create the implementation plan
- The `library-developer` reported the problem and will benefit from the architect's design when implementing
- The original task (#120) stays blocked until the prerequisite is fully released

**Key behaviors:**
- The PM reads the detailed technical problem description
- It recognizes when a problem needs architectural design — but asks the architect, doesn't decide the solution
- It uses the same review task + sync tracker pattern: ask the expert, wait for their response, then act
- It communicates clearly at every step — the developer knows what's happening with their blocker
- It sets up proper blockages so the original issue will resume automatically after the prerequisite is done
- **PM sets new Feature to `in-progress`** after creating children + sync tracker

## Notes
- The PM should trust the developer's technical assessment that something is blocked
- The PM should NOT trust its own ability to design the solution — that's the architect's job
- The architect might propose a different solution than "pub/sub layer" — the PM must follow the architect's recommendation, not assume the solution
- If the architect says "this is not an architectural problem, the developer just needs to do X differently", the PM can unblock the original issue and reassign it with the architect's guidance
- This pattern (ask the expert first, then create issues) prevents the PM from creating unnecessary or wrong work
