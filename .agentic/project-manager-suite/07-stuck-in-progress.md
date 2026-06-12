# Story 07: Agent Forgot to Move Issue to `done`

## Loop
Project Status Loop

## Description
An agent completed work on an issue but forgot to update the status from `in-progress` to `done`. The PM must detect this and resolve it.

## Initial Conditions

- **agentrack state:**
  - Issue #42: "Implement search functionality" — status: `in-progress`, assignee: `library-developer`
  - Issue #42 has a comment from `library-developer` saying: "Search functionality implemented and tested locally. All edge cases covered."
  - Issue #43: "Validate search functionality" — status: `todo`, assignee: `library-validator`
    - Blocked by Issue #42
  - No new activity on Issue #42 for over an hour (stale)
  - The `library-developer` is not currently working on any issue

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Current state |
|---|---|
| `library-developer` | Available but idle — finished the work on #42, didn't update status |
| `library-validator` | Blocked — waiting on #42 to be marked done so blockage clears |

## User Story

1. The PM is awakened for a status check.
2. The PM lists all `in-progress` issues.
3. The PM detects Issue #42 has been stale — the developer finished (per comments) but didn't mark it `done`.
4. The PM resolves the issue so the validator can proceed.

## Expected Output

The PM should:

1. View Issue #42 and read its comments
2. Confirm the work appears complete based on the comment content ("implemented and tested locally")
3. Update Issue #42 status to `done`
4. Add a comment: "Status updated to done. Developer completed implementation but forgot to update status."
5. The blockage on Issue #43 is automatically resolved by the system
6. Issue #43 becomes actionable — the `library-validator` will be picked up by the work loop

**Key behaviors:**
- The PM doesn't just blindly change status — it reads comments to verify completion
- It recognizes the `library-developer`'s comment indicates the work is done (implementation complete, edge cases covered)
- If the comment were ambiguous, the PM should mention the developer to ask for confirmation
- The PM documents its intervention with a comment
- **This is a status loop exception** — normally the PM never touches child issue statuses (agents drive `todo` → `in-progress` → `done`). But during the status loop, the PM is authorized to fix stuck issues directly.
