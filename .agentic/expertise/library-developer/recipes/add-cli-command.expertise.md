# Recipe: Add A New CLI Command

## Trigger

Task asks to add a new CLI command or subcommand to the `agt` tool.

## Preconditions

- The Tracker method (or worktree function) the command will call already exists or is being added simultaneously
- Result types are defined in `src/types/api.ts`

## Steps

1. **Create command handler file** at `src/cli/commands/<name>.ts`
   - Export an action handler function (e.g., `<name>Action`)
   - Parse args/options from Commander
   - Call the appropriate Tracker method (or worktree function)
   - Print result via output utilities (stdout JSON on success, stderr JSON on error)

2. **Register command** in `src/cli/runner.ts`
   - Import the action handler
   - Add `program.command('<name> [args...]')` with `.option()` for flags
   - Chain `.action(<name>Action)`

3. **Export result type** from barrel
   - Add to `src/types/index.ts` if new type
   - Add to `src/index.ts` if it should be part of the public API

4. **Add CLI tests** in `tests/cli/commands.test.ts` or create new test file
   - Use Bun.spawn to run bin.ts as subprocess
   - Test stdout JSON, stderr JSON, and exit code
   - Test both success and error cases

5. **Add e2e test** at `tests/e2e/<name>.test.ts`
   - Test full command lifecycle with real file system

6. **Verify**: `bun run quality` (typecheck + lint + coverage)

## Relevant Files

- `src/cli/commands/*.ts` — existing command handlers (reference for patterns)
- `src/cli/runner.ts` — command registration
- `src/cli/output.ts` — output formatting
- `tests/cli/commands/cli-test-helper.ts` — subprocess testing helper
- `tests/e2e/setup.ts` — e2e test setup

## Known Pitfalls

- push/pull are NOT Tracker methods — they are standalone worktree module functions
- Use `'null'` (string) for detaching parentId or filtering top-level in list
- Tags are comma-separated in CLI parsing
- Commander handles positional args and options differently — check existing commands for patterns
