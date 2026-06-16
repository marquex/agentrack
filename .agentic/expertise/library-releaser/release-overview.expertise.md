# Release Overview & Role

## When To Use This

- Any release task: "release X", "cut a release for <change>", "publish the library", "bump the version for <feature>"
- Questions about what the library-releaser is responsible for, or who assigns/receives its work
- A release issue that appears to be blocked by a validation issue

## Mental Model

The library-releaser cuts and publishes releases of the Agentrack package (the `agt` CLI installable via NPM, which also exposes a TypeScript library API). It does **not** implement features — it takes already-completed, already-validated changes and ships them.

### The publishable package (concrete facts as of 2026-06-16)

- Location: `packages/library/` (the repo is an npm workspace root with `workspaces: ["packages/*"]`; sibling is `packages/webapp`).
- npm package name: `agentrack`. **Not yet on the npm registry** as of v0.3.0 (npm returns 404 for `agentrack`); publication depends on the `NPM_TOKEN` GitHub secret being configured.
- Build tool: **`tsup`** via `bun run build`; output in `packages/library/dist/` (ESM + CJS + `.d.ts` + CLI binary).
- Quality gate: `bun run quality` (= `typecheck` + `lint` + `test:coverage`), run from `packages/library`. Also re-run by the `prepublishOnly` hook.
- Version: last released `0.3.0` (see [release-recipe](release-recipe.expertise.md)). Re-read `packages/library/package.json` before bumping — concurrent agents leave uncommitted bumps in the working tree (HEAD lagged the working tree during the v0.3.0 release).

### Release flow — VERIFIED end-to-end as of 2026-06-16 (v0.3.0)

The 5-step flow is now confirmed and captured with concrete commands in [release-recipe.expertise.md](release-recipe.expertise.md):

1. **Test** — `bun run quality` from `packages/library`.
2. **Docs** — update `README.md` + `docs/markdown/cli-reference.md` + `docs/markdown/javascript-reference.md`.
3. **Build** — `bun run build` (tsup); verify dist symbols.
4. **Version bump** — manual edit of `packages/library/package.json` (no `npm version`, no release script).
5. **Publish** — **NOT local `npm publish`.** Commit on a `release/v<version>` branch, tag `v<version>`, push branch + tag; the `release.yml` GitHub Actions workflow does quality → build → `npm publish --access public` using `secrets.NPM_TOKEN`.

Key correction vs. earlier hypothesis: the publish mechanism is **git-tag-driven CI**, never a direct `npm publish` (no npm auth exists on the dev machine).

### The validation gate (structural pattern)

Every observed release issue is paired with a **validation issue** that blocks it. The release must **not** be cut until the validation issue is resolved (`done`).

- Blocked (do not proceed): when the validation issue is still `todo`/`in-progress`, comment and reassign to project-manager — do not modify code, version numbers, or run build/publish. Seen on 2026-06-14: release `mqe27481sa` blocked by `mqe274mwm3`.
- Cleared (proceed): when the validation issue is `done` (or resolved), verify it, mark the release issue `in-progress`, and begin the release flow. Seen on 2026-06-16 (release `mqe2xmprgj` unblocked by `mqe2xmdugp`) and again on 2026-06-16 (release `mqgxdt6csi` unblocked once its blocker `mqgxdtkaca` was resolved). Read the blocker's comments — the validator's "Done." comment there carries the pass/fail counts and is the green-light signal.

### Reporting line

- Work is assigned by the **project-manager**.
- On completion, success, or blockage, reassign the issue **back to project-manager**. The manager reviews/closes; the library-releaser never closes issues itself.

## Related Topics

- [release-recipe.expertise.md](release-recipe.expertise.md) — the verified end-to-end release recipe (commands, files, sandbox gotchas).
- [timeline.expertise.md](timeline.expertise.md) — what this agent has actually worked on.

## Timeline

- 2026-06-14 — First session: release issue was blocked by an unresolved validation issue; reassigned to project-manager without shipping. See [timeline.expertise.md](timeline.expertise.md).
- 2026-06-16 — Second session: validation gate cleared (blocker `done`), agent proceeded and started the test suite, but the session was interrupted before any build/version/publish.
- 2026-06-16 — Third session (`mqgxdt6csi`, "Release: agt events namespace"): **first fully completed release.** Cut v0.3.0 — tests/docs/build/version-bump all run, publish triggered via `v0.3.0` tag push → `release.yml`. Flow is now verified; see [release-recipe.expertise.md](release-recipe.expertise.md).

## Gaps And Validation Needs

- **NPM publication not yet observed succeeding.** The publish runs in GitHub Actions via `NPM_TOKEN`; the agent cannot observe the run locally (no `gh`, no API token). The package was not on the registry yet, and the `NPM_TOKEN` secret may still need one-time manual setup per the publish-pipeline spec. Confirm on the next release whether `agentrack` actually appears on npm.
- **Patch-version bump is unverified.** v0.3.0 was a minor bump (new namespace + CLI break). No fix-only release has been cut yet — confirm the patch convention when one occurs.
