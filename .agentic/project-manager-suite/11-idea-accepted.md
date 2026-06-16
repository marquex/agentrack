# Story 11: Idea Accepted — Cross-Team Idea Routed to Platform Team Lead

## Loop
Ideas Loop

## Description
A research agent creates a technical `idea` issue requesting a new platform capability. The PM checks for duplicates, finds none, and routes it to the platform team lead for approval — this is a platform tool, not a research direction. The platform team lead accepts it. The PM then plans the implementation.

## Initial Conditions

- **agentrack state:**
  - Issue #80: "Add risk-adjusted performance metric to backtesting engine" — status: `idea`, created by `quant-researcher`, assignee: none
  - No other issues matching "risk-adjusted performance metric" in status `idea`, `todo`, `in-progress`, or `closed` with `idea` tag

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM picks up Issue #80 from the ideas queue.
2. The PM checks for duplicates — searches issues in `idea`, `todo`, `in-progress`, and `closed` with `idea` tag.
3. No duplicates found.
4. The PM determines: this is a platform tool idea (new metric in the backtesting engine) → route to platform team lead (`platform-architect`), NOT to `head-of-research`.
5. The PM creates a review task for the platform architect + sync tracker for itself.
6. The platform architect reviews and accepts.
7. The PM creates the implementation plan.

## Expected Output

### Phase 1: Routing

The PM should:

1. View Issue #80 and determine routing type (platform tool vs research direction, creator identity)
2. Search for duplicates: list issues with status `idea`, `todo`, `in-progress`, and `closed` with `idea` tag matching "risk-adjusted performance metric" → no duplicates found
3. Determine routing: the idea is a platform tool (new metric in the backtesting engine) → route to platform team lead (`platform-architect`). This is NOT a research direction idea — even though it was created by a researcher, it requires platform infrastructure changes.
4. Create review children:
   ```
   Issue #80: "Add risk-adjusted performance metric to backtesting engine" (status: in-progress, assigned: project-manager)
   ├── Task: "Review: Add risk-adjusted performance metric to backtesting engine" (tag: task, assigned: platform-architect, status: todo)
   └── Task: "Check review decision on risk-adjusted metric idea" (tag: task,sync, assigned: project-manager, status: todo)
       └── Blocked by review task
   ```
5. Add a comment: "Routed to platform-architect (platform team lead) for technical review. This is a platform tool idea — even though it was created by quant-researcher, it requires backtesting engine changes."

### Phase 2: Architect Reviews

6. Work loop picks up the review task, wakes `platform-architect`
7. Architect reviews the idea, adds comment: "The backtesting engine already computes raw returns and drawdowns — adding a risk-adjusted metric (e.g., Sharpe ratio, Sortino ratio) is straightforward. We can extend the metrics module. Accept."
8. Architect marks review task as `done`
9. System auto-resolves blockage on sync tracker

### Phase 3: PM Acts on Decision

10. Work loop picks up sync tracker, wakes PM
11. PM reads architect's comment → decision: **accepted**
12. PM marks sync tracker as `done`
13. PM tags Issue #80 as `feature` (it's a new capability)
14. PM creates implementation children under Issue #80:
    ```
    Issue #80: "Add risk-adjusted performance metric to backtesting engine" (tag: feature, status: todo, assigned: project-manager)
    ├── Task: "Review: ..." (status: done) ← completed during review
    ├── Task: "Check review decision" (status: done) ← completed
    ├── Task: "Design metric API" (tag: task, assigned: platform-architect, status: todo, phase: planning)
    ├── Task: "Review metric design for research needs" (tag: task, assigned: quant-researcher, status: todo)
    │   └── Blocked by "Design" task (can't review until architect produces the design)
    ├── Task: "Verify metric design agreed" (tag: task,sync, assigned: project-manager, status: todo)
    │   └── Blocked by "Review" task (PM reads review to check for issues)
    ├── Task: "Implement risk-adjusted metric" (tag: task, assigned: platform-developer, status: todo, phase: development)
    │   └── Blocked by "Verify design agreed" task (can't implement until consumer agrees)
    ├── Task: "Validate risk-adjusted metric" (tag: task, assigned: platform-validator, status: todo, phase: validation)
    │   └── Blocked by "Implement" task
    ├── Task: "Release risk-adjusted metric" (tag: task, assigned: platform-releaser, status: todo, phase: release)
    │   └── Blocked by "Validate" task
    ```

**Assignment rationale:**
- **Review → `platform-architect`**: Platform team lead for technical direction. Decides if the idea aligns with the platform's architecture and roadmap. Even though `quant-researcher` created the idea, it's a platform tool — routing goes to the platform team lead, not `head-of-research`.
- **Planning → `platform-architect`**: Metric API needs careful design — which ratios to support, how to integrate with the existing metrics module, data requirements, output format.
- **Design Review → `quant-researcher`**: The consumer validates the metric design — confirms the ratios, data granularity, and output format match what they need for strategy evaluation. Consumer check: "Will this metric give me what I need to evaluate my strategies?"
- **Sync → `project-manager`**: PM reads the researcher's design review. If issues found (wrong ratios, missing data), creates fix tasks for architect + re-review for researcher and loops until agreed.
- **Development → `platform-developer`**: Implements the metric in the backtesting engine, extending the metrics module from the agreed design.
- **Validation → `platform-validator`**: Tests metric correctness (known inputs → expected outputs), edge cases (zero volatility, single data point), performance impact.
- **Release → `platform-releaser`**: Documents the new metric, deploys to production.

**Key behaviors:**
- The PM does NOT evaluate the idea itself — it routes to the appropriate team lead
- The PM correctly identifies this as a platform tool idea despite being created by a researcher — routing goes to `platform-architect`, not `head-of-research`
- The PM checks for duplicates first before doing anything else
- Platform tool ideas go to `platform-architect`; research direction ideas go to `head-of-research`; cross-team conflicts go to `cto`
- The review uses the same sync tracker pattern: task for reviewer + sync tracker for PM
- Only after the team lead accepts does the PM create the implementation plan
- **The researcher reviews the metric design before the platform implements it** — the consumer who requested the feature validates the design meets their needs
- **The PM reads the researcher's review** — if issues found, creates fix tasks and loops until agreement is total
- The idea issue becomes the Feature parent — no new parent needed
- This is a bottom-up idea from the consumer (research) team to the provider (platform) team — the researcher needs a tool that only the platform team can build
- If the idea had been created by a manager (head-of-research, platform-architect, or PM), it would be treated as already accepted — skip review, go straight to planning

## Notes
- The PM's role in the ideas loop is routing, not evaluating
- The key routing decision here: even though `quant-researcher` created the idea, it's about a platform tool, so it goes to `platform-architect` — NOT to `head-of-research`
- `head-of-research` handles research direction ideas (which strategies to pursue, research priorities), not platform feature requests from researchers
- The duplicate check scope: `idea`, `todo`, `in-progress`, and `closed` with `idea` tag
- Ideas created by managers (`head-of-research`, `platform-architect`, `project-manager`, `cto`) are auto-accepted — no review needed
- The researcher who created the idea reviews the implementation design — they know best what they need from the metric. This is the joint agreement pattern: the provider designs, the consumer validates, the PM reads the review and iterates until both agree.
- If the researcher's design review reveals issues (e.g., "I need the Sortino ratio, not just Sharpe"), the PM creates fix tasks for the architect and re-review tasks for the researcher, looping until agreement is total
