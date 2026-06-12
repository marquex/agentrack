# Project Manager User Story Catalog

This catalog defines the expected behavior for the `project-manager` agent across different scenarios and teams. Each story specifies initial conditions, the user story (what happens), and the expected output (what the project manager should do).

The project manager operates through **three loops**:

1. **Work Loop** — Picks up `todo` issues, assigns them to agents, tracks them through the phase flow.
2. **Project Status Loop** — Periodically checks for sick/stuck issues and fixes them.
3. **Ideas Loop** — Triages `idea` issues: checks for duplicates, routes to the right manager (team lead for technical ideas, product-owner for product ideas), and acts on the manager's decision (plan implementation or close as discarded).

## Reference

- **[00-team-roster.md](00-team-roster.md)** — Full descriptions of every agent's role, responsibilities, capabilities, and constraints across all teams. The PM must understand these to assign work correctly.

## Teams

The training suite uses three teams with different dynamics to ensure the PM learns team-independent coordination skills:

| Team | Company | Teams | Key Dynamic |
|---|---|---|---|
| **Library + Webapp** | agentrack | Library + Webapp | Top-down feature flow, styler phase |
| **QuantEdge** | Algorithmic Trading | Platform (Dev) + Research (Quants) | Consumer-driven feature requests, domain-specific validation |
| **AndroidApp** | Mobile App | Backend + Frontend (Android) | Contract-driven coordination, asymmetric releases |

Each story is assigned to exactly one team. The PM skills being tested remain the same regardless of team — only the scenario and agents change. This ensures the PM learns to work with different team structures rather than memorizing one.

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
| Route idea to manager | **PM** | Technical → team lead, product → product-owner, manager-created → auto-accept |
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
8. **PM does NOT evaluate ideas** — it routes them to the right manager. Technical ideas → team lead, product ideas → product-owner, manager-created → auto-accept.
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

See [00-team-roster.md](00-team-roster.md) for full agent descriptions.

### Features: Plan → Dev → Validate → Release

| Phase | Library (Team A) | Webapp (Team A) | Platform (Team B) | Strategy (Team B) | Backend (Team C) | Frontend (Team C) |
|---|---|---|---|---|---|---|
| **Planning** | `library-architect` | `webapp-developer` | `platform-architect` | `quant-researcher` | `backend-architect` | `android-developer` (reads API contracts) |
| **Development** | `library-developer` | `webapp-developer` → `webapp-styler` | `platform-developer` | `quant-researcher` | `backend-developer` | `android-developer` → `android-designer` |
| **Validation** | `library-validator` | `webapp-validator` | `platform-validator` | `strategy-validator` | `backend-validator` | `android-validator` |
| **Release** | `library-releaser` | (usually no separate release) | `platform-releaser` | (no release phase) | `devops-engineer` | `android-developer` (APK) → `devops-engineer` (Play Store) |

### Bugs: Reproduce → Dev → Validate → Release

| Phase | Library (Team A) | Webapp (Team A) | Platform (Team B) | Backend (Team C) | Frontend (Team C) |
|---|---|---|---|---|---|
| **Reproduction** | `library-validator` | `webapp-validator` | `platform-validator` | `backend-validator` | `android-validator` |
| **Development** | `library-developer` | `webapp-developer` | `platform-developer` | `backend-developer` | `android-developer` |
| **Validation** | `library-validator` | `webapp-validator` | `platform-validator` | `backend-validator` | `android-validator` |
| **Release** | `library-releaser` | (usually no separate release) | `platform-releaser` | `devops-engineer` | `android-developer` (APK) → `devops-engineer` (Play Store) |

---

## Story Index

### By Team

#### Team A: Library + Webapp — 7 stories

Stories that are well-written for this team and serve as the canonical reference for each PM skill.

