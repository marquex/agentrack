# Story 24: Production Hotfix vs Scheduled Work

## Loop
Work Loop + Project Status Loop

## Description
The execution engine has a critical bug — it's double-submitting orders in production. Meanwhile, `platform-developer` is mid-way through implementing a data normalization pipeline. The PM must create an urgent hotfix bug, pull the developer off their current task, fix the production issue, then reassign the developer back to the pipeline. Tests urgent interruption handling, context switching, and work resumption.

## Initial Conditions

- **Work queue:** Has an active task
- **Input:** Critical bug report: "Execution engine double-submitting orders in production — orders are being sent twice to the exchange"
- **agentrack state:**
  - Issue #240 (parent): "Build data normalization pipeline" — status: `in-progress`, assignee: `project-manager`
  - Issue #241: "Design data normalization pipeline" — status: `done`, assignee: `platform-architect`
  - Issue #242: "Implement data normalization pipeline" — status: `in-progress`, assignee: `platform-developer`
    - Has a comment from `platform-developer`: "In progress. Completed the data ingestion module, working on the transformation layer. About 60% done."
  - Issue #243: "Validate data normalization pipeline" — status: `todo`, blocked by #242, assignee: `platform-validator`
  - Issue #244: "Release data normalization pipeline" — status: `todo`, blocked by #243, assignee: `platform-releaser`

### Team Context

> See [Team Roster](00-team-roster.md) for all agent roles.

