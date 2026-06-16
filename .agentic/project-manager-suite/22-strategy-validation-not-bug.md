# Story 22: Strategy Validation Failure — Not a Bug

## Loop
Work Loop

## Description
A strategy passes basic backtesting but the `strategy-validator` flags it as overfitted — it performs well historically but fails Monte Carlo robustness checks. The validator reports this as a problem (reassigns to PM). The PM must recognize this is NOT a platform bug — the tools work correctly — and route the finding back to the `quant-researcher` for strategy refinement. Tests domain-specific routing and the ability to distinguish a code bug from a domain issue.

## Initial Conditions

- **Work queue:** Empty
- **agentrack state:**
  - Issue #220 (parent): "Develop mean-reversion strategy for equities" — status: `in-progress`, assignee: `project-manager`
  - Issue #221: "Design mean-reversion model" — status: `done`, assignee: `quant-researcher`
  - Issue #222: "Implement mean-reversion strategy" — status: `done`, assignee: `quant-researcher`
  - Issue #223: "Validate mean-reversion strategy" — status: `todo`, assignee: `project-manager`
    - Has a comment from `strategy-validator` (reassigned back to PM): "Validation failed. The strategy passes basic backtesting (Sharpe ratio 1.8) but fails Monte Carlo robustness checks. When I perturb the input parameters by 5%, the strategy loses 40% of its returns — this indicates severe overfitting to historical data. The strategy code is correct; the model itself is overfit. Not a platform bug — the backtesting engine and Monte Carlo tools work correctly. Recommend refinement of the strategy model with simpler parameters."
    - Issue #223 was blocked by nothing (blockages clear after reassignment)

### Team Context

> See [Team Roster](00-team-roster.md) for all agent roles.

| Agent | Relevance |
|---|---|
| `quant-researcher` | Originally created the strategy — needs to refine it based on validation feedback |
| `strategy-validator` | Flagged the overfitting — correctly reported as a domain issue, not a platform bug |
| `head-of-research` | Research team lead — only involved if researcher wants to pursue a fundamentally different approach |
| `platform-architect` | NOT involved — the platform tools work correctly, this is not a platform issue |

## User Story

1. The PM picks up Issue #223 (reassigned to it by the `strategy-validator`).
2. The PM reads the validator's comment carefully.
3. The PM analyzes: the strategy code runs correctly, the backtesting engine works, the Monte Carlo tools work — this is a **strategy quality issue**, not a platform bug.
4. The PM routes the finding back to `quant-researcher` for strategy refinement — NOT to any platform agent.
5. The PM does NOT create a platform development task.
6. The researcher refines the strategy and the cycle repeats.

## Expected Output

### PM Analysis

The PM should:

1. View Issue #223 and read the validator's detailed comment
2. Analyze the problem:
   - Strategy code runs without errors — no crashes, no exceptions
   - Backtesting engine produces correct results — the Sharpe ratio is calculated correctly
   - Monte Carlo simulation runs correctly — it's doing its job by catching overfitting
   - The issue: the **strategy model itself is overfit** to historical data
3. Conclusion: this is a **strategy quality problem**, not a platform bug. The tools did exactly what they should — the validator correctly caught a bad strategy. No platform agent needs to be involved.
4. Recognize: routing to `platform-architect` or `platform-developer` would be WRONG — there is nothing to fix in the platform.

### PM Action: Route Back to Researcher

The PM should:

