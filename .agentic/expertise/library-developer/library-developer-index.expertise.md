# Library Developer — Expertise Index

Agent: library-developer
Domain: Building and maintaining the Agentrack TypeScript library — the programmatic API exposed alongside the CLI, so other code can import agentrack and call its methods directly.

## Routing topics

Read every file related to the task at hand.

### Library overview and API surface
- File: [library-overview.expertise.md](library-overview.expertise.md)
- Prompts: "how is the library structured", "where is the library API", "what does the library expose", "library vs CLI", "import agentrack"
- Covers: High-level shape of the TypeScript library, its relationship to the CLI, and known API entry points. Many internal details still need filling in from implementation work.

### usersRegenerate token override
- File: [users-regenerate-token-override.expertise.md](users-regenerate-token-override.expertise.md)
- Prompts: "usersRegenerate", "regenerate token", "token override", "add token option to usersRegenerate", "resolveAuthor token", "regenerate returns 401", "open auth mode", "BUG-1"
- Covers: The `token` option on `usersRegenerate` (now implemented) that forwards into `resolveAuthor`, fixing the open-auth 401 bug. Source files, issue chain, and remaining test/CLI/webapp follow-ups.

### Library gotchas (TS strictness, access scope)
- File: [library-gotchas.expertise.md](library-gotchas.expertise.md)
- Prompts: "exactOptionalPropertyTypes", "TS2379 optional field", "token undefined typecheck", "no access to packages/cli", "sandbox /dev/null"
- Covers: Reusable traps — the `exactOptionalPropertyTypes` conditional-spread pattern for forwarding optional params, library-developer's access scope (only `packages/library/src`), and the `/dev/null` sandbox rejection.

### Work timeline
- File: [timeline.expertise.md](timeline.expertise.md)
- Prompts: "what has library-developer worked on", "history"
- Covers: Changelog of completed work and lessons learned.
