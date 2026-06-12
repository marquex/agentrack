# Story 14: Duplicate Idea — PM Detects and Closes Before Routing

## Loop
Ideas Loop

## Description
An agent creates an idea that duplicates an existing issue. The PM detects this during the duplicate check (the first step of ideas triage) and closes it without routing to a manager.

## Initial Conditions

- **agentrack state:**
  - Issue #110 (existing): "Add pull-to-refresh on all list screens" — status: `todo`, already planned with children, assigned to `project-manager`
  - Issue #115 (new): "Pull to refresh for lists" — status: `idea`, created by `android-validator`, assignee: none

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Relevance |
|---|---|
| `android-validator` | Source of the duplicate — noticed the need for pull-to-refresh during testing but didn't check existing issues |
| `android-developer` | Already assigned to implement pull-to-refresh under #110 |

## User Story

1. The PM picks up the new `idea` Issue #115 for triage.
2. The PM checks for duplicates first (before routing to any manager).
3. The PM finds Issue #110 which covers the same feature.
4. The PM closes the duplicate without routing to a manager.

## Expected Output

The PM should:

1. View Issue #115 and determine routing type (technical vs product, creator identity)
2. **Check for duplicates first** — search issues in status `idea`, `todo`, `in-progress`, and `closed` with `idea` tag matching "pull" or "refresh" or "list"
3. Find Issue #110: "Add pull-to-refresh on all list screens" — status: `todo`, already planned with children. Same feature.
4. Close Issue #115 directly — no need to route to a manager:
   - Status → `closed`
   - Tags → `idea,duplicate`
   - Comment: "Duplicate of Issue #110, which is already planned and in progress. The `android-developer` is assigned to implement it. Closing."
5. Optionally add a comment to #110 mentioning the validator's interest: "@android-validator noted the need for pull-to-refresh during testing — they may have useful input for test coverage and which screens need it most."
6. Do NOT create any review task or sync tracker — the duplicate check short-circuits the routing

**Key behaviors:**
- Duplicate checking is the **first step** of ideas triage — before routing to any manager
- The PM searches in `idea`, `todo`, `in-progress`, and `closed` with `idea` tag — the duplicate might be an active idea, planned work, in-progress work, or a previously discarded idea
- If a duplicate is found, the PM closes it directly — no manager review needed
- Tags are `idea,duplicate` (not `discarded` — this is a duplicate, not a rejection on merit)
- No child issues or review tasks are created for duplicates
- The PM connects the dots — the validator who created the duplicate might have useful context for the existing task

## Notes
- Duplicate detection relies on the PM searching existing issues by keyword and comparing descriptions
- The search scope is broad: `idea`, `todo`, `in-progress`, and `closed` with `idea` tag — a previously discarded idea might also be a match
- The validator's duplicate is actually a good signal — it confirms the feature is needed and the validator has first-hand testing context
- If a previously discarded idea comes up again, the PM should re-route to the manager (the context may have changed), not auto-close it as duplicate
