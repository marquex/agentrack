# usersRegenerate token override

## When To Use This

"usersRegenerate", "regenerate token", "token override", "add token option to usersRegenerate", "resolveAuthor token", "regenerate returns 401", "open auth mode regenerate", "BUG-1".

## Mental Model

There is an agreed-but-not-yet-implemented design to add a `token` override option to the library's `usersRegenerate` function. The design was decided in the CTO review and is ready to implement once the verification blocker clears.

### The problem

`usersRegenerate(name)` regenerates a user/author token but does NOT accept a token override. The underlying `resolveAuthor({ token })` already supports an `options.token` field for open-auth scenarios, but `usersRegenerate` never forwards it through. This is the root cause of **BUG-1**: regenerating a token returns **401 in open-auth mode** because the server does not receive/forward the user token. (BUG-1 is documented from the webapp side in `webapp-users-and-sync.expertise.md`.)

### The agreed design

From CTO review issue `mqe1imi4lg` ("Review idea: regenerate token returns 401 in open auth mode"), which is `done` with a triage decision of **ACCEPT** (comment `mqe1sgum9m`):

- Add a **backward-compatible** `usersRegenerate(name, { token })` signature.
- Forward the `token` into the existing `resolveAuthor({ token })` call, which already handles `options.token`.
- No alternative design was requested. The change is additive and backward-compatible.

### Issue chain

- `mqe26nou8f` — parent: "Library: Add token override to usersRegenerate"
- `mqe2745ekb` — implementation task: "Implement: usersRegenerate token override" (status `todo`, was blocked)
- `mqe274wi48` — blocker: "Verify design agreed" (sync task for project-manager; what's blocking implementation)
- `mqe1imi4lg` — CTO review (done, ACCEPT) where the design above was decided

## Related Topics

- [library-overview.expertise.md](library-overview.expertise.md): where `usersRegenerate` and `resolveAuthor` sit in the library API.

## Timeline

- 2026-06-14: Implementation task `mqe2745ekb` was picked up but was **actively blocked** by `mqe274wi48`. The agent investigated the full context chain and confirmed the design is already agreed via the ACCEPT decision, then followed the blockage rule: commented with the context and reassigned to project-manager. **No code was written.** Status remains `todo`. The next pickup should be able to implement the agreed design directly once unblocked.

## Gaps And Validation Needs

- **Source files not yet identified.** The implementation session never reached the code, so the exact source file(s) defining `usersRegenerate` and `resolveAuthor` are not recorded. Verify and fill in when implementation begins.
- **Test coverage plan not yet known.** Confirm whether there is an existing test for `usersRegenerate` / open-auth regenerate behavior that must be updated, and whether fixing BUG-1 on the library side flips any webapp e2e assertion — the webapp Phase 4 suite currently asserts the 401 behavior (see `webapp-users-and-sync.expertise.md` BUG-1).
