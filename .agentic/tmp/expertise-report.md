Expertise Summary For: Create agt clear Command

  Matched Topics

  - CLI Commands: new command addition — cli-commands.expertise.md
  - Issue CRUD And Events: clearing involves removing all issue event files — issue-crud-events.expertise.md
  - Dependencies And Blockages: clearing must remove dependencies.json — dependencies-blockages.expertise.md
  - Git Integration And Worktree: clearing may affect the worktree/branch — git-worktree.expertise.md
  - Resolution And Directory Discovery: clear needs to find the tracker dir — resolution-discovery.expertise.md
  - Error Handling: new error code may be needed (NOT_INITIALIZED guard) — error-handling.expertise.md

  Mental Model

  A clear command needs to reset the agentrack data directory to a clean state, removing:

  1. All issue files — stored as issues/[id].json in the tracker directory, each containing an event array
  2. Index files — the index manager maintains sorted open/closed arrays and a childrenOf map (likely index.json or similar managed by src/core/index-manager.ts)
  3. Dependencies file — dependencies.json in the tracker directory holds all blockage relationships
  4. Any other state files — comments, mentions, etc. are stored within issue event files, so deleting issue files covers those

  The command is essentially the inverse of init in terms of data (but preserves the initialized directory/worktree structure). It should not delete the .agentrack.json pointer file
  or uninitialize the worktree — it should just wipe the data contents.

  Key architectural detail: The system uses event sourcing. Issues are stored as event files (issues/[id].json). The index is a denormalized view rebuilt from events.
  dependencies.json is separate persisted state. So "clear" means:
  - Delete all files in the issues/ subdirectory
  - Reset/recreate the index (empty open/closed arrays, empty childrenOf)
  - Delete dependencies.json
  - Reset any other data files (check if there's a users.json or similar)

  Patterns And Conventions

  CLI command structure — patterns/cli-command-structure.expertise.md:
  - Create src/cli/commands/clear.ts with an exported clearAction handler
  - Register in src/cli/runner.ts via program.command('clear').action(clearAction)
  - Success → JSON to stdout, exit 0; Error → JSON to stderr, exit from error code

  File I/O — patterns/file-io-atomic.expertise.md:
  1. All issue files — stored as issues/[id].json in the tracker directory, each containing an event array
  2. Index files — the index manager maintains sorted open/closed arrays and a childrenOf map (likely index.json or similar managed by src/core/index-manager.ts)
  3. Dependencies file — dependencies.json in the tracker directory holds all blockage relationships
  4. Any other state files — comments, mentions, etc. are stored within issue event files, so deleting issue files covers those

  The command is essentially the inverse of init in terms of data (but preserves the initialized directory/worktree structure). It should not delete the .agentrack.json pointer file
  or uninitialize the worktree — it should just wipe the data contents.

  Key architectural detail: The system uses event sourcing. Issues are stored as event files (issues/[id].json). The index is a denormalized view rebuilt from events.
  dependencies.json is separate persisted state. So "clear" means:
  - Delete all files in the issues/ subdirectory
  - Reset/recreate the index (empty open/closed arrays, empty childrenOf)
  - Delete dependencies.json
  - Reset any other data files (check if there's a users.json or similar)

  Patterns And Conventions

  CLI command structure — patterns/cli-command-structure.expertise.md:
  - Create src/cli/commands/clear.ts with an exported clearAction handler
  - Register in src/cli/runner.ts via program.command('clear').action(clearAction)
  - Success → JSON to stdout, exit 0; Error → JSON to stderr, exit from error code

  File I/O — patterns/file-io-atomic.expertise.md:
  - All file writes use atomic write-to-temp-then-rename via src/core/file-io.ts
  - File I/O uses node:fs/promises (not Bun-specific APIs)

  API result shape — patterns/api-result-shape.expertise.md:
  - Use discriminated union with result field
  - Follow naming convention: e.g., ClearResult
  - Include | AgentrackError for error cases

  Index manager — patterns/index-manager-pattern.expertise.md:
  - Index maintains sorted open/closed arrays and childrenOf map
  - Need to reset to empty state after clearing

  Recipes

  Add A New CLI Command — recipes/add-cli-command.expertise.md

  Steps (adapted for clear):

  1. Create src/cli/commands/clear.ts — export clearAction, call Tracker method or do file ops directly
  2. Register in src/cli/runner.ts — program.command('clear').action(clearAction)
  3. Define result type in src/types/api.ts — e.g., ClearResult
  4. Add CLI tests using Bun.spawn subprocess testing
  5. Add e2e test at tests/e2e/clear.test.ts
  6. Verify: bun run quality

  Add A New Tracker Method — recipes/add-tracker-method.expertise.md

  If the clear logic should live in Tracker (recommended for consistency):
  1. Define ClearResult in src/types/api.ts
  2. Add clear() method to Tracker class in src/core/tracker.ts
  3. Validate init state (throw if not initialized)
  4. Check auth (write permission using resolveAuthor)
  5. Perform the deletion operations
  4. Check auth (write permission using resolveAuthor)
  5. Perform the deletion operations
  6. Return result

  Business Rules And Invariants
  5. Perform the deletion operations
  6. Return result

  Business Rules And Invariants

  Business Rules And Invariants
  Business Rules And Invariants
  - Init idempotency: After clear, running init should still return ALREADY_INITIALIZED — the directory/worktree structure remains, only data is wiped.
  - Init idempotency: After clear, running init should still return ALREADY_INITIALIZED — the directory/worktree structure remains, only data is wiped.
  - Atomic writes: When resetting the index file, use the atomic write pattern from file-io.ts.
  - Worktree preservation: Do NOT delete the .agentrack.json pointer file or the worktree setup itself — only the data contents within the tracker directory.
  - Error codes: If adding a new error code (e.g., NOT_INITIALIZED for clear), follow the ErrorCodes pattern in src/core/errors.ts — currently using exit codes 0–19.

  Code Map

  Files the implementer will need to touch or reference:

  - src/cli/commands/clear.ts — new file (command handler)
  - src/cli/runner.ts — modify (register the clear command)
  - src/core/tracker.ts — modify (add clear() method)
  - src/types/api.ts — modify (add ClearResult type)
  - src/types/index.ts — modify (export new type)
  - src/index.ts — modify (public API export)
  - src/core/file-io.ts — reference (for file deletion/write utilities)
  - src/core/index-manager.ts — reference (to understand index reset)
  - src/core/dependency-manager.ts — reference (to understand dependencies.json location)
  - src/core/errors.ts — reference (error codes, may need new one)
  - src/cli/commands/init.ts — reference (pattern for similar command)
  - src/cli/commands/delete.ts — reference (pattern for destructive operations)
  - tests/cli/commands.test.ts — modify (add CLI tests)
  - tests/e2e/clear.test.ts — new file (e2e tests)

  Gaps And Verification Needs

  1. No stored recipe for a "clear/reset" operation — the implementer should study how init sets up the directory structure to understand what files to keep vs. wipe.
  2. Index manager reset — verify how to properly reset the index manager state (recreate with empty data, or just delete and let init recreate it). Check src/core/index-manager.ts
  for the API.
  3. Users file — the expertise doesn't detail if there's a separate users.json or if users are stored differently. The implementer should check the auth-users module to see if user
  data should also be cleared or preserved.
  4. Mentions data — verify if mentions are purely derived from comment events (stored in issue files) or if there's separate mentions state that needs clearing.
  5. Confirmation prompt — the task description doesn't mention one, but a destructive command like clear might benefit from a --force flag or confirmation. This is a product
  decision for the human.
  6. Verify file structure — the implementer should run init on a test directory and inspect the file tree to confirm exactly what files exist and need to be cleared.