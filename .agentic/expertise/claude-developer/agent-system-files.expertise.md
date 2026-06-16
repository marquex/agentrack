# Agent System Files

## When To Use This

Tasks involving updating, creating, or reviewing agent system prompt files. Bulk edits across multiple agents. Changes to shared sections like "Coordinating Work".

## Mental Model

Agent system files live in `.claude/agents/` as Markdown files (e.g., `library-developer.md`, `project-manager.md`).

**Known agent files:**
- `library-validator.md` — Library quality engineer
- `project-manager.md` — Project execution manager
- `webapp-styler.md` — Webapp styling expert
- `webapp-validator.md` — Webapp quality engineer
- `product-owner.md` — Product vision owner
- `library-developer.md` — TypeScript library developer
- `webapp-developer.md` — Webapp expert engineer
- `library-releaser.md` — Library release engineer
- `library-architect.md` — Library architect

**Common sections across agents:**
- `## Coordinating Work` — Defines how agents interact with agentrack issues and the project-manager. All agents share identical wording for this section.

**Reference sources:**
- `.claude/skills/hire-expert/SKILL.md` — Contains canonical versions of shared agent sections (e.g., the "Coordinating Work" template).

## Key Patterns

- When agents share a common section, all files typically have identical text, enabling single `old_string` → `new_string` Edit across all files.
- Use `grep -rl` to find which agents contain a target section before editing.
- After bulk edits, verify with `grep -c` to confirm each file has exactly one instance of the new section.

## Gotchas

