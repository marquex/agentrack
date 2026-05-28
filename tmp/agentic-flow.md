# Agentrack — Agentic Workflow Analysis

## How Real Teams Use Issue Trackers — Core Workflows

### The 5 Universal Flows

1. **Triage → Plan → Execute → Review → Close** — The basic lifecycle. Every team follows some variant. Agentrack already models this well with `idea → todo → in-progress → done → closed`.

2. **Decomposition** — Break epics into tasks, tasks into subtasks. Agentrack handles this via `parentId` hierarchy.

3. **Prioritized Backlog Pull** — Workers pull the next most important item. Agentrack's `agt next` command handles this perfectly for agents.

4. **Blocking/Dependency Management** — "I can't start X until Y is done." Agentrack's blockages system covers this.

5. **Communication in Context** — Comments, mentions, and status updates attached to specific issues. Agentrack has comments and mentions.

### What Real Teams Use Most (by frequency)

| Feature | Usage | Agentrack Status |
|---------|-------|-----------------|
| Status transitions | Every day, multiple times | ✅ Solid |
| Assignment | Every task | ✅ Has assignee |
| Comments/discussion | Very frequent | ✅ Has comments |
| Filtering/listing | Constant | ✅ Has list with filters |
| Priority/ordering | Daily backlog pulls | ✅ Has priority + impact |
| Parent-child hierarchy | For project structure | ✅ Has parentId |
| Blocking dependencies | For coordination | ✅ Has blockages |
| Mentions/notifications | For handoffs | ✅ Has mentions |

---

## Agent-Specific Workflows That Matter

For autonomous agent teams, these patterns are critical:

### 1. Handoff Protocol (most important for agents)

Agent A finishes work → signals Agent B to continue. Agentrack handles this via:
- Blockage resolution triggering unblocked issues
- `agt next` to auto-pick work
- Mentions for explicit requests

### 2. Claim-Before-Work (prevents duplicate effort)

Agent claims an issue (assigns to self, moves to `in-progress`) before starting. This is already supported.

### 3. Automated Decomposition

A "manager" agent creates a parent issue, breaks it into sub-issues with dependencies, and workers pull from the queue. Already supported via hierarchy + blockages.

### 4. Status-Driven Triggers

When issue X moves to `done`, agent Y picks up the next blocked issue. This works via blockages + `agt next`.

---

## Gap Analysis — What's Missing vs. What's Excess

### Missing (consider adding)

| Feature | Why agents need it | Complexity |
|---------|-------------------|-----------|
| **Issue types/labels for role** | Distinguish "spec", "implementation", "review", "test" — so agents know what kind of work an issue requires | Low — already have tags |
| **Structured result/output field** | When an agent completes work, where does it record *what* it produced? (file paths, decisions, artifacts) | Medium |
| **Time/token budget tracking** | Agents burn resources. A simple `estimate` and `actual` field helps teams plan | Low |
| **Bulk operations** | Agents create/update many issues at once (e.g., decomposing a spec into 10 sub-tasks). A batch API avoids 10 sequential calls | Medium |
| **Webhooks/event stream** | For reactive agent architectures — "when issue changes, notify subscriber." The event-sourced model already supports this conceptually | Medium |

### NOT Missing (don't add these)

| Feature | Why to skip it |
|---------|---------------|
| Sprints/milestones | Agents don't need time-boxed iterations — they work continuously |
| Story points/estimation | Artificial for agents — priority + dependency ordering is sufficient |
| Custom workflows/statuses | 5 statuses is enough. Custom workflows add configuration overhead |
| Boards/views | Agents don't need visual UI — they query programmatically |
| Attachments/file uploads | Agents can reference files by path in descriptions |
| Due dates | Agents don't calendar-plan — priority ordering handles urgency |
| Watchers/subscriptions | Mentions are sufficient for agent coordination |

### Current Feature Assessment

**Just right:**
- Event sourcing (perfect audit trail for debugging agent behavior)
- 5-status lifecycle (simple, sufficient)
- Hierarchy with auto-promotion (reduces coordination overhead)
- Blockages (essential for dependency flow)
- `agt next` (the killer feature for agents — automatic work selection)
- JSON output (machine-native)
- Git-native storage (no infrastructure)
- Mentions (lightweight directed communication)

**Possibly over-engineered:**
- Auth modes (for a team of agents in one repo, `open` mode is probably fine — strict auth adds friction without much value since agents aren't adversarial to each other)
- Multiple branch support (nice to have, but may be premature complexity)

---

## Recommendations for Maximum Agent Effectiveness

### Top 3 Priorities

1. **Make `agt next` the central primitive.** The entire agent work loop should be: `next → claim → work → complete → next`. Ensure it accounts for assignment, blockages, priority, and impact in one call. This is already close — keep refining.

2. **Structured completion output.** When an agent marks an issue `done`, let it attach a structured result (what files changed, what decisions were made, summary). This becomes input for the next agent in the chain. Could be a special comment type or a field.

3. **Keep the API surface small.** The current CLI has ~30 commands. For agents, the core loop needs only: `next`, `create`, `update`, `view`, `comments add`, `blockages resolve`. Consider documenting a "minimal agent toolkit" subset.

### Design Principle

The best agent issue tracker is one where **an agent never has to "think about" project management** — it just calls `next`, gets told what to do, does it, reports completion, and calls `next` again. All the intelligence should be in the tracker's sorting/prioritization logic, not in the agent's understanding of workflows.
