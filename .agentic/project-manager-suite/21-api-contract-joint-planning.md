# Story 21: API Contract Joint Planning

## Loop
Work Loop

## Description
The product owner requests a "user profile" feature requiring a new backend API and a new Android screen. The PM must coordinate work so that the backend architect defines the API contract, then the frontend consumer reviews it, and the PM reads the review. If the consumer found issues, the PM creates fix tasks and loops until both teams fully agree. Only when agreement is total do both teams proceed in parallel. Tests the PM's understanding of joint contract planning, iterative agreement, consumer approval, and contract-level dependencies versus full-implementation dependencies.

## Initial Conditions

- **Work queue:** Empty
- **Input:** Product owner requests: "Add user profile feature — users should be able to view and edit their profile in the app"
- **agentrack state:** No existing issues related to user profiles

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives the feature request from the product owner.
2. The PM identifies this requires both backend (new API) and frontend (new Android screen) work.
3. The PM recognizes the dependency structure: both teams need to agree on the API contract BEFORE either can build their side. The contract must be reviewed and approved by the consuming team — it's not enough for the backend architect to design it alone.
4. The PM creates a single Epic with a contract Feature first (design by backend + review by frontend consumer), then two parallel Features — one for backend implementation, one for frontend.
5. The PM reads the consumer review. If the consumer found issues, the PM creates fix tasks for the architect to address feedback and the consumer to re-review, looping until agreement is total.
6. Frontend is blocked on CONTRACT AGREEMENT (design + review + iteration), NOT on full backend implementation.
7. The consumer review ensures the API follows existing patterns and provides everything the frontend needs — an agreement where all teams are happy to work.

## Expected Output

### What the PM creates (initial state)

```
Epic: "Add user profile feature" (tag: epic, assigned: project-manager, status: todo)
│
├── Feature: "Define user profile API contract" (tag: feature, assigned: project-manager, status: todo)
│   ├── Task: "Design user profile API contract" (tag: task, assigned: backend-architect, status: todo, phase: planning)
│   ├── Task: "Review API contract for frontend consumption" (tag: task, assigned: android-developer, status: todo)
│   │   └── Blocked by "Design" task (can't review until architect produces the contract)
│   └── Task: "Verify API contract review" (tag: task,sync, assigned: project-manager, status: todo)
│       └── Blocked by "Review" task (PM reads the review to check for issues)
│
├── Feature: "Implement user profile backend API" (tag: feature, assigned: project-manager, status: todo)
│   └── (tasks blocked by Contract Feature — cannot start until contract is agreed)
│
├── Feature: "Build user profile Android screen" (tag: feature, assigned: project-manager, status: todo)
│   └── (tasks blocked by Contract Feature — cannot start until contract is agreed)
│
└── (Epic completed by the status loop once all three Features are done)
```

### Phase 1: Architect designs, consumer reviews

1. Work loop picks up the design task, wakes `backend-architect`
2. Architect designs the API contract and marks task as `done`
3. Work loop picks up the review task, wakes `android-developer`
4. Android-developer reviews the contract and adds a comment. Two possible outcomes:

**Outcome A — Consumer approves:**
> "Contract looks good. Follows our existing patterns (REST, JSON, consistent error codes). All fields I need for the profile screen are present: name, email, avatar URL, bio. Ready to build."

The developer marks the review task as `done` → sync tracker fires → PM wakes → **skip to Phase 3**.

**Outcome B — Consumer found issues:**
> "Two issues: (1) Missing `phone_number` field — the profile screen shows it but the contract doesn't include it. (2) The `avatar_url` should be `avatar_urls` — we need multiple sizes (thumbnail, medium, full) for different screen densities. Otherwise patterns look correct."

The developer marks the review task as `done` → sync tracker fires → PM wakes → **continue to Phase 2**.

### Phase 2: PM iterates on feedback (only if issues found)

5. PM reads the android-developer's review comment and identifies actionable issues.
6. PM does NOT start implementation — the contract is not agreed yet.
7. PM creates fix tasks within the contract Feature to address the feedback:

```
Feature: "Define user profile API contract" (tag: feature, assigned: project-manager, status: in-progress)
├── Task: "Design user profile API contract" (status: done) ✓
├── Task: "Review API contract for frontend consumption" (status: done) ✓
├── Task: "Verify API contract review" (status: done) ✓
├── Task: "Address missing phone_number and avatar_urls feedback" (tag: task, assigned: backend-architect, status: todo)
├── Task: "Re-review updated API contract" (tag: task, assigned: android-developer, status: todo)
│   └── Blocked by "Address feedback" task
└── Task: "Verify updated contract review" (tag: task,sync, assigned: project-manager, status: todo)
    └── Blocked by "Re-review" task
```

