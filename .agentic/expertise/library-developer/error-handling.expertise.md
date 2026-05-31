# Error Handling

## When To Use This

Tasks involving error codes, exit codes, AgentrackError, error messages, or changing error behavior. "Add a new error", "change exit code", "error message format", "AgentrackError class".

## Mental Model

Errors use the `AgentrackError` class which extends `Error` with `result`, `message`, and `exitCode` fields.

**ErrorCodes** is a const object mapping error names to `{result, exitCode}`. Currently 15 error codes defined, with exit codes 0–19.

**CLI output convention**:
- Success → JSON to stdout, exit 0
- Error → JSON to stderr, exit from error code

**Message formatting**:
- IDs are wrapped in backticks (e.g., `abc123`)
- Hierarchy error messages end with a period

**InitResult special case**: ALREADY_INITIALIZED is a valid return (not an error), exit code 0.

## Code Map

- `src/core/errors.ts` — AgentrackError class, ErrorCodes const
- `src/cli/output.ts` — CLI output formatting
- All Tracker methods and CLI commands — error handling and propagation

## Related Topics

- [patterns/api-result-shape.expertise.md](patterns/api-result-shape.expertise.md): how errors appear in API result types

## Business Rules And Invariants

- ErrorCodes currently uses exit codes 0–19 (INVALID_BRANCH_NAME = 18, BRANCH_CONFLICT = 19)
- New error codes should follow the pattern in ErrorCodes const
- All public methods return `T | AgentrackError` in their result type
