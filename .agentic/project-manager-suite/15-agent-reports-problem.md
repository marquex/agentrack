# Story 15: Agent Reports a Problem — Platform Blocker on Strategy Work

## Loop
Work Loop + Project Status Loop

## Description
A research agent working on a strategy issue encounters an unresolvable problem — the backtesting engine has a bias that invalidates their strategy results. The agent marks the issue as `todo` and reassigns it back to the PM with a detailed technical description. The PM recognizes the platform nature of the blocker and asks the platform team lead for a solution before creating any new issues.

## Initial Conditions

- **agentrack state:**
  - Issue #120: "Implement pairs trading strategy" — status: `todo`, assignee: `project-manager`
    - Has a comment from `quant-researcher`: "Cannot validate pairs trading strategy — the backtesting engine doesn't account for market impact. All backtest results show unrealistic fills. The engine assumes zero slippage on all orders. This is a platform limitation, not a strategy issue."
    - Reassigned back to PM by the researcher
  - Issue #120 was blocked by nothing (blockages clear)
  - No slippage model exists in the backtesting engine

### Team Context

> See [Team Roster](00-team-roster.md) for agent roles.

| Agent | Relevance |
|---|---|
| `quant-researcher` | Reported the blocker on #120 — needs platform fix before it can validate the pairs trading strategy |
| `platform-architect` | **Platform team lead** — must analyze the blocker and propose a solution |
| `platform-developer` | Would implement whichever platform fix gets created |
| `platform-validator` | Would validate whichever platform fix gets created |
| `platform-releaser` | Would release whichever platform fix gets created |

## User Story

1. The PM picks up Issue #120 (reassigned to it by the researcher).
2. The PM reads the comment and understands the blocker.
3. The PM recognizes this is a platform problem — but does NOT design the solution itself.
4. The PM asks the platform team lead (`platform-architect`) to analyze the blocker and propose a solution.
5. The platform architect responds with a proposed approach.
6. Based on the architect's proposal, the PM creates the prerequisite platform work.

## Expected Output

### Phase 1: PM Asks the Architect

The PM should:

1. View Issue #120 and read the researcher's comment
2. Analyze the problem: the strategy requires platform infrastructure that doesn't exist
3. Recognize this is a **platform** limitation — but the PM does NOT decide what the solution is
4. Create a consultation task for the platform architect under Issue #120:
   ```
   Issue #120: "Implement pairs trading strategy" (status: in-progress, assigned: project-manager)
   ├── Task: "Analyze blocker: backtesting engine lacks market impact modeling" (tag: task, assigned: platform-architect, status: todo)
   └── Task: "Check architect's solution for backtesting bias blocker" (tag: task,sync, assigned: project-manager, status: todo)
       └── Blocked by analysis task
   ```
5. Add a comment to Issue #120: "Researcher reports platform blocker — backtesting engine doesn't account for market impact, producing unrealistic fills. Asking platform-architect (platform team lead) to analyze and propose a solution."

### Phase 2: Architect Analyzes and Proposes

6. Work loop picks up the analysis task, wakes `platform-architect`
7. Architect investigates the backtesting engine and the researcher's report
8. Architect adds comment with proposed solution: "The backtesting engine needs a slippage model. I recommend adding a configurable slippage module that simulates market impact based on order size relative to average volume. The module should plug into the existing execution pipeline and apply slippage before recording fills. Researchers can toggle it on/off and adjust parameters per strategy."
9. Architect marks analysis task as `done`
10. System auto-resolves blockage on sync tracker

### Phase 3: PM Validates Solution with Researcher

11. Work loop picks up sync tracker, wakes PM
12. PM reads the architect's proposal
13. PM recognizes: the researcher reported the problem and should validate the solution actually fixes it. PM does NOT decide the solution is sufficient by itself.
14. PM creates a validation task for the researcher under Issue #120:
    ```
    Issue #120: "Implement pairs trading strategy" (status: in-progress, assigned: project-manager)
    ├── Task: "Analyze blocker..." (status: done) ✓
    ├── Task: "Check architect's solution..." (status: done) ✓
    ├── Task: "Validate proposed slippage model addresses backtesting bias" (tag: task, assigned: quant-researcher, status: todo)
    └── Task: "Check researcher's validation of slippage model proposal" (tag: task,sync, assigned: project-manager, status: todo)
        └── Blocked by validation task
    ```
15. Add a comment: "Platform-architect proposes a configurable slippage model. Asking quant-researcher to validate the proposal addresses their backtesting bias issue."

