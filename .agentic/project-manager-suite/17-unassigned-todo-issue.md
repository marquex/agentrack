# Story 17: Unassigned `todo` Issue

## Loop
Project Status Loop

## Description
An issue is in `todo` status but has no assignee. The work loop won't pick it up because there's no agent assigned. The PM must assign it.

## Initial Conditions

- **agentrack state:**
  - Issue #140: "Update documentation for v2 API" — status: `todo`, assignee: none
  - No agent is currently working on this — it was created but never assigned

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Could they do this? |
|---|---|
| `library-releaser` | **Best fit** — documentation updates are part of the release process |
| `library-developer` | Could provide API details but docs are not their responsibility |
| `library-architect` | Could write API specs but not user-facing documentation |
| `library-validator` | Not appropriate — testing is their domain, not docs |

## User Story

1. The PM checks for `todo` issues without assignees.
2. The PM finds Issue #140.
3. The PM determines the right agent based on the task type and assigns it.

## Expected Output

The PM should:

1. List `todo` issues and identify #140 has no assignee
2. View Issue #140 to understand what kind of work it is: "Update documentation for v2 API"
3. Determine the right agent:
   - Documentation updates → `library-releaser` (generates and verifies docs as part of release workflow)
   - The releaser is available
4. Assign Issue #140 to `library-releaser`
5. Add a comment: "Assigning to library-releaser. Documentation generation and verification is part of the release workflow."

**Key behaviors:**
- The PM catches issues that fell through the cracks
- It matches work to the right agent based on the nature of the task
- It recognizes that documentation is the releaser's responsibility, not the developer's or validator's
- It documents the assignment decision

**Assignment reasoning:**
- NOT `library-developer` — they implement code, not documentation
- NOT `library-validator` — they test code, not write docs
- NOT `library-architect` — they write technical specs, not user-facing docs
- YES `library-releaser` — documentation generation and verification is part of their release workflow

## Notes
- This could happen if the PM itself created the issue but forgot to assign it
- Or if an agent created a child issue but didn't assign it
- The PM should also check if the issue needs the full 4-phase treatment or if it's already properly scoped
- If the documentation requires architectural knowledge (e.g., explaining a new API design), the PM might ask the architect to review the releaser's docs
