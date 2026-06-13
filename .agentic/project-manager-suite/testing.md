# Testing the Project Manager Agent

This document describes the test suite for evaluating the `project-manager` agent against the scenario catalog.

## Quick Start

```bash
# Run all 27 scenarios (full suite — takes a while)
bun run .agentic/project-manager-suite/test-runner.ts

# Run a single scenario for quick iteration
bun run .agentic/project-manager-suite/test-runner.ts --scenario 01

# List all available scenarios
bun run .agentic/project-manager-suite/test-runner.ts --list
```

## How It Works

The test runner evaluates each scenario in two phases:

### Phase 1: PM Agent Test

The runner constructs a prompt from the scenario's **Initial Conditions** and **User Story**, then invokes the PM agent in **testing mode**:

```bash
claude --agent "project-manager" \
       --tools "" \
       --append-system-prompt "<testing instructions>" \
       -p "<scenario prompt>" \
       --print
```

In testing mode (`--tools ""`), the PM cannot execute any commands or read any files. Instead, it produces a detailed written plan showing every `agt` command it would run, the complete issue hierarchy, assignments, blockages, and reasoning.

The prompt includes the relevant team roster (agents, roles, phase flows) so the PM has full context without needing to read files.

### Phase 2: LLM Judge Scoring

The runner sends the PM's response to a second Claude call (judge) along with the scenario's **Expected Output**. The judge scores 7 dimensions on a 0–10 scale using `--json-schema` for structured output:

| Dimension | What it measures |
|---|---|
| **Hierarchy & Tags** | Correct issue levels (Feature/Bug/Task/Sync/etc.), no skipped levels |
| **Assignments** | Right worker agent for each phase (architect→plan, developer→dev, etc.) |
| **Dependencies** | Correct blockages between tasks, sequential chains |
| **Sync Pattern** | Sync tracker created (child assigned to PM, blocked by last worker) |
| **Status Management** | Parent set to `in-progress` after children, correct transitions |
| **Behavioral Accuracy** | Scenario-specific key behaviors followed |
| **Completeness** | All expected actions covered, nothing critical missing |

**Pass threshold:** 49/70 (70%).

## CLI Options

```
--scenario <num>    Run a specific scenario (e.g., "01", "07", "15")
--team <team>       Filter by team: "library-webapp" | "quantedge" | "android"
--loop <loop>       Filter by loop type: "work" | "status" | "ideas" | "error"
--no-judge          Collect PM responses without scoring (faster, for reviewing raw output)
--judge-only        Re-judge previously collected responses (skip PM agent calls)
--verbose           Show full dimension breakdown and PM response
--list              List all scenarios and exit
```

### Filtering Examples

```bash
# Run all QuantEdge scenarios
bun run .agentic/project-manager-suite/test-runner.ts --team quantedge --verbose

# Run only Ideas Loop scenarios
bun run .agentic/project-manager-suite/test-runner.ts --loop ideas

# Run all Work Loop scenarios without judging (just collect responses)
bun run .agentic/project-manager-suite/test-runner.ts --loop work --no-judge

# Re-judge responses after tweaking the judge prompt (no new PM calls)
bun run .agentic/project-manager-suite/test-runner.ts --judge-only
```

## Two-Step Workflow for Iteration

When iterating on the PM agent's system prompt, use the two-step workflow to save time and API costs:

```bash
# Step 1: Collect PM responses (the expensive part — one Claude call per scenario)
bun run .agentic/project-manager-suite/test-runner.ts --no-judge

# Step 2: Judge responses (separate, faster Claude calls)
bun run .agentic/project-manager-suite/test-runner.ts --judge-only --verbose
```

This lets you re-run the judge with different scoring criteria without re-running the PM agent each time.

## Output

### Console Output

Each scenario shows:
- Scenario number, title, team, and loop type
- PM agent execution status
- Judge score with dimension breakdown (in `--verbose` mode)
- Brief feedback on what was good and what needs improvement

After all scenarios complete, the summary shows:
- Pass/fail counts and percentages
- Average score
- Per-dimension averages with bar charts
- Breakdown by team and loop type
- Lowest-scoring scenarios (needs improvement)

### Saved Results

Results are saved to `.agentic/project-manager-suite/test-results/`:

