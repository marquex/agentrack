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

- **Path resolution**: The sandbox may reject absolute paths (e.g., `/Users/.../projects/agentrack/.claude/`). Always use relative paths from the project root (e.g., `.claude/agents/`). If path errors occur, run `pwd` to confirm the working directory first.

## Related Topics

- None yet.

## Timeline

- **2026-06-05**: Replaced `## Using agentrack as the issue tracker` with `## Coordinating Work` across all 9 agent files. Learned the structure of agent files and the shared-section pattern.

## Gaps And Validation Needs

- The list of agent files above may become stale as new agents are added or removed. Re-scan `.claude/agents/` when working in this area.
