# Story 16: Agent Creates Out-of-Scope Idea While Working

## Loop
Ideas Loop (triggered during Work Loop)

## Description
While working on an issue, an agent creates a new `idea` issue for work they noticed needs doing but is outside their current scope. The PM picks this up in the ideas loop, checks for duplicates, and routes it to the team lead for a decision.

## Initial Conditions

- **agentrack state:**
  - Issue #130: "Add bulk update command" — status: `in-progress`, assignee: `library-developer` (active work)
  - Issue #131: "Refactor command argument parsing to use a shared parser" — status: `idea`, created by `library-developer`, no assignee
    - Comment from developer: "While implementing bulk update, I noticed each command parses arguments differently. A shared parser would reduce duplication."
  - No other issues matching "argument parsing" or "shared parser" in status `idea`, `todo`, `in-progress`, or `closed` with `idea` tag

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Relevance |
|---|---|
| `library-developer` | Source of the idea — currently working on #130, has first-hand knowledge of the argument parsing inconsistency |
| `library-architect` | **Team lead** — decides if this technical refactoring aligns with technical direction |
| `library-validator` | Would test the shared parser — refactoring all commands is risky and needs thorough testing |

## User Story

1. The PM is awakened for ideas triage.
2. The PM finds the new `idea` Issue #131.
3. The PM checks for duplicates → none found.
4. The PM determines: this is a 100% technical idea (internal refactoring) → route to team lead (`library-architect`).
5. The architect decides whether to accept, park, or discard.

## Expected Output

### Phase 1: Routing

The PM should:

1. View Issue #131 and determine routing type (technical vs product, creator identity)
2. Search for duplicates: list issues with status `idea`, `todo`, `in-progress`, and `closed` with `idea` tag matching "argument" or "parser" → no duplicates found
3. Determine routing: the idea is 100% technical (internal code refactoring) → route to team lead (`library-architect`)
4. Create review children:
   ```
   Issue #131: "Refactor command argument parsing to use a shared parser" (status: in-progress, assigned: project-manager)
   ├── Task: "Review: Refactor command argument parsing" (tag: task, assigned: library-architect, status: todo)
   └── Task: "Check review decision on parser refactor idea" (tag: task,sync, assigned: project-manager, status: todo)
       └── Blocked by review task
   ```
5. Add a comment: "Routed to library-architect (team lead) for technical review. This is a 100% technical idea — internal refactoring."

### Phase 2: Architect Reviews

6. Work loop picks up the review task, wakes `library-architect`
7. Architect reviews, adds comment: "Good idea — a shared parser would reduce duplication across commands. However, it's a cross-cutting refactoring with medium risk (touches ALL commands). Accept, but low priority. Recommend implementing when adding new commands that would benefit from the shared parser."
8. Architect marks review task as `done`

### Phase 3: PM Acts on Decision

9. Work loop picks up sync tracker, wakes PM
10. PM reads architect's comment → decision: **accepted, low priority**
11. PM marks sync tracker as `done`
12. PM tags Issue #131 as `chore` (technical maintenance, no user-facing change)
13. PM creates implementation children:
    ```
    Issue #131: "Refactor command argument parsing to use a shared parser" (tag: chore, status: in-progress, assigned: project-manager)
    ├── Task: "Review: ..." (status: done)
    ├── Task: "Check review decision" (status: done)
    ├── Task: "Design shared argument parser" (tag: task, assigned: library-architect, status: todo, phase: planning)
    ├── Task: "Implement shared argument parser" (tag: task, assigned: library-developer, status: todo, phase: development)
    │   └── Blocked by "Design" task
    ├── Task: "Validate shared argument parser" (tag: task, assigned: library-validator, status: todo, phase: validation)
    │   └── Blocked by "Implement" task
    ├── Task: "Release shared argument parser" (tag: task, assigned: library-releaser, status: todo, phase: release)
    │   └── Blocked by "Validate" task
    └── Task: "Verify parser refactor complete" (tag: task,sync, assigned: project-manager, status: todo)
        └── Blocked by "Release" task
    ```
14. The agent who created the idea (`library-developer`) continues with their original work (#130) undisturbed — the parser refactoring tasks are queued behind existing work

**Key behaviors:**
- The PM does NOT evaluate the idea — it routes to the team lead
- The PM encourages agents to capture ideas by routing them promptly
- The team lead (not the PM) assesses risk, priority, and technical alignment
- The idea is tagged `chore` (not `feature`) because it's internal refactoring with no user-facing change
- The original work (#130) continues — the new tasks are queued and won't interrupt

**Assignment rationale:**
- **Planning → `library-architect`**: The shared parser needs architectural design — it affects all commands, needs a migration strategy
- **Development → `library-developer`**: Implements the shared parser and migrates all commands
- **Validation → `library-validator`**: Thorough regression testing of ALL commands after migration
- **Release → `library-releaser`**: Release as minor version (refactoring, no API change)

## Notes
- This is a common pattern — developers notice improvements while working
- The PM acknowledges and routes the idea promptly — agents should feel encouraged to create ideas
- The idea is high-risk when implemented — every command changes, so validation must be thorough
- The architect's "low priority" assessment means this gets queued behind more important work
- If the idea had been discarded by the architect, the PM would close with `idea,discarded` tags and a comment
