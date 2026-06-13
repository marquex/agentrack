# Project Manager Suite — Initial Scores (Baseline)

> **Pre-improvement baseline for the `project-manager` agent** (`.claude/agents/project-manager.md`).
> Established **2026-06-13** against the full 27-scenario suite, *before* any agent-definition edits.
> Future improvements to the agent should be measured against these numbers.

## Headline

| Metric | Value |
|---|---|
| Scenarios scored | **27 / 27** |
| Pass rate (≥ 49/70) | **9 / 27 (33.3%)** |
| Average score | **39.6 / 70 (56.6%)** |
| Median score | 34 / 70 |
| Highest | 68 (#18 Empty Work Queue) |
| Lowest | 18 (#16 Agent Creates Out-of-Scope Idea) |

The agent **passes simple, reasoning-heavy interventions** (idle states, stuck-issue fixes, duplicate detection) but **fails the core planning/breakdown scenarios** that require the agentrack sync-tracker and hierarchy mechanics.

## Dimension Averages

Scores are 0–10 per dimension; 7 dimensions; max 70. **Pass threshold = 49/70 (70%).**

| # | Dimension | Avg | Bar (out of 10) | Verdict |
|---|---|---|---|---|
| 1 | **Assignments** | **7.0** | ███████░░░ | 🟢 Strongest — picks the right worker agent |
| 2 | Dependencies | 6.5 | ██████▌░░░ | 🟡 OK — blockage chains roughly right |
| 3 | Behavioral Accuracy | 6.1 | ██████░░░░ | 🟡 OK — reasoning is sound |
| 4 | Hierarchy & Tags | 5.6 | █████▌░░░░ | 🔴 Weak — skips levels, mis-tags tasks |
| 5 | Completeness | 5.6 | █████▌░░░░ | 🔴 Weak — missing expected children |
| 6 | Status Management | 5.1 | █████░░░░░ | 🔴 Weak — parent not set to `in-progress` |
| 7 | **Sync Pattern** | **3.7** | ████░░░░░░ | 🔴 **Weakest — sync tracker missing** |

**Root cause:** the current `project-manager.md` agent definition is generic — it has **no mention of the sync-tracker pattern, the strict issue-hierarchy tags, or the parent-status-management rules** that the suite's expected outputs require. So the dimensions tied to those mechanics (sync, hierarchy, status) collapse, while pure-reasoning dimensions (assignments, behavior) hold up.

## By Team

| Team | Pass | Avg / 70 | Verdict |
|---|---|---|---|
| Library + Webapp | 5 / 7 | **50.7** | 🟢 Best — simplest team structure |
| QuantEdge | 3 / 10 | 38.2 | 🟡 Mid — cross-team routing adds difficulty |
| AndroidApp | 1 / 10 | **33.2** | 🔴 Worst — contract-driven coordination breaks down |

## By Loop

| Loop | Pass | Avg / 70 | Verdict |
|---|---|---|---|
| Status Loop | 3 / 4 | **55.5** | 🟢 Best — pure diagnosis/fix |
| Error & Edge Cases | 3 / 6 | 47.5 | 🟡 Mid |
| Ideas Loop | 2 / 6 | 38.0 | 🟡 Mid |
| Work Loop | **1 / 11** | **30.4** | 🔴 **Worst — core planning fails** |

> The Work Loop (the PM's primary job — feature/bug breakdown, assignments, sync trackers) is where the agent struggles most. Only scenario #01 passes it.

## Per-Scenario Breakdown

Dimensions: **H**=Hierarchy · **A**=Assignments · **D**=Dependencies · **Sync**=Sync Pattern · **Stat**=Status Mgmt · **Beh**=Behavioral Accuracy · **Comp**=Completeness. Mean = total ÷ 7.

| # | Scenario | Team | Loop | H | A | D | Sync | Stat | Beh | Comp | Total | Mean | Pass |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | New Feature Request | lib+web | work | 7 | 7 | 8 | 10 | 9 | 8 | 8 | **57** | 8.1 | ✅ |
| 02 | Bug Fix Request | android | work | 7 | 9 | 6 | 1 | 4 | 8 | 6 | 41 | 5.9 | ❌ |
| 03 | Multi-Team Feature | quant | work | 3 | 5 | 4 | 0 | 2 | 3 | 3 | **20** | 2.9 | ❌ |
| 04 | Single Agent Task | lib+web | work | 5 | 6 | 4 | 0 | 1 | 4 | 3 | 23 | 3.3 | ❌ |
| 05 | Blocked Task Chain | android | work | 3 | 5 | 5 | 1 | 2 | 4 | 3 | 23 | 3.3 | ❌ |
| 06 | Parallel Independent Tasks | lib+web | work | 3 | 4 | 6 | 0 | 2 | 4 | 3 | 22 | 3.1 | ❌ |
| 07 | Agent Forgot to Move Issue to `done` | quant | status | 9 | 10 | 8 | 7 | 10 | 10 | 9 | **63** | 9.0 | ✅ |
| 08 | Parent In-Progress, No Active Children | android | status | 7 | 8 | 8 | 5 | 5 | 4 | 5 | 42 | 6.0 | ❌ |
| 09 | Blocked with Resolved Blockers | lib+web | status | 8 | 9 | 9 | 7 | 9 | 9 | 9 | **60** | 8.6 | ✅ |
| 10 | Stale In-Progress — Process Aborted | quant | status | 8 | 10 | 8 | 7 | 9 | 7 | 8 | **57** | 8.1 | ✅ |
| 11 | Idea Accepted — Cross-Team | quant | ideas | 5 | 6 | 5 | 5 | 4 | 5 | 5 | 35 | 5.0 | ❌ |
| 12 | Idea Discarded | lib+web | ideas | 7 | 10 | 10 | 10 | 6 | 9 | 7 | **59** | 8.4 | ✅ |
| 13 | Idea Needs Refinement | android | ideas | 4 | 5 | 3 | 3 | 4 | 6 | 5 | 30 | 4.3 | ❌ |
| 14 | Duplicate Idea — Closes Before Routing | android | ideas | 10 | 9 | 10 | 10 | 8 | 6 | 7 | **60** | 8.6 | ✅ |
| 15 | Agent Reports a Problem | quant | error | 5 | 7 | 6 | 1 | 3 | 3 | 4 | 29 | 4.1 | ❌ |
| 16 | Agent Creates Out-of-Scope Idea | android | ideas | 2 | 5 | 2 | 0 | 1 | 5 | 3 | **18** | 2.6 | ❌ |
| 17 | Unassigned `todo` Issue | lib+web | error | 9 | 10 | 9 | 9 | 9 | 10 | 10 | **66** | 9.4 | ✅ |
| 18 | Empty Work Queue | lib+web | error | 10 | 10 | 10 | 10 | 10 | 9 | 9 | **68** | 9.7 | ✅ |
| 19 | Replanning Mid-Flight | quant | error | 5 | 6 | 6 | 1 | 4 | 6 | 5 | 33 | 4.7 | ❌ |
| 20 | Consumer→Provider Request | quant | work | 3 | 5 | 4 | 0 | 3 | 5 | 5 | 25 | 3.6 | ❌ |
| 21 | API Contract Joint Planning | android | work | 4 | 5 | 5 | 1 | 4 | 5 | 4 | 28 | 4.0 | ❌ |
| 22 | Strategy Validation Not Bug | quant | work | 5 | 4 | 6 | 1 | 7 | 8 | 5 | 36 | 5.1 | ❌ |
| 23 | Device-Specific Bug Triage | android | work | 4 | 7 | 7 | 1 | 4 | 6 | 5 | 34 | 4.9 | ❌ |
| 24 | Production Hotfix vs Scheduled Work | quant | error | 8 | 10 | 10 | 10 | 7 | 6 | 7 | **58** | 8.3 | ✅ |
| 25 | Play Store Rejection Recovery | android | error | 4 | 6 | 6 | 0 | 5 | 5 | 5 | 31 | 4.4 | ❌ |
| 26 | Research Generates Platform Idea | quant | ideas | 4 | 5 | 4 | 0 | 3 | 6 | 4 | 26 | 3.7 | ❌ |
| 27 | Backend-First Dependency Chain | android | work | 2 | 5 | 6 | 0 | 4 | 5 | 3 | 25 | 3.6 | ❌ |

## Top & Bottom Performers

### 🏆 Highest (strengths to preserve)

| # | Scenario | Total | Why it passed |
|---|---|---|---|
| 18 | Empty Work Queue | 68/70 | Correctly recognizes idle state — nothing to create |
| 17 | Unassigned `todo` Issue | 66/70 | Clean housekeeping/reassignment |
| 07 | Agent Forgot `done` | 63/70 | Excellent status-loop diagnosis |
| 14 | Duplicate Idea | 60/70 | Correct duplicate detection + close |
| 09 | Resolved Blockers | 60/70 | Correct stale-blockage fix |

**Pattern:** the agent excels at *diagnostic* scenarios where the right answer is to fix/clean/close existing issues — these need reasoning, not the sync-tracker creation pattern.

### 🪦 Lowest (priorities to fix)

| # | Scenario | Total | Key gap |
|---|---|---|---|
| 16 | Agent Creates Out-of-Scope Idea | 18/70 | No sync tracker, hierarchy collapsed |
| 03 | Multi-Team Feature | 20/70 | Skipped hierarchy levels, no sync, bad status |
| 06 | Parallel Independent Tasks | 22/70 | No sync trackers, no parent status flip |
| 04 | Single Agent Task | 23/70 | Collapsed phases, no sync tracker |
| 05 | Blocked Task Chain | 23/70 | Missing sync trackers + status management |

**Pattern:** every bottom performer is a **Work Loop planning scenario** where the agent must *create* an issue hierarchy with sync trackers and set parent status — exactly the mechanics absent from the current agent definition.

## Diagnosis — Why the Scores Are Low

The agent's system prompt (`.claude/agents/project-manager.md`) describes the PM role at a **high, generic level** (planning, coordination, tracking, quality, communication) but omits the **specific agentrack mechanics** the suite rewards. Concretely, these are missing or under-specified:

1. **The sync-tracker pattern** (biggest gap → `syncPattern` 3.7). The PM must create a child issue tagged `task,sync`, assigned to itself, blocked by the last worker child — its "alarm clock" for when children complete. The current agent never does this, so `syncPattern` scores near 0 across Work Loop scenarios.

2. **Parent status management** (`statusManagement` 5.1). The PM must set the parent to `in-progress` *immediately after* creating children (to avoid the work loop re-waking it). The agent leaves parents at `todo` or sets them too early/at creation.

3. **Strict issue hierarchy & tags** (`hierarchy` 5.6, `completeness` 5.6). The agent skips hierarchy levels (e.g., Epic → Tasks, skipping Feature), mis-tags phase work as `feature` instead of `task`, and collapses distinct phases into single issues.

4. **Phase-to-agent mapping for complex teams**. Assignments are decent overall (7.0) but degrade on AndroidApp (contract-driven) and QuantEdge (consumer→producer) where the routing is non-obvious.

5. **Notably NOT broken**: diagnostic reasoning, status-loop interventions, duplicate detection, and idea routing logic. These score well and should be preserved during improvement.

## Recommended Improvement Targets (for future work)

Ordered by expected score impact, derived from the dimension/loop/team weaknesses above:

1. **Add the sync-tracker pattern** to the agent definition (targets `syncPattern` 3.7 → 8+, and lifts the entire Work Loop).
2. **Add parent-status rules** — parent → `in-progress` after children, parent → `done` after sync tracker fires (targets `statusManagement` 5.1).
3. **Codify the strict hierarchy + tag rules** — never skip levels, phase work is `task`, sync is `task,sync` (targets `hierarchy` 5.6 and `completeness` 5.6).
4. **Add phase-to-agent mapping tables per team** — especially AndroidApp & QuantEdge cross-team flows (targets `assignments` and the AndroidApp team avg 33.2).

## Methodology & Caveats

- **Run date:** 2026-06-13. CLI: `claude` 2.1.177. Runner: `.agentic/project-manager-suite/test-runner.ts`.
- **Testing mode:** PM invoked with `--tools ""` (no execution) so it returns a written plan; the plan is scored by a sonnet LLM judge against each scenario's **Expected Output**, using a 7-dimension JSON schema. Pass = 49/70.
- **Completeness:** all 27 scenarios scored. 8 initially errored on timeouts during the first full pass and were re-run (4 PM-agent timeouts re-run cleanly; 4 judge timeouts re-judged). All scores use the same judge model (`sonnet`) and schema, so they are directly comparable.
- **Judge timeout note:** the runner's hardcoded 120 s judge limit proved too short for several scenarios (08, 11, 13 timed out repeatedly); those were resolved with a 300 s judge call. **The defaults have since been raised in `test-runner.ts`** — judge 120 s → **300 s**, PM agent 300 s → **600 s** — so future runs don't need the workaround.
- **Raw data:** per-scenario results and the regenerated aggregate live in `.agentic/project-manager-suite/test-results/` (`*-result.json`, `summary.json`).
- **Only the initial response is scored.** Later phases driven by worker agents are out of scope.
