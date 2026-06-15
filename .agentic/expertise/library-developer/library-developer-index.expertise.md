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
- Covers: The agreed (not-yet-implemented) design for adding a `token` option to `usersRegenerate` that forwards into `resolveAuthor`, and its link to the open-auth 401 bug.

### Work timeline
- File: [timeline.expertise.md](timeline.expertise.md)
- Prompts: "what has library-developer worked on", "history"
- Covers: Changelog of completed work and lessons learned.
