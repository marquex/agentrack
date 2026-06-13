# Agent Testing (Claude CLI evaluation suites)

## When To Use This

- Prompts: "test an agent", "evaluate the project-manager agent", "run the PM test suite", "score agent responses", "add a scenario to the test runner", "improve test scoring", "agent test mode", "LLM judge", "two-phase test run"
- Covers: How to build and run automated test suites that evaluate a Claude agent headlessly via the `claude` CLI, anchored on the `project-manager` agent suite as the worked example.

## Mental Model

The goal is to **systematically evaluate an agent's behavior** against a catalog of scenarios so the agent's system file can be iteratively improved. Three pieces work together:

1. **Scenario catalog** — `.agentic/project-manager-suite/01..27-*.md` (one markdown file per scenario) plus `00-team-roster.md` (the teams the PM manages) and `README.md`.
2. **Agent under test** — `.claude/agents/project-manager.md`. Improving this file is the whole point of the suite.
3. **Test runner** — `.agentic/project-manager-suite/test-runner.ts` (Bun/TypeScript). Discovers scenarios, runs the agent in testing mode, and scores each response with an LLM judge. Usage docs: `testing.md`. Results land in `test-results/`.

### The "Loop" concept

The PM agent is awakened in production by specific **loops** (described in `tmp/project-manager-behavior.md`). Every scenario is tagged with the Loop it exercises, so a scenario = one loop + one situation. The scenarios must drive the agent to behave correctly *for the loop that awakened it*.

### Testing mode (no side effects)

The agent must return a **plan of what it would do and what it expects to happen** — it must NOT actually interact with agentrack (no issue mutations). This is enforced at the CLI level (see patterns below), not by changing the agent file.

## Key Patterns — claude CLI for headless testing

- **`--tools ""`** disables all tools, forcing a text plan instead of command execution. This is the core of "testing mode".
- **`--append-system-prompt "<test mode>"`** injects testing instructions without modifying the agent file. (Escape with single-quote wrapping / `escapeShellArg()`.)
- **`--no-session-persistence`** keeps test runs out of session history.
- **`--output-format json`** wraps the response in an envelope: `{ "type": "result", "result": "<text>", "structured_output": {...}, ... }`.
- **When using `--json-schema`** (for the judge), the parsed JSON is in the envelope's **`structured_output`** field — NOT `result` (which holds explanatory text). Easy to read the wrong field.
- The **judge system prompt must insist on pure JSON** ("ONLY JSON, no markdown, no tables") or the model may return markdown tables.
- For long prompts, pass via a **temp file + `$(cat 'file')`** to dodge shell escaping.

## Test Runner Architecture (test-runner.ts)

- Discovers scenario files `01`–`27`, parses markdown sections: **Initial Conditions, User Story, Expected Output**.
- Per scenario: invokes `claude --agent "project-manager" --tools "" --append-system-prompt "<test mode>" -p "<prompt>" --print`.
- **Scoring** = a second `claude` call with `--json-schema` for structured output, comparing the PM response against the scenario's Expected Output.
- **7 scoring dimensions** (0–10 each): `hierarchy`, `assignments`, `dependencies`, `syncPattern`, `statusManagement`, `behavioralAccuracy`, `completeness`.
- **Two-phase workflow**:
  - `--no-judge` → collect PM responses only.
  - `--judge-only` → re-score existing responses without re-running the (expensive) PM agent. Lets you iterate on judge criteria cheaply.

## Scenario File Structure

Strict sections: **Loop, Description, Initial Conditions, Team Available, User Story, Expected Output, Notes**.

- Issue trees must show tags, assignments, statuses, blockages, and sync trackers.
- Single-team stories use the standard hierarchy; **cross-team (multi-team) stories use a 4-level hierarchy**: Initiative → Epic → Feature → Task.
- Multi-team stories (20–27) reference `00-team-roster.md`, which covers 3 teams: Library+Webapp, QuantEdge, AndroidApp.

## Source Files

- `.agentic/project-manager-suite/test-runner.ts` — the runner.
- `.agentic/project-manager-suite/testing.md` — usage / how to run.
- `.agentic/project-manager-suite/README.md` — suite overview.
- `.agentic/project-manager-suite/00-team-roster.md` — teams referenced by scenarios.
- `.agentic/project-manager-suite/test-results/` — per-scenario `*-result.json` + `summary.json`.
- `.claude/agents/project-manager.md` — the agent under test.
- `tmp/project-manager-behavior.md` — defines the loops that awaken the PM agent.

## Gotchas

- **`structured_output` vs `result`**: when parsing the json envelope from a `--json-schema` call, read `structured_output`. Reading `result` silently gets prose.
- **Judge discipline**: without a hard "pure JSON" instruction the judge emits markdown.
- **Shell escaping**: system-prompt values need `escapeShellArg()`; prefer temp-file prompt passing for long content.
- CLI flags can drift between `claude` CLI versions — re-verify flag names/behavior against the installed CLI before relying on them.

## Related Topics

- [agent-system-files.expertise.md](agent-system-files.expertise.md) — the PM agent file is the artifact under improvement; test results guide edits to it.
- [timeline.expertise.md](timeline.expertise.md) — 2026-06-13 entry records when the runner was built.

## Gaps And Validation Needs

- The expertise-manager cannot read files under `.agentic/project-manager-suite/` (access-restricted). The architecture/scoring/CLI details above were carried over from the timeline entry and the originating task; **verify `test-runner.ts`, `testing.md`, and the exact CLI flags against the current code before acting on them**.
- Re-confirm the 7 scoring dimension names and the `--no-judge` / `--judge-only` flag spellings in `test-runner.ts`.
- The scenario count (currently 27) and team roster grow over time — re-scan the suite directory for the current set.