8. Work loop picks up the fix task, wakes `backend-architect` — architect updates the contract to add `phone_number` and change `avatar_url` to `avatar_urls` with size variants. Marks task as `done`.
9. Work loop picks up the re-review task, wakes `android-developer` — developer re-reviews the updated contract.
10. If the developer still has issues → the PM repeats Phase 2 (another fix + re-review cycle). If the developer approves → PM wakes via sync tracker → **continue to Phase 3**.

### Phase 3: Contract agreed — both teams start

Once the PM confirms agreement is total (no outstanding issues), it marks the contract Feature's gate tracker `done`. That leaves the contract Feature with all children `done`, so:

11. The status loop marks the contract Feature `done` (it has the Epic as parent → `done`).
12. The system auto-clears the blockages that the contract Feature was causing — the backend and frontend Features' first tasks become unblocked:

```
├── Feature: "Implement user profile backend API" (tag: feature, assigned: project-manager, status: todo)
│   ├── Task: "Plan user profile backend implementation" (tag: task, assigned: backend-developer, status: todo, phase: planning)
│   │   └── Blocked by Contract Feature (auto-clears once the Contract Feature is marked done = agreed)
│   ├── Task: "Implement user profile API endpoints" (tag: task, assigned: backend-developer, status: todo, phase: development)
│   │   └── Blocked by "Plan" task
│   ├── Task: "Validate user profile API" (tag: task, assigned: backend-validator, status: todo, phase: validation)
│   │   └── Blocked by "Implement" task
│   └── Task: "Deploy user profile API" (tag: task, assigned: devops-engineer, status: todo, phase: release)
│       └── Blocked by "Validate" task
│
├── Feature: "Build user profile Android screen" (tag: feature, assigned: project-manager, status: todo)
│   ├── Task: "Plan user profile screen from API contract" (tag: task, assigned: android-developer, status: todo, phase: planning)
│   │   └── Blocked by Contract Feature (auto-clears once the Contract Feature is marked done = agreed)
│   ├── Task: "Implement user profile screen" (tag: task, assigned: android-developer, status: todo, phase: development)
│   │   └── Blocked by "Plan" task
│   ├── Task: "Polish user profile screen design" (tag: task, assigned: android-designer, status: todo, phase: styling)
│   │   └── Blocked by "Implement" task
│   └── Task: "Validate user profile screen" (tag: task, assigned: android-validator, status: todo, phase: validation)
│       └── Blocked by "Polish" task
```

Both streams run IN PARALLEL after the contract is agreed. Each Feature is completed by the status loop when its phase tasks are done; the Epic is completed (closed + children closed) once all three Features are done.

**3-level hierarchy: Epic → Feature → Task**
- **Epic** groups the three related features (contract, backend, frontend)
- **Feature** is each deliverable with its own lifecycle
- **Task** is individual phase work assigned to worker agents

**The key insight: contract-level dependency**

The frontend Feature's planning task is blocked by the **contract Feature itself** (it auto-unblocks once the contract Feature is marked `done` = agreed), not by the backend implementation Feature. This means:

```
Timeline:

1. backend-architect designs API contract
       │
       ▼
2. android-developer reviews contract (checks patterns, completeness for frontend needs)
       │
       ▼
3. PM reads review via sync tracker
       │
       ├──► Issues found: PM creates fix tasks → architect addresses → developer re-reviews
       │         │                     (loops until no issues remain)
       │         ▼
       │    PM reads re-review via sync tracker ──► still issues? loop again
       │
       └──► No issues: PM marks gate done → status loop marks contract Feature done
                 │
                 ├──► Backend planning starts (backend-developer reads agreed contract)
                 │         │
                 │         ▼
                 │    Backend implementation → validation → deployment
                 │
                 └──► Frontend planning starts (android-developer reads agreed contract)
                           │
                           ▼
                      Frontend implementation → styling → validation

Both streams run IN PARALLEL only after the contract is fully agreed by both teams.
```

If the PM had incorrectly blocked frontend on the **backend release** (instead of the contract), the frontend team would sit idle while the backend was fully implemented, tested, and deployed — wasting significant time.

**Assignment rationale:**

