# Story 27: Backend-First Dependency Chain

## Loop
Work Loop

## Description
The app needs a "real-time order tracking" feature using WebSockets. Unlike REST APIs where the frontend can mock responses, WebSocket integration requires a running backend. The PM must create a strict sequential chain where the frontend cannot start until the backend is fully deployed to staging. Tests understanding of when frontend needs more than just a contract — it needs a live service dependency.

## Initial Conditions

- **Work queue:** Empty
- **Input:** Product owner requests: "Add real-time order tracking — customers should see live updates as their order is prepared, picked up, and delivered"
- **agentrack state:** No existing issues related to order tracking

### Team Available

> See [Team Roster](00-team-roster.md) for all agent roles and capabilities.

## User Story

1. The PM receives the feature request from the product owner.
2. The PM identifies this requires WebSocket integration for real-time updates.
3. The PM recognizes the critical dependency: the frontend needs a **running backend** to integrate WebSockets — it cannot mock WebSocket connections the way it can mock REST responses.
4. The PM creates a strict sequential chain: backend builds and deploys to staging, THEN frontend starts.
5. This is explicitly different from Story 21 (API contract joint planning) where frontend only needed the contract.

## Expected Output

### What the PM creates (initial state)

```
Epic: "Add real-time order tracking" (tag: epic, assigned: project-manager, status: in-progress)
│
├── Feature: "WebSocket order tracking API" (tag: feature, assigned: project-manager, status: in-progress)
│   ├── Task: "Design WebSocket order tracking architecture" (tag: task, assigned: backend-architect, status: todo, phase: planning)
│   ├── Task: "Review WebSocket architecture for Android integration" (tag: task, assigned: android-developer, status: todo)
│   │   └── Blocked by "Design" task (can't review until architect produces the architecture)
│   ├── Task: "Verify WebSocket architecture agreed" (tag: task,sync, assigned: project-manager, status: todo)
│   │   └── Blocked by "Review" task (PM reads review to check for issues)
│   ├── Task: "Implement WebSocket order tracking service" (tag: task, assigned: backend-developer, status: todo, phase: development)
│   │   └── Blocked by "Verify architecture agreed" task (can't implement until consumer agrees)
│   ├── Task: "Validate WebSocket order tracking service" (tag: task, assigned: backend-validator, status: todo, phase: validation)
│   │   └── Blocked by "Implement" task
│   ├── Task: "Deploy order tracking service to staging" (tag: task, assigned: devops-engineer, status: todo, phase: release)
│   │   └── Blocked by "Validate" task
│
├── Feature: "Order tracking screen with live updates" (tag: feature, assigned: project-manager, status: in-progress)
│   ├── Task: "Plan Android WebSocket integration for order tracking" (tag: task, assigned: android-developer, status: todo, phase: planning)
│   │   └── Blocked by backend Feature's "Deploy" task (can't plan until backend is DEPLOYED TO STAGING —
│   │        WebSocket integration requires a running backend, not just a contract)
│   ├── Task: "Implement order tracking screen with WebSocket" (tag: task, assigned: android-developer, status: todo, phase: development)
│   │   └── Blocked by "Plan" task
│   ├── Task: "Polish order tracking screen" (tag: task, assigned: android-designer, status: todo, phase: styling)
│   │   └── Blocked by "Implement" task
│   └── Task: "Validate order tracking screen" (tag: task, assigned: android-validator, status: todo, phase: validation)
│       └── Blocked by "Polish" task
│
└── (Epic completed by the status loop once both Features are done)
```

**3-level hierarchy: Epic → Feature → Task**
- **Epic** groups the two related deliverables (backend service + Android screen). No Initiative and no per-team Epic — each team contributes one deliverable, so a per-team wrapper would be a single-child parent (overhead).
- **Feature** is each team's deliverable with its own full lifecycle
- **Task** is individual phase work assigned to worker agents

**The critical distinction from Story 21 (API Contract Joint Planning):**

```
Story 21 (REST API — Contract dependency):
  1. backend-architect defines API contract
  2. android-developer reviews contract, PM iterates until agreed
  3. BOTH teams start in parallel (backend implements, frontend implements against contract)
  → Frontend can mock REST responses. Contract is sufficient.

Story 27 (WebSocket — Live service dependency):
  1. backend-architect designs WebSocket architecture
  2. android-developer reviews architecture, PM iterates until agreed
  3. Backend implements, validates, deploys to staging
  4. ONLY THEN can frontend start planning
  → Frontend CANNOT mock WebSocket connections. Needs a running server.
  → The blockage is on the backend's DEPLOYMENT TO STAGING, not on the architecture agreement.
  → BUT the architecture is still agreed first — both teams must be happy with the protocol.
```

