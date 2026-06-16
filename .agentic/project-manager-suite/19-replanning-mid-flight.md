# Story 19: Replanning Mid-Flight — Market Regime Change Requires Pivot

## Loop
Work Loop + Project Status Loop

## Description
While a quant researcher is implementing a trading strategy, market conditions change and invalidate the strategy's assumptions. The PM must cancel the current strategy, stop in-flight work, and create a new strategy for the updated market regime.

## Initial Conditions

- **agentrack state:**
  - Issue #150 (parent): "Implement momentum strategy" — status: `in-progress`, assignee: `project-manager`
  - Issue #151: "Plan momentum strategy" — status: `done`, assignee: `quant-researcher`
  - Issue #152: "Implement momentum strategy" — status: `in-progress`, assignee: `quant-researcher`
  - Issue #153: "Validate momentum strategy" — status: `todo`, blocked by #152, assignee: `strategy-validator`
- **Trigger:** Market regime shifts from trending to range-bound: "Momentum strategies are underperforming in the current low-volatility, range-bound market. Pivot to a volatility-based strategy instead."

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Current state |
|---|---|
| `quant-researcher` | **ACTIVE** — currently implementing momentum strategy (#152, in-progress). Must be stopped. Pivoting to volatility strategy. |
| `strategy-validator` | Blocked — hasn't started #153. Would need to validate volatility strategy instead. |

## User Story

1. The PM receives updated market intelligence that invalidates the current strategy.
2. The PM must stop the in-flight strategy implementation (#152).
3. The PM must close the momentum strategy feature and all its children.
4. The PM must create a new volatility strategy feature with a fresh plan.

## Expected Output

The PM should:

1. Acknowledge the market regime change
2. Add a comment to Issue #150: "Market regime changed from trending to range-bound. Momentum strategy cancelled in favor of volatility-based strategy. Closing this feature and creating a new one." and close it: status → `closed`
3. Cancel in-flight and pending work:
   - Issue #152 (in-progress, researcher): Reassign to `project-manager`, status → `closed`, add comment: "Cancelled mid-implementation — market regime shifted to range-bound. Momentum signals unreliable in current conditions. Researcher stopped."
   - Issue #153 (todo, validator): status → `closed`, add comment: "Cancelled — strategy direction changed to volatility-based approach."
4. Keep Issue #151 (done, researcher's momentum strategy plan) as `done` — the research thinking may be useful as reference.
5. Create a **new** Feature issue for the volatility strategy work:
   ```
   Feature: "Implement volatility-based strategy" (tag: feature, assigned: project-manager, status: todo)
   ├── Task: "Plan volatility strategy" (tag: task, assigned: quant-researcher, status: todo, phase: planning)
   ├── Task: "Implement volatility strategy" (tag: task, assigned: quant-researcher, status: todo, phase: development)
   │   └── Blocked by "Plan" task
   └── Task: "Validate volatility strategy" (tag: task, assigned: strategy-validator, status: todo, phase: validation)
       └── Blocked by "Implement" task
   ```
6. Add a comment to Issue #150 mentioning the new issue created for reference.

**Assignment rationale (new plan):**
- **Planning → `quant-researcher`**: Volatility strategy needs signal selection, entry/exit rules, and parameter design. The researcher already has market context from the momentum work and understands the regime shift.
- **Development → `quant-researcher`**: Same researcher who was working on momentum, now pivoting to volatility. They have context on market conditions and the codebase.
- **Validation → `strategy-validator`**: Standard strategy validation — backtest, Monte Carlo simulation, overfitting detection on the volatility strategy.

**Key behaviors:**
- The PM acts decisively — it cancels work that's no longer needed
- It stops the `quant-researcher` who is actively working (#152 in-progress)
- It doesn't let agents continue on cancelled work
- It **closes the old Feature** and **creates a new Feature** — the volatility strategy is a different deliverable, not a continuation of the momentum work
- The old Feature (#150) is clearly closed with a comment explaining why, not silently abandoned
- It keeps the completed strategy plan (#151) for reference
- It assigns the same agents — they have context, just need different direction
- This is research-specific replanning — same agents, different strategy. No cross-team coordination needed.
- It documents the market regime change and the reason clearly on every cancelled issue
- **Exception to normal lifecycle** — the PM directly sets issues to `closed` because the work is being cancelled, not completed. Normally the PM doesn't touch child statuses, but replanning is a PM-initiated intervention where cancelling in-flight work is necessary.

## Notes
- This is the hardest scenario — cancelling work mid-flight
- The PM creates a **new** Feature issue instead of repurposing the old one — momentum and volatility strategies are fundamentally different with different signals, parameters, and validation criteria
- The old Feature (#150) and its children serve as a historical record of what was attempted and why it was cancelled
- The researcher loses their in-progress strategy implementation — the PM should acknowledge this in the comment
- Cancelled issues should be clearly tagged so they're not confused with completed work
- Research replanning stays within the research team — `quant-researcher` handles both plan and dev phases, `strategy-validator` handles validation. No platform agents are involved.
- The new strategy feature has no release phase — research work follows plan→dev→validate only
