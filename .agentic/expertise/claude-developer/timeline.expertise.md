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

## 2026-06-13 Created PM agent test suite (test-runner.ts)

Built an automated test suite that evaluates the `project-manager` agent against the 27-scenario catalog in `.agentic/project-manager-suite/`. Originated from a task to make the PM agent master the issue tracker for any team project; the suite enables systematic, scored evaluation so the PM agent file can be iteratively improved.

**New files:**
- `.agentic/project-manager-suite/test-runner.ts` — Bun/TypeScript test runner
- `.agentic/project-manager-suite/testing.md` — Usage documentation
- `.agentic/project-manager-suite/test-results/` — per-scenario results + summary

**Learnings:** testing mode via `--tools ""` (agent returns a plan, no agentrack side effects); `structured_output` (not `result`) holds parsed JSON under `--json-schema`; judge must demand pure JSON; two-phase `--no-judge`/`--judge-only` workflow to iterate on judge criteria cheaply.

Full mental model, CLI patterns, 7-dimension scoring, and source-file map now live in the dedicated topic: [agent-testing.expertise.md](agent-testing.expertise.md).

**Related topics:** [agent-testing](agent-testing.expertise.md), [agent-system-files](agent-system-files.expertise.md)

## 2026-06-13 Attempted PM suite baseline run (interrupted)

Task: run all 27 scenarios against the `project-manager` agent and write a base score to `.agentic/project-manager-suite/initial-scores.md` so future improvements can be measured against it. **Outcome: NOT completed** — the session was interrupted (`process_end`) during a single-scenario smoke test; the full suite never ran and `initial-scores.md` was not created.

