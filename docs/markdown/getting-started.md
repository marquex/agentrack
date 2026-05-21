# Getting started

This guide walks you through installing agentrack and running through a complete first session. By the end, you'll know how to create, update, and inspect issues using both the CLI and the JavaScript API.

## Prerequisites

- **Node.js >= 20** -- Agentrack uses modern JavaScript features and requires Node 20 or later.
- **Git** -- Your project must be a git repository. Agentrack stores issue data on a dedicated branch.

## Installation

Install agentrack as a dependency in your project:

```bash
npm install agentrack
```

This gives you access to the JavaScript API (`import { Tracker } from "agentrack"`) and the CLI command.

### Using the CLI

After installation, the `agt` command is available via:

```bash
npx agt <command>
```

For frequent use, link it globally:

```bash
npm link
# Now you can use "agt" directly
agt <command>
```

## Your first session (CLI)

### 1. Initialize the tracker

Run `init` in your git repository to create the `.agentrack` directory and set up the storage branch:

```bash
agt init
```

Output:

```json
{ "result": "OK", "scenario": "fresh", "path": "/path/to/your/project" }
```

This creates the `.agentrack/` directory (which lives on a separate git branch) with the index file, config, and user registry. See [Storing issues in git](./storing-issues-in-git.md) for details on how this works.

**Custom branch:** If you want to run a separate tracker instance (for example, for test results or a different workflow), use `--branch`:

```bash
agt init --branch testing
```

This creates a `_testing` branch and `.testing/` directory instead of the defaults. See [CLI reference](./cli-reference.md#agt-init) for the full `--branch` documentation.

### 2. Create an issue

```bash
agt create "Investigate slow database queries" \
  --description "Users report the dashboard takes 10+ seconds to load. Start by profiling the database queries." \
  --status todo \
  --assignee "alice" \
  --tags "performance,backend" \
  --priority 2
```

Output:

```json
{ "id": "m1x2k9ab" }
```

The issue ID is a short, time-sortable string. Save it -- you'll use it to reference the issue.

### 3. List your issues

```bash
agt list
```

Output:

```json
[
  {
    "id": "m1x2k9ab",
    "title": "Investigate slow database queries",
    "status": "todo",
    "assignee": "alice",
    "tags": ["performance", "backend"],
    "parentId": null,
    "priority": 2
  }
]
```

You can filter by status, assignee, tags, or parent. For example, `agt list --status open --assignee alice` shows all open issues assigned to alice.

### 4. View an issue's full details

```bash
agt view m1x2k9ab
```

Output:

```json
{
  "id": "m1x2k9ab",
  "title": "Investigate slow database queries",
  "description": "Users report the dashboard takes 10+ seconds to load...",
  "status": "todo",
  "assignee": "alice",
  "tags": ["performance", "backend"],
  "parentId": null,
  "priority": 2,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "createdBy": "anonymous",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

### 5. Update the issue

Move the issue to in-progress:

```bash
agt update m1x2k9ab --status "in-progress"
```

Output:

```json
{ "result": "OK" }
```

You can update any combination of fields in a single command:

```bash
agt update m1x2k9ab --status "done" --description "Found and fixed the N+1 query in the dashboard endpoint."
```

### 6. View the event history

Every change is recorded as an immutable event. View the full history:

```bash
agt history m1x2k9ab
```

Output:

```json
[
  { "timestamp": "2025-01-15T10:30:00.000Z", "type": "creation", "author": "anonymous" },
  {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "type": "update",
    "author": "anonymous",
    "content": {
      "title": "Investigate slow database queries",
      "description": "Users report the dashboard takes 10+ seconds to load...",
      "status": "todo",
      "assignee": "alice",
      "tags": ["performance", "backend"],
      "priority": 2
    }
  },
  {
    "timestamp": "2025-01-15T11:00:00.000Z",
    "type": "update",
    "author": "anonymous",
    "content": { "status": "in-progress" }
  }
]
```

The history is the source of truth. The `view` command computes the current state by replaying these events.

## Your first session (JavaScript)

The same workflow using the JavaScript API:

```javascript
import { Tracker } from "agentrack";

const tracker = new Tracker(); // resolves .agentrack/ from cwd

// 1. Initialize
await tracker.init();

// 2. Create an issue
const { id } = await tracker.create({
  title: "Investigate slow database queries",
  description: "Users report the dashboard takes 10+ seconds to load...",
  status: "todo",
  assignee: "alice",
  tags: ["performance", "backend"],
  priority: 2,
});
console.log("Created issue:", id);

// 3. List issues
const issues = await tracker.list({ status: "open" });
console.log("Open issues:", issues);

// 4. View an issue
const issue = await tracker.view(id);
console.log("Issue details:", issue);

// 5. Update the issue
await tracker.update(id, { status: "in-progress" });

// 6. View history
const events = await tracker.history(id);
console.log("Event log:", events);
```

The `Tracker` constructor optionally accepts a `cwd` argument if you need to target a specific project directory:

```javascript
const tracker = new Tracker("/path/to/project");
```

## Where to go next

- [Authentication](./authentication.md) -- Set up users and tokens so multiple agents can attribute their work
- [The issue object](./issue-object.md) -- Understand issue properties, statuses, and the event sourcing model
- [Hierarchy and blockages](./hierarchy-and-blockages.md) -- Organize issues into epics and track dependencies
- [CLI reference](./cli-reference.md) -- Full command documentation with all flags and examples
- [JavaScript reference](./javascript-reference.md) -- Complete API reference for the Tracker class