**Why the frontend needs a deployed backend:**
- WebSocket connections are persistent, stateful, bidirectional — they cannot be meaningfully mocked with static data
- The frontend must test against actual real-time message streams: connection establishment, message ordering, reconnection handling, connection drops
- The Android WebSocket client must be tested with the actual server's message format, timing, and error behavior
- Unlike a REST API where you can return a static JSON response, WebSocket testing requires the server to actively push messages in real time

**Why there is a "Deploy to staging" step:**
- The backend must be deployed to a staging environment that the frontend can connect to
- This is NOT a production deployment — it's a staging deployment specifically for frontend integration testing
- The `devops-engineer` manages staging environments as part of their role

**Assignment rationale:**

*Backend Feature:*
- **Planning → `backend-architect`**: WebSocket architecture is complex — connection management, message format, subscription model, scalability, reconnection handling, authentication. The architect designs the full system.
- **Review → `android-developer`**: The consumer validates the WebSocket architecture — confirms the message format, subscription model, and reconnection behavior work for the Android integration. Consumer check: "Can I build a reliable Android WebSocket client with this architecture?"
- **Sync → `project-manager`**: PM reads the developer's architecture review. If issues found (wrong message format, missing subscription events), creates fix tasks for architect + re-review for developer and loops until agreed.
- **Development → `backend-developer`**: Implements the WebSocket server, order status event publishing, subscription management, and connection lifecycle from the agreed architecture.
- **Validation → `backend-validator`**: Tests WebSocket behavior — connection establishment, message delivery, ordering, concurrent connections, reconnection after disconnect, load testing.
- **Deploy to staging → `devops-engineer`**: Deploys the WebSocket service to the staging environment so the frontend can connect to it. This is a release to staging, not production.

*Frontend Feature:*
- **Planning → `android-developer`**: Plans the Android WebSocket integration — client library selection, connection lifecycle management, reconnection strategy, UI state management for live updates. Blocked until backend is deployed to staging — the developer needs to understand the actual server behavior during planning.
- **Development → `android-developer`**: Builds the order tracking screen with live WebSocket updates, handles connection states (connecting, connected, disconnected, reconnecting).
- **Styling → `android-designer`**: Polishes the live tracking UI — real-time status indicators, animations for state transitions, responsive layout.
- **Validation → `android-validator`**: Tests the full flow — WebSocket connection, live updates, disconnection handling, reconnection, UI state transitions across multiple devices/API levels.

**Key behaviors:**
- The PM recognizes that WebSocket features require a LIVE backend, not just a contract
- **The frontend developer reviews the WebSocket architecture before the backend implements it** — both teams must agree on the protocol (message format, subscription model, reconnection behavior)
- **The PM reads the developer's review** — if issues found, creates fix tasks for architect + re-review tasks for developer and loops until agreement is total
- The PM does NOT decide the architecture is agreed by itself — the consumer's review determines agreement
- The frontend Feature is blocked by the **backend's staging deployment** (the backend Feature's "Deploy" task), not by the architecture agreement and not by a sync tracker
- Even though the frontend needs a running backend, the architecture is still agreed first — wrong protocol would waste the backend team's time
- This is a strict sequential chain — backend must be running before frontend can even start planning
- The backend deployment is to STAGING (for frontend integration), not production
- The PM explicitly notes this is different from Story 21's contract-only dependency — but both stories require joint agreement before implementation
- The 3-level hierarchy (Epic → Feature → Task) properly models the cross-team effort

## Notes
- This story is the counterpoint to Story 21 — it tests whether the PM understands that not all frontend work can start with just a contract, while still requiring joint agreement on the architecture
- Both Story 21 and Story 27 require the frontend to review and agree on the design before implementation. The difference is what happens after agreement: Story 21 allows parallel work, Story 27 requires sequential work.
- The key decision factor: can the frontend mock the backend's behavior? If yes (REST APIs with static responses), use contract-level dependency. If no (WebSockets, streaming, real-time connections), use deployment-level dependency.
- The architecture agreement is about building the RIGHT thing — wrong message format or missing subscription events would waste both teams' time
- If the developer's architecture review reveals issues (e.g., "the subscription model doesn't support filtering by order ID"), the PM creates fix tasks for the architect and re-review tasks for the developer, looping until agreement is total
- Other features that would use this pattern: push notifications (needs running push server), video streaming (needs running media server), voice chat (needs running signaling server)
- The staging deployment is a middle ground — it's not production, but it's a running service the frontend can test against
- After the frontend completes its work, a separate production release would deploy both the backend to production and submit the Android app to the Play Store — but that's beyond the scope of this story
