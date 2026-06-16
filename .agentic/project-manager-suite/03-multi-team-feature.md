# Story 03: Multi-Team Feature

## Loop
Work Loop

## Description
A feature spans both the platform dev team and the quant research team. The PM must coordinate across two teams, ensuring platform work completes before research can build on it.

## Initial Conditions

- **Work queue:** Empty
- **Input:** "Add a crypto data feed to the platform and create a crypto trading strategy"
- **agentrack state:** No existing issues

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives the cross-team feature request.
2. The PM identifies that this requires platform infrastructure work first, then research strategy work.
3. The PM creates an Epic to group the two team deliverables, then plans each team's contribution as its own Feature.
4. Within each Feature, the standard phases are applied.
5. Cross-team blockages ensure research can't start until the platform work is done.

## Expected Output

```
Epic: "Add crypto data feed and crypto trading strategy" (tag: epic, assigned: project-manager, status: in-progress)
│
├── Feature: "Crypto market data feed" (tag: feature, assigned: project-manager, status: in-progress)
│   ├── Task: "Design crypto data feed architecture" (tag: task, assigned: platform-architect, status: todo, phase: planning)
│   ├── Task: "Review data feed design for strategy needs" (tag: task, assigned: quant-researcher, status: todo)
│   │   └── Blocked by "Design" task (can't review until architect produces the design)
│   ├── Task: "Verify data feed design agreed" (tag: task,sync, assigned: project-manager, status: todo)
│   │   └── Blocked by "Review" task (PM reads review to check for issues)
│   ├── Task: "Implement crypto data feed" (tag: task, assigned: platform-developer, status: todo, phase: development)
│   │   └── Blocked by "Verify design agreed" task (can't implement until consumer agrees)
│   ├── Task: "Validate crypto data feed" (tag: task, assigned: platform-validator, status: todo, phase: validation)
│   │   └── Blocked by "Implement" task
│   ├── Task: "Release crypto data feed" (tag: task, assigned: platform-releaser, status: todo, phase: release)
│   │   └── Blocked by "Validate" task
│
├── Feature: "Crypto trading strategy" (tag: feature, assigned: project-manager, status: in-progress)
│   ├── Task: "Plan crypto trading strategy" (tag: task, assigned: quant-researcher, status: todo, phase: planning)
│   │   └── Blocked by platform feature "Release" task (can't plan strategy until data feed is available)
│   ├── Task: "Implement crypto trading strategy" (tag: task, assigned: quant-researcher, status: todo, phase: development)
│   │   └── Blocked by "Plan" task
│   └── Task: "Validate crypto trading strategy" (tag: task, assigned: strategy-validator, status: todo, phase: validation)
│       └── Blocked by "Implement" task
│
└── (Epic completed by the status loop once both Features are done)
```

**No completion children.** Neither Feature nor the Epic gets a "Verify complete" child. Each Feature is marked `done` by the status loop once its phase tasks are all `done` (they have the Epic as parent → marked `done`, not closed). Once both Features are `done`, the status loop finds the Epic `in-progress` with all children `done` → since the Epic has no parent, it is `closed` and its children (the Features) are `closed`.

**3-level hierarchy: Epic → Feature → Task**
- **Epic** groups the two related deliverables (the platform data feed + the research strategy). No Initiative, and no per-team Epic — each team contributes exactly one deliverable, so a per-team grouping would be a parent with a single child (pure overhead).
- **Feature** is each team's deliverable with its own lifecycle (platform: Plan→Dev→Validate→Release; strategy: Plan→Dev→Validate).
- **Task** is individual phase work assigned to worker agents.

Teams are reflected by **assignment** (platform agents vs. research agents), not by extra hierarchy levels.

**Assignment rationale:**

*Platform Feature (data feed):*
- **Planning → `platform-architect`**: Crypto data feed needs proper design (data sources, ingestion pipeline, normalization, storage schema). Architect creates the spec.
- **Review → `quant-researcher`**: The consumer validates the design — confirms the data feed provides the right crypto pairs, data granularity, and fields needed for the trading strategy. This is a consumer check: "Can I build my strategy with this data feed?"
- **Sync → `project-manager`**: PM reads the researcher's review. If issues found, creates fix tasks for architect + re-review for researcher and loops until agreed.
- **Development → `platform-developer`**: Implements the data feed from the agreed design — connectors, normalization, API endpoints.
- **Validation → `platform-validator`**: Tests data feed correctness, latency, error handling. Reports any bugs to PM (doesn't fix them).
- **Release → `platform-releaser`**: Runs full test suite, generates docs, deploys the feed to production.

*Research Feature (strategy):*
- **Planning → `quant-researcher`**: Plans the crypto strategy — signal selection, entry/exit rules, position sizing. Blocked until crypto data feed is released.
- **Development → `quant-researcher`**: Implements the strategy, backtests initial parameters, iterates on the model.
- **Validation → `strategy-validator`**: Runs full backtesting suite, Monte Carlo simulations, overfitting detection. Does NOT fix strategy issues — reports findings to PM.

*Cross-team dependency:*
- The research Feature is blocked by the platform release — the quant researcher can't even plan the strategy until the crypto data feed is available and documented.

**Key behaviors:**
- The PM recognizes cross-team dependencies and models them with blockages
- **The researcher reviews the data feed design before the platform implements it** — both teams must agree on what the data feed provides (data format, fields, granularity, update frequency)
- **The PM reads the researcher's review via the design-agreement gate tracker** — if the researcher found issues (wrong granularity, missing fields), the PM creates fix tasks for the architect and re-review tasks for the researcher, looping until agreement is total
- The PM does NOT decide the design is agreed by itself — the researcher's review determines agreement
- The PM does NOT start platform implementation until agreement is total — no "we'll fix it later" shortcuts
- Each team follows its own phase structure independently after the design is agreed
- The platform release must complete before research can start planning the strategy
- Research work has no release phase — strategies go through plan→dev→validate only
- **PM sets the Epic and both Features to `in-progress`** after creating all children — prevents re-waking. No completion children are created; the status loop completes each Feature when its phase tasks are done, then completes the Epic when both Features are done. See Story 01 for the single-feature lifecycle example.
- Blockages resolve automatically when an agent marks its issue `done`, cascading through the chain across both teams

## Notes
- This is the most complex planning scenario — cross-team coordination with joint design agreement
- The researcher's design review ensures the platform builds the right data feed — wrong granularity or missing fields would waste the platform team's time
- The design review does NOT unblock research work earlier — research is still blocked by the platform release because the researcher needs the actual running data feed to plan and test the strategy
- If the researcher's review reveals design issues (e.g., "I need tick-level data, not 1-minute bars"), the PM creates fix tasks for the architect and re-review tasks for the researcher, looping until both agree
- Research work has no release phase — the strategy-validator is the final gate
- The research epic does not assign to `head-of-research` because this is implementation, not direction-setting
- If validation finds issues in the platform epic, the validator reassigns to PM who creates a new dev task in the platform epic
- If validation finds issues in the research epic, the strategy-validator reports to PM who routes back to `quant-researcher` (strategy problems are NOT platform bugs)
