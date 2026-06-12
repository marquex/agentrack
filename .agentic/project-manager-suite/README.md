# Project Manager User Story Catalog

This catalog defines the expected behavior for the `project-manager` agent across different scenarios. Each story specifies initial conditions, the user story (what happens), and the expected output (what the project manager should do).

## Reference

- **[00-team-roster.md](00-team-roster.md)** — Full descriptions of every agent's role, responsibilities, capabilities, and constraints. The PM must understand these to assign work correctly.

The project manager operates through **three loops**:

1. **Work Loop** — Picks up `todo` issues, assigns them to agents, tracks them through the phase flow.
2. **Project Status Loop** — Periodically checks for sick/stuck issues and fixes them.
3. **Ideas Loop** — Triages `idea` issues: checks for duplicates, routes to the right manager (team lead for technical ideas, product-owner for product ideas), and acts on the manager's decision (plan implementation or close as discarded).

## Issue Status Lifecycle — WHO Changes WHAT

The PM does NOT micromanage child status transitions. Worker agents own their own status updates. The PM's role is to **create, assign, and monitor** — but the PM DOES manage **parent issue** statuses since the PM is the assignee.

### Status flow for worker (child) issues

```
PM creates issue → status: todo, assignee: <worker>
                        │
                        ▼
          Work loop picks up the issue (todo + assigned + no blockers)
                        │
                        ▼
          Worker agent wakes up → sets status: in-progress
                        │
                   ┌────┴────┐
                   ▼         ▼
              Success     Failure
                   │         │
                   ▼         ▼
        status: done    status: todo (back to PM)
        + comment       + comment describing problem
        + system auto-  + reassigned to project-manager
          resolves        for PM to decide next step
          blockages
```

### Status flow for parent issues (managed by PM)

Parent issues are assigned to the PM. The PM must manage their status to avoid being re-woken every cycle and to get notified when work completes.

```
PM creates parent → status: todo
                        │
                        ▼
PM creates children + sync tracker issue
                        │
                        ▼
PM sets parent → in-progress (work is happening via children)
                        │
                        ▼
          Worker agents drive children through phases
          (todo → in-progress → done, blockages auto-resolve)
                        │
                        ▼
          Last child marked done → sync tracker's blockage clears
                        │
                        ▼
          Work loop wakes PM for the sync tracker
                        │
                        ▼
          PM checks children are all done
                        │
                        ▼
          PM sets sync tracker → done
          PM sets parent → done
```

**Why the sync tracker?** The work loop won't automatically notify the PM when children complete. The PM must create a child issue assigned to itself, blocked by the last worker child. When that child is marked `done`, the blockage clears and the work loop wakes the PM.

**Why set parent to `in-progress`?** If the parent stays `todo`, the work loop will wake the PM every cycle to "work" on it. Setting it to `in-progress` means: "this feature is being actively worked on through its children — don't bother me about it until the children are done."

### Who does what

| Action | Who does it | When |
|---|---|---|
| Create issue in `todo` | **PM** | During planning — PM creates the issue hierarchy |
| Assign agent to issue | **PM** | At creation time — each issue gets the right agent for its phase |
| Create sync tracker (child assigned to PM, blocked by last child) | **PM** | At creation time — ensures PM gets notified when children complete |
| Set parent → `in-progress` | **PM** | Immediately after creating all children — prevents re-waking |
| Set `in-progress` on worker children | **Worker agent** | When the agent starts working (after work loop wakes it) |
| Set `done` + comment on worker children | **Worker agent** | When the agent completes successfully |
| Set `todo` + reassign to PM on worker children | **Worker agent** | When the agent hits an unresolvable blocker |
| PM wakes for sync tracker | **Work loop** | When last child is `done` and blockage clears |
| Set sync tracker → `done` | **PM** | After verifying all children completed successfully |
| Set parent → `done` | **PM** | After sync tracker confirms all children are done |
| Create `idea` issues | **Any agent** | When an agent notices out-of-scope work while working |
| Check for duplicates before routing | **PM** | First step of ideas triage — searches `idea`, `todo`, `in-progress`, and `closed` with `idea` tag |
| Create review task + sync tracker for idea | **PM** | Routes to team lead (technical) or product-owner (product) for accept/reject decision |
| Route idea to manager | **PM** | Technical → team lead (`library-architect`), product → `product-owner`, manager-created → auto-accept |
| Accept idea → plan implementation | **PM** | After manager accepts — tags idea as feature/bug/chore, creates implementation tasks |
| Discard idea → close | **PM** | After manager rejects — status: `closed`, tags: `idea,discarded`, comment with reason |
| Close duplicate idea | **PM** | During duplicate check — tags: `idea,duplicate`, no manager review needed |
| Move `todo` → `closed` | **PM** | When cancelling or discarding an issue |
| Set `closed` + tags | **PM** | When discarding ideas (tags: `idea,discarded`) or cancelling work |
| Fix stuck `in-progress` → `done` | **PM** | During status loop — when agent forgot to update |
| Reassign stuck issues | **PM** | During status loop — when agent is unavailable |

