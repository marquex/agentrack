# Testing Patterns

## When To Use This

Tasks involving writing tests, understanding test structure, test helpers, test isolation, or test coverage. "Write a test for X", "test helper", "test structure", "e2e test", "mock pattern".

## Mental Model

Tests use `bun:test` (describe/test/expect pattern). The test suite has ~649 tests across ~30 files.

**Test organization**:
```
tests/
├── helpers/          # Shared test utilities
│   ├── setup.ts      # createTestDir() for isolation with cleanup
│   ├── fixtures.ts   # test data fixtures
│   └── assertions.ts # custom assertion helpers
├── core/             # Unit tests
│   ├── auth.test.ts, file-io.test.ts, id.test.ts, etc.
│   ├── events/       # Event tests split by function
│   │   ├── append-event.test.ts
│   │   ├── compute-comments.test.ts
│   │   ├── compute-state.test.ts
│   │   └── replay-events.test.ts
│   ├── tracker/      # Tracker tests split by domain
│   │   ├── tracker-auth.test.ts
│   │   ├── tracker-blockages.test.ts
│   │   ├── tracker-comments.test.ts
│   │   ├── tracker-crud.test.ts
│   │   ├── tracker-delete.test.ts
│   │   ├── tracker-errors.test.ts
│   │   ├── tracker-hierarchy.test.ts
│   │   ├── tracker-init.test.ts
│   │   ├── tracker-mentions.test.ts
│   │   ├── tracker-next.test.ts
│   │   └── tracker-users.test.ts
│   └── *.test.ts     # Other core unit tests
├── cli/
│   ├── commands.test.ts           # CLI integration tests
│   └── commands/cli-test-helper.ts # CLI subprocess helper
├── integration/
│   ├── edge-cases.test.ts  # Empty tracker, corrupt JSON, missing files, large volume
│   └── package.test.ts     # package.json fields, CLI --help/--version
└── e2e/                    # End-to-end per-command tests
    ├── setup.ts
    └── *.test.ts           # One file per command
```

**Key patterns**:
- `createTestDir()` from `tests/helpers/setup.ts` — creates isolated temp directory with automatic cleanup
- CLI tests use `Bun.spawn` to run bin.ts as subprocess, check stdout/stderr/exitCode
- ID tests verify length (10), format (base36), and uniqueness (100 samples)
- Edge-case tests cover: empty tracker ops, invalid JSON corruption, missing files, large event volume (100+ updates, 50+ comments), self-referencing/no-op

**Runner**: `bun test` for all tests, `bun run quality` for typecheck + lint + coverage.

## Code Map

- `tests/helpers/setup.ts` — createTestDir isolation
- `tests/helpers/fixtures.ts` — test data
- `tests/helpers/assertions.ts` — custom assertions
- `tests/cli/commands/cli-test-helper.ts` — Bun.spawn helper for CLI testing
- `tests/e2e/setup.ts` — e2e test setup

## Related Topics

- [build-package.expertise.md](build-package.expertise.md): test scripts and quality gates

## Business Rules And Invariants

- All tests must pass with `bun test`
- Quality script runs typecheck + lint + coverage in one command
- CLI tests must test subprocess behavior (stdout/stderr/exitCode), not just function calls
