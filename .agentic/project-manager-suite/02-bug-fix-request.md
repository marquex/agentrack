# Story 02: Bug Fix Request — Full Lifecycle

## Loop
Work Loop

## Description
A bug is reported and needs to go through a 4-phase lifecycle adapted for bugs: **Reproduce → Develop → Validate → Release**. Unlike features (which start with architectural planning), bugs start with the validator reproducing the issue and providing technical diagnosis, which then guides the developer's fix.

## Initial Conditions

- **Work queue:** Empty
- **Input:** A bug report: "CLI crashes when listing issues with no arguments"
- **agentrack state:** No existing issues related to this bug

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives the bug report.
2. The PM creates the issue hierarchy for the bug fix.
3. The first step is **reproduction** — the validator reproduces the bug and provides a technical diagnosis.
4. The developer then implements the fix guided by the validator's findings.
5. The validator verifies the fix with regression tests.
6. The releaser publishes.
7. From step 3 onward, **worker agents drive all status transitions** — the PM does NOT touch child issue statuses.

## Expected Output

### What the PM creates (initial state)

```
Bug: "Fix CLI crash when listing issues with no arguments" (tag: bug, assigned: project-manager, status: in-progress)
├── Task: "Reproduce and diagnose CLI crash with no arguments" (tag: task, assigned: library-validator, status: todo, phase: reproduction)
├── Task: "Implement fix for CLI crash" (tag: task, assigned: library-developer, status: todo, phase: development)
│   └── Blocked by Task 1
├── Task: "Validate CLI crash fix" (tag: task, assigned: library-validator, status: todo, phase: validation)
│   └── Blocked by Task 2
├── Task: "Release CLI crash fix" (tag: task, assigned: library-releaser, status: todo, phase: release)
│   └── Blocked by Task 3
└── Task: "Verify bug fix complete" (tag: task,sync, assigned: project-manager, status: todo)
    └── Blocked by Task 4
```

### What happens after — status transitions (driven by worker agents)

```
PM sets parent → in-progress (after creating all children)
       │
       ▼
Step 1: Work loop wakes library-validator (Child 1 is todo, unblocked)
  → Validator sets Child 1: todo → in-progress
  → Validator reproduces the crash, analyzes the code, finds root cause
  → Validator sets Child 1: in-progress → done
  → Validator adds comment: "Reproduced. Root cause: argument parser
     accesses argv[0] without checking length when no args passed.
     Failing path: src/cli/list.ts:42. Edge cases: also fails with
     --format flag but no other args."
  → System auto-resolves blockage on Child 2

Step 2: Work loop wakes library-developer (Child 2 is todo, now unblocked)
  → Developer sets Child 2: todo → in-progress
  → Developer reads validator's diagnosis, implements the fix
  → Developer sets Child 2: in-progress → done
  → Developer adds comment: "Fixed. Added length check before accessing
     argv[0]. Existing tests pass."
  → System auto-resolves blockage on Child 3

Step 3: Work loop wakes library-validator (Child 3 is todo, now unblocked)
  → Validator sets Child 3: todo → in-progress
  → Validator writes regression tests, verifies fix against original reproduction steps
  → Validator sets Child 3: in-progress → done
  → Validator adds comment: "Regression tests added. Fix verified. All tests pass."
  → System auto-resolves blockage on Child 4

Step 4: Work loop wakes library-releaser (Child 4 is todo, now unblocked)
  → Releaser sets Child 4: todo → in-progress
  → Releaser runs full test suite, builds, publishes
  → Releaser sets Child 4: in-progress → done
  → Releaser adds comment: "Released as v2.3.1. Patch fix for CLI crash."
  → System auto-resolves blockage on Child 5 (sync tracker)

Step 5: Work loop wakes project-manager (Child 5 is todo, now unblocked)
  → PM verifies all children are done
  → PM sets Child 5 (sync tracker): todo → done
  → PM sets parent: in-progress → done
```

**Assignment rationale:**
- **Reproduction → `library-validator`** (not developer): The validator is the quality expert — they reproduce bugs methodically, analyze the code to find root causes, and report precise technical details (stack trace, failing code path, edge cases). This gives the developer a clear diagnosis to work from instead of guessing. The validator's reproduction comment should include: steps to reproduce, root cause analysis, affected code paths, and relevant code snippets.
- **Development → `library-developer`**: With the validator's diagnosis in hand, the developer knows exactly what to fix. No architect needed — the scope is defined by the reproduction report. The developer implements the fix and verifies existing tests pass.
- **Validation → `library-validator`**: The same validator who reproduced the bug now writes regression tests to ensure the crash doesn't reappear. They verify the fix against their original reproduction steps.
- **Release → `library-releaser`**: Standard release flow — run full test suite, build, publish.

**Key behaviors:**
- Bug fixes start with **reproduction by the validator**, not planning by the developer
- The validator provides a technical diagnosis that serves as the "spec" for the developer's fix
- The developer doesn't need to guess at the root cause — the validator has already found it
- The validator is involved twice: first to reproduce/diagnose, then to validate the fix
- This is the key difference from features: features start with architectural planning (architect), bugs start with reproduction/diagnosis (validator)
- **PM does NOT change child issue statuses** — worker agents drive all transitions (`todo` → `in-progress` → `done`)
- Blockages resolve automatically when an agent marks its issue `done`

## Notes
- If the validator cannot reproduce the bug, it reports back to PM with what was tried — PM may need more information from the reporter
- If the validator's diagnosis reveals the bug is actually a design flaw (not a code bug), the PM may need to escalate to the architect and create a proper feature-sized plan
- The reproduction phase replaces the planning phase for bugs — the validator's diagnosis IS the plan
