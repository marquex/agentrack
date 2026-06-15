# Release Overview & Role

## When To Use This

- Any release task: "release X", "cut a release for <change>", "publish the library", "bump the version for <feature>"
- Questions about what the library-releaser is responsible for, or who assigns/receives its work
- A release issue that appears to be blocked by a validation issue

## Mental Model

The library-releaser cuts and publishes releases of the Agentrack package (the `agt` CLI installable via NPM, which also exposes a TypeScript library API). It does **not** implement features — it takes already-completed, already-validated changes and ships them.

### Intended release flow

The agent's stated flow for an unblocked release (not yet executed end-to-end in a captured session — **verify on the first real release**):

1. Run the **test suite** (confirm green).
2. Update **docs** if the change warrants it.
3. **Build** the package.
4. **Version bump** (the exact mechanism — npm version, manual `package.json` edit, or a release script — is not yet confirmed from this agent's work; verify in the repo before bumping).
5. **Publish** to NPM.

Treat the above as a hypothesis. The first time an actual release runs, record the concrete commands and files touched here and promote it to a dedicated recipe.

### The validation gate (structural pattern)

Every observed release issue is paired with a **validation issue** that blocks it. The release must **not** be cut until the validation issue is resolved (`done`).

- Example: release `mqe27481sa` ("Release: library token override") is blocked by `mqe274mwm3` ("Validate: usersRegenerate token override").
- When the validation issue is still `todo`/`in-progress`, the correct action is to **comment and reassign to project-manager** — do not proceed, and do not modify code, version numbers, or run build/publish.

### Reporting line

- Work is assigned by the **project-manager**.
- On completion, success, or blockage, reassign the issue **back to project-manager**. The manager reviews/closes; the library-releaser never closes issues itself.

## Related Topics

- [timeline.expertise.md](timeline.expertise.md) — what this agent has actually worked on.

## Timeline

- 2026-06-14 — First session: release issue was blocked by an unresolved validation issue; reassigned to project-manager without shipping. See [timeline.expertise.md](timeline.expertise.md).

## Gaps And Validation Needs

- **Release flow is unverified.** The five-step flow above is the agent's stated intent, not a confirmed, executed procedure. On the first real release, capture the exact commands (test runner, build command, version-bump mechanism, publish command) and the files involved, then extract a `release-recipe` topic.
- **Version-bump mechanism unknown.** Confirm whether the repo uses `npm version`, a release script, or a manual `package.json` edit before bumping.
- **NPM publish credentials / 2FA flow** are not documented here — the first publish will reveal the actual mechanism.
