# Story 05: Blocked Task Chain — Sequential Dependencies

## Loop
Work Loop

## Description
Multiple features must be completed in a strict sequence — the frontend depends on the backend API contract, and a caching layer depends on both being in place. The PM must create an Epic to link the related features, with proper blockage chains between them, accounting for cross-team coordination through API contracts.

## Initial Conditions

- **Work queue:** Empty
- **Input:** A multi-step feature set: "1) Backend API for user profiles, 2) Frontend user profile screen, 3) Add caching layer"
- **agentrack state:** No existing issues

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives a multi-step request with clear sequential dependencies across backend and frontend teams.
2. The backend API must be designed first — the frontend is blocked on the API contract (not the full backend implementation).
3. Once the API contract is defined, the backend implementation and frontend development can proceed, but the frontend feature still depends on the backend release for integration testing.
4. The caching layer depends on both the backend and frontend being complete.
5. The three features are related (same user profile goal) — they need an Epic parent to link them.

## Expected Output

```
Epic: "Add user profile feature" (tag: epic, assigned: project-manager, status: todo)
│
├── Feature: "Add user profiles API" (tag: feature, assigned: project-manager, status: todo)
│   ├── Task: "Design user profiles API contract" (tag: task, assigned: backend-architect, status: todo, phase: planning)
│   ├── Task: "Review API contract for frontend needs" (tag: task, assigned: android-developer, status: todo)
│   │   └── Blocked by "Design" task (can't review until architect produces the contract)
│   ├── Task: "Verify API contract agreed" (tag: task,sync, assigned: project-manager, status: todo)
│   │   └── Blocked by "Review" task (PM reads review to check for issues)
│   ├── Task: "Implement user profiles API" (tag: task, assigned: backend-developer, status: todo, phase: development)
│   │   └── Blocked by "Verify contract agreed" task (can't implement until consumer agrees)
│   ├── Task: "Validate user profiles API" (tag: task, assigned: backend-validator, status: todo, phase: validation)
│   │   └── Blocked by "Implement" task
│   ├── Task: "Release user profiles API" (tag: task, assigned: devops-engineer, status: todo, phase: release)
│   │   └── Blocked by "Validate" task
│
├── Feature: "Build user profile screen (Android)" (tag: feature, assigned: project-manager, status: todo)
│   ├── Task: "Plan user profile screen from API contract" (tag: task, assigned: android-developer, status: todo, phase: planning)
│   │   └── Blocked by backend "Verify contract agreed" task (can't plan frontend until API contract is agreed by both teams)
│   ├── Task: "Implement user profile screen" (tag: task, assigned: android-developer, status: todo, phase: development)
│   │   └── Blocked by "Plan" task
│   ├── Task: "Polish user profile screen UI" (tag: task, assigned: android-designer, status: todo, phase: styling)
│   │   └── Blocked by "Implement" task
│   └── Task: "Validate user profile screen" (tag: task, assigned: android-validator, status: todo, phase: validation)
│       └── Blocked by "Polish" task
│
├── Chore: "Add caching layer for user profile data" (tag: chore, assigned: project-manager, status: todo)
│   ├── Task: "Design caching strategy for user profiles" (tag: task, assigned: backend-architect, status: todo, phase: planning)
│   │   └── Blocked by backend Feature "Release" task AND frontend Feature "Validate" task (needs both sides to be stable)
│   ├── Task: "Implement caching layer" (tag: task, assigned: backend-developer, status: todo, phase: development)
│   │   └── Blocked by "Design" task
│   ├── Task: "Validate caching layer" (tag: task, assigned: backend-validator, status: todo, phase: validation)
│   │   └── Blocked by "Implement" task
│   └── Task: "Release caching layer" (tag: task, assigned: devops-engineer, status: todo, phase: release)
│       └── Blocked by "Validate" task
│
└── (Epic completed by the status loop once all 3 deliverables are done)
```

**3-level hierarchy: Epic → Feature/Chore → Task**
- **Epic** groups the 3 related features. No Initiative needed — there's only one group.
- **Feature/Chore** are the deliverables with their respective lifecycle phases. The caching layer is tagged `chore` (technical infrastructure, no new user-facing capability), the others are `feature` (new capabilities).
- **Task** is individual phase work assigned to worker agents.

