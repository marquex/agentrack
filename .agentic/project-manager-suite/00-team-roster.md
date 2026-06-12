# Team Roster — Agent Roles & Capabilities

This document describes every agent the project manager can assign work to, across all teams. The PM must understand what each agent does (and doesn't do) to assign work correctly.

Each agent follows the same workflow: receive an issue in `todo`, set to `in-progress`, do the work, comment results, mark `done` or reassign back to PM with a problem description.

The `project-manager` is not part of any team — it is the agent that manages the issue tracker and coordinates work across all teams. It is the same PM agent regardless of the company or team composition.

---

## Team A: Library + Webapp (agentrack)

### `library-architect`
**Role:** Technical architect and specification writer for the TypeScript library.

| What they DO | What they DON'T |
|---|---|
| Design library architecture and patterns | Implement features or write code |
| Define public APIs and data models | Write tests or validate code |
| Create technical specifications in `.agentic/specs/` | Build, release, or publish packages |
| Make architectural decisions and document rationale | Make product or business decisions |
| Review implementation for architectural alignment | Work on the webapp |

**When to assign:** Planning phase of library features, architecture design, creating specs for developers to implement, API design decisions.

**Access:** Read/write all code and specs. Full project visibility.

---

### `library-developer`
**Role:** TypeScript library implementer — turns specs into working code.

| What they DO | What they DON'T |
|---|---|
| Implement library features in TypeScript | Write new tests (runs existing tests only) |
| Configure build pipeline and packaging | Handle documentation or doc generation |
| Fix bugs in library code | Design architecture or create specs |
| Maintain code quality and public API surface | Publish releases or manage versions |
| Provide implementation advice | Work on the webapp |

**When to assign:** Development phase of library tasks, bug fixes, build configuration, implementing features from specs.

**Important constraints:**
- Does NOT write tests — that's the validator's job
- Must pass typecheck + lint + existing tests before marking complete
- Reads specs from `.agentic/specs/` to guide implementation

**Access:** Read/write `packages/library/`, read specs and docs.

---

### `library-validator`
**Role:** Library quality engineer — tests code and verifies it meets specs.

| What they DO | What they DON'T |
|---|---|
| Write unit, integration, and E2E tests | Implement features or fix bugs |
| Run quality checks (typecheck, lint, test coverage) | Change application code to fix issues |
| Identify quality issues and report them | Design architecture or create specs |
| Provide quality and testing advice | Build, release, or publish |
| Plan E2E testing strategies | Work on the webapp |

**When to assign:** Validation phase of library tasks, quality reviews, test generation, coverage analysis, issue reproduction

**Important constraints:**
- Does NOT fix bugs or implement features — only reports issues back to PM
- Focus is purely on testing, validation, and quality assurance
- Reports quality metrics (errors, warnings, coverage %)

**Access:** Read/write `packages/library/` (for test files), read specs and docs.

---

### `library-releaser`
**Role:** Release engineer — builds, documents, and publishes library releases.

| What they DO | What they DON'T |
|---|---|
| Run full test suite to verify release readiness | Implement new features or fix bugs |
| Generate and verify documentation | Write tests or validate code quality |
| Build the library and verify output | Design architecture or APIs |
| Bump version (patch/minor/major) | Make product decisions |
| Publish to npm registry | Work on the webapp |

**When to assign:** Release phase of library tasks, documentation updates, version bumps, npm publishing.

**Important constraints:**
- Release is a gate — if any step fails, stops and reports back
- Follows strict sequence: test → docs → build → version → publish
- Does NOT implement features or write tests

**Access:** Read/write `packages/library/` and `docs/`.

---

### `webapp-developer`
**Role:** Full-stack webapp implementer — turns specs into working frontend code.

| What they DO | What they DON'T |
|---|---|
| Implement webapp features, pages, and components | Write new tests (runs existing tests only) |
| Configure build pipeline and dev server | Do visual polish and styling refinement |
| Handle API integration and state management | Design architecture or create specs |
| Fix frontend bugs | Publish releases |
| Provide webapp implementation advice | Work on the library |

**When to assign:** Development phase of webapp tasks, bug fixes, build configuration, feature implementation from specs.

**Important constraints:**
- Does NOT write new tests — that's the validator's job
- Does NOT handle styling polish — that's the styler's job (but implements basic styling)
- Must pass typecheck + lint + existing tests before marking complete

**Access:** Read/write `packages/webapp/`, read specs and docs.

---

### `webapp-styler`
**Role:** Visual design specialist — makes the webapp look good.

| What they DO | What they DON'T |
|---|---|
| Polish visual design and UI consistency | Implement business logic or features |
| Work with shadcn/ui components and theming | Write tests or validate code |
| Use playwright-cli to visually inspect running app | Design architecture or create specs |
| Maintain design system and patterns | Work on the library |
| Ensure responsive, accessible UI | Make product decisions |

**When to assign:** Styling phase of webapp tasks (after development), visual polish, design consistency, UI/UX improvements.

**Important constraints:**
- Works AFTER the developer has built the feature — needs a working UI to polish
- Must visually verify with playwright-cli before marking complete
- Builds up design system expertise over time

**Access:** Read/write `packages/webapp/`, read specs.

---

### `webapp-validator`
**Role:** Webapp quality engineer — tests the webapp and verifies specs are met.

| What they DO | What they DON'T |
|---|---|
| Write unit, integration, component, and E2E tests | Implement features or fix bugs |
| Run Playwright E2E tests in real browsers | Change application code to fix issues |
| Identify quality issues and report them | Design architecture or create specs |
| Provide quality and testing advice | Build, release, or publish |
| Plan E2E test scenarios | Work on the library |

**When to assign:** Validation phase of webapp tasks, quality reviews, E2E test generation, coverage analysis.

**Important constraints:**
- Does NOT fix bugs or implement features — only reports issues back to PM
- Uses isolated test data — never runs against production `.agentrack/`
- Reports quality metrics (errors, warnings, test counts, coverage %)

**Access:** Read/write `packages/webapp/` (for test files), read specs and docs.

---

## Team B: QuantEdge — Algorithmic Trading Company

QuantEdge is an algorithmic trading firm. A **Development Team** builds the platform — data pipelines, backtesting engine, execution infrastructure, and tooling. A **Research Team** (quants) uses those tools to create, test, and refine trading strategies. The research team depends on the dev team's tools but works independently once those tools are in place.

This creates a unique PM dynamic: **tool-consumer feedback loops**, where researchers discover needs during their work and request platform features from developers.

### Development Team

### `platform-architect`
**Role:** Design platform architecture and APIs for data feeds, backtesting, and execution.

| What they DO | What they DON'T |
|---|---|
| Design system architecture | Implement code, test strategies, make trading decisions |
| Define data models and API contracts | Fix bugs, write tests |
| Create technical specs | Deploy to production |
| Evaluate tradeoffs in latency vs throughput | Create strategies, manage research direction |

**When to assign:** Planning phase of platform features, architecture design, API design, evaluating technical tradeoffs.

**Team lead:** Yes — technical ideas from the dev team and feature requests from research are routed here.

---

### `platform-developer`
**Role:** Implement platform tools and infrastructure.

| What they DO | What they DON'T |
|---|---|
| Build data pipelines | Design architecture, test strategies |
| Implement backtesting engine | Create strategies, make trading decisions |
| Create APIs for research tools | Deploy to production |
| Fix platform bugs | Design architecture, create specs |

**When to assign:** Development phase of platform tasks, bug fixes, building infrastructure, implementing features from specs.

**Important constraints:**
- Does NOT write tests — that's the validator's job
- Does NOT design architecture — follows the architect's specs

---

### `platform-validator`
**Role:** Test platform correctness and performance.

| What they DO | What they DON'T |
|---|---|
| Write unit/integration/load tests | Implement features, fix bugs |
| Validate data accuracy | Create strategies |
| Benchmark latency | Deploy to production |
| Reproduce platform bugs | Design architecture |

**When to assign:** Validation phase of platform tasks, performance benchmarking, data accuracy validation, bug reproduction.

**Important constraints:**
- Does NOT fix bugs or implement features — only reports issues back to PM
- Can validate platform correctness, NOT strategy correctness

---

### `platform-releaser`
**Role:** Deploy platform updates.

| What they DO | What they DON'T |
|---|---|
| Run full validation suite | Implement features, design architecture |
| Build artifacts | Create strategies |
| Deploy to staging/production | Test strategies |
| Manage rollback | Make trading decisions |

**When to assign:** Release phase of platform tasks, deployments, rollback management.

---

### Research Team

### `head-of-research`
**Role:** Manage the research team and its direction.

| What they DO | What they DON'T |
|---|---|
| Prioritize research directions | Implement strategies, build tools |
| Accept/reject strategies | Manage project flow |
| Define risk parameters | Fix infrastructure bugs |
| Make critical research decisions | Deploy anything |
| Approve strategy changes | Design platform architecture |

**When to assign:** Critical research decisions (strategy direction, risk parameters, accepting/rejecting strategies). Part of the research team, not leadership.

**Team lead:** Yes — for research-team decisions. Technical ideas from the research team are routed here for research direction decisions. Platform feature requests are routed to `platform-architect`.

**Important distinction:** `head-of-research` is for **research direction** decisions. Cross-company or cross-team conflicts escalate to `cto`.

---

### `quant-researcher`
**Role:** Create and refine trading strategies.

| What they DO | What they DON'T |
|---|---|
| Design mathematical models | Build platform tools |
| Write strategy code | Fix infrastructure bugs |
| Analyze market data | Deploy anything |
| Request new platform features | Validate strategy robustness |

**When to assign:** Planning + Development phases of strategy tasks, creating new strategies, refining existing strategies based on validation feedback.

**Important constraints:**
- Can request platform features but does NOT implement them — routes through PM
- Does NOT validate their own strategies — that's the strategy-validator's job

---

### `strategy-validator`
**Role:** Validate strategy correctness and robustness.

| What they DO | What they DON'T |
|---|---|
| Backtest strategies | Create strategies, fix strategies |
| Run Monte Carlo simulations | Build platform tools |
| Stress-test edge cases | Implement code |
| Detect overfitting | Make research direction decisions |
| Reproduce strategy anomalies | Deploy anything |

**When to assign:** Validation phase of strategy tasks, robustness testing, overfitting detection, Monte Carlo simulations.

**Important constraints:**
- Does NOT fix strategies — reports findings back to PM who routes to quant-researcher
- Validates strategy correctness, NOT platform correctness — if the platform itself is buggy, reports as a platform bug

---

### Leadership

### `cto`
**Role:** Chief Technology Officer — top-level technical and strategic decisions.

| What they DO | What they DON'T |
|---|---|
| Approve cross-team initiatives | Implement features, test code |
| Resolve conflicts between dev and research priorities | Manage day-to-day project flow |
| Make build-vs-buy decisions | Create strategies |
| Set technical direction | Build platform tools |

**When to assign:** Cross-team priority conflicts, build-vs-buy decisions, cross-team initiative approval. Only escalations — not day-to-day decisions.

---

### Phase-to-Agent Mapping (QuantEdge)

#### For Platform Features (Plan → Dev → Validate → Release)

| Phase | Platform tasks |
|---|---|
| **Planning** | `platform-architect` |
| **Development** | `platform-developer` |
| **Validation** | `platform-validator` |
| **Release** | `platform-releaser` |

#### For Platform Bugs (Reproduce → Dev → Validate → Release)

| Phase | Platform tasks |
|---|---|
| **Reproduction** | `platform-validator` — reproduces and diagnoses root cause |
| **Development** | `platform-developer` — fixes based on validator's diagnosis |
| **Validation** | `platform-validator` — regression tests |
| **Release** | `platform-releaser` |

#### For Strategy Work (Plan → Dev → Validate)

| Phase | Strategy tasks |
|---|---|
| **Planning** | `quant-researcher` — designs mathematical model |
| **Development** | `quant-researcher` — implements strategy code |
| **Validation** | `strategy-validator` — backtests, Monte Carlo, robustness checks |

**Note:** Strategy work typically does NOT have a release phase — strategies are evaluated in the backtesting environment, not deployed to production.

### Key Dynamics (QuantEdge)

1. **Consumer-driven feature requests** — Researchers discover missing tools while working and submit feature requests that must route to the dev team.
2. **Validation is domain-specific** — Strategy validation isn't just "does the code run" but "is this overfitted, robust, and within risk parameters."
3. **Feedback loops** — Research work often generates platform improvement ideas that loop back to dev.
4. **Data dependency chains** — New asset classes or data sources require platform work before any strategy work can begin.
5. **Urgency asymmetry** — A platform bug in production trading affects everything; research work can wait.
6. **Research team has a manager** — `head-of-research` is part of the research team. Critical research decisions go through them. Cross-team conflicts escalate to `cto`.

### Idea Routing (QuantEdge)

| Idea type | Route to |
|---|---|
| Platform technical idea | `platform-architect` (dev team lead) |
| Research direction idea | `head-of-research` (research team lead) |
| Cross-team idea or conflict | `cto` (leadership) |
| Idea from a manager | Auto-accept (skip review) |

---

## Team C: AndroidApp — Mobile App Company

AndroidApp builds a consumer Android application. A **Backend Team** designs and runs the API, database, and services. A **Frontend Team** builds the Android app that consumes those APIs. The two teams interact through **API contracts** — the backend defines endpoints and the frontend consumes them.

This creates a unique PM dynamic: **contract-driven coordination**, where both teams need to agree on interfaces before proceeding independently, and **asymmetric release cycles** (backend deploys continuously, Android goes through Play Store review).

### Backend Team

### `backend-architect`
**Role:** Design API architecture and service topology.

| What they DO | What they DON'T |
|---|---|
| Define API contracts | Implement endpoints |
| Design database schemas | Write Android code |
| Plan service architecture | Deploy infrastructure |
| Create specs | Write automated tests |

**When to assign:** Planning phase of backend features, API contract design, database schema design, service architecture decisions.

**Team lead:** Yes — technical ideas from the backend team are routed here.

---

### `backend-developer`
**Role:** Implement backend services and APIs.

| What they DO | What they DON'T |
|---|---|
| Build REST/GraphQL endpoints | Design architecture |
| Implement business logic | Test APIs with automated tests |
| Manage database queries | Write Android code |
| Fix backend bugs | Design API contracts |

**When to assign:** Development phase of backend tasks, bug fixes, implementing endpoints from specs.

**Important constraints:**
- Does NOT write tests — that's the validator's job
- Does NOT design API contracts — follows the architect's specs

---

### `backend-validator`
**Role:** Test backend correctness and performance.

| What they DO | What they DON'T |
|---|---|
| Write API tests, load tests, integration tests | Implement endpoints |
| Validate data consistency | Design architecture |
| Reproduce backend bugs | Work on Android |

**When to assign:** Validation phase of backend tasks, load testing, API testing, data consistency validation, bug reproduction.

**Important constraints:**
- Does NOT fix bugs or implement features — only reports issues back to PM
- Only validates backend code — NOT Android code

---

### `devops-engineer`
**Role:** Deploy and maintain infrastructure.

| What they DO | What they DON'T |
|---|---|
| Deploy backend services | Implement features |
| Manage CI/CD | Design architecture |
| Configure monitoring | Write Android code |
| Handle incident response | Write tests |
| Manage staging environments | Create specs |
| Submit app releases to Play Store | Fix bugs |

**When to assign:** Release phase of backend tasks, deployments, CI/CD, monitoring, incident response, Play Store submissions.

---

### Frontend (Android) Team

### `android-developer`
**Role:** Implement Android app features.

| What they DO | What they DON'T |
|---|---|
| Build screens, implement navigation | Design API contracts |
| Integrate APIs, manage state | Implement backend logic |
| Handle device compatibility | Do visual polish |
| Build release APKs | Write tests |

**When to assign:** Planning + Development phases of Android tasks, bug fixes, feature implementation, building release APKs.

**Important constraints:**
- Does NOT write tests — that's the validator's job
- Does NOT design API contracts — reads them as specs
- Can plan tasks by reading API contracts (serves as spec for frontend work)

---

### `android-designer`
**Role:** Polish Android UI and UX.

| What they DO | What they DON'T |
|---|---|
| Apply Material Design | Implement business logic |
| Refine animations | Write tests |
| Ensure accessibility | Design backend APIs |
| Handle responsive layouts across devices | Fix bugs |

**When to assign:** Styling phase of Android tasks (after development), visual polish, accessibility, animation refinement.

**Important constraints:**
- Works AFTER the developer has built the feature — needs a working UI to polish
- Does NOT implement features or fix bugs

---

### `android-validator`
**Role:** Test the Android app.

| What they DO | What they DON'T |
|---|---|
| Write UI tests, integration tests | Implement features |
| Test compatibility across API levels/devices | Fix bugs |
| Reproduce Android bugs | Design UI |

**When to assign:** Validation phase of Android tasks, compatibility testing, UI testing, bug reproduction.

**Important constraints:**
- Does NOT fix bugs or implement features — only reports issues back to PM
- Tests across multiple API levels and device configurations

---

### Leadership

### `product-owner`
**Role:** Define app features and priorities.

| What they DO | What they DON'T |
|---|---|
| Prioritize user stories | Implement features |
| Accept/reject features | Design architecture |
| Define acceptance criteria | Manage coordination |
| Make product decisions | Write code |

**When to assign:** Product decisions, feature prioritization, requirement clarification, acceptance reviews.

**Team lead:** Yes — product ideas from any team are routed here. Technical ideas go to `backend-architect`.

---

### Phase-to-Agent Mapping (AndroidApp)

#### For Backend Features (Plan → Dev → Validate → Release)

| Phase | Backend tasks |
|---|---|
| **Planning** | `backend-architect` |
| **Development** | `backend-developer` |
| **Validation** | `backend-validator` |
| **Release** | `devops-engineer` |

#### For Backend Bugs (Reproduce → Dev → Validate → Release)

| Phase | Backend tasks |
|---|---|
| **Reproduction** | `backend-validator` — reproduces and diagnoses root cause |
| **Development** | `backend-developer` — fixes based on validator's diagnosis |
| **Validation** | `backend-validator` — regression tests |
| **Release** | `devops-engineer` |

#### For Frontend (Android) Features (Plan → Dev → Style → Validate)

| Phase | Frontend tasks |
|---|---|
| **Planning** | `android-developer` (reads API contracts as spec) |
| **Development** | `android-developer` → then `android-designer` for polish |
| **Validation** | `android-validator` |

**Note:** Frontend release involves `android-developer` building the release APK → `devops-engineer` submitting to Play Store.

#### For Frontend (Android) Bugs (Reproduce → Dev → Validate)

| Phase | Frontend tasks |
|---|---|
| **Reproduction** | `android-validator` — reproduces with device specifics |
| **Development** | `android-developer` — fixes based on validator's diagnosis |
| **Validation** | `android-validator` — regression tests, cross-device verification |

### Key Dynamics (AndroidApp)

1. **API contract dependency** — Frontend can't start until backend defines the contract. Sometimes the contract needs to be planned jointly.
2. **Asymmetric release cycles** — Backend can deploy hotfixes in minutes; Android requires Play Store review (hours to days).
3. **Device fragmentation** — Bugs may only appear on specific API levels, screen sizes, or manufacturers.
4. **Offline-first concerns** — Frontend must handle poor connectivity, cached data, sync conflicts — backend must support that.
5. **Versioned API rollout** — Backend can't break existing Android versions still in the wild; API versioning is a cross-team concern.

### Idea Routing (AndroidApp)

| Idea type | Route to |
|---|---|
| Backend technical idea | `backend-architect` (backend team lead) |
| Product idea | `product-owner` (product decision-maker) |
| Idea from a manager | Auto-accept (skip review) |

---

## Phase-to-Agent Mapping (Quick Reference — All Teams)

### Features: Plan → Dev → Validate → Release

| Phase | Library (Team A) | Webapp (Team A) | Platform (Team B) | Strategy (Team B) | Backend (Team C) | Frontend (Team C) |
|---|---|---|---|---|---|---|
| **Planning** | `library-architect` | `webapp-developer` | `platform-architect` | `quant-researcher` | `backend-architect` | `android-developer` (reads API contracts) |
| **Development** | `library-developer` | `webapp-developer` → `webapp-styler` | `platform-developer` | `quant-researcher` | `backend-developer` | `android-developer` → `android-designer` |
| **Validation** | `library-validator` | `webapp-validator` | `platform-validator` | `strategy-validator` | `backend-validator` | `android-validator` |
| **Release** | `library-releaser` | (usually no separate release) | `platform-releaser` | (no release phase) | `devops-engineer` | `android-developer` (APK) → `devops-engineer` (Play Store) |

### Bugs: Reproduce → Dev → Validate → Release

| Phase | Library (Team A) | Webapp (Team A) | Platform (Team B) | Backend (Team C) | Frontend (Team C) |
|---|---|---|---|---|---|
| **Reproduction** | `library-validator` | `webapp-validator` | `platform-validator` | `backend-validator` | `android-validator` |
| **Development** | `library-developer` | `webapp-developer` | `platform-developer` | `backend-developer` | `android-developer` |
| **Validation** | `library-validator` | `webapp-validator` | `platform-validator` | `backend-validator` | `android-validator` |
| **Release** | `library-releaser` | (usually no separate release) | `platform-releaser` | `devops-engineer` | `android-developer` (APK) → `devops-engineer` (Play Store) |

---

## Key Rules for the PM

1. **Bugs start with reproduction, not planning** — the validator reproduces the bug and provides technical diagnosis before the developer touches anything.
2. **Never assign planning to a validator or releaser** — they don't design. (Exception: validators reproduce bugs, which is a form of diagnosis, not architectural planning.)
3. **Never assign development to a validator** — they don't implement features or fixes.
4. **Never assign testing to a developer** — they don't write new tests.
5. **Never assign styling to a developer** — styler/designer handles visual polish after development.
6. **Validators never fix bugs** — they reproduce, diagnose, and report. PM creates a dev task from their findings.
7. **Releasers/devops are a gate** — if tests fail, release stops and goes back to PM.
8. **Styler/designer works after developer** — needs a working UI to polish.
9. **Product owner is for decisions, not execution** — consult for clarity, don't assign implementation.
10. **Tag every issue** — use `initiative`, `epic`, `feature`, `bug`, `chore`, or `task` tags so agents know what kind of issue they're working on.
11. **Link related issues** — if features depend on each other or belong to the same goal, wrap them in an Initiative or Epic. No orphaned related work.
12. **PM does NOT evaluate ideas** — route to the right manager. Technical → team lead, product → product-owner, manager-created → auto-accept.
13. **Duplicate check first** — before routing any idea, search `idea`, `todo`, `in-progress`, and `closed` with `idea` tag for duplicates.

### Team-specific rules

**QuantEdge:**
- Platform feature requests from researchers must route to `platform-architect`, not `head-of-research`
- Strategy validation failures are NOT platform bugs — route to `quant-researcher` for refinement
- Cross-team priority conflicts escalate to `cto`
- `head-of-research` handles research direction, NOT platform decisions
- Platform bugs in production trading take priority over scheduled research work

**AndroidApp:**
- Frontend tasks are blocked on API contract definition, NOT on full backend implementation (unless the feature requires a live backend, e.g. WebSockets)
- Android validation must cover multiple API levels and device configurations
- Play Store rejections require a non-standard workflow (not a code bug)
- Backend deploys can happen independently; Android releases go through Play Store review

## Issue Hierarchy & Tags

Every issue the PM creates must be tagged. The hierarchy is:

```
The strict hierarchy (never skip levels):

Task ← Feature/Bug/Chore ← Epic ← Initiative

✅ Feature → Tasks                              (standalone)
✅ Epic → Features → Tasks                      (grouped features)
✅ Initiative → Epics → Features → Tasks        (full hierarchy)

❌ Epic → Tasks           (skipped Feature/Bug/Chore level)
❌ Initiative → Features  (skipped Epic level)
```

| Tag | Level | Who works it | When to use |
|---|---|---|---|
| `initiative` | Top | PM only | Groups related Epics. Use when 2+ epics share a strategic goal. |
| `epic` | Mid | PM only | Groups related Features/Bugs/Chores. Use when 2+ deliverables share a goal. |
| `feature` | Deliverable | PM only | New capability with Plan→Dev→Validate→Release. |
| `bug` | Deliverable | PM only | Fix for broken behavior with Reproduce→Dev→Validate→Release. |
| `chore` | Deliverable | PM only | Technical maintenance without user-facing changes. |
| `task` | Leaf | Worker agent | Individual phase work. The only level assigned to worker agents. |
| `task,sync` | Leaf | PM | Sync tracker — PM's alarm clock for completion notification. |

**When to use each depth:**
- Standalone deliverable: Feature/Bug/Chore → Tasks (2 levels)
- Related deliverables: Epic → Features/Bugs/Chores → Tasks (3 levels)
- Multi-team or large effort: Initiative → Epics → Features/Bugs/Chores → Tasks (4 levels)

## Who Changes Issue Statuses

The PM manages **parent issue** statuses (since the PM is the assignee). Worker agents manage their own **child issue** statuses.

### Worker children — driven by worker agents

| Transition | Who | When |
|---|---|---|
| Create in `todo` | **PM** | During planning |
| Assign agent | **PM** | At creation time |
| `todo` → `in-progress` | **Worker agent** | When work loop wakes the agent |
| `in-progress` → `done` + comment | **Worker agent** | On successful completion |
| `in-progress` → `todo` + reassign to PM | **Worker agent** | When blocked or failed |
| Auto-resolve blockages | **System** | When an issue is marked `done` |

### Parent issues — driven by PM

| Transition | Who | When |
|---|---|---|
| Create parent in `todo` | **PM** | During planning |
| Create children + sync tracker | **PM** | At the same time as parent |
| Parent `todo` → `in-progress` | **PM** | Immediately after creating children — prevents re-waking |
| Sync tracker blockage clears | **System** | When last child is marked `done` |
| PM wakes for sync tracker | **Work loop** | Sync tracker is now unblocked + assigned to PM |
| Sync tracker → `done` | **PM** | After verifying all children completed |
| Parent `in-progress` → `done` | **PM** | After sync tracker confirms completion |
| Parent → `closed` | **PM** | When cancelling or discarding |

### Why the sync tracker?

The work loop won't automatically notify the PM when children complete. The PM must create a **sync tracker** — a child issue assigned to itself, blocked by the last worker child. When that child is marked `done`, the blockage clears and the work loop wakes the PM.

Without the sync tracker, the PM would never know when to close the parent.

### Why `in-progress` on the parent?

If the parent stays `todo`, the work loop wakes the PM every cycle to "work" on it. Setting it to `in-progress` signals: "work is happening through children — don't wake me until the sync tracker fires."

### Status loop exceptions

The PM only intervenes on worker child statuses during the **status loop** (fixing stuck/abandoned issues). Otherwise, the work loop + worker agents drive everything.
