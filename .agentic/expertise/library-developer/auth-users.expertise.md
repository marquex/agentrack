# Auth And Users

## When To Use This

Tasks involving user management, authentication modes, token validation, AGT_USER_TOKEN env var, or changing auth behavior. "Register user", "revoke token", "change auth mode", "who can do what".

## Mental Model

Three auth modes determine access control:
- **open** — no auth required for any operation
- **read-only** — reads don't require auth, writes require a valid token
- **strict** — all operations require a valid token

Token system:
- Tokens are `tk_` + 8 random alphanumeric chars
- Stored in `users.json` alongside user entries
- Read from `AGT_USER_TOKEN` environment variable at runtime
- `resolveAuthor()` checks token → mode → defaultUser fallback

User operations:
- **Register** — bootstrap (no auth required), creates UserEntry with name (lowercase), token, registeredAt
- **List** — requires read auth, returns UserInfo (name + registeredAt, no token)
- **Revoke** — requires write auth, removes user
- **Regenerate** — self-service only (caller must be the target user), generates new token

## Code Map

- `src/core/auth.ts` — resolveAuthor, token validation, mode checking
- `src/core/tracker.ts` — usersRegister, usersList, usersRevoke, usersRegenerate methods
- `src/types/user.ts` — UserEntry, UserInfo types
- `src/types/config.ts` — config structure with auth mode
- `tests/core/auth.test.ts` — auth unit tests
- `tests/core/tracker/tracker-auth.test.ts` — tracker auth integration
- `tests/core/tracker/tracker-users.test.ts` — user management tests
- `tests/e2e/auth.test.ts`, `tests/e2e/users.test.ts` — e2e tests

## Related Topics

- [issue-crud-events.expertise.md](issue-crud-events.expertise.md): resolveAuthor used in create/update events

## Business Rules And Invariants

- User names are always stored lowercase
- Token regeneration is self-service only — cannot regenerate another user's token
- UsersRegisterResult, UsersRevokeResult, UsersRegenerateResult use discriminated unions with `result` field
- Tokens never appear in list output (stripped to UserInfo)
