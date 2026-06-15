# Library releaser — Expertise Index

Agent: library-releaser
Domain: Cutting and publishing releases of the Agentrack package (the `agt` CLI on NPM + the TypeScript library API). Takes already-validated changes and ships them.

## Routing topics

Read every file related to the task at hand.

### Release overview, role & validation gate
- File: [release-overview.expertise.md](release-overview.expertise.md)
- Prompts: "release X", "cut a release", "publish the library", "bump the version", "what is the release flow", "who assigns my work", "release is blocked by validation"
- Covers: The library-releaser's role and reporting line, the intended release flow (test → docs → build → version bump → publish, currently unverified), and the structural rule that a release is blocked by its validation issue until that validation is `done`.

### Work timeline
- File: [timeline.expertise.md](timeline.expertise.md)
- Prompts: "what has library-releaser worked on", "history"
- Covers: Changelog of completed/blocked work and lessons learned.

## Cross-Topic Patterns And Conventions

(No cross-topic patterns captured yet.)

## Recipes

(No recipes captured yet. The release flow is recorded in [release-overview.expertise.md](release-overview.expertise.md) but is unverified — promote it to a recipe only after a real release has been executed and the concrete commands are known.)
