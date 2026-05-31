# API Result Shape Pattern

## When To Use This

Adding or changing public API methods, understanding return types, working with discriminated union results, or changing error types.

## Mental Model

All Tracker methods follow a consistent result pattern:
- **Success**: return the result type (ComputedIssue, array, etc.)
- **Failure**: throw or return `AgentrackError`

**Result type conventions**:
- `InitResult` is special: ALREADY_INITIALIZED is valid return (not error), exit 0
- `UsersRegisterResult`, `UsersRevokeResult`, `UsersRegenerateResult` — discriminated unions with `result` field
- `NextResult` = `ComputedIssue | { result: 'NO_ISSUES_AVAILABLE'; message: string }` — check for `'title'` property to distinguish
- Most methods return `T | AgentrackError` in their type signature

**Type organization**:
- `src/types/api.ts` — API result types and Tracker method signatures
- `src/types/issue.ts` — ComputedIssue, IndexEntry, status types
- `src/types/event.ts` — event types
- `src/types/index-file.ts` — IndexFile structure
- `src/types/dependency.ts` — dependency types
- `src/types/user.ts` — UserEntry, UserInfo
- `src/types/config.ts` — config structure
- `src/types/mention.ts` — mention types
- `src/types/index.ts` — barrel re-exports

All public exports have comprehensive JSDoc with `@param`, `@returns`, `@throws`, `@example` tags.

## Code Map

- `src/types/api.ts` — API result types
- `src/types/index.ts` — barrel exports
- `src/index.ts` — package barrel exports

## Related Topics

- [error-handling.expertise.md](error-handling.expertise.md): AgentrackError and error codes
