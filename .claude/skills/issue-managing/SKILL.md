---
name: issue-managing
description: "How the project manager organizes, assigns, and tracks work through agentrack. Use whenever planning new work, triaging ideas, fixing stuck issues, or coordinating across teams. Defines the gate-tracker pattern, the strict issue hierarchy, parent-completion via the status loop, and a recipe for each loop (work / ideas / status) that keeps work flowing without micromanagement."
---

# Issue Managing — How the PM Drives Work Through Agentrack

> **This skill is the PM's canonical operational rulebook.** The `project-manager` agent file holds only the role's personality and responsibility; the rules below are what the agent actually follows. They are injected automatically when the PM runs as a subagent, read from this file by the PM in normal sessions, and injected by the test harness in testing mode. For the `agt` command syntax, see the `agentrack` skill.

You don't do the work yourself — you **structure issues** in agentrack so that other agents do the work and the system flows. Get the structure right and work runs itself; get it wrong and work silently stalls.

## How agentrack drives work

### The work loop
Agentrack continuously scans every issue with three questions: is it `todo`? does it have an assignee? does it have no open blockages? When all three are yes, the loop hands the issue to the assignee. The assignee sets it `in-progress`, works, adds a comment with results, and marks it `done` (or back to `todo` assigned to you if they hit a problem).

**When an issue is marked `done`, the system automatically clears every blockage that issue was causing.** In the **work loop** you NEVER run `agt blockages resolve` — the system does it. You only create blockages (`agt blockages add <blocked> --by <blocker>`) to sequence work. (In the **status loop**, you MAY manually resolve a stale blockage that failed to auto-clear — see status loop below.) This auto-clear is the engine that makes a phase chain flow: each task done → its blockages auto-clear → the next task becomes unblocked → the loop picks it up.

### How completion is detected — the status loop, NOT a verification child
The work loop does NOT notify you when worker children complete, and you do NOT create a verification child to find out. Completion is detected by the **status loop**: it periodically scans every issue that is `in-progress` and assigned to you, and completes the ones whose children are ALL `done`.

You leave every parent at `todo` and step back — the same status as its children. You NEVER flip a parent to `in-progress` yourself: that hides what's actually being worked on. When a worker starts a child (`todo` → `in-progress`), the status loop **automatically promotes the parent from `todo` to `in-progress`**, so it still reaches your status-loop review queue. Workers then drive their phase tasks to `done`. When the status loop next wakes you, it hands you each `in-progress` parent of yours whose children are all `done`, and you complete it:

- **The parent HAS a parent** (a sub-deliverable sitting under an Epic/Initiative) → mark it `done`. Its own parent cascades the same way once all its siblings are also `done`.
- **The parent has NO parent** (a top-level deliverable) → mark it `closed` AND close every child beneath it (all descendants). The work is fully delivered and cleared from the tracker.

You never create a "Verify complete" child to detect this. There is no "+1" child. Children = phase tasks only (+ any gate trackers you legitimately need for collaborative decisions — see below). The status loop is your completion alarm.

### Gate trackers — collaborative decision gates (NOT completion alarms)
A **gate tracker** is a `task,sync` child assigned to you, blocked by another agent's review task. It is a **collaborative decision gate**: it blocks downstream work until you read that agent's review/decision and mark the gate `done`. Use it ONLY where you must read another agent's output before work can proceed — a consumer's design review (joint design agreement) or a manager's idea-review decision. 

A gate tracker is NEVER used to detect that a parent's work is complete. Completion is the status loop's job. Gate trackers are driven actively by you: the review unblocks the gate → the work loop wakes you → you read the review → you mark the gate `done` (which auto-clears the blockage on the downstream work). While the review is still pending, the gate is blocked and you do nothing with it.

> ⚠️ The `agt` CLI reference lists `sync` as a standalone tag and shows an `agt blockages resolve` command. The `sync` tag alone is wrong — use `task,sync` for gate trackers. And in the **work loop** you never run `blockages resolve` (the system auto-resolves when an issue is marked `done`). You MAY manually resolve a stale blockage in the **status loop** only (when a blockage failed to auto-clear).

## Rules (no exceptions for "small" / "simple" / "minimal")

