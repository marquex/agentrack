# File I/O Atomic Write Pattern

## When To Use This

Understanding or changing how files are written safely. Adding new file write operations. Understanding ID generation.

## Mental Model

All file writes use an atomic write-to-temp-then-rename pattern via `src/core/file-io.ts`. This prevents data corruption from partial writes.

**ID generation**: `Date.now().toString(36).slice(0,6) + Math.random().toString(36).slice(-4)` — always 10 chars, base36 format.

**No Bun-specific APIs**: All file I/O uses `node:fs/promises` for Node.js compatibility. Exception: `readDependenciesSync` in tracker.ts uses `node:fs` `readFileSync` for use inside synchronous sort comparators.

## Code Map

- `src/core/file-io.ts` — atomic write utilities
- `src/core/id.ts` — ID generation

## Related Topics

- [issue-crud-events.expertise.md](issue-crud-events.expertise.md): how file I/O is used in event storage
- [dependencies-blockages.expertise.md](dependencies-blockages.expertise.md): sync read for sort comparators