### Key rules

1. **PM sets parent to `in-progress` immediately after creating children** — prevents the work loop from re-waking PM every cycle for the parent.
2. **PM creates a sync tracker child** — assigned to PM, blocked by the last worker child. This is the notification mechanism that tells PM when children are done.
3. **PM never sets worker children to `in-progress` or `done`** — that's the worker agent's job.
4. **PM marks parent `done` only after all children are `done`** — triggered by the sync tracker waking the PM.
5. **Blockages resolve automatically** — when an agent marks its issue `done`, the system clears blockages on downstream issues.
6. **PM only intervenes on worker child statuses during the status loop** — to fix stuck/abandoned issues.
7. **Failed work comes back to PM** — agents reassign to `project-manager` with `todo` status and a problem comment.
8. **PM does NOT evaluate ideas** — it routes them to the right manager. Technical ideas → team lead (`library-architect`), product ideas → `product-owner`, manager-created → auto-accept.
9. **Duplicate check is the first step of ideas triage** — PM searches `idea`, `todo`, `in-progress`, and `closed` with `idea` tag before routing. Duplicates are closed directly without manager review.
10. **Ideas loop uses review task + sync tracker** — PM creates a task for the manager to decide, and a sync tracker for PM to check the decision. Same pattern as work loop.

## Issue Hierarchy

Every issue the PM creates must be tagged with its level in the hierarchy. This helps agents understand what kind of issue they're working on and how it fits into the bigger picture.

### The strict hierarchy (never skip levels)

```
Task ← Feature/Bug/Chore ← Epic ← Initiative
```

Levels are always in this order from bottom to top. You don't need every level, but you can never skip:

```
✅ Feature → Tasks                              (standalone)
✅ Epic → Features → Tasks                      (grouped features)
✅ Initiative → Epics → Features → Tasks        (full hierarchy)

❌ Epic → Tasks           (skipped Feature/Bug/Chore level)
❌ Initiative → Features  (skipped Epic level)
❌ Initiative → Tasks     (skipped two levels)
```

### Hierarchy levels

| Level | Tag | Who works it | Description | Example |
|---|---|---|---|---|
| **Initiative** | `initiative` | PM only | Groups related Epics. | "Add dashboard page with issue statistics" |
| **Epic** | `epic` | PM only | Groups related Features/Bugs/Chores. Typically maps to a team or a body of work. | "Migrate to indexed events" |
| **Feature** | `feature` | PM only | New capability. Plan→Dev→Validate→Release. | "Add search functionality" |
| **Bug** | `bug` | PM only | Fix for broken behavior. Reproduce→Dev→Validate→Release. | "Fix CLI crash" |
| **Chore** | `chore` | PM only | Technical maintenance without user-facing changes. | "Refactor event store" |
| **Task** | `task` | Worker agent | Individual phase work (Plan, Dev, Validate, Release, Reproduce, Style). | "Implement search" |
| **Sync** | `task,sync` | PM | Notification — PM's alarm clock for when children complete. | "Verify search complete" |

### When to use each depth

- **Standalone deliverable**: Feature/Bug/Chore → Tasks (2 levels)
- **Related deliverables**: Epic → Features/Bugs/Chores → Tasks (3 levels)
- **Multi-team or large effort**: Initiative → Epics → Features/Bugs/Chores → Tasks (4 levels)

### Key rules

