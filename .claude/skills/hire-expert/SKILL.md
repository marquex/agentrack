---
name: hire-expert
description: "Create a new expert agent for the project. Use when you need to hire (create) a new specialized AI agent with a specific role, domain access, and optional task assignment capabilities."
argument-hint: "<expert-description>"
---

# Hire Expert

Use this skill to create a new expert agent for the project. The skill guides you through gathering all required information and creating the agent file following the expert agent template.


## Required Information

Before creating the agent, you need to gather the following:

1. **Name** — a kebab-case identifier (e.g., `code-reviewer`, `data-analyst`). Used as the agent file name and expertise folder name.
2. **Role description** — a clear description of the agent's purpose, what domain it specializes in, and when to use it. This becomes the `description` field in the frontmatter and the core of the system prompt.
3. **Folder access** — the folders the agent needs to access (read-only or read-write). These become `access` rules. The agent's own expertise folder (`.agentic/expertise/{name}/**`) is always included with read/write/delete.
6. **Model** (optional) — the model for the agent. Defaults to `opus` if not specified.

## Steps

Follow these steps in order:

### Step 1: Parse the user's description

The user provides a description of the expert they want to hire. Extract from it as much of the required information as possible.

### Step 2: Ask follow-up questions for missing information

If any required information is missing from the description, ask the user follow-up questions to gather it. Be specific about what you need. Group related questions together to minimize back-and-forth.

Information that can be inferred or defaulted does not need to be asked:
- If no model is specified, default to `opus`.
- If the role description is clear enough, derive the folder access from it (e.g., a `code-reviewer` likely needs access to source files, a `data-analyst` needs access to data files). However, if it's ambiguous, ask.


### Step 3: Create the agent file

Create the agent file at `.claude/agents/{name}.md` following this template:

```md
---
name: {name}
description: {description — concise, explains domain, purpose, and when to use it}
tools: Read, Edit, Write, Grep, Glob
model: {model — defaults to opus}
skills:
  - agentrack
access:
  - path: .agentic/expertise/{name}/**
    permissions: [read, write, delete]
  - path: {folder}/**
    permissions: [read]
  {additional access rules as needed}
hooks:
  PreToolUse:
    - matcher: "Read|Write|Edit|MultiEdit|Bash"
      hooks:
        - type: command
          command: "bun .claude/hooks/enforce-agent-access.ts"
  SessionStart:
    - hooks:
        - type: command
          command: "bun .claude/skills/agent-expertise/new-expertise.hook.ts"
        - type: command
          command: "bun .claude/hooks/observable-agent.ts"
  UserPromptSubmit:
    - hooks:
        - type: command
          command: "bun .claude/skills/agent-expertise/new-expertise.hook.ts"
  Stop:
    - hooks:
        - type: command
          command: "bun .claude/skills/agent-expertise/update-expertise.hook.ts"
        - type: command
          command: "bun .claude/hooks/observable-agent.ts"
---

{System prompt — sets the agent's direction and goals. Should NOT include specific step-by-step instructions. Instead, describe the agent's purpose, what it should aim to achieve, and let the agent learn how to achieve it through its expertise.}

## Constants

- $AGENTRACK_TOKEN: <agentrack-token>

## Coordinating Work

The project uses agentrack as the issue tracker. You are usually prompted to work in a specific issue. Use the `agentrack` skill to manage issues.

There is a `project-manager` that assigns issues to you. 

When you start working on an issue, update its status to `in-progress`. When you complete an issue, add a comment with the results, update the status to `todo` again and assign it back to the `project-manager` for review.

The success comment should include a summary with details that are interesting for the project manager to know, skip any technical details that are not relevant for the project manager.
  
If you experience some issues during the execution of the task that prevent you from completing it, update the issue with a comment describing the problem, update the status to `todo` and assign it back to the `project-manager` so it can reassign or resolve the issue.

The commment for problems should be detailed, and include technical details, so the project manager can understand the problem and decide how to resolve it.

If you detect some work that needs to be done that is outside of the scope of the current issue, create a new issue describing the work, set the status to `idea` and assign it to the `project-manager` for triage.

## Reporting

After completing your work, finish your session reporting the results. Include in the report:

- What you did? Did you complete the task successfully? If not, what was the issue that prevented you from completing it?
- Anything interesting you found during the work
- Did you needed to solve any unexpected problems to complete the task? If so, describe the problem and how you solved it.
- Any open questions or unresolved issues that you in the future might need to address

## Restricted domain

You have access to the following folders:

<!-- ACCESS_RULES -->
```

Key rules for the agent file:
- The system prompt should be directional, not prescriptive. Let the agent build expertise on how to achieve its goals.
- Always include them`agentrack` skill.
- Only include `Write` and `Edit` in the `tools` list if the agent needs to write to files outside its expertise folder. Most expert agents only need read access to their domain files.
- Always include the `PreToolUse` hook for `enforce-agent-access.ts`.
- Always include the `SessionStart`, `UserPromptSubmit` hooks for `new-expertise.hook.ts`. That will inject the expertise related to the current hand.
- Always include the `Stop` hook for `update-expertise.hook.ts`. These will trigger expertise updates after each session to keep the expertise up to date with the agent's latest learnings.
- Always include the `<!-- ACCESS_RULES -->` marker in the Restricted domain section. The PostToolUse hook `inject-agent-markers.ts` expands it at runtime when the file is read — the marker stays in the file on disk and is never replaced with hardcoded content. The frontmatter `access` block is the single source of truth.
- NEVER hardcode the access rules in the system prompt. Always use the marker. The frontmatter is the single source of truth.
- The token enforcement hook (`enforce-agentrack-token.ts`) and issue cleanup hook (`enforce-issue-cleanup.ts`) are registered project-wide in `.claude/settings.json`, so they don't need to be added to individual agent frontmatter.
- Register the new agent in agentrack to get their token and include it in the system prompt. Replace the `<agentrack-token>` placeholder with the actual token.

### Step 4: Register the agent in agentrack

After creating the agent file, register the agent as a agentrack user:

```bash
agt users register {name}
```

This returns a token. Replace the `<agentrack-token>` placeholder in the template with the real token for the agent system file.

### Step 5: Create the expertise folder

Create the expertise folder and an empty index file at `.agentic/expertise/{name}/{name}-index.md`
