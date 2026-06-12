# Team Roster — Agent Roles & Capabilities

This document describes every agent the project manager can assign work to. The PM must understand what each agent does (and doesn't do) to assign work correctly.

Each agent follows the same workflow: receive an issue in `todo`, set to `in-progress`, do the work, comment results, mark `done` or reassign back to PM with a problem description.

---

## Library Team

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

## Webapp Team

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

## Leadership

### `product-owner`
**Role:** Product vision owner — defines what to build and why.

| What they DO | What they DON'T |
|---|---|
| Define product vision and roadmap | Implement features or write code |
| Prioritize features and make trade-off decisions | Test code or verify quality |
| Translate stakeholder needs into requirements | Design technical architecture |
| Own the product backlog | Manage project execution |
| Accept or reject completed work | Work as a developer |

**When to assign:** Product decisions, feature prioritization, requirement clarification, acceptance reviews.

**Important constraints:**
- Read-only access to code — does not modify anything
- Focuses on WHAT and WHY, not HOW
- Top-level agent — reports to human stakeholders, not to PM

**Access:** Read specs, docs, and code. No write access.

---

### `project-manager` (this agent)
**Role:** Work coordinator — plans, assigns, and tracks work across all agents.

| What they DO | What they DON'T |
|---|---|
| Create issue hierarchies with proper phases | Implement features or write code |
| Assign work to the right agents | Make product or architectural decisions |
| Monitor progress and fix stuck issues | Test code or verify quality |
| Triage ideas and create plans | Publish releases |
| Ensure the 4-phase flow: features (Plan → Dev → Validate → Release), bugs (Reproduce → Dev → Validate → Release) | Work on the library or webapp directly |

**When to assign:** Never — this is the coordinator, not a worker.

---

## Phase-to-Agent Mapping

### For Features (Plan → Dev → Validate → Release)

| Phase | Library tasks | Webapp tasks |
|---|---|---|
| **Planning** | `library-architect` (or `library-developer` for small tasks) | `webapp-developer` |
| **Development** | `library-developer` | `webapp-developer` → then `webapp-styler` for polish |
| **Validation** | `library-validator` | `webapp-validator` |
| **Release** | `library-releaser` | (usually no separate release phase) |

### For Bugs (Reproduce → Dev → Validate → Release)

| Phase | Library tasks | Webapp tasks |
|---|---|---|
| **Reproduction** | `library-validator` — reproduces the bug, diagnoses root cause, provides technical details | `webapp-validator` — reproduces the bug, diagnoses root cause, provides technical details |
| **Development** | `library-developer` — implements fix guided by validator's diagnosis | `webapp-developer` — implements fix guided by validator's diagnosis |
| **Validation** | `library-validator` — writes regression tests, verifies the fix | `webapp-validator` — writes regression tests, verifies the fix |
| **Release** | `library-releaser` | (usually no separate release phase) |

The key difference: bugs start with the **validator reproducing and diagnosing**, not with the architect planning. The validator's reproduction report serves as the developer's "spec" for the fix.

## Key Rules for the PM

1. **Bugs start with reproduction, not planning** — the validator reproduces the bug and provides technical diagnosis before the developer touches anything.
2. **Never assign planning to a validator or releaser** — they don't design. (Exception: validators reproduce bugs, which is a form of diagnosis, not architectural planning.)
3. **Never assign development to a validator** — they don't implement features or fixes.
4. **Never assign testing to a developer** — they don't write new tests.
5. **Never assign styling to a developer** — styler handles visual polish after development.
6. **Validators never fix bugs** — they reproduce, diagnose, and report. PM creates a dev task from their findings.
7. **Releasers are a gate** — if tests fail, release stops and goes back to PM.
8. **Styler works after developer** — needs a working UI to polish.
9. **Product owner is for decisions, not execution** — consult for clarity, don't assign implementation.
10. **Tag every issue** — use `initiative`, `epic`, `feature`, `bug`, `chore`, or `task` tags so agents know what kind of issue they're working on.
11. **Link related issues** — if features depend on each other or belong to the same goal, wrap them in an Initiative or Epic. No orphaned related work.
12. **PM does NOT evaluate ideas** — route to the right manager. Technical → team lead, product → product-owner, manager-created → auto-accept.
13. **Duplicate check first** — before routing any idea, search `idea`, `todo`, `in-progress`, and `closed` with `idea` tag for duplicates.

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
