# Resolution And Directory Discovery

## When To Use This

Tasks involving how the tracker directory is found, resolveTrackerDir, walk-up discovery, or the pointer file mechanism. "Change how dirs are discovered", "find the tracker", "resolution walk-up".

## Mental Model

`resolveTrackerDir()` walks up from `cwd`, checking each directory level for a `.agentrack.json` pointer file. The pointer file contains the directory name (not hardcoded `.agentrack`).

**Resolution flow**:
1. Start at cwd
2. At each level, check for `.agentrack.json` pointer file
3. If found, read the dir name from the pointer, confirm the directory exists
4. If not found, move up one directory level
5. Fallback: `.agentrack/` in cwd if no pointer found anywhere

The Tracker constructor uses this resolved directory. Most Tracker methods (18+) call resolveTrackerDir internally.

## Code Map

- `src/core/resolution.ts` — resolveTrackerDir, uses readBranchPointer()
- `src/core/branch-config.ts` — readBranchPointer, resolveWorktreeOptions
- `src/core/tracker.ts` — constructor and methods use resolved dir
- `tests/core/resolution.test.ts` — resolution unit tests

## Related Topics

- [branch-config.expertise.md](branch-config.expertise.md): pointer file format and writing
- [git-worktree.expertise.md](git-worktree.expertise.md): how the pointer file is created during init

## Business Rules And Invariants

- The pointer file at repo root breaks circular discovery (you don't need to know the dir to find the dir)
- Fallback to `.agentrack/` when no pointer file exists
- Custom branch names always create a pointer file at the repo root
