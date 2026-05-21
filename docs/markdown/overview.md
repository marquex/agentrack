# Agentrack

Agentrack is a lightweight issue tracker designed for AI agents and developers who work in git repositories. It stores issues as JSON files on a dedicated git branch, so your tracker data lives alongside your code without generating merge conflicts.

## Why agentrack?

Traditional issue trackers (Jira, GitHub Issues, Linear) are built around web interfaces and human workflows. Agentrack is different:

- **File-backed** -- All data lives in JSON files. No database, no server, no infrastructure.
- **Event-sourced** -- Every change is an immutable event. The current state of an issue is computed by replaying its event log, so you always have a full audit trail.
- **Git-friendly** -- Issues are stored on a dedicated orphan branch (`_agentrack`) via git worktree. Push and pull with standard git commands. No merge conflicts with your code. Use `--branch` to run multiple independent trackers in the same repo.
- **Designed for AI agents** -- The CLI outputs JSON by default, making it easy for agents and scripts to parse. The JavaScript API gives full programmatic access.
- **Zero infrastructure** -- `npm install agentrack` and you're done. No accounts, no hosting, no configuration servers.
- **Multi-agent ready** -- Token-based authentication lets multiple agents (and humans) attribute their actions. Choose from open, read-only, or strict auth modes.

## Key features

### Event sourcing

Every action on an issue -- creating it, changing its status, adding a comment, linking a dependency -- is recorded as an immutable event. The current state is always computed by replaying the event log from start to finish. This means you never lose history, and you can always understand how an issue evolved.

### Hierarchy and dependencies

Issues can form parent-child trees via the `parentId` property, and they can declare dependencies via blockages. The hierarchy enforces status constraints: a parent can't be closed until its children are done, and starting work on a child automatically promotes the parent. Blockages prevent work from starting until blockers are resolved. See [Hierarchy and blockages](./hierarchy-and-blockages.md).

### Git-native storage

Instead of a database, agentrack stores everything in JSON files on a dedicated git branch. This means your issues are versioned, distributed, and synced alongside your code -- but without merge conflicts. See [Storing issues in git](./storing-issues-in-git.md).

### Token-based auth

Multiple agents can register as users and attribute their actions via lightweight tokens. Three auth modes (open, read-only, strict) let you balance convenience and accountability. See [Authentication](./authentication.md).

### Priority and impact scoring

Issues have a priority from 1 (critical) to 5 (trivial). When listing or getting the next issue, agentrack sorts by priority, then by impact score (how many other issues depend on this one), then by age. This helps agents automatically pick the most important work. See [The issue object](./issue-object.md).

## Two ways to use it

Agentrack provides two interfaces for the same underlying tracker:

1. **CLI** -- The `agt` command-line tool. Ideal for quick interactions, scripting, and agent tool use.

   ```bash
   agt create "Fix login bug" --status todo --assignee "alice" --priority 2
   ```

2. **JavaScript API** -- The `Tracker` class. Ideal for application integration, custom workflows, and batch operations.

   ```javascript
   import { Tracker } from "agentrack";

   const tracker = new Tracker();
   const { id } = await tracker.create({
     title: "Fix login bug",
     status: "todo",
     assignee: "alice",
     priority: 2,
   });
   ```

## Quick example

Here's a complete workflow in three steps:

```bash
# 1. Initialize the tracker in your repository
agt init

# 2. Create an issue
agt create "Set up CI pipeline" --status todo --tags "devops,infra"

# 3. View all open issues
agt list --status open
```

The equivalent in JavaScript:

```javascript
import { Tracker } from "agentrack";
const tracker = new Tracker();

await tracker.init();
const { id } = await tracker.create({
  title: "Set up CI pipeline",
  status: "todo",
  tags: ["devops", "infra"],
});
const issues = await tracker.list({ status: "open" });
```

## Status lifecycle

Issues progress through five statuses:

```
idea --> todo --> in-progress --> done --> closed
```

- **idea** -- A thought or proposal, not yet committed to.
- **todo** -- Accepted and planned, ready to be picked up.
- **in-progress** -- Someone is actively working on it.
- **done** -- Work is complete, awaiting review or verification.
- **closed** -- Final state. Resolved, abandoned, or no longer relevant.

The `--status open` filter matches everything except `closed`.

## What's next?

- [Getting started](./getting-started.md) -- Install agentrack and run through your first session
- [Authentication](./authentication.md) -- Set up users and tokens for multi-agent workflows
- [The issue object](./issue-object.md) -- Properties, status lifecycle, and the event sourcing model
- [Hierarchy and blockages](./hierarchy-and-blockages.md) -- Parent-child relationships and dependency tracking
- [Storing issues in git](./storing-issues-in-git.md) -- How agentrack uses git branches to store tracker data
- [CLI reference](./cli-reference.md) -- Complete command documentation
- [JavaScript reference](./javascript-reference.md) -- Tracker class methods and exported types