| Story | Skill | File |
|---|---|---|
| `01` New feature request | Feature lifecycle | [01-new-feature-request.md](01-new-feature-request.md) |
| `04` Single-agent task | Minimal scope work (styler) | [04-single-agent-task.md](04-single-agent-task.md) |
| `06` Parallel independent tasks | Independent work streams | [06-parallel-independent-tasks.md](06-parallel-independent-tasks.md) |
| `09` Blocked with resolved blockers | Stale blockage detection | [09-blocked-with-resolved-blockers.md](09-blocked-with-resolved-blockers.md) |
| `12` Idea discarded | Product idea → rejected | [12-idea-discarded.md](12-idea-discarded.md) |
| `17` Unassigned todo issue | Dropped assignment | [17-unassigned-todo-issue.md](17-unassigned-todo-issue.md) |
| `18` Empty work queue | Idle state | [18-empty-work-queue.md](18-empty-work-queue.md) |

#### Team B: QuantEdge (Dev + Research) — 10 stories

Stories that benefit from the consumer-producer dynamic between dev and research teams, and from domain-specific routing decisions.

| Story | Skill | File |
|---|---|---|
| `03` Multi-team feature | Cross-team coordination | [03-multi-team-feature.md](03-multi-team-feature.md) |
| `07` Stuck in-progress | Status monitoring | [07-stuck-in-progress.md](07-stuck-in-progress.md) |
| `10` Stale in-progress | Abandoned work | [10-stale-in-progress.md](10-stale-in-progress.md) |
| `11` Idea accepted | Technical idea → accepted (cross-team) | [11-idea-accepted.md](11-idea-accepted.md) |
| `15` Agent reports problem | Architectural blocker (cross-team) | [15-agent-reports-problem.md](15-agent-reports-problem.md) |
| `19` Replanning mid-flight | Cancel + replan | [19-replanning-mid-flight.md](19-replanning-mid-flight.md) |
| `20` Consumer→provider request | Bottom-up routing | [20-consumer-to-provider-request.md](20-consumer-to-provider-request.md) |
| `22` Strategy validation failure | Domain-specific routing | [22-strategy-validation-not-bug.md](22-strategy-validation-not-bug.md) |
| `24` Production hotfix | Urgent interruption | [24-production-hotfix.md](24-production-hotfix.md) |
| `26` Research generates platform idea | Cross-team idea capture | [26-research-generates-platform-idea.md](26-research-generates-platform-idea.md) |

#### Team C: AndroidApp (Backend + Frontend) — 10 stories

Stories that benefit from contract dependencies, asymmetric releases, and external blockers.

| Story | Skill | File |
|---|---|---|
| `02` Bug fix request | Bug lifecycle (frontend) | [02-bug-fix-request.md](02-bug-fix-request.md) |
| `05` Blocked task chain | Sequential dependencies (cross-team) | [05-blocked-task-chain.md](05-blocked-task-chain.md) |
| `08` Parent without active children | Orphaned parent | [08-parent-without-active-children.md](08-parent-without-active-children.md) |
| `13` Idea needs refinement | Vague idea handling | [13-idea-needs-refinement.md](13-idea-needs-refinement.md) |
| `14` Idea duplicate | Duplicate detection | [14-idea-duplicate.md](14-idea-duplicate.md) |
| `16` Agent creates out-of-scope idea | Idea while working | [16-agent-creates-out-of-scope-idea.md](16-agent-creates-out-of-scope-idea.md) |
| `21` API contract joint planning | Contract-level dependencies | [21-api-contract-joint-planning.md](21-api-contract-joint-planning.md) |
| `23` Device-specific bug | Scoped investigation (frontend) | [23-device-specific-bug-triage.md](23-device-specific-bug-triage.md) |
| `25` Play Store rejection | External blocker | [25-play-store-rejection.md](25-play-store-rejection.md) |
| `27` Backend-first dependency | Live service dependencies | [27-backend-first-dependency.md](27-backend-first-dependency.md) |

### By Skill Category

Ensures each team covers all major PM skills:

| Skill Category | Library + Webapp | QuantEdge | AndroidApp |
|---|---|---|---|
| Feature lifecycle | `01` | `03`, `20` | `21`, `27` |
| Bug lifecycle | — | `24` | `02`, `23` |
| Dependency management | `06` | — | `05` |
| Status monitoring | `09` | `07`, `10` | `08` |
| Idea management | `12` | `11`, `26` | `13`, `14`, `16` |
| Problem handling | — | `15`, `22` | — |
| Change management | — | `19` | `25` |
| Idle / housekeeping | `04`, `17`, `18` | — | — |

### By Loop Type

