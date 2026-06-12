# Story 20: Cross-Team Feature Request from Consumer to Provider

## Loop
Work Loop

## Description
A quant researcher discovers the backtesting engine doesn't support iceberg order types needed for their strategy. They create an idea requesting this feature. The PM must route the idea to the platform team (not research leadership), get feasibility approval, then plan cross-team work where the research strategy is blocked by the platform feature. Tests bottom-up feature routing and backlog re-prioritization across the consumer-producer boundary.

## Initial Conditions

- **Work queue:** Empty
- **Input:** An idea created by `quant-researcher`: "Add iceberg order type support to the backtesting engine — needed for new liquidity-based strategy"
- **agentrack state:**
  - Issue #200: "Add iceberg order type support to backtesting engine" — status: `idea`, created by `quant-researcher`, assignee: none
  - No other issues matching "iceberg" in status `idea`, `todo`, `in-progress`, or `closed` with `idea` tag

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM picks up Issue #200 from the ideas queue.
2. The PM checks for duplicates — no duplicates found.
3. The PM determines routing: this is a **platform tool** request, not a research direction → route to `platform-architect` (NOT `head-of-research`).
4. The architect reviews and accepts — iceberg orders are feasible and align with the engine's order model.
5. The PM creates the implementation plan with two epics: one for the platform team to implement iceberg orders, one for the research team to build the strategy that uses them.
6. The research epic is blocked by the platform epic's completion.

## Expected Output

### Phase 1: Routing

The PM should:

1. View Issue #200 and determine routing type — this is a platform feature request (tool needed by research)
2. Search for duplicates: list issues with status `idea`, `todo`, `in-progress`, and `closed` with `idea` tag matching "iceberg" — no duplicates found
3. Determine routing: the idea is about the **backtesting engine** (a platform tool) → route to `platform-architect` (dev team lead), NOT `head-of-research`
4. Create review children:
   ```
   Issue #200: "Add iceberg order type support to backtesting engine" (status: in-progress, assigned: project-manager)
   ├── Task: "Review: Iceberg order type support for backtesting engine" (tag: task, assigned: platform-architect, status: todo)
   └── Task: "Check review decision on iceberg order idea" (tag: task,sync, assigned: project-manager, status: todo)
       └── Blocked by review task
   ```
5. Add a comment: "Routed to platform-architect (dev team lead) for technical feasibility review. This is a platform tool request from the research team."

### Phase 2: Architect Reviews

6. Work loop picks up the review task, wakes `platform-architect`
7. Architect reviews the idea, evaluates the backtesting engine's order model
8. Architect adds comment: "Iceberg orders fit the existing order model — we'd add a `displayQuantity` field to the order type. The execution engine already supports partial fills, so the simulation layer just needs to expose the hidden quantity logic. Accept — estimated 1 sprint."
9. Architect marks review task as `done`
10. System auto-resolves blockage on sync tracker

### Phase 3: PM Plans Cross-Team Implementation

11. Work loop picks up sync tracker, wakes PM
12. PM reads architect's comment — decision: **accepted**
13. PM marks sync tracker as `done`
14. PM tags Issue #200 as `initiative` and creates the cross-team plan:

```
Issue #200: "Add iceberg order type support to backtesting engine" (tag: initiative, status: in-progress, assigned: project-manager)
│
├── Epic: "Implement iceberg order type in platform" (tag: epic, assigned: project-manager, status: in-progress)
│   │
│   └── Feature: "Iceberg order type support" (tag: feature, assigned: project-manager, status: in-progress)
│       ├── Task: "Design iceberg order model for backtesting engine" (tag: task, assigned: platform-architect, status: todo, phase: planning)
│       ├── Task: "Review iceberg order design for strategy needs" (tag: task, assigned: quant-researcher, status: todo)
│       │   └── Blocked by "Design" task (can't review until architect produces the design)
│       ├── Task: "Verify iceberg order design agreed" (tag: task,sync, assigned: project-manager, status: todo)
│       │   └── Blocked by "Review" task (PM reads review to check for issues)
│       ├── Task: "Implement iceberg order type" (tag: task, assigned: platform-developer, status: todo, phase: development)
│       │   └── Blocked by "Verify design agreed" task (can't implement until consumer agrees)
│       ├── Task: "Validate iceberg order type" (tag: task, assigned: platform-validator, status: todo, phase: validation)
│       │   └── Blocked by "Implement" task
│       ├── Task: "Release iceberg order type" (tag: task, assigned: platform-releaser, status: todo, phase: release)
│       │   └── Blocked by "Validate" task
│       └── Task: "Verify iceberg order feature complete" (tag: task,sync, assigned: project-manager, status: todo)
│           └── Blocked by "Release" task
│
├── Epic: "Build iceberg-based liquidity strategy" (tag: epic, assigned: project-manager, status: in-progress)
│   │
│   └── Feature: "Iceberg liquidity strategy" (tag: feature, assigned: project-manager, status: in-progress)
│       ├── Task: "Design iceberg liquidity strategy model" (tag: task, assigned: quant-researcher, status: todo, phase: planning)
│       │   └── Blocked by Platform Epic's sync tracker (can't plan strategy until platform feature is released)
│       ├── Task: "Implement iceberg liquidity strategy" (tag: task, assigned: quant-researcher, status: todo, phase: development)
│       │   └── Blocked by "Design" task
│       ├── Task: "Validate iceberg liquidity strategy" (tag: task, assigned: strategy-validator, status: todo, phase: validation)
│       │   └── Blocked by "Implement" task
│       └── Task: "Verify iceberg strategy complete" (tag: task,sync, assigned: project-manager, status: todo)
│           └── Blocked by "Validate" task
│
└── Task: "Verify iceberg initiative complete" (tag: task,sync, assigned: project-manager, status: todo)
    └── Blocked by both epic sync trackers (both epics must complete)
```