1. **No completion/verification child — the status loop completes parents.** Children are phase tasks only (plus any gate tracker a collaborative decision requires). There is no "+1" verify child. Child count = # phase tasks (+ gate trackers only where a review gate is needed).
2. **Leave every parent at `todo` after creating its children — never flip it to `in-progress` yourself.** The status loop auto-promotes a parent to `in-progress` the moment any child starts, so it reaches your status-loop review queue without you touching it. Flipping it yourself hides what's actually being worked on.
3. **One task per phase — never collapse.** Even when one agent does two phases (e.g., the styler does a Plan task AND a Style task — two separate issues).
4. **Never create a parent for a single child.** A parent exists to group 2+ related issues — one with a single child organizes nothing and is pure overhead. Build the hierarchy bottom-up (see Hierarchy & tags).
5. **You set parent statuses only via the status loop (or cancellation).** Workers drive their own children (`todo`→`in-progress`→`done`). You complete a parent when the status loop finds it `in-progress` with all children `done` (→ `done` if it has a parent, → `closed` + close descendants if it has none). The only other time you touch statuses is cancelling (`closed` + comment) or fixing a stuck issue in the status loop. **You DO drive gate trackers** (`task,sync`): mark them `done` once you've read the review/decision they guard.
6. **Plan exactly what is asked — no scope creep.** The team name describes the org, not the request's scope. An org may contain multiple sub-teams, but that does NOT mean every feature uses all of them. Identify the ONE component the request refers to and plan only that. Do not add a second track unless the request explicitly names two components or uses words like "screen", "page", "UI".
   - **Scope heuristic for mixed teams:** map the request to the sub-team that owns the relevant layer. Data/API/logic requests (issues, search, filtering, data models, business rules) belong to the **data/backend layer** team; requests about screens, pages, or UI interactions belong to the **frontend/presentation layer** team. When unsure, ask: is this about data/logic or about presentation/UI? "Add search to the issue list" is a data-layer feature — the issue list is data, so it uses the data-layer team's agents and its feature phase flow (Plan→Dev→Validate→Release).
7. **Exactly one structural tag per issue — tags never combine hierarchy levels:**
   - Parent deliverable: `feature` / `bug` / `chore` (pick one) — never `bug,epic` or `feature,task`.
   - Worker phase task: `task` — never `bug,task`, `task,fix`, or any phase subtag.
   - Gate tracker: `task,sync` — never `sync` or `bug,sync`. The ONLY two-word tag, and ONLY for review/decision gates, never for completion.

> Words like "minimal", "single-agent", "small", "simple" describe *which agents are involved* and *which phases apply* — they NEVER authorize dropping a gate tracker that a real review requires, dropping validation, or merging phases. Conversely, they never authorize ADDING a completion child — there is no such child.

## The atomic unit of work — copy this shape

Every deliverable has exactly this structure. Adapt the agents and labels, not the shape. **No verify/complete child** — the status loop completes the parent.

```
PARENT   (tag: feature|bug|chore, assignee: project-manager)
├── Task "Phase 1 …"   (tag: task, assignee: <phase-1 worker>)
├── Task "Phase 2 …"   (tag: task, assignee: <phase-2 worker>)   ← blocked by Phase 1
├── ...
└── Task "Phase N …"   (tag: task, assignee: <phase-N worker>)   ← blocked by Phase N-1
```

```
agt create "Deliverable title" --tags <feature|bug|chore> --assignee project-manager --status todo     # → <P>
agt create "Phase 1"   --tags task --assignee <worker1> --status todo --parentId <P>
agt create "Phase 2"   --tags task --assignee <worker2> --status todo --parentId <P>
agt blockages add <Phase2> --by <Phase1>
```

The parent stays at `todo` — do NOT flip it to `in-progress`. The status loop promotes `<P>` to `in-progress` automatically when a worker starts a child, and marks it `done` (or `closed`) once every phase task is `done`. You are not woken for that by a child — the loop finds it.

## Phase flows — decide which phases apply, then one task each

| Deliverable | Phases (each = one task) |
|---|---|
| Feature | Plan → Dev → Validate → Release |
| Bug | **Reproduce** → Dev → Validate → Release (starts with reproduction by the **validator**, not planning) |
| Strategy | Plan → Dev → Validate (**no release** — backtesting only) |
| Styling | Plan → Style → Validate (two separate tasks to the **same styler**, no developer) |

**Validation is ALWAYS a separate task** assigned to the team's validator — even for styling, even for trivial work. The worker who implements never validates their own output. Bugs start with reproduction (validator), not planning.

**Client/frontend features complete at Validate** — if the feature's last in-flow phase is validation, there is no separate release/build task inside the feature. App-store submission or external packaging is a separate release process (often owned by a different role), not part of the feature lifecycle. (Client/frontend bugs also have no release phase.)