| Agent | Current state |
|---|---|
| `platform-developer` | **ACTIVE** — currently implementing data normalization pipeline (#242, in-progress). Must be pulled off for hotfix. |
| `platform-validator` | Blocked — waiting on #242 for pipeline validation. Available for hotfix reproduction. |
| `platform-releaser` | Blocked — waiting on #244. Available for emergency deployment. |
| `platform-architect` | Idle — completed pipeline design (#241). Available for consultation if needed. |

## User Story

1. The PM receives a critical bug report about the execution engine double-submitting orders.
2. The PM recognizes this is **critical priority** — production trading impact, potential financial loss every minute.
3. The PM creates the hotfix bug and pulls `platform-developer` off the pipeline work.
4. After the hotfix is deployed, the PM reassigns the developer back to the pipeline work.

## Expected Output

### Phase 1: Create Hotfix and Interrupt Pipeline Work

The PM should:

1. Acknowledge the critical production issue
2. Create the hotfix bug:
   ```
   Bug: "Fix execution engine double-submitting orders in production" (tag: bug, assigned: project-manager, status: in-progress)
   ├── Task: "Reproduce and diagnose double order submission" (tag: task, assigned: platform-validator, status: todo, phase: reproduction)
   │   Comment: "CRITICAL — production issue. Execution engine is double-submitting orders
   │   to the exchange. Reproduce in test environment and find root cause."
   ├── Task: "Fix double order submission" (tag: task, assigned: platform-developer, status: todo, phase: development)
   │   └── Blocked by "Reproduce" task
   ├── Task: "Validate double submission fix" (tag: task, assigned: platform-validator, status: todo, phase: validation)
   │   └── Blocked by "Fix" task
   ├── Task: "Emergency deploy double submission fix" (tag: task, assigned: platform-releaser, status: todo, phase: release)
   │   └── Blocked by "Validate" task
   ```
3. Interrupt the pipeline work:
   - Reassign Issue #242 from `platform-developer` to `project-manager`
   - Set Issue #242 status: `in-progress` → `todo`
   - Add comment to #242: "PAUSED — critical production hotfix takes priority. Developer pulled off pipeline work. Developer was ~60% through the transformation layer. Will resume after hotfix is deployed."
4. Add comment to Issue #240 (pipeline parent): "Pipeline work paused due to critical production hotfix. Developer reassigned. Will resume after hotfix deployment."

### Phase 2: Hotfix Execution (driven by worker agents)

5. Work loop wakes `platform-validator` (reproduction task is todo, unblocked)
   - Validator reproduces in test environment, finds root cause
   - Validator adds comment: "Reproduced. Root cause: OrderSubmitter.submit() lacks idempotency check. Network retry mechanism resubmits the same order on timeout, but the original request may have already succeeded. Race condition between confirmation listener and retry timer. Fix: add order ID deduplication before submission."
   - Validator marks reproduction task `done`
6. Work loop wakes `platform-developer` (fix task is now unblocked)
   - Developer reads diagnosis, implements idempotency check
   - Developer adds comment: "Fixed. Added order ID deduplication in OrderSubmitter. Duplicate orders are now caught before reaching the exchange. Added retry-safe submission with idempotency key."
   - Developer marks fix task `done`
7. Work loop wakes `platform-validator` (validation task is now unblocked)
   - Validator writes regression tests, verifies fix
   - Validator adds comment: "Regression tests added. Tested with simulated network timeouts — no duplicate submissions. Fix verified."
   - Validator marks validation task `done`
8. Work loop wakes `platform-releaser` (deploy task is now unblocked)
   - Releaser runs validation suite, builds, deploys to production
   - Releaser adds comment: "Emergency deployed to production. All validation passed. Monitoring for duplicate submissions."
   - Releaser marks deploy task `done`
9. All hotfix children are now done

### Phase 3: Resume Pipeline Work

10. Status loop runs → finds the hotfix Bug in-progress + every child done → the Bug has NO parent (top-level) → PM closes it and closes every child (Bug → closed, children → closed)
11. PM **resumes the pipeline work**:
    - Reassign Issue #242 back to `platform-developer` (from `project-manager`)
    - Keep Issue #242 status as `todo` (it was paused mid-implementation)
    - Add comment to #242: "Hotfix deployed. Resuming pipeline work. Developer was ~60% through the transformation layer — pick up where you left off."
12. The work loop will pick up Issue #242 and wake the developer to continue

**The full timeline:**

```
Pipeline work in progress (#242 in-progress, developer working)
       │
       ▼
Critical bug reported → PM creates hotfix bug
       │
       ├── #242: in-progress → todo, reassigned from developer → PM (PAUSED)
       │
       ▼
Hotfix lifecycle: reproduce → fix → validate → deploy
       │
       ▼
Hotfix deployed → PM marks hotfix done
       │
       ├── #242: todo, reassigned from PM → developer (RESUMED)
       │
       ▼
Pipeline work resumes (#242 todo → in-progress, developer continues)
```

**Assignment rationale:**

*Hotfix Bug:*
- **Reproduction → `platform-validator`**: The validator is available (blocked on pipeline work) and can immediately start reproducing the production issue. Critical bugs need fast, methodical diagnosis.
- **Development → `platform-developer`**: The developer is pulled off the pipeline to fix the hotfix. This is the same developer, ensuring they're available immediately. The context switch is acknowledged.
- **Validation → `platform-validator`**: Standard regression testing after the fix.
- **Release → `platform-releaser`**: Emergency deployment to production — the releaser deploys the fix immediately.

*Pipeline Work (resumed):*
- Same agents as before — the pipeline Feature retains its original plan. Only the implementation task (#242) was paused, not replanned.

**Key behaviors:**
- The PM acts decisively — production issues take absolute priority over scheduled work
- The PM pulls `platform-developer` off in-flight work by reassigning #242 back to itself with status `todo` and a detailed context comment
- The PM preserves the developer's progress context ("~60% through transformation layer") so the developer can resume efficiently
- The PM communicates clearly: the pipeline task comment explains WHY work was paused and WHAT will happen next
- After the hotfix is deployed, the PM **resumes** the pipeline work — same task, same developer, same plan
- The pipeline Feature's other tasks (#243, #244) remain blocked/unaffected — only the in-flight task is paused
- The hotfix follows the standard bug lifecycle (Reproduce → Dev → Validate → Release) with added urgency
- **This is a status loop exception** — the PM directly reassigns and changes the status of #242, which is normally driven by worker agents. But interrupting in-flight work for production hotfixes is a PM-initiated intervention.

## Notes
- This is the most critical PM skill for QuantEdge — trading production bugs have real financial impact and demand immediate response
- The context switch pattern (pause → hotfix → resume) is different from Story 19 (replanning mid-flight) — here the original work is PAUSED, not cancelled. The developer will return to it.
- If the developer had been close to finishing the pipeline task (e.g., 95% done), the PM might consider letting them finish first. But with 60% remaining and a production issue, pulling them off is the right call.
- The hotfix bug has no "planning" phase — it follows the bug lifecycle (Reproduce → Dev → Validate → Release), not the feature lifecycle
- If the hotfix reveals a deeper architectural issue (e.g., "the retry mechanism design is fundamentally flawed"), the PM might create a follow-up feature for a proper redesign after the emergency fix
- The PM should consider whether the pipeline work's spec needs any updates after the hotfix — unlikely in this scenario, but possible if the hotfix affects shared infrastructure
