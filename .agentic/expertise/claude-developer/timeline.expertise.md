# Claude Developer — Work Timeline

## 2026-06-05 Bulk update of agent "Coordinating Work" section

Replaced the `## Using agentrack as the issue tracker` section with `## Coordinating Work` (sourced from `.claude/skills/hire-expert/SKILL.md`) across 9 agent files in `.claude/agents/`. All agents had identical old section text.

**Affected files:** library-validator, project-manager, webapp-styler, webapp-validator, product-owner, library-developer, webapp-developer, library-releaser, library-architect.

**Learnings:**
- Agent files share common sections with identical wording, enabling efficient bulk edits.
- Absolute paths can fail in sandboxed environments — prefer relative paths.
- The `SKILL.md` at `.claude/skills/hire-expert/` is the canonical reference for shared agent sections.

**Related topics:** [agent-system-files.expertise.md](agent-system-files.expertise.md)

## 2026-06-12 Created 8 new PM training stories (20-27) for multi-team suite

Created stories for two new teams (QuantEdge and AndroidApp) in `.agentic/project-manager-suite/`. Each story tests PM skills stressed by specific team dynamics.

**New files:**
- `20-consumer-to-provider-request.md` -- QuantEdge: bottom-up feature routing across consumer-producer boundary
- `21-api-contract-joint-planning.md` -- AndroidApp: contract-level vs implementation-level dependency
- `22-strategy-validation-not-bug.md` -- QuantEdge: distinguishing code bugs from domain issues (overfitting)
- `23-device-specific-bug-triage.md` -- AndroidApp: scoped frontend-only bug with device-specific reproduction
- `24-production-hotfix.md` -- QuantEdge: urgent interruption of in-flight work for production hotfix
- `25-play-store-rejection.md` -- AndroidApp: external blocker (Play Store policy) requiring non-standard workflow
- `26-research-generates-platform-idea.md` -- QuantEdge: proactive idea creation from agent comments during status loop
- `27-backend-first-dependency.md` -- AndroidApp: live service dependency (WebSocket needs running backend)

**Learnings:**
- Stories follow a strict section structure: Loop, Description, Initial Conditions, Team Available, User Story, Expected Output, Notes
- Issue trees must show proper tags, assignments, statuses, blockages, and sync trackers
- Cross-team stories use 4-level hierarchy (Initiative -> Epic -> Feature -> Task)
- Stories 20-27 reference `00-team-roster.md` which now covers 3 teams (Library+Webapp, QuantEdge, AndroidApp)
- The `more-teams.md` file contains the planning rationale and story proposals that were implemented as stories 20-27

**Related topics:** Project manager training suite