#### Work Loop Stories
- [01-new-feature-request.md](01-new-feature-request.md) — Feature → Tasks (2 levels) — Library+Webapp
- [02-bug-fix-request.md](02-bug-fix-request.md) — Bug → Tasks (2 levels) — AndroidApp
- [03-multi-team-feature.md](03-multi-team-feature.md) — Initiative → Epics → Features → Tasks (4 levels) — QuantEdge
- [04-single-agent-task.md](04-single-agent-task.md) — Feature → Tasks (2 levels, styler only) — Library+Webapp
- [05-blocked-task-chain.md](05-blocked-task-chain.md) — Epic → Chore + 2 Features → Tasks (3 levels) — AndroidApp
- [06-parallel-independent-tasks.md](06-parallel-independent-tasks.md) — 2 standalone: Feature → Tasks, Bug → Tasks — Library+Webapp
- [20-consumer-to-provider-request.md](20-consumer-to-provider-request.md) — Initiative → Epics → Features → Tasks (bottom-up routing) — QuantEdge
- [21-api-contract-joint-planning.md](21-api-contract-joint-planning.md) — Epic → Features → Tasks (contract-level deps) — AndroidApp
- [22-strategy-validation-not-bug.md](22-strategy-validation-not-bug.md) — Bug → Tasks (domain-specific routing) — QuantEdge
- [23-device-specific-bug-triage.md](23-device-specific-bug-triage.md) — Bug → Tasks (frontend-only, device-specific) — AndroidApp
- [25-play-store-rejection.md](25-play-store-rejection.md) — Bug → Tasks (external blocker, non-standard flow) — AndroidApp
- [27-backend-first-dependency.md](27-backend-first-dependency.md) — Initiative → Epics → Features → Tasks (live service deps) — AndroidApp

#### Project Status Loop Stories
- [07-stuck-in-progress.md](07-stuck-in-progress.md) — Developer forgot to move issue to `done` — QuantEdge
- [08-parent-without-active-children.md](08-parent-without-active-children.md) — Parent in-progress but developer isn't picking up next child — AndroidApp
- [09-blocked-with-resolved-blockers.md](09-blocked-with-resolved-blockers.md) — Stale blockage despite architect's design being done — Library+Webapp
- [10-stale-in-progress.md](10-stale-in-progress.md) — Developer disappeared mid-task — QuantEdge

#### Ideas Loop Stories
- [11-idea-accepted.md](11-idea-accepted.md) — Technical idea routed to team lead → accepted (cross-team) — QuantEdge
- [12-idea-discarded.md](12-idea-discarded.md) — Product idea routed to product-owner → discarded — Library+Webapp
- [13-idea-needs-refinement.md](13-idea-needs-refinement.md) — Vague idea routed to product-owner → needs more info — AndroidApp
- [14-idea-duplicate.md](14-idea-duplicate.md) — PM detects duplicate during initial check → closes — AndroidApp
- [16-agent-creates-out-of-scope-idea.md](16-agent-creates-out-of-scope-idea.md) — Developer notices improvement while working → routes to manager — AndroidApp
- [26-research-generates-platform-idea.md](26-research-generates-platform-idea.md) — Researcher comment triggers cross-team improvement request — QuantEdge

#### Error & Edge Case Stories
- [15-agent-reports-problem.md](15-agent-reports-problem.md) — Developer hits architectural blocker (cross-team escalation) — QuantEdge
- [17-unassigned-todo-issue.md](17-unassigned-todo-issue.md) — Documentation task with no assignee — Library+Webapp
- [18-empty-work-queue.md](18-empty-work-queue.md) — All agents idle — Library+Webapp
- [19-replanning-mid-flight.md](19-replanning-mid-flight.md) — Cancel in-flight work and replan — QuantEdge
- [24-production-hotfix.md](24-production-hotfix.md) — Urgent interruption of in-flight work — QuantEdge

### Summary

| | Library + Webapp | QuantEdge | AndroidApp | Total |
|---|---|---|---|---|
| **Existing stories (rewritten)** | 7 (unchanged) | 6 | 6 | 19 |
| **New stories** | 0 | 4 | 4 | 8 |
| **Total** | 7 | 10 | 10 | **27** |
