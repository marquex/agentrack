# Story 19: Replanning Mid-Flight — Requirements Change

## Loop
Work Loop + Project Status Loop

## Description
While work is in progress on a feature, requirements change or new information emerges. The PM must cancel the current feature, stop in-flight work, and create a new feature for the updated requirements.

## Initial Conditions

- **agentrack state:**
  - Issue #150 (parent): "Add REST API for issue management" — status: `in-progress`, assignee: `project-manager`
  - Issue #151: "Plan REST API" — status: `done`, assignee: `library-architect`
  - Issue #152: "Implement REST API" — status: `in-progress`, assignee: `library-developer`
  - Issue #153: "Validate REST API" — status: `todo`, blocked by #152, assignee: `library-validator`
  - Issue #154: "Release REST API" — status: `todo`, blocked by #153, assignee: `library-releaser`
- **Trigger:** Stakeholder decides: "We don't need a full REST API — just add GraphQL support instead"

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Current state |
|---|---|
| `library-architect` | Idle — completed REST API planning (#151). Would need to plan GraphQL API instead. |
| `library-developer` | **ACTIVE** — currently implementing REST API (#152, in-progress). Must be stopped. |
| `library-validator` | Blocked — hasn't started #153. Would need to validate GraphQL instead. |
| `library-releaser` | Blocked — hasn't started #154. Would release GraphQL instead. |

## User Story

1. The PM receives updated requirements that invalidate current work.
2. The PM must stop the in-flight development (#152).
3. The PM must close the REST API feature and all its children.
4. The PM must create a new GraphQL feature with a fresh plan.

## Expected Output

The PM should:

1. Acknowledge the requirement change
2. Add a comment to Issue #150: "Requirements changed. REST API cancelled in favor of GraphQL. Closing this feature and creating a new one for GraphQL." and close it: status → `closed`
3. Cancel in-flight and pending work:
   - Issue #152 (in-progress, developer): Reassign to `project-manager`, status → `closed`, add comment: "Cancelled mid-implementation — requirements changed to GraphQL. Developer stopped."
   - Issue #153 (todo, validator): status → `closed`, add comment: "Cancelled — parent direction changed to GraphQL."
   - Issue #154 (todo, releaser): status → `closed`, add comment: "Cancelled — parent direction changed to GraphQL."
4. Keep Issue #151 (done, architect's REST API design) as `done` — the architectural thinking may be useful as reference.
5. Create a **new** Feature issue for the GraphQL work:
   ```
   Feature: "Add GraphQL API for issue management" (tag: feature, assigned: project-manager, status: in-progress)
   ├── Task: "Design GraphQL schema for issues" (tag: task, assigned: library-architect, status: todo, phase: planning)
   ├── Task: "Implement GraphQL API" (tag: task, assigned: library-developer, status: todo, phase: development)
   │   └── Blocked by "Design" task
   ├── Task: "Validate GraphQL API" (tag: task, assigned: library-validator, status: todo, phase: validation)
   │   └── Blocked by "Implement" task
   ├── Task: "Release GraphQL API" (tag: task, assigned: library-releaser, status: todo, phase: release)
   │   └── Blocked by "Validate" task
   └── Task: "Verify GraphQL API complete" (tag: task,sync, assigned: project-manager, status: todo)
       └── Blocked by "Release" task
   ```
6. Add a comment to the issue #150 mentioning the new issue created for reference.

**Assignment rationale (new plan):**
- **Planning → `library-architect`**: GraphQL needs a schema design — this is architectural work. The architect already has context from the REST API design.
- **Development → `library-developer`**: Same developer who was working on REST, now pivoting to GraphQL. They have codebase context.
- **Validation → `library-validator`**: Standard validation — test the GraphQL endpoints and queries.
- **Release → `library-releaser`**: Standard release — document the GraphQL API, build, publish.

**Key behaviors:**
- The PM acts decisively — it cancels work that's no longer needed
- It stops the `library-developer` who is actively working (#152 in-progress)
- It doesn't let agents continue on cancelled work
- It **closes the old Feature** and **creates a new Feature** — the GraphQL work is a different deliverable, not a continuation of the REST work
- The old Feature (#150) is clearly closed with a comment explaining why, not silently abandoned
- It keeps the completed architect design (#151) for reference
- It assigns the same agents — they have context, just need different direction
- It documents the change and the reason clearly on every cancelled issue
- **Exception to normal lifecycle** — the PM directly sets issues to `closed` because the work is being cancelled, not completed. Normally the PM doesn't touch child statuses, but replanning is a PM-initiated intervention where cancelling in-flight work is necessary.

## Notes
- This is the hardest scenario — cancelling work mid-flight
- The PM creates a **new** Feature issue instead of repurposing the old one — REST and GraphQL are fundamentally different deliverables with different designs, implementations, and test suites
- The old Feature (#150) and its children serve as a historical record of what was attempted and why it was cancelled
- The PM might want to briefly consult with the architect: "We're pivoting from REST to GraphQL — can you repurpose your design?"
- The developer loses their in-progress work — the PM should acknowledge this in the comment
- Cancelled issues should be clearly tagged so they're not confused with completed work