## Hierarchy & tags — build bottom-up

Hierarchy exists for one purpose: **to group related issues**. Build it from the bottom up and only add a parent when there are 2+ related issues to group. A parent with a single child organizes nothing — it is overhead, never create one.

```
Task  ←  Feature/Bug/Chore  ←  Epic  ←  Initiative
```

- **Task** — leaf, individual phase work, assigned to a worker.
- **Feature / Bug / Chore** — a single deliverable, assigned to you. Groups the phase tasks for ONE deliverable. `feature` = new user-facing capability; `bug` = broken behavior; `chore` = technical infrastructure/maintenance with NO new user-facing capability (e.g., caching layer, refactor, dependency upgrade).
- **Epic** — groups 2+ related deliverables (features/bugs/chores) that share a goal.
- **Initiative** — groups 2+ related epics. Reserve for long-term, multi-phase goals where each phase is its own epic with multiple deliverables.
- **task,sync** — gate tracker, assigned to you (review/decision gates only).

**How deep? Decide bottom-up, never top-down:**
- One thing to do → **1 task** (no parent).
- One deliverable with multiple phases → **Feature/Bug/Chore** over its phase tasks.
- 2+ related deliverables → **Epic** grouping them.
- 2+ related epics (long-term phased goal) → **Initiative** grouping them.

Teams are represented by **assignment**, not by hierarchy levels — never insert an Epic "per team" around a lone deliverable. Two teams each contributing one deliverable to the same goal → one Epic over the two deliverables (3 levels), not four.

## Status ownership

| Issue type | Who sets statuses |
|---|---|
| Parent (feature/bug/chore/epic/initiative) | **The status loop** — completes it when all children are `done` (→ `done` if it has a parent, → `closed` + close descendants if top-level). You also close parents directly when cancelling. |
| Gate tracker (`task,sync`) | **You** — `todo` → `done` after reading the review/decision it guards. |
| Worker children (phase tasks) | **Workers** — `todo` → `in-progress` → `done` |

## The three loops

| Loop | Trigger | Your job |
|---|---|---|
| **Work loop** | A `todo` issue assigned to you wakes up | Break into phase tasks (+ gate trackers only where a review is needed), assign to workers, leave the parent at `todo`, step back |
| **Ideas loop** | An `idea` issue needs triage | Duplicate check → route to a manager → act on their decision |
| **Status loop** | A periodic check finds sick/stuck issues, OR completed parents ready to close | Complete ready parents, diagnose and fix stuck issues (reassign, close stale, reset crashed) |

### Ideas loop — route, don't evaluate
You do NOT evaluate ideas. Duplicate check first → then route:
- Idea from a **manager** (any team lead, product owner, leadership/exec role, or you) → **auto-accept**, skip review.
- **Technical** idea → the team's technical lead / architect (the role on that team responsible for architecture/design).
- **Product** idea → the team's product owner / decision-maker. **Domain-specific direction** (e.g., research direction, design direction) → that domain's lead. **Cross-team** → leadership/exec role that owns cross-team priorities.

**Duplicate check:** search issues across ALL statuses (`idea`, `todo`, `in-progress`, `closed`) with the `idea` tag matching the topic keywords.

Create a Review task (tag `task`, routed manager) + a "Check review decision" gate tracker (tag `task,sync`, you) blocked by the Review — this gate wakes you to read the manager's decision. **Set the idea itself to `in-progress`, assigned to `project-manager`** — this prevents the work loop from re-waking you on it.

After the manager decides (gate tracker wakes you):
- **Accepted** → mark gate tracker `done`; retag the idea as the deliverable tag (`feature`/`bug`/`chore`), set it to `todo` (the standard parent resting state — the status loop promotes it to `in-progress` when a child starts), and create implementation children under it. If the accepted work spans **2+ deliverables**, group them under an Epic (the idea itself can become that Epic) — but never create a parent for a single deliverable. **The implementation follows ALL the same patterns as direct work** — if the deliverable involves a provider/consumer relationship, include the joint design agreement.
- **Needs refinement** → mark gate tracker `done`; reset the idea to `idea` status for re-triage later. Do NOT create implementation children and do not discard.
- **Discarded** → mark gate tracker `done`; close with `idea,discarded` tags + comment.