1. **Never skip hierarchy levels** — Tasks are always inside Features/Bugs/Chores, which are always inside Epics (when grouped), which are always inside Initiatives (when grouped).
2. **Every issue gets a tag** — no untagged issues.
3. **Related issues must be linked** — if features depend on each other or belong to the same goal, wrap them in an Epic. If epics are related, wrap in an Initiative.
4. **Tags use `agt create --tags`** — e.g., `agt create "Fix crash" --tags bug`
5. **Sync trackers use both tags** — `--tags task,sync`

## Phase-to-Agent Mapping (Quick Reference)

### Features: Plan → Dev → Validate → Release

| Phase | Library tasks | Webapp tasks |
|---|---|---|
| **Planning** | `library-architect` (or `library-developer` for small tasks) | `webapp-developer` |
| **Development** | `library-developer` | `webapp-developer` → then `webapp-styler` for polish |
| **Validation** | `library-validator` | `webapp-validator` |
| **Release** | `library-releaser` | (usually no separate release phase) |

### Bugs: Reproduce → Dev → Validate → Release

| Phase | Library tasks | Webapp tasks |
|---|---|---|
| **Reproduction** | `library-validator` — reproduces and diagnoses root cause | `webapp-validator` — reproduces and diagnoses root cause |
| **Development** | `library-developer` — fixes based on validator's diagnosis | `webapp-developer` — fixes based on validator's diagnosis |
| **Validation** | `library-validator` — regression tests | `webapp-validator` — regression tests |
| **Release** | `library-releaser` | (usually no separate release phase) |

## Story Index

### Work Loop Stories
- [01-new-feature-request.md](01-new-feature-request.md) — Feature → Tasks (2 levels)
- [02-bug-fix-request.md](02-bug-fix-request.md) — Bug → Tasks (2 levels)
- [03-multi-team-feature.md](03-multi-team-feature.md) — Initiative → Epics → Features → Tasks (4 levels, full hierarchy)
- [04-single-agent-task.md](04-single-agent-task.md) — Feature → Tasks (2 levels, styler only)
- [05-blocked-task-chain.md](05-blocked-task-chain.md) — Epic → Chore + 2 Features → Tasks (3 levels)
- [06-parallel-independent-tasks.md](06-parallel-independent-tasks.md) — 2 standalone: Feature → Tasks, Bug → Tasks (no linking needed)

### Project Status Loop Stories
- [07-stuck-in-progress.md](07-stuck-in-progress.md) — Developer forgot to move issue to `done` (validator is blocked)
- [08-parent-without-active-children.md](08-parent-without-active-children.md) — Parent in-progress but developer isn't picking up next child
- [09-blocked-with-resolved-blockers.md](09-blocked-with-resolved-blockers.md) — Stale blockage despite architect's design being done
- [10-stale-in-progress.md](10-stale-in-progress.md) — Developer disappeared mid-task (can't reassign to wrong domain)

### Ideas Loop Stories
- [11-idea-accepted.md](11-idea-accepted.md) — Technical idea routed to team lead → accepted → implementation planned
- [12-idea-discarded.md](12-idea-discarded.md) — Product idea routed to product-owner → discarded
- [13-idea-needs-refinement.md](13-idea-needs-refinement.md) — Vague idea routed to product-owner → manager asks creator for more info
- [14-idea-duplicate.md](14-idea-duplicate.md) — PM detects duplicate during initial check → closes without routing

### Error & Edge Case Stories
- [15-agent-reports-problem.md](15-agent-reports-problem.md) — Developer hits architectural blocker; PM asks team lead for solution → then creates prerequisite based on architect's proposal
- [16-agent-creates-out-of-scope-idea.md](16-agent-creates-out-of-scope-idea.md) — Developer notices refactoring opportunity; PM routes technical idea to team lead → accepted as low-priority chore
- [17-unassigned-todo-issue.md](17-unassigned-todo-issue.md) — Documentation task with no assignee; PM picks releaser
- [18-empty-work-queue.md](18-empty-work-queue.md) — All agents idle; PM reports and waits
- [19-replanning-mid-flight.md](19-replanning-mid-flight.md) — REST→GraphQL pivot; PM cancels developer's in-flight work and replans
