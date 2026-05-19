---
name: idea
description: "Register a lightweight idea — pending task, feature idea, detected improvement, or tech debt — as an issue for future triage and prioritization. Any agent can use this to capture opportunities they discover during their work."
argument-hint: "<description of the idea or improvement>"
---

# Idea — Capture Opportunities for Later

This skill is invoked when an agent discovers something worth doing in the future but not right now: a pending task, a feature idea, a code improvement, a piece of tech debt, a detected edge case, or anything that could improve the project but isn't part of the current assignment.

Use this skill to capture the idea so it doesn't get lost. The CTO will triage and prioritize it later.

## When to Use

| Situation | Action |
|-----------|--------|
| You spot a code improvement while implementing something else | Register it as an idea |
| You notice missing test coverage outside your current scope | Register it as an idea |
| You think of a feature that would be valuable | Register it as an idea |
| You find tech debt or a workaround that should be cleaned up | Register it as an idea |
| You discover an edge case that isn't handled but isn't blocking | Register it as an idea |
| You want to suggest a tooling, process, or documentation improvement | Register it as an idea |
| You have a concrete task to do right now | Use `/issue` instead |

## Workflow

### 1. Check for Overlaps

Before creating, check if something similar already exists:

```bash
agt list --status open
```

Search for existing issues whose title matches your idea. You can see details of the issue by using

```bash
agt view <existing-id>
```

If an existing idea covers the same ground, add a comment with your additional perspective instead of creating a duplicate:

```bash
agt comments add <existing-id> --content "Additional thought: <your perspective>"
```

### 2. Classify the Idea

Choose a category tag to help triage:

| Tag | When to use |
|-----|-------------|
| `improvement` | Better way to do something that already works |
| `feature` | New capability that doesn't exist yet |
| `tech-debt` | Workarounds, shortcuts, or suboptimal code that should be cleaned up |
| `quality` | Missing tests, coverage gaps, error handling improvements |
| `docs` | Missing or outdated documentation |
| `performance` | Performance optimization opportunity |
| `ux` | Developer experience or usability improvement |

You can combine multiple tags. Always include at least one category tag.

### 3. Create the Idea Issue

```bash
agt create "<concise title>" \
  --description "<what you observed, why it matters, and what could be done about it>\n\n**Context:** <where you encountered this, what triggered the idea>\n\n**Suggested approach:** <optional — if you have a specific idea how to address it>" \
  --status "idea" \
  --priority <1-5> \
  --tags "<category-tag>" \
  --assignee "<your-manager>"
```

NOTE: If you are a manager-level agent (like the CTO), assign to yourself.

**Title guidelines:**
- Start with an imperative verb when possible: "Add...", "Improve...", "Refactor...", "Remove..."
- Be specific enough to recall the idea later without reading the full description
- Don't include the solution — just the opportunity

**Priority guidelines:**

| Priority | When to use |
|----------|-------------|
| 2 | Would significantly improve the project if done |
| 3 | Normal — worth doing when there's time |
| 4 | Low — minor improvement |
| 5 | Trivial — polish or nice-to-have |

Default to priority 3 unless you have a strong reason for a different level.

**Assignee:**
- If you are a worker, assign to your manager
- If you are a manager, assign to yourself

### 4. Add Context Comment

Add a comment with any additional context that would help the triager:

```bash
agt comments add <idea-id> --content "Discovered while working on <issue-id/reference>. <any additional context, code references, or examples that would help evaluate this idea>"
```

This is especially valuable when the idea is related to ongoing work — it creates a traceable connection.

## Rules

- **One idea per issue** — don't bundle multiple unrelated ideas into one issue.
- **Be specific** — "improve error handling" is too vague. "Add retry logic to the CLI connection handler when the network drops mid-request" is useful.
- **Include the why** — explain what triggered the idea and why it matters. Future readers may not have the context you have right now.
- **Don't implement** — this skill is for capturing, not doing. If the idea is urgent enough to do now, use `/issue` instead.
- **Don't over-classify** — one or two tags is enough. The CTO will refine during triage.

## Output

When done, briefly confirm:

```
Idea registered: <idea-id> "<title>" (assigned to cto)
```

No further action needed — continue with your current work.
