# CLI Commands

## When To Use This

Adding, changing, or fixing any CLI command. Understanding CLI flags, argument parsing, output format, or error behavior. Tasks mentioning "agt" commands, command registration, or runner.ts.

## Mental Model

The CLI is a thin wrapper over the Tracker class: parse arguments → call Tracker method → print result. Commander.js handles argument parsing. Each command has its own file in `src/cli/commands/`. All commands are registered in `src/cli/runner.ts` via `createProgram()`.

Output convention:
- **Success**: JSON to stdout, exit 0
- **Error**: JSON to stderr, exit from error code (see ErrorCodes)

The CLI binary is `src/bin.ts` (no hardcoded shebang — tsup adds it during build). In dev, run with `bun run src/bin.ts`.

### Command Reference

| Command | File | Key Flags |
|---------|------|-----------|
| `init` | commands/init.ts | `--branch <name>` |
| `create <title>` | commands/create.ts | `--description, --assignee, --tags, --status, --priority, --parentId, --path` |
| `list` | commands/list.ts | `--status, --assignee, --tags, --parentId` (`'null'` for top-level) |
| `view <issueId>` | commands/view.ts | — |
| `update <issueId>` | commands/update.ts | `--title, --description, --status, --assignee, --tags, --priority, --parentId` (`'null'` to detach) |
| `delete <issueId>` | commands/delete.ts | — |
| `history <issueId>` | commands/history.ts | — |
| `next <userName>` | commands/next.ts | — |
| `users register <name>` | commands/users.ts | — |
| `users list` | commands/users.ts | — |
| `users revoke <name>` | commands/users.ts | — |
| `users regenerate <name>` | commands/users.ts | — |
| `comments add <issueId> <content>` | commands/comments.ts | — |
| `comments update <issueId> <commentId> <content>` | commands/comments.ts | — |
| `comments delete <issueId> <commentId>` | commands/comments.ts | — |
| `comments list <issueId>` | commands/comments.ts | — |
| `blockages add <issueId> <blockedById>` | commands/blockages.ts | `--reason` |
| `blockages resolve <issueId> <blockedById>` | commands/blockages.ts | — |
| `blockages delete <issueId> <blockedById>` | commands/blockages.ts | — |
| `blockages list <issueId>` | commands/blockages.ts | — |
| `mentions list <issueId>` | commands/mentions.ts | — |
| `push` | commands/push.ts | `--message <string>` |
| `pull` | commands/pull.ts | — |

**Important**: push/pull are NOT Tracker methods — they are standalone worktree module functions (`pushWorktree`/`pullWorktree` from `src/core/worktree.ts`).

## Code Map

- `src/cli/runner.ts` — creates the Commander program, registers all commands
- `src/cli/commands/*.ts` — individual command action handlers
- `src/cli/output.ts` — shared output formatting utilities
- `src/bin.ts` — CLI entry point (calls createProgram)
- `tests/cli/commands.test.ts` — CLI integration tests using Bun.spawn
- `tests/cli/commands/cli-test-helper.ts` — test helper for CLI subprocess testing
- `tests/e2e/*.test.ts` — e2e tests per command

## Related Topics

- [error-handling.expertise.md](error-handling.expertise.md): exit codes and error output format
- [patterns/cli-command-structure.expertise.md](patterns/cli-command-structure.expertise.md): recipe for adding new commands
- [recipes/add-cli-command.expertise.md](recipes/add-cli-command.expertise.md): step-by-step command addition

## Business Rules And Invariants

- Success always goes to stdout as JSON with exit 0
- Errors always go to stderr as JSON with the error's exit code
- `--parentId 'null'` (string) means "detach from parent" in update
- `--parentId 'null'` in list means "show only top-level issues"
- `--tags` accepts comma-separated values
- push/pull are git operations, not Tracker API calls

## Gaps And Validation Needs

- CLI test coverage uses Bun.spawn subprocess testing; verify runner still works when adding new commands
- Tags are comma-separated in CLI but may need different parsing if complex tag values are needed
