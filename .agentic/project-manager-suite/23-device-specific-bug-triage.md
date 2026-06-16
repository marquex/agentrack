# Story 23: Device-Specific Bug Triage

## Loop
Work Loop

## Description
A user reports the app crashes on Samsung devices running Android 12 when opening the payment screen. The PM must scope this correctly as a frontend-only bug, assign the android-validator to reproduce with device-specific conditions, then have the android-developer fix it, and verify across multiple API levels. Tests scoped bug investigation and team-specific validation with no backend involvement.

## Initial Conditions

- **Work queue:** Empty
- **Input:** Bug report: "App crashes on Samsung Galaxy S21 (Android 12) when opening the payment screen"
- **agentrack state:** No existing issues related to this bug

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives the bug report.
2. The PM analyzes: crash on payment screen, specific to Samsung + Android 12 — this is likely a frontend issue (null pointer, device-specific SDK behavior). No backend involvement needed — the payment screen rendering is entirely frontend.
3. The PM creates the bug issue hierarchy with the standard bug lifecycle: Reproduce → Dev → Validate.
4. The `android-validator` reproduces on the specific device/API level and provides a technical diagnosis.
5. The `android-developer` fixes based on the diagnosis.
6. The `android-validator` verifies the fix across multiple API levels (not just the failing one).
7. No backend agent is involved at any point.

## Expected Output

### What the PM creates (initial state)

```
Bug: "Fix app crash on Samsung devices running Android 12 when opening payment screen" (tag: bug, assigned: project-manager, status: todo)
├── Task: "Reproduce and diagnose payment screen crash on Samsung/Android 12" (tag: task, assigned: android-validator, status: todo, phase: reproduction)
│   Comment: "Reproduce on Samsung Galaxy S21 (Android 12, API level 32). Focus on the payment screen
│   open flow. Check for null pointers, SDK compatibility issues, and API-level-specific behavior."
├── Task: "Fix payment screen crash on Android 12" (tag: task, assigned: android-developer, status: todo, phase: development)
│   └── Blocked by "Reproduce" task
└── Task: "Verify payment screen fix across API levels" (tag: task, assigned: android-validator, status: todo, phase: validation)
    └── Blocked by "Fix" task
```

### What happens after — status transitions (driven by worker agents)

```
Parent stays at todo (PM does NOT flip it)
       │
       ▼
Step 1: Work loop wakes android-validator (Child 1 is todo, unblocked)
  → Validator sets Child 1: todo → in-progress (status loop auto-promotes the Bug parent todo → in-progress)
  → Validator reproduces on Samsung Galaxy S21 emulator (API 32)
  → Validator confirms crash and finds root cause
  → Validator sets Child 1: in-progress → done
  → Validator adds comment: "Reproduced on API 32 (Android 12). Root cause:
     PaymentSDK.initialize() returns null on API 32 due to a known Samsung
     compatibility issue. The code calls PaymentSDK.getApiClient() without
     null check on line 45 of PaymentFragment.kt. Crash is a NullPointerException.
     Only affects API 32 — tested API 31 and API 33, both work fine.
     Fix: add null check for PaymentSDK.getApiClient() result, with fallback
     to a compatibility wrapper on API 32."
  → System auto-resolves blockage on Child 2

Step 2: Work loop wakes android-developer (Child 2 is todo, now unblocked)
  → Developer sets Child 2: todo → in-progress
  → Developer reads validator's diagnosis, adds null check and API-level guard
  → Developer sets Child 2: in-progress → done
  → Developer adds comment: "Fixed. Added null check for PaymentSDK.getApiClient()
     with compatibility wrapper for API 32. Added Build.VERSION.SDK_INT guard.
     Tested on API 32 emulator — no crash."
  → System auto-resolves blockage on Child 3

Step 3: Work loop wakes android-validator (Child 3 is todo, now unblocked)
  → Validator sets Child 3: todo → in-progress
  → Validator tests across multiple API levels: 29, 30, 31, 32, 33, 34
  → Validator writes regression tests for payment screen on different API levels
  → Validator sets Child 3: in-progress → done
  → Validator adds comment: "Regression tests added. Verified payment screen
     opens correctly on API 29-34. Fix confirmed on API 32 (the failing level).
     No regressions on other API levels. All tests pass."
  → All children are now done

Step 4: Status loop runs → finds the Bug in-progress + every child done
  → The Bug has NO parent (top-level) → PM closes it and closes every child:
      Bug → closed
      Child 1..3 (done) → closed
```

**Why no backend involvement:**
- The crash is a null pointer in the frontend payment SDK integration — the backend API is not involved
- The payment screen's rendering and SDK initialization are entirely frontend concerns
- No backend API calls fail — the crash happens before any network request is made
- Device-specific crashes are almost always frontend-only issues (SDK compatibility, API-level behavior, manufacturer-specific quirks)

**Assignment rationale:**
- **Reproduction → `android-validator`**: The validator is the quality expert for Android. They reproduce bugs methodically with device-specific conditions (exact API level, manufacturer, screen size). The validator's diagnosis should include: exact reproduction steps, root cause analysis, affected code paths, and which API levels are affected. The reproduction comment explicitly asks the validator to focus on the Samsung/API 32 combination.
- **Development → `android-developer`**: With the validator's diagnosis (null pointer on API 32, line 45 of PaymentFragment.kt), the developer knows exactly what to fix — add null checks and API-level guards. No architect needed — the scope is defined by the reproduction report.
- **Validation → `android-validator`**: The same validator who reproduced the bug now verifies the fix across MULTIPLE API levels (not just the failing one). This is critical for Android bugs — the fix must not break other device configurations. The validator writes regression tests that cover the payment screen across different API levels. The status loop closes the Bug once validation is `done`.

**Key behaviors:**
- The PM correctly scopes this as a **frontend-only** bug — no backend agents involved at any stage
- The reproduction task includes specific device/API instructions to guide the validator
- The validator tests across multiple API levels during validation (not just the one that crashed)
- The bug follows the standard Android frontend bug lifecycle: Reproduce → Dev → Validate
- No release phase — Android bug fixes are typically bundled into the next app release, not deployed separately
- The PM includes device-specific context in the reproduction task's comment

## Notes
- This story demonstrates the AndroidApp team's device fragmentation challenge — bugs may only appear on specific manufacturer/API level combinations
- The validator's reproduction is more nuanced than a standard bug: it tests surrounding API levels to confirm the crash is isolated to API 32
- The validation step is thorough: tests across API 29-34, not just API 32. This ensures the fix doesn't introduce regressions on other devices.
- If the validator couldn't reproduce the bug, they would report back to the PM with what was tried. The PM might need to ask the reporter for more details (exact device model, OS version, app version, steps to reproduce).
- If the validator's diagnosis had revealed a backend issue (e.g., "the payment API returns a different response format on certain requests"), the PM would create a separate backend bug. But that's not this scenario.
- Compare with Story 02 (standard bug lifecycle): the structure is the same, but this story tests the PM's ability to correctly identify which team handles the bug and provide device-specific reproduction guidance.