**Why Epic instead of Initiative?** An Initiative groups Epics. Here we only have one group of features, so an Epic suffices. If later we had multiple Epics to coordinate, we'd wrap them in an Initiative.

**Why tag the caching layer as `chore`?** "Add caching layer" is technical infrastructure — no new user-facing capability. It's a chore, not a feature. The other two are features because they add new capabilities (API endpoint, profile screen).

**Assignment rationale:**
- **Backend Feature — Planning → `backend-architect`**: Designs the API contract (endpoints, request/response schemas, error codes). This contract is the specification that both backend implementation and frontend planning depend on.
- **Backend Feature — Review → `android-developer`**: The consumer validates the API contract — checks it follows existing endpoint patterns, confirms it provides all data the profile screen needs. Consumer check: "Can I build my screen with this API?"
- **Backend Feature — Sync → `project-manager`**: PM reads the review. If issues found, creates fix tasks for architect + re-review for developer and loops until agreed.
- **Backend Feature — Development → `backend-developer`**: Implements the API endpoints against the agreed contract.
- **Backend Feature — Validation → `backend-validator`**: Tests API correctness, response formats, error handling, load testing.
- **Backend Feature — Release → `devops-engineer`**: Deploys the API to staging/production.
- **Frontend Feature — Planning → `android-developer`**: Reads the API contract (defined by backend-architect) to plan the Android screen. No separate architect for frontend — the API contract IS the spec.
- **Frontend Feature — Development → `android-developer`**: Implements the profile screen, integrates with API.
- **Frontend Feature — Styling → `android-designer`**: Polishes the UI after the developer has built the functional screen.
- **Frontend Feature — Validation → `android-validator`**: Tests the screen across API levels and devices.
- **Caching Chore — Planning → `backend-architect`**: Designs the caching strategy (cache keys, TTL, invalidation rules).
- **Caching Chore — Development → `backend-developer`**: Implements the caching middleware.
- **Caching Chore — Validation → `backend-validator`**: Tests cache behavior, TTL expiration, invalidation.
- **Caching Chore — Release → `devops-engineer`**: Deploys the caching layer.

**Key cross-team dependency — API contract agreement:**
The frontend "Plan" task is blocked by the backend "Verify contract agreed" task (not the full backend release). Both teams must agree on the API contract before either proceeds — the architect designs it, the frontend developer reviews it, and the PM reads the review and iterates if needed. Once agreed, both backend implementation and frontend planning can proceed in parallel. This is the key AndroidApp dynamic — the frontend is blocked on the agreed contract, not the implementation. However, full integration testing still requires the backend to be running, so the frontend validation phase benefits from (but is not strictly blocked by) the backend release.

**Key behaviors:**
- The PM creates an Epic to link all 3 related features — no orphaned related work
- Each feature is completed by the status loop when its phase tasks are done (marked `done` since they have the Epic as parent); the Epic is then completed (closed + children closed) by the status loop once all 3 are done
- **The frontend developer reviews the API contract before the backend implements it** — both teams must agree on the contract
- **The PM reads the developer's review via the contract gate tracker** — if issues found (missing fields, inconsistent patterns), the PM creates fix tasks for the architect and re-review tasks for the developer, looping until agreement is total
- The PM does NOT decide the contract is agreed by itself — the consumer's review determines agreement
- Cross-team blockage: frontend planning blocked by backend API contract agreement (not full implementation)
- The caching chore is blocked by both the backend release and frontend validation — it needs both sides stable
- Only the backend "Design" task is immediately actionable — everything else cascades from there
- The chain resolves itself automatically as each feature completes
- Tags make the hierarchy visible: `epic` → `feature`/`chore` → `task`

## Notes
- Without the Epic parent, the 3 features would be orphaned — agents couldn't see they're related
- The hierarchy is strict: Task ← Feature/Chore ← Epic. No levels skipped.
- If this were part of a larger effort with other epics, we'd wrap it in an Initiative
- The API contract review follows the same joint agreement pattern as Story 21 — the PM reads the consumer's review and iterates until both teams are satisfied
- The frontend "Plan" task starts as soon as the API contract is agreed — backend implementation and frontend planning run in parallel
- If the consumer review reveals issues, the PM creates fix tasks for the architect and re-review tasks for the developer. The PM does NOT shortcut to "close enough."
- Android release (Play Store) is not modeled here — the frontend feature is considered complete when validation passes. A separate release chore would handle Play Store submission.
