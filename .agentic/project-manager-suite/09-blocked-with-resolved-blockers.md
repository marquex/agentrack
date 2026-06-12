# Story 09: Blocked Issue with Resolved Blockers

## Loop
Project Status Loop

## Description
An issue shows as blocked, but the blocking issues have already been completed. The blockages weren't properly resolved (the system didn't auto-resolve them for some reason).

## Initial Conditions

- **agentrack state:**
  - Issue #60: "Implement caching layer" — status: `todo`, assignee: `library-developer`
  - Blockages on #60: blocked by Issue #59
  - Issue #59: "Design caching architecture" — status: `done`, assignee: `library-architect`
  - The blockage should have been auto-resolved when #59 moved to `done`, but it wasn't

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Current state |
|---|---|
| `library-architect` | Idle — completed the design (#59) |
| `library-developer` | Available but blocked by stale blockage — should start #60 |

## User Story

1. The PM checks for issues that are stuck.
2. The PM finds Issue #60 is still blocked even though its blocker (#59) is `done`.
3. The PM manually resolves the blockage.

## Expected Output

The PM should:

1. List issues with blockages and check their blockers' statuses
2. Detect that #59 (a planning task done by the architect) is `done` but the blockage on #60 (a dev task for the developer) still exists
3. Resolve the blockage: `agt blockages resolve 60 --by 59`
4. Add a comment to #60: "Blockage resolved — blocking issue #59 (architect's design) is done. Ready for implementation."
5. Issue #60 becomes actionable and the work loop picks it up for `library-developer`

**Key behaviors:**
- The PM acts as a safety net for the automated blockage resolution
- It understands the relationship: architect's design (#59) blocks developer's implementation (#60)
- It checks for inconsistencies between blocker status and blockage state
- It resolves the issue and documents the intervention
- **Status loop context** — the PM uses `agt blockages resolve` directly. This is a status loop exception where the PM intervenes on blockage status (not issue status). Normally blockages resolve automatically when an agent marks its issue `done`.
