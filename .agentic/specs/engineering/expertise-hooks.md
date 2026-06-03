# Expertise Update Hook — Design Specification

## Problem Statement

We want agents to learn from every task they complete. Currently, the `expertise.hook.ts` (old approach) blocks the agent at `Stop` and asks it to self-update its expertise, which is:

1. **Slow** — the agent has to do expertise work inline while the user waits.
2. **Distracting** — the agent's stop is delayed by the expertise update, competing with other Stop hooks.
3. **Inconsistent** — each agent manages its own expertise YAML directly, with varying quality.

The `new-expertise.hook.ts` (used by `library-developer`) improves retrieval by asking the `expertise-manager` for context before work starts. But it still relies on the old `expertise.hook.ts` for Stop updates.

**Goal:** Create an `update-expertise.hook.ts` that runs at `Stop` / `SubagentStop`, does NOT block the agent, and delegates expertise extraction to the `expertise-manager` by passing it the observable session log path. The expertise-manager reads the logs and updates the agent's expertise files asynchronously.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Agent Lifecycle (e.g., library-developer)                           │
│                                                                      │
│  SessionStart  ──► new-expertise.hook.ts (injects "ask EM" reminder)│
│       │                                                              │
│  UserPromptSubmit ──► new-expertise.hook.ts (injects reminder)       │
│       │                      │                                       │
│       │              Agent asks expertise-manager for context         │
│       │              (via Agent tool, subagent_type expertise-manager)│
│       │                                                              │
│  ... agent does its work ...                                         │
│       │                                                              │
│  Stop/SubagentStop ──► update-expertise.hook.ts (async, non-blocking)│
│       │                    │                                         │
│       │              Spawns background:                               │
│       │              claude -p --agent expertise-manager              │
│       │              "Update expertise for <agent> from log <path>"   │
│       │                                                              │
│       └─► observable-agent.ts (writes stop signal, tail finalizes)   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisite Change: Observable Logs Use Claude's session_id

Currently `observable-agent.ts` generates a custom session ID (`Date.now().toString(36)`) and uses it as the log filename. This creates an indirection that requires a state file to map Claude's `session_id` to the observable log.

**Change:** Use Claude's `session_id` directly as the observable log filename. The log file becomes:
```
$OBSERVABLE_AGENT_LOGS_PATH/<session_id>.jsonl
```

This eliminates the need for `update-expertise.hook.ts` to read a state file — it computes the log path directly from the `session_id` it already receives in the hook input.

**Impact on `observable-agent.ts`:**
- Remove `generateSessionId()` and `observableSessionId` field.
- Use `session_id` directly for the output filename.
- State file still needed for dedup (resume/compact) and stop signal, but simplified:
  - Remove `observableSessionId` from `ObservableState`.
  - `outputPath` is now deterministic from `session_id`, so it could be removed too.
  - State retains `sourcePath` and `tailPid` for the resume dedup check.
- Stop signal path stays as-is (already keyed by `session_id`).

