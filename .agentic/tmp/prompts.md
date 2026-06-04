# Agentrack Library — Development Prompts

### 1. "I want to build an issue tracker for AI agents. It should live inside the project repo as files, not require a database, and be easy for agents to read and write programmatically. Set up the project structure as a TypeScript library in a monorepo."

> Initializes the monorepo and scaffolds the library package.

### 2. "Build the core of the tracker. Every issue should be stored as a JSON file — an append-only list of events. The current state of an issue is always computed by replaying those events, never stored directly. It needs a programmatic API and a CLI. Start with the basics: initialize the tracker in a directory, create an issue, list issues, view a single issue with its full computed state, and update issue properties like title, status, assignee, priority, and tags."

> Core implementation: Tracker class, event sourcing, CLI commands (init, create, list, view, update), type definitions.

### 3. "Add quality tooling to the project — type checking, linting, formatting, tests with coverage — and wire it all together so running one command validates everything before a release."

> Quality agent and plan: eslint, prettier, tsc, bun test with coverage, the `quality` script.

### 4. "Every change to an issue is already stored as an event. Now expose that — add a way to retrieve the full event history of any issue so you can see exactly what happened and when."

> The `history` command and API.

### 5. "Add users and authentication. Agents and humans should be able to identify themselves. Each user gets a token. The tracker should support three modes: completely open (anyone can do anything), read-only (reads are open but writes need a token), and strict (everything requires a token)."

> User registration, token management, auth modes (open/read-only/strict).

### 6. "Add comments to issues. Agents and humans should be able to leave comments, edit them, and delete them. Comments are also stored as events in the issue's event log, so deletions are soft — the event stays, it just marks the comment as gone."

> Comment system: add, update, soft-delete, computed comments from events.

### 7. "Support breaking down work into smaller pieces. An issue should be able to have a parent, forming a hierarchy. When all children of a parent are done or closed, the parent should automatically be marked as done. When a parent is closed, all its done children should be closed too. A closed parent shouldn't allow new children."

> Parent-child hierarchy, automatic status propagation (upward promotion, downward cascade).

### 8. "Add dependencies between issues. An issue can be blocked by another issue. You should be able to add, list, resolve, and remove blockages. When a blocking issue is completed, the blockage should be resolved automatically. The tracker should detect circular dependencies."

> Blockage tracking: add, list, resolve, delete, auto-resolution, cycle detection.

### 9. "The error messages and inline documentation need to be clearer. Go through the codebase and improve them so that when something goes wrong, the user — or the agent — understands what happened and what to do."

> Better error messages, code comments, JSDoc.

### 10. "Set up the build system to produce both ESM and CommonJS output with type declarations, using tsup. The library should have zero runtime dependencies besides the CLI argument parser."

> tsup build, dual-format output, type declarations.

### 11. "Create a CI/CD pipeline to automatically build the library, run quality checks, and publish it to npm when a release is ready."

> GitHub Actions: build, quality gate, npm publish workflow.

### 12. "Generate a README that explains what this library is, how to install it, and shows examples of both the CLI and the programmatic API."

> Auto-generated README from source.

### 13. "Add a 'next' command that tells a user what they should work on next. It should look at all open issues assigned to that user, pick the one with the highest priority that isn't blocked, and return it. Only return items that are in 'todo' status — not ideas or items already in progress."

> The `next` command with priority-based, blockage-aware assignment logic.

### 14. "Rename the project from trackgentic to agentrack. Update every reference — the package name, the CLI command, the documentation, everything."

> Full rename across the entire codebase.

### 15. "Add a lightweight way to quickly register an idea without filling in all the details. It should create an issue in 'idea' status with just a title, so we can triage it later."

> The `idea` skill/command.

### 16. "The issue tracker data needs to be shared across all git branches in a repo, not live on each branch separately. Use a git worktree on a dedicated orphan branch so that the `.agentrack/` directory is the same no matter what code branch you're on. Add `push` and `pull` commands to sync the data to and from the remote."

> Worktree-based storage on `_agentrack` orphan branch, push/pull sync.

### 17. "Write end-to-end tests that exercise the full tracker workflow — initializing, creating issues, updating them, adding comments, managing blockages, syncing — the real scenarios a user or agent would go through."

> E2E test suite.

### 18. "Add @mention support in comments. When someone writes @alice in a comment, the tracker should detect that, record the mention, and provide a way for the mentioned user to see their unread mentions, view them with context, and mark them as read."

> Mentions system: detection in comments, mentions.json storage, list/unread/view/read API and CLI.

### 19. "Add the ability to delete an issue entirely — remove it from the index and clean up any blockage or mention data that references it."

> The `delete` command with cascading cleanup.
