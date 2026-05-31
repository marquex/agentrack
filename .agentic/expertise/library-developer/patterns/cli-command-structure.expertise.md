# CLI Command Structure Pattern

## When To Use This

Adding or changing CLI commands. Understanding command registration, action handlers, or runner.ts setup.

## Mental Model

Each CLI command has its own file in `src/cli/commands/`. Commands are registered in `src/cli/runner.ts` via `createProgram()` using Commander.js.

**Command file structure**:
1. Export an action handler function (e.g., `nextAction`, `listAction`)
2. Action handler parses args/options → calls Tracker method → prints result via output utilities
3. Success → stdout JSON, exit 0; Error → stderr JSON, exit from error code

**Registration in runner.ts**:
```typescript
program.command('next <userName>')
  .action(nextAction);
```

**runner.ts exports `createProgram()`** — used by both CLI entry (`src/bin.ts`) and package integration tests.

**Subcommands** (users, comments, blockages) use Commander's `.command()` chaining with their own action handlers.

## Code Map

- `src/cli/runner.ts` — createProgram, all command registrations
- `src/cli/commands/*.ts` — individual command handlers
- `src/cli/output.ts` — shared output formatting
- `src/bin.ts` — entry point

## Referenced Recipes

- [recipes/add-cli-command.expertise.md](recipes/add-cli-command.expertise.md): step-by-step for adding commands

## Related Topics

- [cli-commands.expertise.md](cli-commands.expertise.md): full command reference
