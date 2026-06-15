# Spec: Add the status loop and ideas loop to `scripts/run-agents.ts`

## Context

`scripts/run-agents.ts` runs one loop today — the **work loop**. Every 60 s it polls agentrack
for each free agent, hands it the next assigned issue (`tracker.next(name)`) or unread mention
(`tracker.mentionsList(name)`), and spawns `claude --agent <name> -p "/work-issue|/work-mention <id>"`.

The project manager (`project-manager` agent) is special: beyond doing assigned work like any
other agent, it owns two extra periodic duties described in `tmp/project-manager-behavior.md`:

1. **Status loop** — wake the PM periodically to find and fix "sick" issues: `in-progress` with
   no active work, `in-progress` parents whose children are all stalled, broken blockages, etc.
2. **Ideas loop** — wake the PM periodically to triage issues in status `idea`: dedupe, route to
   the right decider (team lead for technical, product owner for product, auto-accept if a
   manager created it), create decision + follow-up tasks, then plan the implementation or discard.

The PM already has the `issue-managing` skill, which defines concrete recipes for all three loops.
**The script's only job is to wake the PM at the right cadence and tell it which loop to run.** It
must not reimplement triage or status-fix logic — that lives in the skill.

This spec adds the two new loops to the existing script without disturbing the work loop.

## Design principles

- **One launcher, four work types.** Generalize `launchAgent` so the work loop and both PM loops
  share a single spawn path. The only thing that differs is the prompt string and the TUI label.
- **The script stays dumb.** It does not decide *how* to fix a sick issue or *whether* an idea is
  good. It wakes the PM and delegates. The only intelligence the script keeps is a cheap pre-check
  to avoid spawning a full Claude session when there is provably nothing to do.
- **The PM is a normal agent too.** It stays in `agents[]` and keeps participating in the work loop
  (issues get reassigned to it when workers hit problems). The new loops are *additional* timers
  that target only the PM, not new agents.
- **Never run two things at once on the PM.** Every wake-up is gated on the PM being `free`. If it
  is busy (work loop gave it an issue, or the other loop is running), the tick is skipped; the next
  tick catches up. We do not queue.
- **No target id for PM loops.** `/work-issue` and `/work-mention` take an id; the status and ideas
  loops operate on the whole queue, so they take no id.

## Identifying the project manager

Add a config constant:

```ts
const PROJECT_MANAGER = "project-manager";
```

The name matches `.claude/agents/project-manager.md`. At startup, after `loadUsers()`, assert that
an agent named `PROJECT_MANAGER` exists in `users.json`; if not, `console.error` + `process.exit(1)`
with a clear message (today the script only errors on an empty user list — extend that check).

A `getProjectManager()` helper returns the PM's `AgentState` from `agents[]`.

## Generalize `launchAgent`

Today `launchAgent` is overloaded on `workType: "issue" | "mention"` and builds the prompt from
`workType + targetId`. Refactor it to take an explicit prompt and let the caller own it:

```ts
type AgentWorkType = "issue" | "mention" | "status" | "ideas";

function launchAgent(
  agent: AgentState,
  opts: { prompt: string; workType: AgentWorkType; targetId?: string },
): void
```

- `prompt` is passed straight to `claude -p`.
- `workType` is stored on `agent.workType` and shown in the TUI.
- `targetId` (optional) populates `agent.issueId`/`agent.mentionId` for the TUI's Target column;
  for `status`/`ideas` it is left unset and the column shows `—`.

The existing `launchAgent` callsites in `poll()` become:

```ts
launchAgent(agent, { prompt: `/work-issue ${issueId}`, workType: "issue", targetId: issueId });
launchAgent(agent, { prompt: `/work-mention ${mentionId}`, workType: "mention", targetId: mentionId });
```

Everything else in `launchAgent` (session id, log writer, `claude --agent ... --permission-mode auto`
spawn, exit cleanup → mark free) is unchanged.

## The status loop

A timer fires every `STATUS_INTERVAL_MS` and, if the PM is free, runs the status loop:

```ts
const STATUS_INTERVAL_MS = 5 * 60_000; // 5 minutes

let nextStatusAt = Date.now() + STATUS_INTERVAL_MS;

async function runStatusLoop(): Promise<void> {
  const pm = getProjectManager();
  nextStatusAt = Date.now() + STATUS_INTERVAL_MS;

  // Cheap pre-check: only wake the PM if there are in-progress issues to watch.
  // No in-progress issues => nothing can be "sick", so skip the spawn entirely.
  const inProgress = await tracker.list({ status: "in-progress" });
  if (!Array.isArray(inProgress) || inProgress.length === 0) {
    render();
    return;
  }

  if (pm.status !== "free") {
    render();
    return; // PM busy — next tick retries
  }

  launchAgent(pm, {
    prompt: STATUS_PROMPT,
    workType: "status",
  });
  render();
}
```

**Cheap pre-check.** Only `in-progress` issues can become sick (an issue not being worked is the
whole point of the status loop), so `tracker.list({ status: "in-progress" })` empty ⇒ skip the
spawn entirely. This is a coarse gate — it can't tell a healthy `in-progress` from a sick one, so
when the list is non-empty the PM is always woken and the skill makes the fine-grained call. A
skipped tick (PM busy) just reschedules.

`STATUS_PROMPT` — a short instruction, not the logic:

