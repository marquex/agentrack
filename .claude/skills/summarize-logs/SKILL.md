---
name: summarize-logs
description: Read and summarize observable agent session logs. Use when you need to understand what another agent did during a session — what hooks were called, what tools it used, what it thought about, and what it said.
allowed-tools: Bash(bun *)
---

# Summarize Logs

Use this skill to read and understand the contents of observable agent session logs. The logs are JSONL files produced by the `observable-agent` hook, typically stored in `.claude/` or `.agentic/agent_logs/`.

## When to use

- When you need to understand what an agent did during a previous session
- When you need to extract key information from a session log to update expertise
- When you need to analyze agent behavior, decisions, or errors from a completed session
- When you need to review tool usage patterns from a session

## How to use

Run the summarize script with the path to the JSONL log file:

```bash
bun .claude/skills/summarize-logs/scripts/summarize-logs.ts <log-path>
```

For a more compact output (shorter thinking blocks and tool results):

```bash
bun .claude/skills/summarize-logs/scripts/summarize-logs.ts <log-path> --compact
```

The script will output:

1. **Stats** — Summary counts of each entry type (hooks, prompts, tool calls, results, thinking, text)
2. **Narrative** — A chronological narration of the session including:
   - Hooks called (with command, exit code, duration)
   - The initial user prompt
   - Tool calls made and their results (including errors)
   - Agent thinking (internal reasoning)
   - Agent text responses (what the agent said)

For full script options and details, see [reference.md](./reference.md).
