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

- **🚨 CRITICAL: `skills:` frontmatter field does NOT preload skill content when the agent is run via `claude --agent <name>` from the CLI.** The `skills:` field only preloads for subagents launched from a parent session via the Task tool. For CLI-invoked agents, skills are on-demand only (invoked via `/skill-name` or auto-matched by description). If the agent also has `--tools ""` (as in test mode), it cannot invoke skills AT ALL. **SOLUTION: inline critical operational content directly in the agent system prompt.** Keep the skill file as a reference for production sessions, but do not rely on it for content delivery in test mode or CLI invocations.
- **Path resolution**: The sandbox may reject absolute paths (e.g., `/Users/.../projects/agentrack/.claude/`). Always use relative paths from the project root (e.g., `.claude/agents/`). If path errors occur, run `pwd` to confirm the working directory first.
- **Keep agent prompts and skills in sync.** When operational patterns live in the agent prompt (for test-mode reliability) AND in a skill file (for production reference), they must contain the same content. After editing one, update the other. The `project-manager.md` agent prompt and `issue-managing/SKILL.md` skill are kept in sync this way.
- **Keep skills CONCISE and rule-based; fix bloat by deleting, not only adding.** The user explicitly pushed back on an over-long `issue-managing` skill and asked for "concise with clear rules". The fix was to restructure and cut (283 → 196 lines), not append more. When a skill grows past a few hundred lines, look for redundancy and merge/delete before adding new sections. The same concision applies to the agent system prompt itself.

## Related Topics

- None yet.

## Timeline

- **2026-06-05**: Replaced `## Using agentrack as the issue tracker` with `## Coordinating Work` across all 9 agent files. Learned the structure of agent files and the shared-section pattern.
- **2026-06-13**: Added inline operational patterns to `project-manager.md` (work-loop mechanics, sync tracker, hierarchy/tags, phase flows, three loops, cross-team patterns, special scenarios) + created `issue-managing` skill as synced reference. ALL 27 test scenarios pass at ≥85%. **Key discovery: `skills:` frontmatter does NOT preload in `--agent` CLI mode — must inline critical content in the agent prompt.**

## Gaps And Validation Needs

- The list of agent files above may become stale as new agents are added or removed. Re-scan `.claude/agents/` when working in this area.