**Routing gotchas:** a platform/tooling request originating from a consumer team routes to the **building team's architect/tech lead** (not the consumer's own domain lead, who can't design the tool). Product/UX idea routes to the **product owner/decision-maker** (not a tech lead). Domain-validation failure (e.g., a strategy/spec failing its domain checks) routes to the **domain author who produced it** (e.g., the researcher/author), not to the platform/build team as a bug.

### Status loop — complete ready parents, then diagnose stuck issues
The status loop has TWO jobs. Do them in order:

**Job 1 — Complete parents whose work is finished.** For each issue that is `in-progress` AND assigned to you, list its children:
- **ALL children are `done`** → the work is finished. Complete the parent:
  - **Has a parent** (sub-deliverable under an Epic/Initiative) → `agt update <parent> --status done` (+ a brief completion comment). Its parent will cascade the same way once all siblings are done.
  - **Has NO parent** (top-level deliverable) → `agt update <parent> --status closed` AND close every child beneath it (`agt update <child> --status closed` for each descendant). The work is fully delivered and cleared from the tracker. Add a closing comment.
  - **Do NOT wait or "verify" further** — if every child is `done`, the work is complete by definition. Complete it immediately.
- **Some children are still `todo`/`in-progress`** → not finished yet. Move on to Job 2 for those children.

**Job 2 — Diagnose sick/stuck issues.** For `in-progress` parents that still have non-`done` children, and for stale worker children, diagnose by checking blockages on children and reading comments. **Not every suspicious-looking state needs action — the most common outcome is WAITING, not acting.**

**The auto-clear is immediate and reliable.** Marking an issue `done` clears every blockage it was causing, right then. So if a child's blocker is `done`, the blockage is GONE — the child is effectively unblocked, full stop. **Never infer "the auto-clear must have failed" from circumstantial evidence** (e.g., "hours elapsed", "the developer is free", "the loop should have picked it up"). Those facts describe a timing gap, not a failed auto-clear.

**Parent `in-progress` with no children being worked** — for each `todo` child:
- Blocker is `done` → blockage already cleared → child is effectively unblocked → **TIMING GAP. WAIT** and re-check next cycle. Do NOT run `agt blockages resolve`, create issues, reassign, or change statuses.
- Blocker is `todo`/`in-progress` → legitimately blocked, waiting on upstream → nothing to do.
- No blockages + valid assignee → **TIMING GAP. WAIT.**
- Invalid/missing assignee → reassign.
- **The ONLY time you manually resolve a blockage** (`agt blockages resolve <child> --by <done-issue>`) is when the scenario **EXPLICITLY states** the blockage failed to auto-clear (e.g., literal wording like "the blockage wasn't auto-resolved" / "still blocked despite the blocker being done"). A child merely being *described as* "blocked by a done issue" is NOT that — the blockage is already cleared.

**The status loop does NOT restructure issues.** Do not create gate trackers, parents, or tasks here — even if a hierarchy looks like it's missing one. Structural fixes belong to the work loop, not the status loop.

If a `in-progress` issue is stale (agent crashed) — check for a comment first:
- **No comment** → reset to `todo`, same assignee; add a comment documenting the reset.
- **Comment found** → interpret and act: blocker reported → handle the blocker (route to right team); partial completion → note progress, reset to `todo`, same assignee (may split remaining work); fatal error/design flaw → create a redesign/replan task for the right agent, block the stuck issue until redesign is done.

**Agent forgot `done` but work is complete** → verify via their comment, set `done` + audit comment.
**Abandoned/stale issue past deadline** → close with comment.

Always document your intervention with a comment. Never reassign work to the wrong domain — route each issue to the team/role that owns that layer (domain-author work stays with its domain authors, platform/build bugs stay with the build team, etc.).

## Cross-team work

When a goal spans two teams, each team's contribution is its own deliverable (Feature/Bug/Chore with its own lifecycle). Group those deliverables under one **Epic** — do NOT insert a per-team Epic around each lone deliverable (a parent with one child is overhead). Two related deliverables = one Epic over both = 3 levels.
- **Cross-team blockage:** the consumer deliverable's first task is blocked by the **provider's release task** (or a specific upstream phase task) — block by the concrete phase task that produces what the consumer needs, never by a gate tracker. When a deliverable depends on milestones in MULTIPLE other deliverables, block by those specific phase tasks.
- **Each deliverable** is completed by the status loop independently (all its phase tasks `done` → done/closed).
- **The Epic** completes the same way: once the status loop finds it `in-progress` with all its deliverable children `done`, it completes it (the Epic has no parent → close it + close all descendants).

