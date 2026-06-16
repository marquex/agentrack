# Story 26: Research Generates Platform Idea via Comment

## Loop
Ideas Loop (triggered during status loop)

## Description
While working on a momentum strategy, `quant-researcher` leaves a comment saying they spend 90% of their time cleaning data and need an automated data normalization pipeline. The PM, monitoring comments during the status loop, must recognize this is a platform feature request (not a research issue), create an idea from the researcher's comment, and route it to `platform-architect`. Tests cross-team idea recognition from agent comments and proactive idea creation.

## Initial Conditions

- **Work queue:** Has in-progress work
- **Input:** No direct input — the PM discovers this during status loop monitoring
- **agentrack state:**
  - Issue #260 (parent): "Develop momentum strategy for equities" — status: `in-progress`, assignee: `project-manager`
  - Issue #261: "Design momentum model" — status: `done`, assignee: `quant-researcher`
  - Issue #262: "Implement momentum strategy" — status: `in-progress`, assignee: `quant-researcher`
    - Has a recent comment from `quant-researcher`: "Making progress on the momentum calculation, but I'm spending 90% of my time cleaning data — manually handling missing values, normalizing timestamps across exchanges, filtering out bad ticks. We really need an automated data normalization pipeline. This is slowing down all strategy development, not just this one."
  - Issue #263: "Validate momentum strategy" — status: `todo`, blocked by #262, assignee: `strategy-validator`
  - No existing issues matching "data normalization" or "data pipeline" in any status

### Team Context

> See [Team Roster](00-team-roster.md) for all agent roles.

