# Library Developer — Expertise Index

Agent: library-developer
Domain: TypeScript npm package for issue tracking — CLI tool and library API

## Routing Topics

### CLI Commands

- File: [cli-commands.expertise.md](cli-commands.expertise.md)
- Human requests: "add a CLI flag", "change the init command", "fix list output", "add a new command", "update comments CLI", "blockages command bug", "next command", "push/pull commands"
- Covers: All CLI commands (init, create, list, view, update, history, delete, next, users, comments, blockages, mentions, push, pull), their flags, argument parsing, and output format

### Issue CRUD And Events

- File: [issue-crud-events.expertise.md](issue-crud-events.expertise.md)
- Human requests: "create an issue", "update issue fields", "issue event format", "computeState", "replay events", "change how issues are stored"
- Covers: Issue lifecycle (create/update/delete), event sourcing model, event types, computeState/computeComments replay, barrel event format in JSON files

### Hierarchy And Status

- File: [hierarchy-status.expertise.md](hierarchy-status.expertise.md)
- Human requests: "parent-child issues", "hierarchy validation", "status cascade", "upward promotion", "close a parent issue", "reparenting", "change status order"
- Covers: Hierarchy constraints, status ordering (open < in-progress < done < closed), downward cascade (auto-close children), upward auto-promotion, reparenting, childrenOf map

### Dependencies And Blockages

- File: [dependencies-blockages.expertise.md](dependencies-blockages.expertise.md)
- Human requests: "add a blockage", "resolve blockage", "cycle detection", "impact score", "blocked issues", "auto-resolve blockages", "batch blockages"
- Covers: Blockage CRUD, cycle detection (DFS), impact scoring (recursive BFS), auto-resolution on status change, batch blockage operations, dependencies.json persistence

### Next Issue Recommendation

- File: [next-recommendation.expertise.md](next-recommendation.expertise.md)
- Human requests: "next command", "recommend next issue", "change next algorithm", "next for a user", "next should consider X"
- Covers: Tracker.next() selection algorithm, assignable status filtering, blockage exclusion, priority/impact sorting, NO_ISSUES_AVAILABLE handling

### Auth And Users

- File: [auth-users.expertise.md](auth-users.expertise.md)
- Human requests: "user registration", "token validation", "auth mode", "revoke user", "regenerate token", "change auth behavior"
- Covers: Auth modes (open/read-only/strict), token system (tk_ + 8 chars), user registration/revocation/regeneration, AGT_USER_TOKEN env var, self-service token regeneration

### Comments And Mentions

- File: [comments-mentions.expertise.md](comments-mentions.expertise.md)
- Human requests: "add a comment", "update comment", "delete comment", "mention a user", "@mention", "comment event format"
- Covers: Comment CRUD (add/update/soft-delete/list), computeComments replay, mention extraction and tracking, comment events in event stream

### Git Integration And Worktree

- File: [git-worktree.expertise.md](git-worktree.expertise.md)
- Human requests: "push data", "pull data", "worktree setup", "orphan branch", "git sync", "init with git", "branch configuration"
- Covers: Push/pull operations, orphan branch worktree model, .agentrack.json pointer file, worktree module (not Tracker methods), init git/non-git paths

### Branch Configuration

- File: [branch-config.expertise.md](branch-config.expertise.md)
- Human requests: "custom branch name", "--branch flag", "configurable branch", "normalize branch name", "pointer file"
- Covers: --branch flag on init, branch name normalization (strip underscores, prepend _/.), branch-config.ts module, resolveWorktreeOptions, backward compatibility

### Resolution And Directory Discovery

- File: [resolution-discovery.expertise.md](resolution-discovery.expertise.md)
- Human requests: "find tracker dir", "resolveTrackerDir", "walk-up discovery", "change how dirs are found", "pointer file resolution"
- Covers: resolveTrackerDir walk-up algorithm, .agentrack.json pointer file reading, fallback to .agentrack/, tracker constructor dir resolution

### Error Handling

- File: [error-handling.expertise.md](error-handling.expertise.md)
- Human requests: "add error code", "change error message", "exit code", "AgentrackError", "error format"
- Covers: ErrorCodes const object (15 error codes, exit 0-19), AgentrackError class, CLI error output (stderr JSON), error message formatting (backtick IDs, periods)

### Build And Package

- File: [build-package.expertise.md](build-package.expertise.md)
- Human requests: "build the package", "change build output", "tsup config", "publish", "package.json exports", "CJS/ESM dual output"
- Covers: tsup build pipeline, dual CJS+ESM+dts output, package.json configuration, CLI binary bundling, prepublishOnly quality gates

### Testing Patterns

- File: [testing-patterns.expertise.md](testing-patterns.expertise.md)
- Human requests: "write a test", "test helper", "test structure", "test coverage", "e2e test", "mock tracker"
- Covers: Test organization (unit/events/tracker/cli/integration/e2e), createTestDir isolation, CLI subprocess testing, assertion helpers, coverage expectations

### Spec Reviews And Decisions

- File: [spec-reviews.expertise.md](spec-reviews.expertise.md)
- Human requests: "what was decided about X spec", "spec review findings", "configurable branch design", "next todo-only", "cap upward promotion"
- Covers: Completed spec reviews (next-todo-only, cap-upward-promotion, independent-git, user-docs, configurable-branch), key findings, rejected alternatives, implementation notes

## Cross-Topic Patterns

- File: [patterns/event-sourcing.expertise.md](patterns/event-sourcing.expertise.md)
- Human requests: "how events work", "add a new event type", "event sourcing conventions", "replay pattern"
- Covers: Event sourcing model, event file format, replay functions, adding new event types

- File: [patterns/api-result-shape.expertise.md](patterns/api-result-shape.expertise.md)
- Human requests: "API return type", "discriminated union result", "add a new API method", "result type pattern"
- Covers: API result type conventions, discriminated unions, error union pattern, InitResult special case

- File: [patterns/file-io-atomic.expertise.md](patterns/file-io-atomic.expertise.md)
- Human requests: "atomic write", "file write pattern", "safe file operations"
- Covers: Write-to-temp-then-rename pattern, file-io.ts utilities, ID generation

- File: [patterns/index-manager-pattern.expertise.md](patterns/index-manager-pattern.expertise.md)
- Human requests: "index manager", "sorted index", "binary search", "childrenOf map", "fast lookups"
- Covers: Index manager sorted arrays, binary search operations, denormalized IndexEntry, childrenOf management

- File: [patterns/cli-command-structure.expertise.md](patterns/cli-command-structure.expertise.md)
- Human requests: "add a new CLI command", "CLI command pattern", "command registration", "runner.ts"
- Covers: CLI command file structure, action handler pattern, runner.ts registration, stdout/stderr/exit code conventions

## Implementation History

- File: [timeline.expertise.md](timeline.expertise.md)
- Human requests: "when was X implemented", "what changed in phase N", "implementation history"
- Covers: Phase 1-8 history, next command, configurable-branch implementation, all spec reviews

## Recipes

- File: [recipes/add-cli-command.expertise.md](recipes/add-cli-command.expertise.md)
- Human requests: "how to add a new CLI command"
- Covers: Step-by-step recipe for adding a CLI command

- File: [recipes/add-tracker-method.expertise.md](recipes/add-tracker-method.expertise.md)
- Human requests: "how to add a new Tracker method"
- Covers: Step-by-step recipe for adding a Tracker method with events, index, and CLI

- File: [recipes/add-event-type.expertise.md](recipes/add-event-type.expertise.md)
- Human requests: "how to add a new event type"
- Covers: Step-by-step recipe for adding an event type to the sourcing system