**What did get done:**
- Confirmed setup: 27 scenarios present; `test-runner.ts` `--list` works; `claude` CLI is **v2.1.177**. Existing `test-results/summary.json` held only a partial result (#07); per-scenario files existed for 01/07/18.
- Acted on the expert-manager's flag-drift warning by smoke-testing one scenario (`--scenario 04 --verbose`) before the expensive full run — good practice.

**Learnings / gotchas captured:**
- **`timeout` is not on macOS** — `timeout 400 bun run ...` failed with `command not found: timeout`. The runner has its own internal timeouts (5-min PM, 2-min judge), so no external `timeout` wrapper is needed.
- Verified CLI flags compatible with `claude` 2.1.177: `--tools ""`, `--append-system-prompt`, `--output-format json`, `--json-schema`, plus runner flags `--list`, `--scenario`, `--verbose`.
- Cost reality check: 27 scenarios × 2 claude calls ≈ 54 calls; ~60–90 min if fast, up to ~3 h worst case. Plan a long background run and don't expect quick iteration.
- Expert-manager context was reported as "solid"/"good" and directly shaped the plan (flag verification, two-phase awareness).

**Next time:** re-run the full suite end-to-end and actually write `initial-scores.md`; consider `--no-judge` first to collect PM responses cheaply, then `--judge-only` to score.

**Related topics:** [agent-testing](agent-testing.expertise.md)

## 2026-06-13 Completed PM suite baseline + raised runner timeouts

Picked up the interrupted baseline task and finished it: ran all 27 scenarios end-to-end and wrote the pre-improvement baseline to `.agentic/project-manager-suite/initial-scores.md`.

**Outcome:** 27/27 scored. **9/27 pass (33.3%), avg 39.6/70 (56.6%).** Weakest dimension `syncPattern` (3.7); weakest loop Work Loop (30.4 avg, 1/11 pass); weakest team AndroidApp (33.2, 1/10). Diagnosis: `project-manager.md` is generic and omits the sync-tracker pattern, parent-status rules, and strict hierarchy/tag rules the suite rewards — those are the improvement targets. Assignments (7.0) and pure-reasoning status-loop scenarios are the strengths to preserve.

**Files:**
- `.agentic/project-manager-suite/initial-scores.md` — human-readable baseline (headline, dimension/team/loop breakdowns, full 27-row per-scenario table, diagnosis, methodology).
- `.agentic/project-manager-suite/regenerate-summary.ts` — NEW utility: rebuilds `test-results/summary.json` from on-disk per-scenario files after piecemeal re-runs (the runner only writes summary.json for >1-scenario runs). Portable (import.meta.dir). Documented in `testing.md`.

**Changes to the runner (`test-runner.ts`):** raised internal timeouts — **judge 120 s → 300 s**, **PM agent 300 s → 600 s**. The original 120 s judge limit caused repeated `spawnSync /bin/bash ETIMEDOUT` on several scenarios (08, 11, 13 timed out 3–6× each); a one-off 300 s judge call resolved them every time, so 300 s is now the default. (PM-agent timeouts under the original 300 s were transient/load-related and also succeeded on re-run; bumped to 600 s for headroom since the PM runs on opus.)

**Learnings / gotchas captured (also in agent-testing.expertise.md):**
- 8/27 scenarios errored on timeouts during the first full pass (4 PM, 4 judge); all recovered via targeted single-scenario re-runs. **Re-run just the failed scenario (`--scenario NN` or `--scenario NN --judge-only`), not the whole suite.**
- `claude agents` / `claude agents --json` lists running **sessions**, not agent definitions — useless for validating an agent file. To validate the agent definition, just invoke it (the runner does, 27×).
- `enforce-agent-access.ts` scans the Bash command line for path-like tokens: inline `bun -e "...require('/abs/path')..."` and shell var assignments (`RUNNER=/abs/path`) get blocked. Use script files with paths passed as args, or the Read/Write/Edit tools.
- Bash shell cwd persists across calls (a `cd dir && ...` sticks); Read/Write/Edit are project-root-relative and unaffected. Use absolute paths in Bash after any cd.
- Foreground `sleep N` is blocked by the harness; use a background `until <cond>; do sleep N; done` monitor to wait on conditions.

**Next step:** edit `project-manager.md` to add the missing mechanics (sync tracker, parent status, hierarchy/tags, per-team phase maps) and re-run the FULL suite to measure the delta against `initial-scores.md`.

**Related topics:** [agent-testing](agent-testing.expertise.md), [agent-system-files](agent-system-files.expertise.md)

## 2026-06-13 Built `issue-managing` skill + iterated PM agent to ≥85% on all 27 scenarios

Took the baseline (33.3% pass) and drove it to the goal: every one of the 27 scenarios at ≥85% (avg ~66/70, ~94%). Created `.claude/skills/issue-managing/SKILL.md` (sync tracker, hierarchy/tags, three loops, status ownership, phase flows, cross-team) and wired it into `project-manager.md` via the `skills:` frontmatter.

**Methodology that worked (story-by-story):** user explicitly killed batch runs. Run ONE scenario, inspect the agent's literal response, diagnose the WRONG mental model behind the failure, add a targeted corrective rule that debunks that specific misconception, then re-test that one scenario; repeat until pass, then move on.
- Story 01 scope creep — agent treated the team name "Library + Webapp" as requiring both subteams → rule "the team name describes the org, not the request's scope" → 66/70 (94%, PASS).
- Story 02 — agent modeled the sync tracker as an "active monitoring hub" (in-progress, unblocked) instead of a "gated alarm clock" (todo, blocked by last worker) → added a "🚫 COMMON MISCONCEPTION" callout that directly debunks the hub model.
- Per user feedback, kept the skill CONCISE and rule-based: condensed 283→196 lines by deleting/restructuring, not only adding.

**Key discovery (the breakthrough):** the `skills:` frontmatter field does NOT preload skill content when the agent runs via `claude --agent <name>` from the CLI — it only preloads for subagents launched via the Task tool. In test mode (`--tools ""`) the agent could not read the skill file at all, so skill edits had zero effect for hours. **Solution: inline the operational content directly into `project-manager.md`; keep the skill as a synced reference.**

**Note on completeness:** the `ac93f46b` log captures the skill creation, the skills-preload discovery, the story-by-story switch, story 01 passing, and story 02 iteration, but ends interrupted mid-story-02 (process_end). The all-27-pass completion came in continuation sessions; that outcome is reflected in the topic files ([agent-testing](agent-testing.expertise.md), [agent-system-files](agent-system-files.expertise.md)).

**Files:** `.claude/skills/issue-managing/SKILL.md` (created), `.claude/agents/project-manager.md` (`skills:` frontmatter + inlined operational content), helper scripts `validate-skill.ts` / `inspect.ts` in `.agentic/project-manager-suite/`.

**Related topics:** [agent-testing](agent-testing.expertise.md), [agent-system-files](agent-system-files.expertise.md)

## 2026-06-14 Restructured PM agent file vs. issue-managing skill (remove duplication)

Task: the `project-manager.md` agent file and `.claude/skills/issue-managing/SKILL.md` were ~90% verbatim duplicates; restructure so the agent file holds only personality/responsibility and the skill is the single source of rules. The work spanned multiple sessions (the first session, `0707fb36`, was interrupted during the initial file-investigation phase before any edits).

**Final architecture:** lean agent file (personality + "load the `issue-managing` skill" + constants); `SKILL.md` = full rulebook; **the test runner was modified to inject the skill** via `--append-system-prompt` (`loadIssueManagingSkill()`/`buildAppendSystemPrompt()` in `test-runner.ts`), because test mode (`--tools ""`) can't read files and `skills:` doesn't preload in `--agent` mode. An intermediate "canonical agent file + checklist skill" design was rejected as still-duplicative.

**Regression & fix:** moving rules out of the rich agent-file context made the model follow injected skill rules MORE LITERALLY and exploit a loophole in the status-loop rule (Story 08: agent inferred "auto-clear failed" from circumstantial evidence and wrongly resolved blockages). Fix: tightened the rule wording ("never infer auto-clear failure from circumstantial evidence; only manually resolve when the scenario EXPLICITLY states the blockage failed to auto-clear") rather than re-inlining.

**Outcome:** suite holds at 27/27 pass, avg 95.3% (66.7/70), every scenario ≥86%.

**Key lessons:** (1) a lean agent file makes the model follow injected rules more literally — tighten wording to close loopholes; (2) `opus` and `sonnet` aliases both map to `glm-5.2[1m]` in this project's settings, so model-swap is NOT a speed lever.

**Full detail (architecture, decisions, rejected designs, canary verification) lives in the topic file:** [agent-system-files.expertise.md](agent-system-files.expertise.md) (Timeline + Gotchas).

**Related topics:** [agent-system-files](agent-system-files.expertise.md), [agent-testing](agent-testing.expertise.md)