*Contract Feature:*
- **Planning → `backend-architect`**: The API contract is a backend architecture decision — endpoints, request/response shapes, authentication, error codes. The architect defines the spec that both teams work from.
- **Review → `android-developer`**: The consumer validates the contract — checks that the API follows existing endpoint patterns (consistent naming, error format, pagination style), confirms it provides all the data the frontend needs to build the profile screen, and flags any missing fields or awkward structures. This is NOT a technical review of backend quality — it's a consumer check: "Can I build my screen with this contract?" The developer has intimate knowledge of the existing API patterns from building other screens.
- **Sync → `project-manager`**: The PM reads the review comment. If the consumer found issues, the PM creates fix tasks (architect addresses feedback → consumer re-reviews → PM re-checks) and loops until agreement is total. If no issues, the PM marks the contract Feature as done and unblocks both implementation Features.
- **Fix tasks (if needed) → `backend-architect`**: The architect addresses the specific feedback from the consumer review — adds missing fields, adjusts structures, fixes pattern inconsistencies. Each fix cycle is a new task.
- **Re-review tasks (if needed) → `android-developer`**: The consumer re-reviews after each fix. Only marks as `done` when they are satisfied. The PM does NOT decide the contract is agreed — the consumer does.

*Backend Feature:*
- **Planning → `backend-developer`**: Reads the architect's contract and plans the implementation approach. The developer handles their own planning because the contract already defines what to build.
- **Development → `backend-developer`**: Implements the API endpoints, database queries, and business logic.
- **Validation → `backend-validator`**: Writes API tests, validates data consistency, tests edge cases.
- **Release → `devops-engineer`**: Deploys the backend API to staging/production.

*Frontend Feature:*
- **Planning → `android-developer`**: Reads the API contract and plans the screen — UI components, navigation, state management, API integration approach. The developer uses the contract as their spec.
- **Development → `android-developer`**: Builds the user profile screen, integrates the API, manages state.
- **Styling → `android-designer`**: Polishes the screen visually — Material Design, animations, accessibility, responsive layout across devices.
- **Validation → `android-validator`**: Tests the screen — UI tests, integration tests, compatibility across API levels and devices.

**Key behaviors:**
- The PM correctly identifies that the frontend only needs the API CONTRACT, not a running backend
- The contract Feature includes a **consumer review task** — the team that will consume the API validates it before implementation begins
- The consumer review checks: (1) the API follows existing patterns in the codebase, (2) it provides everything the consuming team needs for their work
- Both teams must agree on the contract — the architect designs it, the consumer approves it. No unilateral contracts.
- **The PM reads every consumer review** — it does not just check if the review task is done. It reads the comment to determine if issues were found.
- **If issues are found, the PM creates fix + re-review tasks and loops** — architect addresses feedback, consumer re-reviews, PM re-checks. This repeats until agreement is total.
- The PM does NOT decide the contract is agreed by itself — the consumer's review comment is what determines agreement. If the consumer says "looks good", agreement is reached. If the consumer lists issues, more work is needed.
- The PM does NOT start implementation until agreement is total — no "we'll fix it later" shortcuts.
- The contract Feature is a separate deliverable — it grows with fix+re-review tasks as needed
- Both the backend and frontend Features are blocked until the contract Feature is marked done (only happens after agreement)
- After the contract is agreed, both teams work in parallel — no unnecessary waiting
- The android-developer can plan and implement against the contract by mocking API responses
- No completion children are created: the status loop completes each Feature when its phase tasks are done, and completes the Epic (closed + children closed) once all three Features are done

## Notes
- This story tests three critical PM skills: (1) joint contract planning — both teams must agree before implementation, (2) iterative agreement — the PM reads reviews and loops until consensus, and (3) contract-level dependency vs implementation dependency
- The PM's role is active, not passive — it reads every review comment, decides if iteration is needed, and creates fix tasks. It does NOT just wait for tasks to be marked `done`.
- The agreement loop (architect fixes → consumer re-reviews → PM checks) can repeat multiple times. The story shows one iteration for clarity, but the PM should keep looping until the consumer has zero issues.
- The PM does NOT shortcut the process — if the consumer found issues, the PM does not decide "close enough" and proceed. It creates fix tasks and waits for re-approval.
- The consumer review should be assigned to someone who will actually BUILD against the contract — in this case `android-developer`, not `android-validator`. The reviewer needs to know: "Can I build my screen with this API?"
- Contrast with Story 27 (Backend-First Dependency): in that story, the frontend needs a LIVE backend (WebSockets), not just a contract. The blockage pattern is different.
- The contract Feature starts with three tasks (design + review + sync) and grows with fix + re-review pairs as issues are found — it's a lightweight coordination mechanism that expands as needed
- If the architect's contract design reveals that the feature is more complex than expected, the PM may need to update both downstream Features
- The `android-developer` serves dual roles: consumer reviewer in the contract Feature, then planner+implementer for the frontend Feature — they read the API contract as their spec, which is standard for frontend work in this team
- This joint planning pattern applies any time one team defines an interface that another team consumes — API contracts, data schemas, event formats, shared libraries
