# Story 25: Play Store Rejection Recovery

## Loop
Work Loop

## Description
The latest app release was rejected by the Play Store for violating a new policy on in-app purchase disclosures. The PM must understand this is NOT a code bug but a policy compliance issue, and coordinate a non-standard workflow: fix (add disclosure screen) → validate → build APK → resubmit. Tests external blocker handling and adapting to non-standard workflows.

## Initial Conditions

- **Work queue:** Empty
- **Input:** Play Store rejection notice: "App rejected — violates In-App Purchase disclosure policy. Apps offering in-app purchases must display pricing and terms before the purchase button."
- **agentrack state:** No existing issues related to this rejection. The rejected release APK was built previously and is already in the Play Store review pipeline.

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives the Play Store rejection notice.
2. The PM analyzes: this is a **policy compliance** issue, not a code bug. The app needs a new disclosure screen, not a fix for broken behavior.
3. The PM creates a bug (the closest tag — something is wrong that blocks the release) with a non-standard task sequence.
4. The android-developer adds the required disclosure screen.
5. The android-validator verifies the disclosure appears correctly.
6. The android-developer builds a new release APK.
7. The devops-engineer resubmits to the Play Store.

## Expected Output

### What the PM creates (initial state)

```
Bug: "Resolve Play Store rejection — missing in-app purchase disclosure" (tag: bug, assigned: project-manager, status: todo)
├── Task: "Add in-app purchase pricing disclosure screen" (tag: task, assigned: android-developer, status: todo, phase: development)
│   Comment: "Play Store rejected the app for violating In-App Purchase disclosure policy.
│   Add a disclosure screen that shows pricing and terms BEFORE the purchase button.
│   This is NOT a bug fix — the app works correctly. This is a policy compliance addition."
├── Task: "Validate in-app purchase disclosure screen" (tag: task, assigned: android-validator, status: todo, phase: validation)
│   └── Blocked by "Add disclosure" task
├── Task: "Build new release APK with disclosure fix" (tag: task, assigned: android-developer, status: todo, phase: release)
│   └── Blocked by "Validate" task
├── Task: "Resubmit app to Play Store" (tag: task, assigned: devops-engineer, status: todo, phase: release)
│   └── Blocked by "Build APK" task
```

### What happens after — status transitions (driven by worker agents)

```
Parent stays at todo (PM does NOT flip it)
       │
       ▼
Step 1: Work loop wakes android-developer (Child 1 is todo, unblocked)
  → Developer sets Child 1: todo → in-progress (status loop auto-promotes the Bug parent todo → in-progress)
  → Developer adds a disclosure screen showing pricing and terms before the purchase button
  → Developer sets Child 1: in-progress → done
  → Developer adds comment: "Added disclosure screen. Shows itemized pricing,
     subscription terms, and cancellation policy before the purchase button.
     Follows Material Design guidelines for legal disclosures."
  → System auto-resolves blockage on Child 2

Step 2: Work loop wakes android-validator (Child 2 is todo, now unblocked)
  → Validator sets Child 2: todo → in-progress
  → Validator tests the disclosure screen appears correctly
  → Validator sets Child 2: in-progress → done
  → Validator adds comment: "Disclosure screen verified. Shows pricing and terms
     before purchase button. Tested on API 29-34. Content is readable, layout
     is correct across screen sizes. Play Store policy requirements met."
  → System auto-resolves blockage on Child 3

Step 3: Work loop wakes android-developer (Child 3 is todo, now unblocked)
  → Developer sets Child 3: todo → in-progress
  → Developer bumps version number and builds release APK
  → Developer sets Child 3: in-progress → done
  → Developer adds comment: "Release APK built. Version bumped to 2.4.1.
     APK includes disclosure screen. Ready for Play Store submission."
  → System auto-resolves blockage on Child 4

Step 4: Work loop wakes devops-engineer (Child 4 is todo, now unblocked)
  → DevOps sets Child 4: todo → in-progress
  → DevOps uploads the new APK to the Play Store, updates release notes
  → DevOps sets Child 4: in-progress → done
  → DevOps adds comment: "APK 2.4.1 submitted to Play Store. Release notes
     updated. Awaiting review."
  → All children are now done

Step 5: Status loop runs → finds the Bug in-progress + every child done
  → The Bug has NO parent (top-level) → PM closes it and closes every child:
      Bug → closed
      Child 1..4 (done) → closed
```

**Why this is NOT a standard bug:**
- There's no broken behavior — the app works correctly from a technical standpoint
- There's no reproduction phase — the "bug" is a policy violation, not a code error
- The fix is adding new content (disclosure screen), not fixing broken code
- The workflow is non-standard: Dev → Validate → Build APK → Resubmit (no architect, no separate planning)

**Why the non-standard task sequence:**
- No reproduction phase — the Play Store rejection IS the reproduction. The validator doesn't need to reproduce a bug; they verify the fix looks correct.
- No planning phase — the Play Store rejection notice IS the spec. The developer knows exactly what to add (pricing disclosure before purchase button).
- Two release-like tasks — `android-developer` builds the APK (standard for Android releases), then `devops-engineer` submits to Play Store. This is the Android-specific release pipeline.
- The developer appears twice: once to add the disclosure, once to build the APK. These are separate concerns (code change vs. release artifact).

**Assignment rationale:**
- **Add disclosure → `android-developer`**: Adding a new screen is a development task. No architect needed — the Play Store rejection notice provides the requirements (show pricing and terms before purchase button). No design ambiguity.
- **Validate → `android-validator`**: Verify the disclosure screen appears correctly, content is readable, and it meets the Play Store policy requirements. Tests across API levels and screen sizes.
- **Build APK → `android-developer`**: Building the release APK is the android-developer's responsibility in the AndroidApp team. Bumps version, builds the release artifact.
- **Resubmit → `devops-engineer`**: The devops-engineer handles Play Store submissions — uploads the APK, updates release notes, manages the review pipeline.

**Key behaviors:**
- The PM correctly identifies this as a policy compliance issue, not a code bug
- The PM adapts the workflow to the situation — no reproduction phase, no planning phase, just fix → validate → build → submit
- The PM uses the `bug` tag because something is blocking the release, even though no code is broken
- The developer handles both the code change AND the APK build — two separate tasks for two separate concerns
- The devops-engineer handles the Play Store submission — the external gate that caused the issue
- The PM provides context in the first task's comment so the developer understands this is policy compliance, not a bug fix

## Notes
- This story tests the AndroidApp team's asymmetric release cycle — the Play Store is an external gate that can reject work for non-technical reasons
- The non-standard workflow is a key signal: when the PM encounters an external blocker (Play Store, App Store, regulatory compliance), the standard bug/feature lifecycle may not apply
- The Play Store rejection is NOT the same as a code review rejection — it's an external policy enforcement
- If the Play Store rejection required backend changes (e.g., "your API must expose pricing in a specific format"), the PM would need to involve the backend team. But this specific rejection is frontend-only.
- Compare with Story 02 (standard bug): the structure is adapted. No reproduction, no architect, two release steps. The PM must be flexible.
