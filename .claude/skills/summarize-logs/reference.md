# Summarize Logs — Script Reference

## Script

`summarize-logs.ts` — located in `.claude/skills/summarize-logs/scripts/`

## Usage

```bash
bun .claude/skills/summarize-logs/scripts/summarize-logs.ts <log-path> [--compact]
```

## Arguments

| Argument   | Required | Description                                         |
| ---------- | -------- | --------------------------------------------------- |
| `log-path` | Yes      | Path to the JSONL session log file to summarize     |
| `--compact`| No       | Truncate thinking blocks and tool results for brevity |

## Input format

The script expects JSONL files produced by the `observable-agent` hook. Each line is a JSON object with these possible shapes:

| Entry type        | JSON shape                                                                 |
| ----------------- | -------------------------------------------------------------------------- |
| Hook called       | `{"role":"system","type":"hook_success","data":{"hookEvent":"...","command":"...","exitCode":0,"durationMs":82,...}}` |
| User prompt       | `{"role":"user","data":{"type":"prompt","content":"..."}}`                 |
| Agent thinking    | `{"role":"assistant","type":"thinking","data":{"thinking":"...","signature":""}}` |
| Tool call         | `{"role":"assistant","type":"tool_use","data":{"id":"call_...","name":"Read","input":{...}}}` |
| Tool result       | `{"role":"user","type":"tool_result","data":{"content":"...","is_error":false,"tool_use_id":"call_...","truncated":false}}` |
| Agent text        | `{"role":"assistant","type":"text","data":{"text":"..."}}`                 |
| Session end       | `{"role":"system","type":"process_end","data":{}}`                         |

## Output sections

### Stats

A count of each entry type found in the log:

```
Total entries: 85
  Hooks:          1
  Prompts:        1
  Tool calls:     32
  Tool results:   32 (8 errors)
  Thinking:       13
  Text responses: 5
```

### Narrative

A chronological sequence of events, each under a `---` delimiter:

```
--- Hook Called ---
  Event:    SessionStart
  Command:  bun .claude/hooks/observable-agent.ts
  Exit:     0
  Duration: 82ms

--- User Prompt ---
Update the expertise for the 'library-developer' agent...

--- Thinking ---
Let me start by reading the session log...

--- Tool Call ---
Read .claude/test-session.jsonl
Result: agent 'expertise-manager' has no access rule...

--- Tool Call ---
Glob .claude/*.jsonl
Result (truncated): .claude/test-session.jsonl ...

--- Agent Says ---
I don't have access to the session log files...
```

Tool calls are buffered and emitted together with their matching result in a single block.
Orphaned calls (no result received) are flushed at session end with `Result: (no result received)`.

## Compact mode

When `--compact` is passed:
- Thinking blocks are truncated to 300 characters
- Tool result content is truncated to 200 characters
- Hook stdout/stderr is truncated to 120 characters
- Bash commands are truncated to 80 characters

Without `--compact`:
- Thinking blocks are shown in full
- Tool results show up to 1000 characters
- Hook stdout/stderr shows up to 500 characters
- Bash commands show up to 200 characters
