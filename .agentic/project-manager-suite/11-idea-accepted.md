# Story 11: Idea Accepted — Technical Idea Routed to Team Lead

## Loop
Ideas Loop

## Description
A worker agent creates a technical `idea` issue. The PM checks for duplicates, finds none, and routes it to the team lead for approval. The team lead accepts it. The PM then plans the implementation.

## Initial Conditions

- **agentrack state:**
  - Issue #80: "Add webhook support for issue events" — status: `idea`, created by `library-developer`, assignee: none
  - No other issues matching "webhook" in status `idea`, `todo`, `in-progress`, or `closed` with `idea` tag

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM picks up Issue #80 from the ideas queue.
2. The PM checks for duplicates — searches issues in `idea`, `todo`, `in-progress`, and `closed` with `idea` tag.
3. No duplicates found.
4. The PM determines: this is a 100% technical idea (webhook API for the library) → route to team lead (`library-architect`).
5. The PM creates a review task for the architect + sync tracker for itself.
6. The architect reviews and accepts.
7. The PM creates the implementation plan.

## Expected Output

### Phase 1: Routing

The PM should:

1. View Issue #80 and determine routing type (technical vs product, creator identity)
2. Search for duplicates: list issues with status `idea`, `todo`, `in-progress`, and `closed` with `idea` tag matching "webhook" → no duplicates found
3. Determine routing: the idea is 100% technical (internal library API) → route to team lead (`library-architect`)
4. Create review children:
   ```
   Issue #80: "Add webhook support for issue events" (status: in-progress, assigned: project-manager)
   ├── Task: "Review: Add webhook support for issue events" (tag: task, assigned: library-architect, status: todo)
   └── Task: "Check review decision on webhook idea" (tag: task,sync, assigned: project-manager, status: todo)
       └── Blocked by review task
   ```
5. Add a comment: "Routed to library-architect (team lead) for technical review. This is a 100% technical idea."

### Phase 2: Architect Reviews

6. Work loop picks up the review task, wakes `library-architect`
7. Architect reviews the idea, adds comment: "Webhooks align with our event-sourced architecture. Events already exist — we just need to push them. Accept."
8. Architect marks review task as `done`
9. System auto-resolves blockage on sync tracker

### Phase 3: PM Acts on Decision

10. Work loop picks up sync tracker, wakes PM
11. PM reads architect's comment → decision: **accepted**
12. PM marks sync tracker as `done`
13. PM tags Issue #80 as `feature` (it's a new capability)
14. PM creates implementation children under Issue #80:
    ```
    Issue #80: "Add webhook support for issue events" (tag: feature, status: in-progress, assigned: project-manager)
    ├── Task: "Review: ..." (status: done) ← completed during review
    ├── Task: "Check review decision" (status: done) ← completed
    ├── Task: "Design webhook API" (tag: task, assigned: library-architect, status: todo, phase: planning)
    ├── Task: "Implement webhook support" (tag: task, assigned: library-developer, status: todo, phase: development)
    │   └── Blocked by "Design" task
    ├── Task: "Validate webhook support" (tag: task, assigned: library-validator, status: todo, phase: validation)
    │   └── Blocked by "Implement" task
    ├── Task: "Release webhook support" (tag: task, assigned: library-releaser, status: todo, phase: release)
    │   └── Blocked by "Validate" task
    └── Task: "Verify webhook feature complete" (tag: task,sync, assigned: project-manager, status: todo)
        └── Blocked by "Release" task
    ```

**Assignment rationale:**
- **Review → `library-architect`**: Team lead for technical direction. Decides if the idea aligns with the project's technical goals.
- **Planning → `library-architect`**: Webhook API needs careful design — endpoint structure, payload format, delivery guarantees, retry logic.
- **Development → `library-developer`**: The agent who created the idea implements it — they already have context from working with the event system.
- **Validation → `library-validator`**: Writes tests for webhook delivery, failure handling, payload correctness.
- **Release → `library-releaser`**: Documents the webhook API, builds, publishes.

**Key behaviors:**
- The PM does NOT evaluate the idea itself — it routes to the team lead
- The PM checks for duplicates first before doing anything else
- Technical ideas go to the team lead; product ideas go to the product-owner
- The review uses the same sync tracker pattern: task for reviewer + sync tracker for PM
- Only after the manager accepts does the PM create the implementation plan
- The idea issue becomes the Feature parent — no new parent needed
- If the idea had been created by a manager (product-owner, team lead, or PM), it would be treated as already accepted — skip review, go straight to planning

## Notes
- The PM's role in the ideas loop is routing, not evaluating
- The team lead's review determines technical alignment, not the PM's opinion
- The duplicate check scope: `idea`, `todo`, `in-progress`, and `closed` with `idea` tag
- Ideas created by managers (`product-owner`, `library-architect`, `project-manager`) are auto-accepted — no review needed