> Run the **status loop** from your `issue-managing` skill. Scan the open queue for sick issues —
> `in-progress` with no active work, `in-progress` parents whose children are stalled, broken or
> stale blockages — and fix each one so work flows again. Follow the skill's status-loop recipe
> exactly. If nothing is sick, stop.

## The ideas loop

A timer fires every `IDEAS_INTERVAL_MS`. Like the status loop, it gates on a cheap pre-check:
`tracker.list({ status: "idea" })` returns the idea queue, so we skip the spawn entirely when there
is nothing to triage.

```ts
const IDEAS_INTERVAL_MS = 10 * 60_000; // 10 minutes

let nextIdeasAt = Date.now() + IDEAS_INTERVAL_MS;

async function runIdeasLoop(): Promise<void> {
  const pm = getProjectManager();
  nextIdeasAt = Date.now() + IDEAS_INTERVAL_MS;

  // Cheap pre-check: only wake the PM if there are ideas to triage.
  const ideas = await tracker.list({ status: "idea" });
  if (!Array.isArray(ideas) || ideas.length === 0) {
    render();
    return;
  }

  if (pm.status !== "free") {
    render();
    return; // PM busy — next tick retries (ideas will still be there)
  }

  launchAgent(pm, {
    prompt: IDEAS_PROMPT,
    workType: "ideas",
  });
  render();
}
```

Notes:

- The pre-check runs every tick even when the PM is busy, which is the point: it lets us keep
  trying cheaply until both "there are ideas" and "PM is free" are true at once.
- `tracker.list` is an existing public method (`ListParams.status?: IssueStatus | "open"`), so no
  new library surface is needed.

`IDEAS_PROMPT`:

> Run the **ideas loop** from your `issue-managing` skill. There are `idea`-status issues waiting.
> For each: dedupe against existing ideas/issues, route it to the right decider (team lead for
> purely technical/internal ideas, product owner for product ideas, auto-accept if a manager
> created it), create the decision task and the PM follow-up task, and once a decision lands either
> plan the implementation issues or discard (`closed` + `idea` + `discarded` tags + a comment
> explaining why). Follow the skill's ideas-loop recipe exactly.

## Wiring the timers

In `main`, alongside the existing `setInterval(poll, POLL_INTERVAL_MS)` and `setInterval(render, 1000)`:

```ts
setInterval(runStatusLoop, STATUS_INTERVAL_MS);
setInterval(runIdeasLoop, IDEAS_INTERVAL_MS);
```

Order of initial calls stays: `await poll()` first (work loop), then the first status/ideas ticks
are deferred to their intervals. (Optionally fire `runIdeasLoop()` once at startup so triage begins
immediately — see Open questions.)

## Contention between the loops

Three things can want the PM: the work loop (an issue reassigned to PM), the status loop, and the
ideas loop. They never collide because every wake-up is gated on `pm.status === "free"` and the PM
is a single slot. Practical priority emerges from cadence:

- Work loop polls every 60 s — an issue actually assigned to the PM is usually picked up before the
  5-/10-min PM ticks fire. So genuine assigned work wins over status/ideas housekeeping, which is
  the right ordering.
- If status and ideas timers fire in the same window, whichever checks `free` first runs; the other
  sees `busy` and reschedules. No starvation, because both retry every tick.

## TUI changes

The existing table already has a `Work` column populated from `agent.workType`; with the new work
types it will show `status` / `ideas` for the PM row with no structural change. Two small additions:

1. Extend the footer to show PM-loop countdowns alongside the work-loop countdown, e.g.:
   ```
   Next poll in 42s  |  Status in 3m  |  Ideas in 7m  |  Ctrl+C to stop
   ```
   (compute from `nextStatusAt` / `nextIdeasAt`, mirroring how `nextPollAt` is shown today).
2. No new columns. Keep the table shape stable.

## SIGINT / shutdown

No change needed. The existing handler kills every `agent.process`, which already covers PM loop
processes since they use the same `launchAgent` path.

## Files touched

- `scripts/run-agents.ts` — all changes live here:
  - Add `PROJECT_MANAGER` constant + startup assertion + `getProjectManager()`.
  - Add `STATUS_INTERVAL_MS`, `IDEAS_INTERVAL_MS`, `STATUS_PROMPT`, `IDEAS_PROMPT`.
  - Generalize `launchAgent` signature (prompt-driven).
  - Update the two `poll()` callsites.
  - Add `runStatusLoop`, `runIdeasLoop`, their `nextXAt` trackers.
  - Wire the two new `setInterval`s.
  - Footer countdown line.
- No library changes. No new agent definitions. No changes to `issue-managing` (it already has the
  recipes the prompts reference).

## Open questions

1. **Prompts vs. slash commands.** The work loop invokes real skills (`/work-issue`, `/work-mention`).
   For parity, the status and ideas loops could become skills too — e.g. `/check-status` and
   `/triage-ideas` — thin wrappers over the `issue-managing` recipes, invoked as `claude -p
   "/check-status"`. This spec uses inline prompts for simplicity, but if we want consistency (and
   the ability to invoke these loops by hand the same way workers pick up issues), make them skills.
   Recommend: start inline, extract to skills if hand-invocation proves useful.
2. **Fire ideas loop at startup?** `await poll()` runs immediately; should `runIdeasLoop()` also fire
   once at boot so triage starts without waiting up to 10 min? Lean yes, but it means a PM session
   may start before the first work poll finishes — harmless because of the `free` guard.
