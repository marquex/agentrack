# Story 10: Stale In-Progress Issue — Agent Process Aborted

## Loop
Project Status Loop

## Description
An agent's process was aborted or crashed mid-task, leaving a child issue stuck in `in-progress`. The PM must check if the agent left a comment explaining why, and take appropriate action.

## Initial Conditions

- **agentrack state:**
  - Issue #70: "Implement mean-reversion strategy" — status: `in-progress`, assignee: `quant-researcher`
  - Issue #70 has been `in-progress` with no activity for 2 hours
  - `quant-researcher` is not currently running — the agent process was aborted
  - No other issues depend on #70

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Current state |
|---|---|
| `quant-researcher` | Unavailable — process aborted while working on #70 |
| `platform-developer` | Available but wrong domain — cannot do strategy research work |

## User Story

1. The PM checks for stale `in-progress` issues during the status loop.
2. The PM finds Issue #70 has been `in-progress` for 2 hours with no activity.
3. The PM checks whether the agent left a comment before aborting.
4. Based on the presence or absence of a comment, the PM takes action.

## Expected Output

The PM should:

1. View Issue #70 and check for comments from `quant-researcher`.

2. **Branch A: No comment found** — the agent disappeared without explanation.
   - Add a comment: "Agent process was aborted with no explanation. Resetting to `todo` so the original assignee can pick it up again."
   - Keep the assignee as `quant-researcher`
   - Update status to `todo`
   - The work loop will re-wake `quant-researcher` when it becomes available again

3. **Branch B: Comment found** — the agent left a message before aborting.
   - Read and interpret the comment content
   - Act based on what the comment says:
     - **Blocker reported** (e.g., "Can't proceed — data window too short for mean-reversion signals") → PM handles the blocker: determines if this is a platform data issue or a strategy parameter issue. If it's a platform limitation, routes to the platform team. If it's a research issue, keeps #70 in `todo` for `quant-researcher` to adjust parameters
     - **Partial completion** (e.g., "Completed entry signal logic, still need exit rules and position sizing") → PM notes progress, keeps assignee, resets to `todo`. May consider splitting remaining work into smaller tasks to reduce future stalling risk
     - **Fatal error** (e.g., "Model parameters not converging — this approach won't work for mean-reversion on these timeframes") → PM escalates: creates a new planning task for `quant-researcher` to redesign the approach (strategy design is still a researcher job, not an architect job), and blocks #70 until the redesign is done
   - In all cases, the PM adds its own comment documenting the decision

**Key behaviors:**
- The PM first checks for a comment — the agent's message (or lack thereof) drives the response
- **No comment → reset to `todo`, same assignee** — give the agent a chance to pick it up again
- **Comment found → interpret and act** — the comment content determines the PM's next step
- The PM never reassigns strategy work to platform agents — `platform-developer` builds infrastructure, not trading strategies
- Strategy design issues (parameters, signals, model convergence) stay with `quant-researcher` even when escalating
- The PM documents every intervention with a comment

## Notes
- This scenario differs from Story 07 because the agent didn't complete the work — it was interrupted mid-task
- The default action for "no comment" is simple: reset to `todo` with the same assignee. The work loop handles the rest.
- If the issue stalls repeatedly (agent keeps aborting on the same task), the PM may eventually break it down into smaller sub-tasks
- The PM cannot reassign to `platform-developer` — that agent builds platform infrastructure, not trading strategies. Strategy work belongs exclusively to research agents.
- **Status loop context** — the PM directly changes the issue status (`in-progress` → `todo`) and adds a comment. This is a status loop exception — normally the PM never touches child statuses.
