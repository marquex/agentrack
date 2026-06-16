# Library validator — Expertise Index

Agent: library-validator
Domain: Validating changes to the Agentrack TypeScript library (`packages/library/`) — verifying that implementation tasks landed correctly, tests pass, backward compatibility is preserved, and the change behaves as designed.

## Routing topics

Read every file related to the task at hand.

### Library validation workflow
- File: [library-validation-workflow.expertise.md](library-validation-workflow.expertise.md)
- Prompts: "validate library change", "how do validation tasks work", "blocked by implementation", "what to check when validating", "usersRegenerate", "resolveAuthor", "token override", "auth", "did you create test data in .agentrack", "inspect dogfood tracker", "agt list", "agt users list", "test pollution in .agentrack"
- Covers: The validation-task lifecycle (child of a library change, blocked by the implementation sibling), the blocked workflow, what to verify in code and tests, the auth/user model the library exposes, and how to inspect the real dogfood `.agentrack/` tracker via the `agt` CLI (access restrictions and CLI gotchas).

### Work timeline
- File: [timeline.expertise.md](timeline.expertise.md)
- Prompts: "what has library-validator worked on", "history"
- Covers: Changelog of completed work and lessons learned.
