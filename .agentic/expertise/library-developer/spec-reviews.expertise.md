# Spec Reviews And Decisions

## When To Use This

Understanding past spec review findings, design decisions, rejected alternatives, or implementation notes for features that were reviewed. "What was decided about X", "spec review for Y", "configurable branch findings", "next todo-only decision".

## Mental Model

Multiple specs have been reviewed with detailed findings documented. These reviews capture critical issues, design decisions, and implementation notes that inform future work.

### Reviews Completed

#### next-todo-only (REVIEWED, not implemented)
Proposed restricting Tracker.next() to only consider `todo` status (removing `idea` and `in-progress`).
- **Core change**: 1 line in status filter array + 1 line in NO_ISSUES_AVAILABLE message
- **~11 tests break** because they create issues without status (defaults to `idea`)
- **Message should say** "No unblocked todo issues found" to capture both status AND blockage dimensions
- **Behavioral breaking change** for users relying on next to surface idea/in-progress items
- Default create status is `idea` — newly-created issues won't appear in next until moved to `todo`

#### cap-upward-promotion (REVIEWED, not implemented)
Proposed capping upward auto-promotion at `in-progress` so parents are never auto-promoted to done/closed.
- **Core change**: computeUpwardPromotions in hierarchy.ts (~5 lines)
- **Reparenting code path also affected** (same function used) — not in original spec
- When parent already at in-progress and child goes to done, NO promotion event emitted (capped status equals current)
- 7 tests need updating across hierarchy.test.ts and tracker-hierarchy test files
- Risk is low

#### independent-git (REVIEWED)
Proposed storing data on orphan branch with git worktree, agt init/push/pull commands.
- **CRITICAL**: Git plumbing initial files have WRONG data formats (config has version field, index uses issues[] instead of open/closed, deps uses different key names)
- **CRITICAL**: Tracker.init() ordering bug — spec mounts worktree then calls init(), but init() has existsSync check returning ALREADY_INITIALIZED
- **CRITICAL**: Wrong file paths in spec (src/errors.ts → actual src/core/errors.ts, src/runner.ts → actual src/cli/runner.ts)
- .gitignore auto-commit on user's branch is surprising
- Missing exit codes for 5 new error codes
- Race condition in concurrent init
- Architecture is sound — worktree isolation is the right approach

#### user-docs (REVIEWED)
Proposed replacing TypeDoc with hand-written docs in docs/markdown/ (8 files).
- **CRITICAL**: JavaScript API section has ALL method names wrong — spec uses verb-first (addComment) but actual Tracker uses domain-first (commentsAdd). 12 methods affected.
- **CRITICAL**: create() signature wrong — spec says create(title, options?) but actual is create(params: CreateParams)
- **CRITICAL**: push()/pull() are NOT Tracker methods — they are standalone worktree functions
- Type names wrong: CreateIssueOptions→CreateParams, etc.
- Structural plan is sound; auth, issue-object, hierarchy sections are accurate

#### configurable-branch (REVIEWED + IMPLEMENTED)
Adds --branch flag to agt init for configurable orphan branch names.
- **CRITICAL (resolved)**: Circular config discovery — solved with pointer file at repo root
- **CRITICAL (resolved)**: Three hardcoded locations, not just worktree.ts — tracker.ts AGENTACK_DIR constant and resolution.ts constant both fixed
- Slash rejection in branch names added with dedicated error
- Normalization regex had risk of nested dirs (.feature/foo/) — slash rejection solves this
- Implementation complete: branch-config.ts, worktree parameterization, resolution pointer-file, all 649 tests pass

## Related Topics

- [next-recommendation.expertise.md](next-recommendation.expertise.md): next-todo-only would change behavior here
- [hierarchy-status.expertise.md](hierarchy-status.expertise.md): cap-upward-promotion would change behavior here
- [git-worktree.expertise.md](git-worktree.expertise.md): independent-git and configurable-branch are directly related
- [branch-config.expertise.md](branch-config.expertise.md): configurable-branch implementation details

## Timeline

- configurable-branch: reviewed, then fully implemented with pointer-file mechanism
- next-todo-only: reviewed, NOT implemented
- cap-upward-promotion: reviewed, NOT implemented
- independent-git: reviewed, partially implemented (worktree exists, spec data format issues unresolved)
- user-docs: reviewed, NOT implemented (method name mismatches in spec)