| Agent | Current state |
|---|---|
| `quant-researcher` | **ACTIVE** — working on momentum strategy implementation (#262). The comment about data cleaning was a side observation, not a request to stop working. |
| `strategy-validator` | Blocked — waiting on #262 for strategy validation. |
| `platform-architect` | Idle — available to review the platform idea. |
| `head-of-research` | Idle — NOT the right person for this idea (it's a platform tool, not research direction). |
| `cto` | Idle — available if cross-team prioritization arbitration is needed. |

## User Story

1. The PM is awakened for a status check (status loop).
2. The PM lists all `in-progress` issues and reviews comments for context.
3. The PM reads the `quant-researcher`'s comment on Issue #262 about data cleaning.
4. The PM recognizes: this is a **cross-team feature request** — the researcher needs a platform tool, not a research methodology change.
5. The PM creates a new idea issue from the researcher's comment.
6. The PM routes the idea to `platform-architect` (NOT `head-of-research`).
7. If accepted, the PM creates a platform feature. If prioritization is unclear, escalate to `cto`.

## Expected Output

### Phase 1: PM Discovers the Idea During Status Loop

The PM should:

1. List all `in-progress` issues for status review
2. Read comments on Issue #262 to check progress
3. Encounter the researcher's comment about data cleaning
4. Analyze the comment:
   - "spending 90% of my time cleaning data" — productivity bottleneck
   - "manually handling missing values, normalizing timestamps, filtering bad ticks" — specific platform needs
   - "we really need an automated data normalization pipeline" — clear feature request
   - "this is slowing down all strategy development" — broad impact, not just this strategy
5. Recognize: this is a **platform feature request** (data pipeline is a platform tool), NOT a research direction issue
6. Do NOT interrupt the researcher's current work — the comment was observational, not a request to stop

### Phase 2: PM Creates the Idea

7. Create a new idea issue:
   ```
   Issue #265: "Build automated data normalization pipeline" (status: idea, created by: project-manager, assignee: none)
   Comment: "Originated from quant-researcher's comment on #262: 'I'm spending 90% of my time
   cleaning data — manually handling missing values, normalizing timestamps across exchanges,
   filtering out bad ticks. We really need an automated data normalization pipeline. This is
   slowing down all strategy development, not just this one.' This is a platform infrastructure
   request that would benefit the entire research team."
   ```
8. The PM notes: this is NOT a duplicate — checked for existing "data normalization" or "data pipeline" issues and found none

### Phase 3: Routing

9. Determine routing: this is a **platform technical idea** (data pipeline infrastructure) → route to `platform-architect` (dev team lead)
10. NOT `head-of-research` — this is about building a platform tool, not choosing a research direction
11. Create review children:
    ```
    Issue #265: "Build automated data normalization pipeline" (status: in-progress, assigned: project-manager)
    ├── Task: "Review: Automated data normalization pipeline" (tag: task, assigned: platform-architect, status: todo)
    └── Task: "Check review decision on data normalization idea" (tag: task,sync, assigned: project-manager, status: todo)
        └── Blocked by review task
    ```
12. Add a comment: "Routed to platform-architect (dev team lead) for technical feasibility review. This is a platform infrastructure request originating from the research team's productivity bottleneck. Impact: affects all strategy development velocity."

### Phase 4: Architect Reviews

13. Work loop picks up the review task, wakes `platform-architect`
14. Architect reviews the idea, evaluates platform's data infrastructure
15. Architect adds comment: "Good idea. Our data ingestion layer already handles most of the cleaning steps individually — we just need to compose them into a reusable pipeline. We'd build a DataNormalizer that chains: missing value imputation → timestamp normalization → tick quality filtering. Accept — this would unblock the research team and reduce their data prep time significantly."
16. Architect marks review task as `done`
17. System auto-resolves blockage on sync tracker

### Phase 5: PM Plans the Platform Feature

18. Work loop picks up sync tracker, wakes PM
19. PM reads architect's comment — decision: **accepted**
20. PM marks sync tracker as `done`
21. PM tags Issue #265 as `feature` and creates implementation children:

```
Issue #265: "Build automated data normalization pipeline" (tag: feature, status: in-progress, assigned: project-manager)
├── Task: "Review: ..." (status: done) ← completed during review
├── Task: "Check review decision" (status: done) ← completed
├── Task: "Design data normalization pipeline" (tag: task, assigned: platform-architect, status: todo, phase: planning)
├── Task: "Review pipeline design for research needs" (tag: task, assigned: quant-researcher, status: todo)
│   └── Blocked by "Design" task (can't review until architect produces the design)
├── Task: "Verify pipeline design agreed" (tag: task,sync, assigned: project-manager, status: todo)
│   └── Blocked by "Review" task (PM reads review to check for issues)
├── Task: "Implement data normalization pipeline" (tag: task, assigned: platform-developer, status: todo, phase: development)
│   └── Blocked by "Verify design agreed" task (can't implement until consumer agrees)
├── Task: "Validate data normalization pipeline" (tag: task, assigned: platform-validator, status: todo, phase: validation)
│   └── Blocked by "Implement" task
├── Task: "Release data normalization pipeline" (tag: task, assigned: platform-releaser, status: todo, phase: release)
│   └── Blocked by "Validate" task
```

**Why route to `platform-architect` and NOT `head-of-research`:**
- The data normalization pipeline is a **platform infrastructure tool** — it's software that the dev team builds
- `head-of-research` manages research direction (which strategies to pursue, risk parameters) — they don't manage platform architecture decisions
- The architect decides HOW to build it (pipeline composition, data models, API design), which is a technical decision
- If the researcher had said "should we change our data methodology?" it would go to `head-of-research`. But "we need a tool to automate data cleaning" goes to `platform-architect`.

**When to escalate to `cto`:**
- If `platform-architect` says "good idea but we don't have capacity — our roadmap is full through Q3", the PM should escalate to `cto` for cross-team priority arbitration
- The `cto` decides whether to prioritize research team productivity over the dev team's existing roadmap
- The PM does NOT make this prioritization decision itself — it escalates to leadership

**Assignment rationale:**
- **Review → `platform-architect`**: Team lead for platform technical direction. Evaluates if the idea is feasible and aligns with the platform's architecture.
- **Planning → `platform-architect`**: Data pipeline design — ingestion chain, data models, normalization rules, API for research team. Architect creates the spec.
- **Design Review → `quant-researcher`**: The consumer validates the pipeline design — confirms it handles the specific data cleaning needs they mentioned (missing values, timestamp normalization, bad tick filtering). Consumer check: "Will this pipeline handle the data issues I'm spending 90% of my time on?"
- **Sync → `project-manager`**: PM reads the researcher's design review. If issues found (missing cleaning step, wrong normalization approach), creates fix tasks for architect + re-review for researcher and loops until agreed.
- **Development → `platform-developer`**: Implements the pipeline from the agreed design — the reusable DataNormalizer module.
- **Validation → `platform-validator`**: Tests data accuracy, pipeline correctness, performance with large datasets.
- **Release → `platform-releaser`**: Deploys the pipeline so the research team can use it.

**Key behaviors:**
- The PM proactively creates an idea from an agent's comment — it doesn't wait for a formal feature request
- The PM recognizes the cross-team nature of the comment: research team pain point, platform team solution
- The PM does NOT interrupt the researcher's current work — the idea is created in parallel
- The PM attributes the idea to the researcher's comment (transparency)
- The PM routes to the correct team lead: `platform-architect` for a platform tool, NOT `head-of-research` for a research direction
- **The researcher reviews the pipeline design before the platform implements it** — the consumer who reported the pain point validates the design addresses their specific data cleaning needs
- **The PM reads the researcher's design review** — if issues found, creates fix tasks for architect + re-review for researcher and loops until agreement is total
- The PM checks for duplicates before creating the idea
- The PM considers escalation to `cto` if cross-team prioritization is unclear

## Notes
- This story combines skills from the status loop (monitoring comments) with ideas loop (creating and routing ideas) in a cross-team context
- The key insight: the researcher's comment is NOT a request to stop working or a complaint about the strategy — it's an observation about a platform gap that affects productivity
- The PM should NOT create the idea and immediately start planning it — the idea must go through the standard review process (route to team lead, wait for acceptance)
- The researcher who reported the pain point reviews the pipeline design — they know best whether the proposed pipeline handles their specific data cleaning needs
- If the researcher's design review reveals issues (e.g., "the pipeline doesn't handle cross-exchange timestamp alignment"), the PM creates fix tasks for the architect and re-review tasks for the researcher, looping until agreement is total
- If the idea had been "I think we should explore a different data methodology for our strategies", it would route to `head-of-research` instead
- The researcher continues working on their strategy while the platform idea is reviewed in parallel — these are independent work streams
- If the architect rejects the idea (e.g., "too costly for the current infrastructure"), the PM informs the researcher and closes the idea with the architect's reasoning
- This is the proactive version of Story 11 (idea accepted) — the PM creates the idea itself rather than routing one created by an agent