**4-level hierarchy: Initiative → Epic → Feature → Task**
- **Initiative** groups the two team-level epics — platform build + research consumption
- **Epic** groups each team's work — one per team (Dev and Research)
- **Feature** is the deliverable with a full Plan → Dev → Validate → Release lifecycle (platform) or Plan → Dev → Validate lifecycle (strategy)
- **Task** is individual phase work assigned to worker agents

**Assignment rationale:**

*Platform Epic:*
- **Planning → `platform-architect`**: Iceberg orders need a data model design — `displayQuantity`, hidden quantity logic, partial fill simulation. The architect creates the spec.
- **Review → `quant-researcher`**: The consumer validates the iceberg order design — confirms the order model supports the display/hidden quantity behavior their liquidity strategy needs. Consumer check: "Can I build my iceberg strategy with this order model?"
- **Sync → `project-manager`**: PM reads the researcher's design review. If issues found, creates fix tasks for architect + re-review for researcher and loops until agreed.
- **Development → `platform-developer`**: Implements the iceberg order type in the backtesting engine from the agreed design.
- **Validation → `platform-validator`**: Tests order execution correctness — hidden quantity behavior, partial fills, display quantity replenishment.
- **Release → `platform-releaser`**: Deploys the updated backtesting engine so the research team can use it.

*Research Epic:*
- **Planning → `quant-researcher`**: Designs the mathematical model for the iceberg-based liquidity strategy. Blocked until platform feature is released — needs the actual iceberg order support to design against.
- **Development → `quant-researcher`**: Implements the strategy code using the new iceberg order type.
- **Validation → `strategy-validator`**: Backtests the strategy, runs Monte Carlo simulations, checks for overfitting. Note: strategy work has no release phase — strategies are evaluated in the backtesting environment.

*Cross-team dependency:*
- The research epic's planning task is blocked by the platform epic's sync tracker — the researcher can't even start designing the strategy until the platform feature is released and available.

**Key behaviors:**
- The PM correctly routes the platform tool request to `platform-architect`, NOT `head-of-research`
- The PM recognizes the consumer-producer dependency: research team needs a tool that the dev team must build first
- **The researcher who requested the feature reviews the iceberg order design** — the consumer validates the design meets their strategy needs before the platform team implements it
- **The PM reads the researcher's design review** — if issues found, creates fix tasks for architect + re-review tasks for researcher and loops until agreement is total
- The PM does NOT decide the design is agreed by itself — the consumer's review determines agreement
- The cross-team blockage is modeled at the task level: research planning blocked by platform feature's sync tracker
- The strategy feature has no release phase — strategies are backtesting-only deliverables
- The initiative-level sync tracker ensures both epics complete before the initiative is closed
- The PM uses the same duplicate-check → route → review → plan pattern as Story 11

## Notes
- This is the canonical "bottom-up feature request" pattern for QuantEdge — the research team drives the dev team's backlog
- The key routing decision: iceberg orders are a PLATFORM feature, not a research direction. If the idea had been "should we explore iceberg strategies?" it would go to `head-of-research`. But since it's "add iceberg orders to the engine", it goes to `platform-architect`.
- The researcher who requested the feature reviews the implementation design — they know best what their strategy needs from the iceberg order model
- If the researcher's design review reveals issues (e.g., "I need time-varying display quantities for the strategy"), the PM creates fix tasks for the architect and re-review tasks for the researcher, looping until agreement is total
- If the platform architect had rejected the idea (e.g., "iceberg orders don't fit the engine architecture"), the PM would route back to the researcher with the architect's reasoning
- If the dev team pushed back due to competing priorities, the PM would escalate to `cto` for cross-team arbitration
- The researcher's original idea issue becomes the Initiative parent — no new parent needed
