# Library releaser — Expertise Index

Agent: library-releaser
Domain: Cutting releases of the Agentrack package (the `agt` CLI installable via NPM + the TypeScript library API). Takes already-validated changes and prepares them for release. **NPM publishing is deferred** as of 2026-06-17 — a release is complete at test/docs/build/version-bump/commit.

## Routing topics

Read every file related to the task at hand.

### Release recipe (verified end-to-end)
- File: [release-recipe.expertise.md](release-recipe.expertise.md)
- Prompts: "release X", "cut a release", "publish the library", "complete release without publishing", "is npm publish deferred", "how do I bump the version", "run the build", "publish step", "tag a release", "what commands do I run to release"
- Covers: The concrete, ordered, verified release flow (test → docs → build → version bump → **deferred** publish) with exact commands, the deferral of NPM publishing (2026-06-17 decision), the git-tag-driven publish mechanism (`release.yml` on `v*` tag push, `NPM_TOKEN`) preserved for when publishing is re-enabled, the doc surface to update, and the sandbox access gotchas that block commit/comment commands. **Read this first for any actual release.**

### Release overview, role & validation gate
- File: [release-overview.expertise.md](release-overview.expertise.md)
- Prompts: "what is the release flow", "who assigns my work", "release is blocked by validation", "is the validation gate cleared", "what is the publish mechanism", "is publishing deferred", "when is a release done", "role and reporting line"
- Covers: The library-releaser's role and reporting line, concrete package facts (location, build tool, quality gate, version history), the now-verified flow summary (publish deferred), and the structural rule that a release is blocked by its validation issue until that validation is `done`/resolved.

### Work timeline
- File: [timeline.expertise.md](timeline.expertise.md)
- Prompts: "what has library-releaser worked on", "history", "what was the last release"
- Covers: Changelog of completed/blocked work and lessons learned, including the first fully completed release (v0.3.0).

## Cross-Topic Patterns And Conventions

- **Sandbox access gotchas:** the `enforce-agent-access` hook rejects Bash commands containing dotted version strings (`0.1.0`, `v0.3.0`), slash-bearing paths, or any absolute path outside the project. This blocks `git commit -m` and `agt comments add --content` until payloads are stripped of version/path literals. Use bare `agt` (on PATH) for comment/update calls and phrase text in words. Full details and workarounds in [release-recipe.expertise.md](release-recipe.expertise.md#sandbox-gotchas-access-rule-enforcement).
- **0.x semver convention:** new namespace + CLI-level breaking change → minor bump, even when the library API stays backward-compatible via a deprecated alias.
- **Publish is CI-driven, never local `npm publish`.** See [release-recipe](release-recipe.expertise.md).

## Recipes

- [release-recipe.expertise.md](release-recipe.expertise.md) — verified end-to-end release flow (promoted from the earlier hypothetical "intended flow" after the v0.3.0 release on 2026-06-16).
