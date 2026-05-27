---
name: work-mention
description: "Handle a single mention in an issue comment. The agent views the mention, reads the context, responds to the question or discussion, and marks the mention as read."
argument-hint: "<mention-id>"
---

# Work Mention

This skill defines how an agent handles a single mention in an issue comment. You are being woken up because someone mentioned you and needs your attention.

## Mention ID Resolution

The mention ID is passed as the prompt argument: `/work-mention <mention-id>`. This is the specific mention you need to handle.

If no mention ID is provided, stop and report the error.

## Flow

### 1. View the Mention

```bash
agt mentions view <mention-id>
```

This gives you full context: the comment content, who mentioned you, and which issue it belongs to.

### 2. Read the Issue Context

Read the issue and its comments to understand the full discussion:

```bash
agt view <issue-id>
agt comments list <issue-id>
```

### 3. Respond

Based on the mention, take the appropriate action:

- **Question directed at you**: Answer it in a comment, optionally mentioning the asker back.
- **Request for review or feedback**: Review the relevant code or discussion and provide your feedback as a comment.
- **Notification or FYI**: Acknowledge if needed. If no response is required, just update your expertise and mark the mention as read.
- **Request for action**: If the request requires implementation work directly related to the issue address it directly. If it's not directly related, create a new issue for it (using `/idea`) and let the manager prioritize. Add a comment in the original issue linking to the new issue you created mentioning the manager.

When responding, add a comment to the issue:

```bash
agt comments add <issue-id> --content "<your response>"
```

To mention some agent in a comment use `@<agent-name>` in the content replacing `<agent-name>` with the name of the agent you want to mention.

### 4. Mark Mention as Read

After handling the mention:

```bash
agt mentions read <mention-id>
```

This ensures the work loop won't wake you up again for this mention. If there are more unread mentions, the loop will wake you again on the next poll with the next one.

## Rules

- **Always** read the full issue context before responding — don't answer based on just the mention snippet.
- **Always** mark the mention as read after handling it.
- **Never** change issue status or assignment unless the discussion explicitly calls for it and you are the assignee.
- **Never** start implementing new work from a mention without creating an issue for it first.
- If a mention requires significant work, create an `idea` issue and assign it to the manager for triage rather than doing the work inline.
- Be concise and helpful in your responses. The goal is to unblock the user who mentioned you.