**Why this is better:**
- Any hook that has `session_id` can compute the log path without reading state.
- No coupling between `update-expertise.hook.ts` and `observable-agent.ts` state format.
- The log filename is predictable and debuggable (you can find a session's log by its ID).

---

## Key Design Decisions

### 1. How does `update-expertise.hook.ts` know the log file path?

**Decision: Compute it directly from session_id. No state file needed.**

The log path is deterministic:
```
<OBSERVABLE_AGENT_LOGS_PATH>/<session_id>.jsonl
```

The `update-expertise.hook.ts` receives `session_id` in its hook input. It reads `OBSERVABLE_AGENT_LOGS_PATH` from the environment (same as `observable-agent.ts` does) and joins it with the `session_id`. No state file lookup required.

**If `OBSERVABLE_AGENT_LOGS_PATH` is not set**, fall back to `cwd` (same logic as `observable-agent.ts`).

### 2. Should the hook block the agent while updating expertise?

**Decision: No. Use `async: true` or spawn a detached background process.**

The hook should NOT use `decision: "block"` to keep the agent alive. Instead:

**Option A (recommended): Background process.** The hook spawns a detached `claude` process that calls the `expertise-manager` with the log path, then exits immediately (exit 0). The expertise update happens after the agent has already stopped.

**Option B: Async hook config.** Use `"async": true` in the hook configuration. But async hooks deliver `systemMessage`/`additionalContext` on the *next* turn, which doesn't exist for a stopping agent. So async is not useful here.

**Chosen approach: Option A.** The hook script:
1. Reads the hook input to get `session_id` and `agent_type`.
2. Reads the observable state file to get the log path.
3. Validates the log file exists and has content.
4. Spawns a detached background process: `claude -p --agent expertise-manager --permission-mode auto "Update expertise for agent <agent_type> based on session log at <logPath>"`
5. Exits 0 immediately. The agent stops. The expertise-manager runs asynchronously.

### 3. Can we reuse the expertise-manager session from the retrieval phase?

**Decision: No. Each call is a separate subagent invocation.**

When the agent asks the expertise-manager for context (via the Agent tool), that's a subagent call. When the agent finishes and we want to update expertise, we need a new `claude -p --agent expertise-manager` invocation because:

- The original expertise-manager subagent has already finished.
- Hook scripts run as separate processes outside the agent's conversation.
- We can't reference a previous subagent session from a hook.

This is fine — the expertise-manager is stateless between calls. It reads the expertise files fresh each time.

### 4. When should the observable log be "ready"?

**Problem:** At `Stop` time, the observable-agent tail is still running. The `Stop` hook for `observable-agent.ts` writes a stop signal file, and the tail process reads the remaining data and exits after 20 seconds of idle polling (IDLE_POLLS_BEFORE_EXIT = 10 × 2s = 20s).

**Decision: The update-expertise hook should wait briefly for the tail to finish, then proceed.**

The hook should:
1. Check if the log file has a `process_end` marker (written by the tail on exit).
2. If not, wait up to 30 seconds polling every 2 seconds.
3. If the log is still incomplete after 30 seconds, proceed with whatever is available.

This ensures we capture the full session including the agent's final Stop-hook output.

**Alternative:** The update-expertise hook could write its own stop signal or use the existing `observable-agent.ts` stop mechanism. But this creates coupling. Better to just wait for the existing process to finish.

### 5. Hook placement: skill-level vs shared hook

**Decision: Place in `.claude/skills/agent-expertise/` alongside the other expertise hooks.**

The `update-expertise.hook.ts` lives in the `agent-expertise` skill directory, next to `new-expertise.hook.ts` and `expertise.hook.ts`. Agents that adopt the new expertise system will:
- Use `new-expertise.hook.ts` on `SessionStart` and `UserPromptSubmit` (for retrieval).
- Use `update-expertise.hook.ts` on `Stop` (for learning).
- **NOT** use `expertise.hook.ts` at all (old approach is replaced).

---

## Hook Specification

### File: `.claude/skills/agent-expertise/update-expertise.hook.ts`

### Events handled
- `Stop` — main agent finishes.
- `SubagentStop` — subagent finishes.

### Input (from Claude Code stdin)

```json
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../abc123.jsonl",
  "cwd": "/Users/project",
  "hook_event_name": "Stop",
  "agent_type": "library-developer",
  "agent_id": "def456"
}
```

### Algorithm

```
1. Read stdin → parse HookInput.
2. Extract session_id, agent_type, cwd.
3. If no agent_type → exit 0 (not an agent session).
4. Compute log path: OBSERVABLE_AGENT_LOGS_PATH/{session_id}.jsonl
   (fall back to cwd if env var not set, same as observable-agent.ts).
5. If log file does not exist or is empty → exit 0 (nothing to learn).
6. Wait for process_end marker in the log file (up to 30s, poll every 2s).
7. Build the prompt for expertise-manager:
   "Update the expertise for the '{agent_type}' agent based on its completed work.
    The session log is at: {logPath}
    Read the log, identify what the agent learned, and update the expertise files."
8. Spawn detached background process:
   claude -p --agent expertise-manager --permission-mode auto "<prompt>"
   with CWD set to the project directory.
9. Exit 0 immediately (non-blocking).
```

### Output

The hook exits 0 with no JSON output. It does not block the agent's stop.

The background `claude -p` process produces no output visible to the original agent.

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| No `agent_type` in input | Exit 0 — not an agent session, skip. |
| Log file missing or empty | Exit 0 — nothing to learn from, skip. |
| `process_end` marker never arrives | After 30s timeout, proceed with available content. |
| Background `claude` process fails | Silent failure. No retry. The expertise just doesn't update this session. |
| Multiple agents on same session | Each agent gets its own Stop hook with its own `agent_type`. Each session has one observable log keyed by `session_id`. |

---

## Agent Configuration Changes

### For agents adopting the new expertise system (like `library-developer`)

Replace the old `expertise.hook.ts` Stop hook with `update-expertise.hook.ts`:

**Before (old):**
```yaml
hooks:
  Stop:
    - hooks:
        - type: command
          command: "bun .claude/skills/agent-expertise/expertise.hook.ts"
        - type: command
          command: "bun .claude/hooks/observable-agent.ts"
```

**After (new):**
```yaml
hooks:
  Stop:
    - hooks:
        - type: command
          command: "bun .claude/skills/agent-expertise/update-expertise.hook.ts"
        - type: command
          command: "bun .claude/hooks/observable-agent.ts"
```

**Hook ordering matters:** `update-expertise.hook.ts` should run BEFORE `observable-agent.ts` on Stop. This way:
1. `update-expertise.hook.ts` computes the log path from `session_id`, spawns the background process, and exits.
2. `observable-agent.ts` writes the stop signal, which tells the tail to finalize and exit.

### For the expertise-manager itself

The `expertise-manager` agent should NOT have `update-expertise.hook.ts` — it would create a recursive loop (expertise-manager updating its own expertise while updating another agent's expertise). The expertise-manager is a tool, not a learning agent. Its own expertise can be updated manually or by a separate mechanism.

---

## Prompt Design for the Expertise Manager

The `update-expertise.hook.ts` spawns:

```bash
claude -p --agent expertise-manager --permission-mode auto \
  "Update the expertise for the '{agent_type}' agent based on its completed work session.

The observable session log is at: {logPath}

Read the log file to understand:
1. What task the agent was working on.
2. What the agent discovered or learned during the work.
3. Any patterns, decisions, or important observations the agent made.
4. Any errors encountered and how they were resolved.

Then update the expertise files for '{agent_type}' following your standard updating workflow.
Focus on capturing new knowledge, not repeating what's already stored."
```

The expertise-manager already knows how to:
- Read its expertise index.
- Classify new information by topic.
- Update existing topic files or create new ones.
- Add timeline entries.
- Follow quality rules.

---

## Migration Plan

### Phase 1: Implement `update-expertise.hook.ts` (this task)
- Create the hook file in `.claude/skills/agent-expertise/`.
- Test it works with a manual invocation.

### Phase 2: Update `library-developer` as pilot
- Change `library-developer.md` to use `update-expertise.hook.ts` instead of `expertise.hook.ts` on Stop.
- Test end-to-end: agent starts, does work, stops, expertise-manager updates expertise.

### Phase 3: Roll out to all agents
- Update each agent's frontmatter to use the new hooks.
- Keep `expertise.hook.ts` available as fallback but deprecated.

### Phase 4: Remove old expertise system
- Once all agents use the new system, remove `expertise.hook.ts`.

---

## Open Questions

1. **Should the background process have a timeout?** The `claude -p --agent expertise-manager` call could take a while. We should set a reasonable timeout (e.g., 300s) to prevent zombie processes. The hook itself exits immediately, but the background `claude` process should not run forever.

2. **Should we log when expertise updates happen?** The hook could write a small "update trigger" file (e.g., `.agentic/expertise/<agent>/last-update-trigger.json`) with timestamp and log path. This helps debugging and provides an audit trail.

3. **What if the same agent runs multiple sessions concurrently?** Each session has a unique `session_id`, a unique observable log, and a unique state file. The expertise-manager handles updates sequentially per invocation. Two concurrent updates to the same agent's expertise could conflict. Mitigation: the expertise-manager reads files before writing, so the last one wins with full context. This is acceptable for now.

4. **Should we pass the task description from the original prompt?** The `Stop` hook input includes `last_assistant_message` but not the original user prompt. The observable log contains the full conversation, so the expertise-manager can extract the task from the log. No additional data needed.

5. **Should the expertise-manager use the observable log or the raw transcript?** The observable log is filtered and structured (only messages and system events, no agent-settings or noise). It's the better source. The raw transcript is also available via `transcript_path` in the hook input, but it's much noisier. We should use the observable log.
