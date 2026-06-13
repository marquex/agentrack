# Claude Developer — Expertise Index

Agent: claude-developer
Domain: General-purpose development agent for the agentrack project.

## Routing topics


### Agent System Files

- File: [agent-system-files.expertise.md](agent-system-files.expertise.md)
- Prompts: "update agent files", "change agent instructions", "edit agent system prompts", "bulk update agents", "coordinating work section"
- Covers: Structure and conventions of agent system files in `.claude/agents/`, common sections, and patterns for bulk-editing them.

### Timeline

- File: [timeline.expertise.md](timeline.expertise.md)
- Prompts: "what has this agent worked on", "history of changes", "what did this agent do recently"
- Covers: Chronological record of work sessions and key learnings. (Test-suite work is summarized here, with the full mental model in Agent Testing.)

### Agent Testing

- File: [agent-testing.expertise.md](agent-testing.expertise.md)
- Prompts: "test an agent", "evaluate agent", "run the PM test suite", "automated testing", "claude CLI test mode", "LLM judge scoring", "add a scenario to the test runner", "two-phase test run"
- Covers: How to build and run automated test suites that evaluate a Claude agent headlessly via the `claude` CLI — testing mode (`--tools ""`), `structured_output` parsing, two-phase `--no-judge`/`--judge-only` workflow, 7-dimension scoring, and the `project-manager` suite (scenarios 01–27, test-runner.ts) as the worked example.