1. Add a comment to Issue #223: "This is a strategy quality issue, not a platform bug. The validation tools worked correctly — they caught overfitting that the researcher needs to address. Reassigning to quant-researcher for strategy refinement."
2. Create a refinement task for the researcher under the existing Feature (Issue #220):

```
Issue #220: "Develop mean-reversion strategy for equities" (tag: feature, status: in-progress, assigned: project-manager)
├── Issue #221: "Design mean-reversion model" (status: done) ← completed
├── Issue #222: "Implement mean-reversion strategy" (status: done) ← completed
├── Issue #223: "Validate mean-reversion strategy" (status: done) ← validator completed its job correctly
├── Task: "Refine mean-reversion strategy to reduce overfitting" (tag: task, assigned: quant-researcher, status: todo, phase: development)
│   Comment: "Strategy flagged as overfitted by strategy-validator. Monte Carlo shows 40% return loss
│   with 5% parameter perturbation. Simplify the model — reduce parameter count, add regularization,
│   or use a more robust signal. The strategy code is correct; the model needs refinement."
├── Task: "Re-validate refined mean-reversion strategy" (tag: task, assigned: strategy-validator, status: todo, phase: validation)
│   └── Blocked by "Refine" task
```

3. Close Issue #223 (the original validation task) — the validator completed its job. The finding is captured in the new refinement task.

**Why NOT a platform task:**
- The backtesting engine runs correctly — no errors in order execution, PnL calculation, or data handling
- The Monte Carlo tool works correctly — it correctly identifies parameter sensitivity
- The validator's comment explicitly states "Not a platform bug — the backtesting engine and Monte Carlo tools work correctly"
- Creating a platform task would waste the dev team's time on a non-issue

**Why route to `quant-researcher` and NOT `head-of-research`:**
- This is a routine strategy refinement — the researcher adjusts parameters or simplifies the model
- `head-of-research` is only needed for critical research direction decisions (e.g., "should we abandon mean-reversion entirely?")
- If the researcher's refined strategy still fails validation, AND the researcher wants to pursue a fundamentally different approach, THEN escalate to `head-of-research` for direction approval

**Why optionally create an idea:**
- If the researcher comments: "The overfitting detection could be earlier in the process — we should have a pre-check that flags high parameter counts before full Monte Carlo", the PM could create an idea for a platform feature (better overfitting detection tools)
- This idea would route to `platform-architect` — but it's a SEPARATE action, not part of fixing the current strategy
- The current strategy still needs refinement regardless of whether better tools are built

**Assignment rationale:**
- **Refinement → `quant-researcher`**: The researcher designed the original model and has the domain expertise to simplify it. They understand the mathematical model, the parameters, and the tradeoffs. The validator's feedback (reduce parameter count, add regularization) is actionable by the researcher.
- **Re-validation → `strategy-validator`**: After refinement, the same validator runs the full check again — backtesting + Monte Carlo + robustness. The status loop completes the Feature once the refine + re-validate tasks are `done`.

**Key behaviors:**
- The PM correctly identifies this as a domain issue (strategy quality), not a technical issue (platform bug)
- The PM does NOT create a platform development task — nothing is broken in the platform
- The PM routes to the right agent: `quant-researcher` for strategy refinement, not any platform agent
- The PM reuses the existing Feature parent — the strategy feature isn't done until it passes validation
- The validator's detailed comment (Sharpe ratio, parameter sensitivity, specific recommendation) is preserved and forwarded to the researcher
- The PM recognizes that validation failure in trading often means the strategy is flawed, not the tools

## Notes
- This is the most important domain-specific routing story for QuantEdge — the PM must distinguish "the code is wrong" from "the strategy is wrong"
- In traditional software, a test failure usually means a code bug. In trading, a validation failure often means the strategy's mathematical model is flawed, even though all code runs perfectly.
- The validator's comment is the key signal: if it says "platform bug" (e.g., "orders not executing correctly"), route to platform team. If it says "strategy quality" (e.g., "overfitted", "not robust"), route to researcher.
- If the researcher disagrees with the validator's finding, the PM could ask `head-of-research` to arbitrate — but this is unlikely; the validator's Monte Carlo evidence is usually conclusive
- The cycle may repeat multiple times: researcher refines → validator checks → still overfitted → researcher refines again. The PM should not be alarmed by this — it's normal strategy development.