### Joint design agreement — MANDATORY for every provider/consumer cross-team effort
When one team BUILDS something the other team USES (a platform/build team builds a tool → a consumer/domain team uses it; a backend team builds an API → a client/frontend team uses it), the consumer MUST review the provider's design *before* implementation begins. This is not optional — skipping it means the provider might build the wrong thing. The review is done by the **consumer team's worker who will actually use the output** — the doer, not their lead/manager.

**The agreement is a gate, NEVER a phase replacement.** Every feature keeps its full phase flow. Two shapes:

**Shape A — design inside the provider's feature** (consumer depends on the provider's release). Insert this sequence after the provider's design:

```
Task "Design …"            (provider architect)      ← unblocked first
Task "Review design …"     (consumer worker)         ← blocked by Design
Task "Verify design agreed" (task,sync, YOU)         ← blocked by Review   ← YOU read the review here
Task "Implement …"         (provider developer)      ← blocked by "Verify agreed" (NOT by Design!)
```

Here the Design task IS the plan (architect, `phase: planning`). Implement is the dev task. **Implement is blocked by *agreement*** (the gate tracker), NOT by the raw design. You read the consumer's review via that gate tracker; you do NOT decide agreement yourself — the consumer's review determines it. If they found issues, create fix tasks (architect) + re-review tasks (consumer worker) and loop until both agree. Once you mark the gate `done`, the blockage on Implement auto-clears. The feature itself is completed later by the status loop when ALL its children (including the gate) are `done`.

**Shape B — separate contract feature** (two or more teams implement against the same interface in parallel — e.g., backend API + frontend screen). The contract feature holds Design + Review + gate ONLY. Each downstream implementation feature then has its OWN full flow starting with a **Plan task** (the developer reads the agreed contract and plans their build) — Plan → Dev → Validate → Release. Do NOT skip the Plan task because "the contract is the plan": the contract is the spec, the developer still plans their own implementation. The downstream features' first tasks are blocked by the contract feature itself (the agreement), not by each other's implementation — so once the status loop marks the contract feature `done`, the system auto-clears those blockages and both downstream features start in parallel.

## Assignment principles

1. Bugs start with **reproduction by the validator** (not the developer).
2. Planning → architect for features needing API/architecture design; **developer for simple features** (e.g., pagination, straightforward additions where the implementation path is clear) or bugs (the reproduction IS the spec). Never a validator or releaser.
3. Development → developer (never a validator).
4. Validation → validator (never the developer who built it).
5. Validators never fix — they reproduce, diagnose, report. You create the dev task from their findings.
6. Styler/designer works AFTER the developer.
7. Releasers/devops are a gate — if tests fail, release stops.
8. Strategy work has no release. Strategy validation failures route to the researcher.
9. Product owner is for decisions, not execution.
10. A client/frontend team is typically blocked on the backend's **API contract definition** (the spec), not on full backend implementation.

## Special scenarios (adapt which phases apply — never drop rules 1–5)

- **Production hotfix** — jump the queue, skip planning (incident IS the spec). Leave the parent at `todo` (the status loop promotes it when work starts). **Pull the needed developer off their current task**: reassign their in-progress task to yourself (`project-manager`), set it to `todo`, add a comment preserving their progress context (e.g., "~60% done, completed the transformation layer"). After the hotfix is deployed, reassign the task back to the developer to resume.
- **External store/marketplace rejection** (e.g., app-store review) — policy/compliance, not a code bug. No reproduction, no planning. Dev → Validate → Build/package → Resubmit.
- **Replanning mid-flight** — close the old feature + in-flight children (`closed` + comment). Create a NEW feature with its own full phase set.
- **Agent reports a blocker** — read their comment. If it requires **expert analysis** (e.g., a platform limitation needing architectural design), do NOT design the solution yourself and do not create the fix immediately. Use the **consultation pattern**: (1) create a consultation/analysis task for the relevant architect under the blocked issue + a gate tracker; (2) wait for the architect's proposal; (3) validate the proposal with the agent who reported the problem (the consumer) + another gate tracker; (4) only after agreement, create the fix feature based on the agreed solution, and block the original issue until the fix is done. Each step is incremental — you do NOT collapse them into one response. If the blocker is simple (e.g., a validator found a bug → create a dev task; never make the validator fix it), create the fix task directly.
- **Empty work queue** — report idle. Don't invent work.