### Phase 4: Researcher Validates the Proposal

16. Work loop picks up the validation task, wakes `quant-researcher`
17. Researcher reviews the architect's proposal against their original problem
18. Researcher adds comment: "The slippage model addresses the core issue — realistic fills based on order size. A few requirements: (1) must support per-asset slippage parameters (crypto has different liquidity than equities), (2) need configurable market impact function (linear is fine for now, but the architecture should allow non-linear models later). Otherwise the proposal looks good."
19. Researcher marks validation task as `done`
20. System auto-resolves blockage on sync tracker

### Phase 5: PM Acts on Agreed Solution

21. Work loop picks up sync tracker, wakes PM
22. PM reads the researcher's validation — the solution is agreed with some additional requirements
23. PM marks sync tracker as `done`
24. Based on the agreed solution, PM creates the prerequisite Feature:
    ```
    Feature: "Add slippage model to backtesting engine" (tag: feature, assigned: project-manager, status: in-progress)
    ├── Task: "Design slippage model architecture" (tag: task, assigned: platform-architect, status: todo, phase: planning)
    ├── Task: "Implement slippage model" (tag: task, assigned: platform-developer, status: todo, phase: development)
    │   └── Blocked by "Design" task
    ├── Task: "Validate slippage model" (tag: task, assigned: platform-validator, status: todo, phase: validation)
    │   └── Blocked by "Implement" task
    ├── Task: "Release slippage model" (tag: task, assigned: platform-releaser, status: todo, phase: release)
    │   └── Blocked by "Validate" task
    └── Task: "Verify slippage model complete" (tag: task,sync, assigned: project-manager, status: todo)
        └── Blocked by "Release" task
    ```
25. Create a blockage: Issue #120 (original strategy task) is blocked by the slippage model Feature's sync tracker (the platform prerequisite must complete before the strategy work resumes)
26. Add a comment to Issue #120: "Based on agreed solution (platform-architect proposal validated by quant-researcher), creating prerequisite Feature: 'Add slippage model to backtesting engine.' Requirements from researcher: per-asset slippage parameters, configurable market impact function. This strategy will resume after the slippage model is implemented and released."

**Assignment rationale:**
- The PM correctly identifies that this is a **platform limitation** — but doesn't design the solution itself
- The `platform-architect` (platform team lead) analyzes the problem and proposes the approach
- Only after the architect's proposal does the PM create the implementation plan
- The `quant-researcher` reported the problem and will benefit from the platform fix when resuming the strategy
- The prerequisite work is assigned to the platform team (design→dev→validate→release), not the research team
- The original strategy task (#120) stays blocked until the platform prerequisite is fully released

**Key behaviors:**
- The PM reads the detailed technical problem description
- It recognizes when a problem needs platform architectural design — but asks the platform architect, doesn't decide the solution
- **It validates the proposed solution with the researcher who reported the problem** — the researcher knows best whether the solution addresses their needs
- **The PM reads the researcher's validation** — if the researcher says the solution doesn't fully address the problem, the PM goes back to the architect with the feedback and loops until both agree
- The PM does NOT decide the solution is sufficient by itself — the consumer (researcher) who reported the problem validates the proposal
- It correctly identifies this as a platform bug, not a strategy failure — validation failures from platform limitations are routed to the platform team, not back to the researcher
- It uses the same review task + sync tracker pattern: ask the expert, validate with the consumer, then act
- It communicates clearly at every step — the researcher knows what's happening with their blocker
- It sets up proper blockages so the original issue will resume automatically after the prerequisite is done
- **PM sets new Feature to `in-progress`** after creating children + sync tracker

## Notes
- The PM should trust the researcher's assessment that the backtesting bias is a platform limitation
- The PM should NOT trust its own ability to design the solution — that's the platform architect's job
- The PM should NOT trust its own ability to evaluate whether the solution is sufficient — that's the researcher's job. The researcher reported the problem and should validate the proposed fix.
- The architect might propose a different solution than "slippage model" — the PM must follow the architect's recommendation, not assume the solution
- If the researcher's validation reveals the solution doesn't fully address the problem, the PM goes back to the architect with the researcher's feedback and loops until both agree
- If the architect says "this is not a platform problem, the researcher just needs to adjust their position sizing", the PM can unblock the original issue and reassign it back to `quant-researcher` with the architect's guidance
- This pattern (ask the expert, validate with the consumer, then create issues) prevents the PM from creating unnecessary or wrong work
- The PM correctly routes this to `platform-architect` — strategy validation failures caused by platform bugs are platform problems, not research problems
