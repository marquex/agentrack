# Library gotchas

## When To Use This

Before editing library source or running library commands: "typecheck fails on optional field", "exactOptionalPropertyTypes", "token: undefined error", "no access to packages/cli", "sandbox /dev/null error", "can't read CLI source".

## Mental Model

Two reusable traps came up during real library work. Check both before editing `packages/library`.

### Gotcha 1: `exactOptionalPropertyTypes` is enabled

The library's `tsconfig` has `exactOptionalPropertyTypes` on. You **cannot** pass an optional field whose value is `undefined` into a parameter type that declares the field as `token?: string`. The TS compiler rejects `token: params?.token` (which may be `undefined`) when forwarding into `resolveAuthor({ token?: string })`.

**Symptom:** `error TS2379: Argument of type '{ ... token: string | undefined }' is not assignable to parameter of type '...'`

**Fix — conditional spread:** only include the key when the value is actually present:

```ts
const authResult = resolveAuthor({
  config,
  users,
  requiresWrite: true,
  ...(params?.token !== undefined ? { token: params.token } : {}),
});
```

Reach for this pattern whenever you forward a newly-added optional `params` field into another function's options object. Adding the field directly (`token: params?.token`) will fail typecheck.

### Gotcha 2: Access scope — library only, not the separate CLI package

The library-developer agent is scoped to **`packages/library/src` only**. Trying to read/grep outside it fails:

- `packages/cli/src` → `agent 'library-developer' has no access rule covering 'packages/cli/src'`.
- Note there IS a CLI inside `packages/library/src/cli/` (e.g. `cli/commands/users.ts`, `cli/runner.ts`) — that one is accessible and is the one wired to library methods.

If a task seems to require the separate `packages/cli` package, surface it as a blocker / new issue rather than trying to reach that code.

### Gotcha 3: Sandbox rejects `/dev/null` redirects

Shell redirects like `2>/dev/null` fail with `agent 'library-developer' may not access path outside project: /dev/null`. Avoid `/dev/null` in commands; drop stderr into a pipe or omit the redirect.

## Related Topics

- [library-overview.expertise.md](library-overview.expertise.md): package layout and build commands these gotchas apply to.
- [users-regenerate-token-override.expertise.md](users-regenerate-token-override.expertise.md): where Gotcha 1 was hit.

## Timeline

- 2026-06-16: All three gotchas observed during the `usersRegenerate` token-override implementation. Gotcha 1 caused a typecheck failure that was fixed with the conditional-spread pattern.

## Gaps And Validation Needs

- The `exactOptionalPropertyTypes` setting and the access scope come from this single session's observations; re-confirm against `packages/library/tsconfig.json` and the agent's access rules if either appears to have changed.
