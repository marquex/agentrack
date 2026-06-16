# Library overview and API surface

## When To Use This

Starting any library task: "how is the library structured", "where is the library API", "what does the library expose", "library vs CLI", "import agentrack".

## Mental Model

Per the project's CLAUDE.md, agentrack has three sides that share the same codebase:

1. **Agentrack CLI tool** (`agt` command, installed via NPM) — the user-facing CLI.
2. **Agentrack TypeScript library** — this agent's domain. Reuses the CLI's library code to expose a programmatic TypeScript API, so anyone can `import` agentrack and call its methods directly instead of shelling out to the CLI.
3. **Webapp** — a separate UI built on top of the library/CLI.

Library API functions and CLI commands are typically backed by the same underlying implementation; adding a capability to the library usually makes it available to the CLI and webapp too.

## Package layout

The library lives in **`packages/library/`**. Key source paths (verified during the `usersRegenerate` work):

- `packages/library/src/core/tracker.ts` — the `Tracker` class; most user/issue/blockage API methods (e.g. `usersRegenerate`, `resolveAuthor` callers) live here.
- `packages/library/src/core/auth.ts` — auth helpers including `resolveAuthor({ config, users, requiresWrite, token })`, which reads `options.token ?? process.env["AGT_USER_TOKEN"]`.
- `packages/library/src/types/api.ts` — request/result parameter interfaces (e.g. `UsersRegenerateParams`, `UsersRegenerateResult`, `BlockagesAddParams`, etc.).
- `packages/library/src/types/index.ts` — types barrel.
- `packages/library/src/index.ts` — public API barrel; anything exported here is part of the programmatic surface.
- `packages/library/src/cli/` — the CLI **that ships inside the library package** (e.g. `cli/commands/users.ts`, `cli/runner.ts`). This is distinct from any separate top-level `packages/cli` package, which library-developer cannot access.

When adding a new public method/option, three files usually need updating: the implementation (`core/tracker.ts`), the type (`types/api.ts`), and both barrels (`types/index.ts`, `index.ts`).

## Build / check commands

Run from the `packages/library/` directory (the agent's cwd was already the package root; if `cd packages/library` fails, you are already there):

- `bun run typecheck` → `tsc --noEmit`
- `bun run lint` → `eslint src/ tests/`
- `bun run test` → test suite (confirm full green before finishing a task)

## Known API entry points

- `Tracker.usersRegenerate(name, params?: UsersRegenerateParams)` — regenerate a user/author token. `UsersRegenerateParams = { token?: string }` overrides `AGT_USER_TOKEN`. See [users-regenerate-token-override.expertise.md](users-regenerate-token-override.expertise.md).
- `resolveAuthor({ config, users, requiresWrite, token? })` — resolves an author; reads `options.token ?? process.env["AGT_USER_TOKEN"]`. Already understood token override before `usersRegenerate` exposed it.

## Related Topics

- [users-regenerate-token-override.expertise.md](users-regenerate-token-override.expertise.md): the feature that connects these two functions.
- [library-gotchas.expertise.md](library-gotchas.expertise.md): TS strictness and access-restriction pitfalls when editing the library.

## Timeline

- 2026-06-14: Expertise bootstrapped from a context-gathering-only session (issue was blocked). API entry points recorded from investigation only.
- 2026-06-16: First real implementation session filled in the package layout, the three-file export pattern, the build/check commands, and the `usersRegenerate` signature change.

## Gaps And Validation Needs

- **Full API surface still partial.** Only the author/user methods are mapped. Other method families (issues, blockages, comments) follow the same `Tracker` pattern but are not yet enumerated here — fill in as the next relevant task touches them.
- **CLI flag wiring not documented.** No record yet of how to add a global CLI flag (e.g. `--token`) end-to-end through `cli/runner.ts`; capture when first needed.