- **🚨 CRITICAL: `skills:` frontmatter field does NOT preload skill content when the agent is run via `claude --agent <name>` from the CLI.** Verified empirically (2026-06-14, claude 2.1.177) with a canary string: the `skills:` field only preloads for subagents launched from a parent session via the Task tool. For CLI-invoked main-session agents, skills are on-demand only; with `--tools ""` (test mode) they cannot be invoked at all.
- **ARCHITECTURE (final, 2026-06-14): rules live ONLY in the skill; the agent file is lean.** The `project-manager.md` agent file holds only personality/responsibility + "load the `issue-managing` skill" + constants. The `issue-managing/SKILL.md` is the **single source of truth** for all rules. Three delivery paths make this work: (1) subagent PM → `skills:` preloads it; (2) production main-session PM → the agent has the Read tool and reads the file itself (the agent file instructs it to); (3) test mode (`--tools ""`) → **the test runner injects the skill** via `--append-system-prompt` (see `loadIssueManagingSkill()` / `buildAppendSystemPrompt()` in `test-runner.ts`). This was done because the user insisted on zero duplication; a previous design (verbatim copy in both files) and an intermediate one (canonical agent file + checklist skill) were both rejected as still-duplicative. **Do NOT re-inline the rules into the agent file** — that re-introduces the duplication the user objected to.
- **The lean agent file can cause REGRESSIONS if a rule's wording is too loose.** With the rich agent-file context gone, the model follows injected skill rules MORE LITERALLY and will exploit loopholes. Example: the status-loop rule said "blocked by a done issue → manually resolve (stale blockage exception)"; the agent then resolved blockages in Story 08 (where the expected behavior is WAIT — the auto-clear already worked). The fix had to close the loophole explicitly: "Never infer auto-clear failure from circumstantial evidence (hours elapsed, developer free). Only manually resolve when the scenario EXPLICITLY states the blockage failed to auto-clear." **When a status-loop / edge-case story regresses after moving rules to the skill, tighten the rule's wording rather than re-inlining it.**
- **Path resolution**: The sandbox may reject absolute paths (e.g., `/Users/.../projects/agentrack/.claude/`). Always use relative paths from the project root (e.g., `.claude/agents/`). If path errors occur, run `pwd` to confirm the working directory first. Note: a background `cd` into a subdirectory persists for later commands and broke a `bun ... .agentic/...` invocation — prefer absolute project-root paths or `cd /Users/javi/projects/agentrack && ...`.
- **Keep skills CONCISE and rule-based; fix bloat by deleting, not only adding.** The user explicitly pushed back on an over-long `issue-managing` skill and asked for "concise with clear rules". The fix was to restructure and cut (283 → 196 → 153 lines), not append more. When a skill grows past a few hundred lines, look for redundancy and merge/delete before adding new sections. The same concision applies to the agent system prompt itself.
- **Skills that drive a coordinator (e.g., the PM) must be TEAM/ORG-INDEPENDENT.** The skill is the generic rulebook; the concrete team roster is injected at runtime (in tests via `TEAM_ROSTERS`/`--append-system-prompt` in `test-runner.ts`; in production via the agent's own Read of roster files). If the skill's examples name specific teams (`Library + Webapp`, `Android`, `QuantEdge`) or specific agent handles (`product-owner`, `cto`, `platform-architect`, `quant-researcher`), the skill will bias the PM toward that org shape and break for any other team. Use role/layer abstractions instead ("data/backend layer team", "the team's architect/tech lead", "the consumer team's worker who will actually use the output"). The generic phase-role vocabulary (worker, developer, validator, architect, styler, releaser) is fine — those are roles, not suite agents.
- **Empirically verify skill-preload behavior with a canary.** To confirm whether skill content loads in a given invocation mode, inject a unique canary string (e.g. `zebra-mango-47`) into the SKILL.md only, then ask the agent via `claude --agent <name> --tools "" -p "is 'zebra-mango-47' in your context?" --print`. A "No" confirms skills don't preload. Remove the canary after. Faster and more reliable than reasoning from docs.
- **Model aliases can alias to the SAME underlying model.** In this project's `.claude/settings.json` the API is a `z.ai` proxy where `ANTHROPIC_DEFAULT_OPUS_MODEL` and `ANTHROPIC_DEFAULT_SONNET_MODEL` both map to `glm-5.2[1m]`. So switching an agent's `model: opus` → `sonnet` does NOT change latency or quality (same model). `haiku` maps to `glm-4.6V` (a weaker vision model). **Do not propose model-swap as a speed lever without checking the alias mapping first.**

## Related Topics

- None yet.

## Timeline

- **2026-06-05**: Replaced `## Using agentrack as the issue tracker` with `## Coordinating Work` across all 9 agent files. Learned the structure of agent files and the shared-section pattern.
- **2026-06-13**: Added inline operational patterns to `project-manager.md` (work-loop mechanics, sync tracker, hierarchy/tags, phase flows, three loops, cross-team patterns, special scenarios) + created `issue-managing` skill as synced reference. ALL 27 test scenarios pass at ≥85%. **Key discovery: `skills:` frontmatter does NOT preload in `--agent` CLI mode — must inline critical content in the agent prompt.**
- **2026-06-14**: Refactored the issue hierarchy model from "cross-team always 4 levels / never skip levels" to **bottom-up grouping with a strict no-single-child-parent rule** (a parent exists only to group 2+ related issues). The 3 cross-team stories (03/20/27) collapsed from Initiative→Epic(per team)→Feature→Task to Epic→Feature→Task. Propagated across **8 files**: agent prompt, skill, 3 stories, `00-team-roster.md`, `README.md`, and the judge's hierarchy criterion in `test-runner.ts`. All 3 re-scored at 91–100%; suite holds at 27/27 pass (avg 95%). **Lesson reinforced: a single hierarchy rule is duplicated across the agent prompt AND the skill (verbatim), and the judge prompt encodes its own copy — all three plus the scenario Expected Outputs must be edited in lockstep.**
- **2026-06-14 (PM restructure, attempt 1)**: Separated the `project-manager.md` agent prompt from the `issue-managing` skill, which had been ~90% verbatim duplicates. **Verified empirically (canary test) that `skills:` does NOT preload in `claude --agent` mode.** Attempt 1 kept the agent file self-contained (canonical) + skill as a 153-line checklist. Added a **joint-design clarification** (the agreement is a gate, never a phase replacement): when the contract is a separate feature, each downstream implementation feature keeps its OWN Plan task — lifted scenario 21 from 84% → 93%. **Speed analysis: `opus` and `sonnet` aliases both map to `glm-5.2[1m]` in settings.json, so model-swap is NOT a speed lever here.**
- **2026-06-14 (PM restructure, attempt 2 — FINAL)**: User rejected attempt 1 as still-duplicative and required rules to live ONLY in the skill with the agent loading the skill. Final architecture: lean agent file (personality + "load the issue-managing skill" + constants); `issue-managing/SKILL.md` = single source of truth (full rulebook); **the test runner was modified to inject the skill** via `--append-system-prompt` (`loadIssueManagingSkill()`/`buildAppendSystemPrompt()` in `test-runner.ts`), because test mode (`--tools ""`) can't read files and skills don't preload in `--agent` mode. Moving the rules out of the rich agent-file context caused a **status-loop regression** (Story 08: 94%→71%→63%→86%) because the agent followed the "stale blockage → resolve" rule too literally and exploited a loophole ("hours elapsed + free developer ⇒ auto-clear failed"). Fix: rewrote the rule to "never infer auto-clear failure from circumstantial evidence; only manually resolve when the scenario EXPLICITLY states the blockage failed to auto-clear" + "status loop does NOT restructure issues (no sync-tracker creation)". Final suite: **27/27 pass, avg 95.3% (66.7/70)**, every scenario ≥86%. **Key lesson: a lean agent file makes the model follow injected skill rules more literally — tighten rule wording to close loopholes rather than re-inlining.**
- **2026-06-14 (skill team-independence audit)**: Generalized the `issue-managing` skill so it never names a suite-specific team or agent in its examples. Removed references to `Library + Webapp`, `Android`/`Play Store`, `backend`/`frontend`/`platform`/`research`, and roster handles (`product-owner`, `cto`, `head-of-research`, `*-architect`, `quant-researcher`) from ~10 lines, replacing them with role/layer abstractions ("data/backend layer team", "client/frontend team", "the team's architect/tech lead", "the consumer team's worker who will actually use the output", "external store/marketplace rejection"). Kept the generic phase-role vocabulary (worker, developer, validator, architect, styler, releaser, manager) — those are role abstractions, not suite agents. **Key principle: a skill is the rulebook; the test harness injects the concrete team roster at runtime (`TEAM_ROSTERS` in `test-runner.ts`). The skill must NOT hardcode team/agent names, or it will fight the injected roster and mislead the PM for any team it wasn't built against.** Verify with `grep -noE "platform-architect|backend-architect|quant-researcher|head-of-research|product-owner|cto|Library \+ Webapp|Android|Play Store|webapp" SKILL.md` (watch for false positives like "cto" inside "refa**cto**r").

- **2026-06-15 (completion sync tracker removal)**: Rewrote `issue-managing/SKILL.md` to remove the "sync tracker = completion alarm" pattern and replace it with **status-loop-driven parent completion**. New rule: the status loop scans `in-progress` parents assigned to the PM and completes any whose children are ALL `done` ÃÂ¢ done-vs-closed cascade (has parent ÃÃÂ¢ `done`; no parent ÃÃÂ¢ `closed` + close descendants). `task,sync` tags were reframed as **gate-only** (collaborative decision gates: design agreement, idea review) ÃÂ¢ never for completion. This is the single largest rule change to the skill to date (~20 files touched across skill, runner, 15 scenarios, roster, README, +2 new scenarios 28/29). The skill's operational shape changed enough that any future "sync tracker" reference in the agent file or skill must be checked for whether it means a gate or the removed completion pattern.
- **2026-06-15 (skill team-independence check)**: The completion-mechanism rewrite introduced new examples (status-loop completion, done-vs-closed). These were kept team/agent-independent (role abstractions only), consistent with the 2026-06-14 audit.

## Gaps And Validation Needs

- The list of agent files above may become stale as new agents are added or removed. Re-scan `.claude/agents/` when working in this area.
