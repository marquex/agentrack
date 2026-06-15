# Library overview and API surface

## When To Use This

Starting any library task: "how is the library structured", "where is the library API", "what does the library expose", "library vs CLI", "import agentrack".

## Mental Model

Per the project's CLAUDE.md, agentrack has three sides that share the same codebase:

1. **Agentrack CLI tool** (`agt` command, installed via NPM) — the user-facing CLI.
2. **Agentrack TypeScript library** — this agent's domain. Reuses the CLI's library code to expose a programmatic TypeScript API, so anyone can `import` agentrack and call its methods directly instead of shelling out to the CLI.
3. **Webapp** — a separate UI built on top of the library/CLI.

This means library API functions and CLI commands are typically backed by the same underlying implementation; adding a capability to the library usually makes it available to the CLI and webapp too.

### Known API entry points (partial — to be expanded)

From session work so far, the library exposes at least these author/user-related functions:

- `usersRegenerate(name, ...)` — regenerate a user/author token. Currently does NOT expose a `token` override option (see [users-regenerate-token-override.expertise.md](users-regenerate-token-override.expertise.md)).
- `resolveAuthor({ token, ... })` — resolves an author, and already supports an `options.token` field for token override / open-auth scenarios.

## Related Topics

- [users-regenerate-token-override.expertise.md](users-regenerate-token-override.expertise.md): the in-flight feature that connects these two functions.

## Timeline

- 2026-06-14: Expertise bootstrapped from a session that only reached the context-gathering stage (issue was blocked). The API entry points above come from that investigation; the broader library structure (package layout, build/test commands, full API surface) still needs to be filled in once implementation work happens.

## Gaps And Validation Needs

- **Library source location unknown.** The bootstrap session never read library source files (the task was blocked before implementation). The next time this agent does implementation work, it should record: the package directory for the library, its build/typecheck/test commands, and the source file(s) that define `usersRegenerate` and `resolveAuthor`.
- **No build/test recipe captured yet.** Sibling agents (e.g. webapp-developer) have build/test commands documented; the library equivalent is not yet known from expertise.