```
test-results/
├── 01-result.json      # Per-scenario result (PM response + scores)
├── 07-result.json
├── 18-result.json
├── ...
└── summary.json        # All results in one file
```

Each result file contains:
```json
{
  "scenario": "01",
  "title": "Story 01: New Feature Request — Full Lifecycle",
  "team": "library-webapp",
  "loop": "work",
  "pmResponse": "<full PM agent output>",
  "scores": {
    "hierarchy": 6,
    "assignments": 8,
    "dependencies": 8,
    "syncPattern": 9,
    "statusManagement": 9,
    "behavioralAccuracy": 5,
    "completeness": 6
  },
  "totalScore": 51,
  "maxScore": 70,
  "pass": true,
  "feedback": "Core structure is correct — parent feature with worker children..."
}
```

### Regenerating `summary.json` after piecemeal runs

The runner only writes `summary.json` when you run **more than one scenario** in a single invocation. If you re-run individual scenarios (`--scenario N`) or re-judge a few (`--judge-only --scenario N`), the per-scenario `*-result.json` files update but `summary.json` goes stale. Rebuild it from the on-disk results:

```bash
bun run .agentic/project-manager-suite/regenerate-summary.ts
```

This rewrites `summary.json` and prints the headline stats (pass rate, averages, per-dimension, per-team/loop) so you can check the current state of the suite without re-running anything.

## Scenario Catalog

| # | Title | Team | Loop |
|---|---|---|---|
| 01 | New Feature Request | Library + Webapp | Work |
| 02 | Bug Fix Request | AndroidApp | Work |
| 03 | Multi-Team Feature | QuantEdge | Work |
| 04 | Single Agent Task | Library + Webapp | Work |
| 05 | Blocked Task Chain | AndroidApp | Work |
| 06 | Parallel Independent Tasks | Library + Webapp | Work |
| 07 | Stuck In-Progress | QuantEdge | Status |
| 08 | Parent Without Active Children | AndroidApp | Status |
| 09 | Blocked With Resolved Blockers | Library + Webapp | Status |
| 10 | Stale In-Progress | QuantEdge | Status |
| 11 | Idea Accepted | QuantEdge | Ideas |
| 12 | Idea Discarded | Library + Webapp | Ideas |
| 13 | Idea Needs Refinement | AndroidApp | Ideas |
| 14 | Idea Duplicate | AndroidApp | Ideas |
| 15 | Agent Reports Problem | QuantEdge | Error |
| 16 | Agent Creates Out-of-Scope Idea | AndroidApp | Ideas |
| 17 | Unassigned Todo Issue | Library + Webapp | Error |
| 18 | Empty Work Queue | Library + Webapp | Error |
| 19 | Replanning Mid-Flight | QuantEdge | Error |
| 20 | Consumer→Provider Request | QuantEdge | Work |
| 21 | API Contract Joint Planning | AndroidApp | Work |
| 22 | Strategy Validation Not Bug | QuantEdge | Work |
| 23 | Device-Specific Bug Triage | AndroidApp | Work |
| 24 | Production Hotfix | QuantEdge | Error |
| 25 | Play Store Rejection | AndroidApp | Error |
| 26 | Research Generates Platform Idea | QuantEdge | Ideas |
| 27 | Backend-First Dependency | AndroidApp | Work |

## Scoring Notes

- **Only the initial response is scored.** Many scenarios describe what happens after the PM acts (worker agents driving status transitions). Those later phases are not scored — they test different PM invocations.
- **The sync pattern dimension** is N/A for some scenarios (e.g., status loop interventions, idle states). The judge may award full marks for these since there's nothing to get wrong.
- **The judge is lenient on format** — if the PM captures the correct behavior with different wording or structure, it still scores well.
- **Scope creep is penalized.** If the PM creates more issues than the expected output calls for, the behavioral accuracy and completeness scores will reflect this.

## Files

```
project-manager-suite/
├── test-runner.ts         # The test suite runner (TypeScript/Bun)
├── testing.md             # This documentation
├── README.md              # Scenario catalog overview
├── 00-team-roster.md      # Agent roles and capabilities reference
├── 01-*.md ... 27-*.md   # Scenario files
└── test-results/          # Generated test results (gitignored)
```
