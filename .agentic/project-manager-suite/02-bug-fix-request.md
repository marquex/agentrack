# Story 02: Bug Fix Request — Full Lifecycle

## Loop
Work Loop

## Description
A bug is reported and needs to go through a 3-phase lifecycle adapted for frontend bugs: **Reproduce → Develop → Validate**. Unlike features (which start with planning), bugs start with the validator reproducing the issue and providing technical diagnosis with device specifics, which then guides the developer's fix. This bug is purely frontend — no backend involvement needed.

## Initial Conditions

- **Work queue:** Empty
- **Input:** A bug report: "App crashes on orientation change during checkout screen"
- **agentrack state:** No existing issues related to this bug

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives the bug report.
2. The PM creates the issue hierarchy for the bug fix (frontend bug — 3 phases, no release phase).
3. The first step is **reproduction** — the validator reproduces the bug with device specifics and provides a technical diagnosis.
4. The developer then implements the fix guided by the validator's findings.
5. The validator verifies the fix with regression tests across multiple API levels.
6. From step 3 onward, **worker agents drive all status transitions** — the PM does NOT touch child issue statuses.

## Expected Output

### What the PM creates (initial state)

```
Bug: "Fix crash on orientation change during checkout" (tag: bug, assigned: project-manager, status: in-progress)
├── Task: "Reproduce and diagnose orientation change crash on checkout" (tag: task, assigned: android-validator, status: todo, phase: reproduction)
├── Task: "Implement fix for orientation change crash" (tag: task, assigned: android-developer, status: todo, phase: development)
│   └── Blocked by Task 1
└── Task: "Validate orientation change crash fix" (tag: task, assigned: android-validator, status: todo, phase: validation)
    └── Blocked by Task 2
```

### What happens after — status transitions (driven by worker agents)

```
PM sets parent → in-progress (after creating all children)
       │
       ▼
Step 1: Work loop wakes android-validator (Child 1 is todo, unblocked)
  → Validator sets Child 1: todo → in-progress
  → Validator reproduces the crash across devices, analyzes the code, finds root cause
  → Validator sets Child 1: in-progress → done
  → Validator adds comment: "Reproduced. Crash occurs when rotating from portrait
     to landscape on API 33+. Root cause: CheckoutFragment does not retain
     ViewModel state across configuration changes — the ViewModel is recreated
     and the in-progress payment request reference is lost, causing a
     NullPointerException in onViewCreated. Failing path:
     CheckoutFragment.kt:87 → CheckoutViewModel.kt:142. Edge cases: also
     reproducible on foldable devices when unfolding during checkout.
     Does NOT reproduce on API 31 or 32."
  → System auto-resolves blockage on Child 2

Step 2: Work loop wakes android-developer (Child 2 is todo, now unblocked)
  → Developer sets Child 2: todo → in-progress
  → Developer reads validator's diagnosis, implements the fix
  → Developer sets Child 2: in-progress → done
  → Developer adds comment: "Fixed. CheckoutViewModel now uses SavedStateHandle
     to persist payment request across configuration changes. Added
     @HiltViewModel to ensure proper scoping. Existing tests pass."
  → System auto-resolves blockage on Child 3

Step 3: Work loop wakes android-validator (Child 3 is todo, now unblocked)
  → Validator sets Child 3: todo → in-progress
  → Validator writes regression tests, verifies fix against original reproduction
    steps, tests across API levels 31-34 and foldable configurations
  → Validator sets Child 3: in-progress → done
  → Validator adds comment: "Regression tests added. Fix verified on API 31,
     32, 33, 34. Tested portrait→landscape, landscape→portrait, and foldable
     unfold scenarios. All tests pass. No regression on other screens."
  → All children are now done

Step 4: Status loop runs → finds the Bug in-progress + every child done
  → The Bug has NO parent (top-level) → PM closes it and closes every child:
      Bug → closed
      Child 1..3 (done) → closed
  → PM adds comment: "Bug fix complete. All phases done."
```

**Assignment rationale:**
- **Reproduction → `android-validator`** (not developer): The validator is the quality expert — they reproduce bugs methodically across devices and API levels, analyze the code to find root causes, and report precise technical details (crash log, failing code path, device-specific conditions, edge cases). This gives the developer a clear diagnosis to work from instead of guessing. The validator's reproduction comment should include: steps to reproduce, device/API level specifics, root cause analysis, affected code paths, and relevant code snippets.
- **Development → `android-developer`**: With the validator's diagnosis in hand, the developer knows exactly what to fix. No architect needed — the scope is defined by the reproduction report. The developer implements the fix and verifies existing tests pass.
- **Validation → `android-validator`**: The same validator who reproduced the bug now writes regression tests to ensure the crash doesn't reappear. They verify the fix against their original reproduction steps and test across multiple API levels and device configurations.
- **No release phase**: This is a frontend bug fix. The fix will be included in the next regular app release cycle — no separate release task needed. When the PM plans the next release, `android-developer` will build the APK and `devops-engineer` will submit to Play Store.

**Key behaviors:**
- Bug fixes start with **reproduction by the validator**, not planning by the developer
- The validator provides a technical diagnosis that serves as the "spec" for the developer's fix
- The validator includes **device specifics** — API levels, screen configurations, foldable behavior — which are critical for Android bugs
- The developer doesn't need to guess at the root cause — the validator has already found it
- The validator is involved twice: first to reproduce/diagnose, then to validate the fix
- This is the key difference from features: features start with planning, bugs start with reproduction/diagnosis (validator)
- Frontend bugs have 3 phases (no release) — the fix gets picked up in the next release cycle
- **PM does NOT change child issue statuses** — worker agents drive all transitions (`todo` → `in-progress` → `done`)
- Blockages resolve automatically when an agent marks its issue `done`

## Notes
- If the validator cannot reproduce the bug, it reports back to PM with what was tried — PM may need more information from the reporter (which device? which Android version?)
- If the validator's diagnosis reveals the bug is actually a backend issue (e.g., API returning malformed data), the PM may need to create a backend bug and reassign appropriately
- Device fragmentation is a key concern — the validator's reproduction must specify exactly which API levels and device configurations are affected
- The reproduction phase replaces the planning phase for bugs — the validator's diagnosis IS the plan
