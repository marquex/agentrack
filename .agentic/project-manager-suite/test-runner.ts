/**
 * Project Manager Test Suite Runner
 *
 * Evaluates the project-manager agent against the scenario suite.
 * Each scenario is run through the PM agent in testing mode (no actual command execution),
 * then scored by an LLM judge against the expected output.
 *
 * Usage:
 *   bun run .agentic/project-manager-suite/test-runner.ts [options]
 *
 * Options:
 *   --scenario <num>    Run a specific scenario by number (e.g., "01", "15")
 *   --team <team>       Run only scenarios for a team: "library-webapp" | "quantedge" | "android"
 *   --loop <loop>       Run only scenarios for a loop: "work" | "status" | "ideas" | "error"
 *   --no-judge          Skip LLM judging, just collect PM responses
 *   --judge-only        Only run the judge on previously collected responses
 *   --verbose           Show full PM responses and judge reasoning
 *   --list              List all scenarios and exit
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename } from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Scenario {
  number: string;
  title: string;
  loop: string;
  description: string;
  initialConditions: string;
  userStory: string;
  expectedOutput: string;
  notes: string;
  filePath: string;
  team: string;
}

interface TestResult {
  scenario: string;
  title: string;
  team: string;
  loop: string;
  pmResponse: string;
  scores: {
    hierarchy: number;
    assignments: number;
    dependencies: number;
    syncPattern: number;
    statusManagement: number;
    behavioralAccuracy: number;
    completeness: number;
  } | null;
  totalScore: number | null;
  maxScore: number;
  pass: boolean | null;
  feedback: string | null;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SUITE_DIR = join(import.meta.dir);
const RESULTS_DIR = join(SUITE_DIR, "test-results");

const SCENARIO_TEAMS: Record<string, string> = {
  "01": "library-webapp",
  "02": "android",
  "03": "quantedge",
  "04": "library-webapp",
  "05": "android",
  "06": "library-webapp",
  "07": "quantedge",
  "08": "android",
  "09": "library-webapp",
  "10": "quantedge",
  "11": "quantedge",
  "12": "library-webapp",
  "13": "android",
  "14": "android",
  "15": "quantedge",
  "16": "android",
  "17": "library-webapp",
  "18": "library-webapp",
  "19": "quantedge",
  "20": "quantedge",
  "21": "android",
  "22": "quantedge",
  "23": "android",
  "24": "quantedge",
  "25": "android",
  "26": "quantedge",
  "27": "android",
  "28": "library-webapp",
  "29": "android",
};

const LOOP_MAP: Record<string, string> = {
  "01": "work",
  "02": "work",
  "03": "work",
  "04": "work",
  "05": "work",
  "06": "work",
  "07": "status",
  "08": "status",
  "09": "status",
  "10": "status",
  "11": "ideas",
  "12": "ideas",
  "13": "ideas",
  "14": "ideas",
  "15": "error",
  "16": "ideas",
  "17": "error",
  "18": "error",
  "19": "error",
  "20": "work",
  "21": "work",
  "22": "work",
  "23": "work",
  "24": "error",
  "25": "error",
  "26": "ideas",
  "27": "work",
  "28": "status",
  "29": "status",
};

const TEAM_LABELS: Record<string, string> = {
  "library-webapp": "Library + Webapp",
  quantedge: "QuantEdge",
  android: "AndroidApp",
};

const LOOP_LABELS: Record<string, string> = {
  work: "Work Loop",
  status: "Status Loop",
  ideas: "Ideas Loop",
  error: "Error & Edge Cases",
};

// ─── Team Roster Summaries (for test prompts) ──────────────────────────────

const TEAM_ROSTERS: Record<string, string> = {
  "library-webapp": `Available Agents (Library + Webapp Team):

Library Sub-team:
- library-architect: Planning phase — designs architecture, creates specs, API design
- library-developer: Development phase — implements features from specs, fixes bugs
- library-validator: Validation phase — writes tests, quality checks, bug reproduction
- library-releaser: Release phase — runs tests, generates docs, builds, publishes to npm

Webapp Sub-team:
- webapp-developer: Planning + Development — implements frontend features, handles API integration
- webapp-styler: Styling phase — visual polish AFTER developer builds the feature
- webapp-validator: Validation — tests the webapp, E2E tests, quality checks, bug reproduction

Phase Flows:
- Features: Plan → Dev → Validate → Release
- Bugs: Reproduce → Dev → Validate → Release`,

  quantedge: `Available Agents (QuantEdge — Algorithmic Trading):

Development Team:
- platform-architect: Planning phase + team lead — designs platform architecture, APIs. Technical ideas route here.
- platform-developer: Development phase — builds platform tools and infrastructure
- platform-validator: Validation phase — tests platform, performance benchmarks, bug reproduction
- platform-releaser: Release phase — deploys platform updates

Research Team:
- head-of-research: Research team lead — research direction decisions, strategy priorities. Research direction ideas route here.
- quant-researcher: Planning + Development — designs and implements trading strategies
- strategy-validator: Validation — backtests, Monte Carlo simulations, overfitting detection

Leadership:
- cto: Cross-team priority conflicts, build-vs-buy decisions. Escalations only.

Phase Flows:
- Platform Features: Plan → Dev → Validate → Release
- Platform Bugs: Reproduce → Dev → Validate → Release
- Strategy Work: Plan → Dev → Validate (no release phase)

Idea Routing:
- Platform technical idea → platform-architect
- Research direction idea → head-of-research
- Cross-team idea or conflict → cto
- Idea from a manager → Auto-accept (skip review)

Key Rules:
- Platform feature requests from researchers route to platform-architect, NOT head-of-research
- Strategy validation failures are NOT platform bugs → route to quant-researcher
- Platform bugs in production trading take priority over scheduled research work`,

  android: `Available Agents (AndroidApp — Mobile App):

Backend Team:
- backend-architect: Planning phase + team lead — designs API contracts, database schemas. Technical ideas route here.
- backend-developer: Development phase — implements endpoints, business logic
- backend-validator: Validation phase — API tests, load tests, bug reproduction
- devops-engineer: Release phase — deploys services, CI/CD, Play Store submissions, incident response

Frontend (Android) Team:
- android-developer: Planning + Development — builds screens, integrates APIs, handles device compatibility, builds release APKs
- android-designer: Styling phase — Material Design, animations, accessibility (AFTER developer builds)
- android-validator: Validation — UI tests, cross-device testing, bug reproduction

Leadership:
- product-owner: Product decisions, feature prioritization, acceptance reviews. Product ideas route here.

Phase Flows:
- Backend Features: Plan → Dev → Validate → Release
- Backend Bugs: Reproduce → Dev → Validate → Release
- Frontend Features: Plan → Dev → Style → Validate (release via android-developer APK → devops Play Store)
- Frontend Bugs: Reproduce → Dev → Validate (no separate release)

Idea Routing:
- Backend technical idea → backend-architect
- Product idea → product-owner
- Idea from a manager → Auto-accept (skip review)

Key Rules:
- Frontend blocked on API contract definition, NOT full backend implementation
- Play Store rejections require non-standard workflow
- Backend deploys independently; Android goes through Play Store review`,
};

// ─── Agentrack CLI Reference (for test prompts) ────────────────────────────

const AGENTRACK_CLI_REF = `Agentrack CLI Reference:

Create an issue:       agt create "Title" [--description "desc"] [--assignee name] [--tags tag1,tag2] [--status status] [--priority 1-5] [--parentId id]
List issues:           agt list [--status status] [--assignee name] [--tags tags] [--parentId id]
View an issue:         agt view <issueId>
Update an issue:       agt update <issueId> [--title "title"] [--status status] [--assignee name] [--tags tags] [--priority N] [--parentId id]
Add a comment:         agt comments add <issueId> --content "content"
List comments:         agt comments list <issueId>
Add blockage:          agt blockages add <blockedId> --by <id1> [id2] ...
Resolve blockage:      agt blockages resolve <blockedId> --by <id1> [id2] ...
List blockages:        agt blockages list <issueId>

Valid statuses: idea, todo, in-progress, done, closed
Common tags: initiative, epic, feature, bug, chore, task, sync, idea, duplicate, discarded`;

// ─── Testing Mode System Prompt ─────────────────────────────────────────────

const TESTING_MODE_PROMPT = `TESTING MODE — You are being evaluated on your project management skills.

CRITICAL RULES:
1. Do NOT use any tools or execute any commands
2. Do NOT try to read any files
3. Produce a detailed written plan of every action you would take

For each action, show:
- The exact agt command you would run (with all flags and arguments)
- Why you are taking this action (your reasoning)

Present your plan as a COMPLETE issue hierarchy showing:
- Issue titles, tags (--tags), assignments (--assignee), and statuses
- Parent-child relationships (indented tree structure)
- Blockages between issues (agt blockages add commands)
- Comments you would add (agt comments add commands)
- Status updates you would make (agt update commands)

Be thorough and specific — your plan will be scored against expected behavior.
Include every agt command you would run, in the order you would run them.`;

// ─── Judge System Prompt ────────────────────────────────────────────────────

const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator scoring a project manager AI agent's test response. You MUST respond with ONLY a valid JSON object — no markdown, no tables, no explanation outside the JSON.

You will receive:
1. The EXPECTED OUTPUT for a specific scenario (what correct behavior looks like)
2. The AGENT'S ACTUAL RESPONSE (what the PM agent produced in testing mode)

Score the agent's response on these 7 dimensions (0-10 each):

1. hierarchy — Issue hierarchy levels (Initiative/Epic/Feature/Bug/Chore/Task), correct tags, no single-child parents (a parent must group 2+ related issues; never wrap one deliverable in its own Epic)
2. assignments — Right worker agent for each task, correct phase-to-agent mapping
3. dependencies — Correct blockages between tasks, sequential dependencies, cross-team dependencies
4. syncPattern — Completion pattern correct: NO "verify complete" child created for parent completion (the status loop completes parents); gate trackers (task,sync assigned to project-manager, blocked by a review task) created ONLY where a collaborative review/decision gate is required (joint design agreement, idea review); for status-loop scenarios, parents completed correctly (done if has parent, closed + close children if top-level)
5. statusManagement — Parent LEFT at 'todo' after creating children (PM must NOT flip it to in-progress — the status loop auto-promotes it when a child starts); correct status transitions on worker children
6. behavioralAccuracy — Scenario-specific key behaviors met
7. completeness — All expected actions covered, nothing critical missing

Guidelines:
- Only score the agent's INITIAL response (what it would do immediately)
- Ignore "what happens after" sections (driven by worker agents in later invocations)
- A score of 7+ = mostly met, 5-6 = partial, below 5 = significant gaps

Respond with this exact JSON structure (no other text):
{"scores":{"hierarchy":0,"assignments":0,"dependencies":0,"syncPattern":0,"statusManagement":0,"behavioralAccuracy":0,"completeness":0},"totalScore":0,"maxScore":70,"pass":false,"feedback":"brief feedback"}`;

const JUDGE_JSON_SCHEMA = {
  type: "object",
  properties: {
    scores: {
      type: "object",
      properties: {
        hierarchy: { type: "number", description: "0-10 score for issue hierarchy and tags" },
        assignments: { type: "number", description: "0-10 score for agent assignments" },
        dependencies: { type: "number", description: "0-10 score for blockages and dependencies" },
        syncPattern: { type: "number", description: "0-10 score for sync tracker pattern" },
        statusManagement: { type: "number", description: "0-10 score for status transitions" },
        behavioralAccuracy: { type: "number", description: "0-10 score for key behaviors" },
        completeness: { type: "number", description: "0-10 score for completeness" },
      },
      required: [
        "hierarchy",
        "assignments",
        "dependencies",
        "syncPattern",
        "statusManagement",
        "behavioralAccuracy",
        "completeness",
      ],
    },
    totalScore: { type: "number", description: "Sum of all dimension scores" },
    maxScore: { type: "number", description: "Always 70" },
    pass: { type: "boolean", description: "true if totalScore >= 49 (70%)" },
    feedback: {
      type: "string",
      description: "Brief feedback: what was good, what needs improvement",
    },
  },
  required: ["scores", "totalScore", "maxScore", "pass", "feedback"],
};

// ─── CLI Argument Parsing ───────────────────────────────────────────────────

interface CliOptions {
  scenario?: string;
  team?: string;
  loop?: string;
  noJudge: boolean;
  judgeOnly: boolean;
  verbose: boolean;
  list: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    noJudge: false,
    judgeOnly: false,
    verbose: false,
    list: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--scenario":
        opts.scenario = args[++i]?.padStart(2, "0");
        break;
      case "--team":
        opts.team = args[++i];
        break;
      case "--loop":
        opts.loop = args[++i];
        break;
      case "--no-judge":
        opts.noJudge = true;
        break;
      case "--judge-only":
        opts.judgeOnly = true;
        break;
      case "--verbose":
        opts.verbose = true;
        break;
      case "--list":
        opts.list = true;
        break;
    }
  }

  return opts;
}

// ─── Scenario Parser ────────────────────────────────────────────────────────

function parseScenario(filePath: string): Scenario {
  const content = readFileSync(filePath, "utf-8");

  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : basename(filePath, ".md");

  // Extract scenario number from filename
  const numberMatch = filePath.match(/(\d+)-[^/]+\.md$/);
  const number = numberMatch ? numberMatch[1] : "00";

  // Split content on ## headings (keeping the heading text)
  const sections: Record<string, string> = {};
  const sectionRegex = /^## (.+)$/gm;
  let match: RegExpExecArray | null;
  const boundaries: { heading: string; start: number }[] = [];

  while ((match = sectionRegex.exec(content)) !== null) {
    boundaries.push({ heading: match[1].trim(), start: match.index });
  }

  for (let i = 0; i < boundaries.length; i++) {
    const heading = boundaries[i].heading;
    const start = boundaries[i].start;
    const end = i + 1 < boundaries.length ? boundaries[i + 1].start : content.length;
    // Get content after the heading line
    const sectionContent = content.slice(start, end);
    const firstNewline = sectionContent.indexOf("\n");
    sections[heading] = sectionContent.slice(firstNewline + 1).trim();
  }

  const team = SCENARIO_TEAMS[number] || "unknown";

  return {
    number,
    title,
    loop: sections["Loop"] || "",
    description: sections["Description"] || "",
    initialConditions: sections["Initial Conditions"] || "",
    userStory: sections["User Story"] || "",
    expectedOutput: sections["Expected Output"] || "",
    notes: sections["Notes"] || "",
    filePath,
    team,
  };
}

// ─── Scenario Discovery ─────────────────────────────────────────────────────

function discoverScenarios(opts: CliOptions): Scenario[] {
  const files = readdirSync(SUITE_DIR)
    .filter((f) => /^\d{2}-.+\.md$/.test(f) && !f.startsWith("00-"))
    .sort();

  let scenarios = files.map((f) => parseScenario(join(SUITE_DIR, f)));

  if (opts.scenario) {
    scenarios = scenarios.filter((s) => s.number === opts.scenario);
  }

  if (opts.team) {
    scenarios = scenarios.filter((s) => s.team === opts.team);
  }

  if (opts.loop) {
    scenarios = scenarios.filter((s) => LOOP_MAP[s.number] === opts.loop);
  }

  return scenarios;
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

function buildTestPrompt(scenario: Scenario): string {
  const teamLabel = TEAM_LABELS[scenario.team] || scenario.team;
  const teamRoster = TEAM_ROSTERS[scenario.team] || "Unknown team";

  return `# TEST SCENARIO: ${scenario.title}

Team: ${teamLabel}
Loop: ${scenario.loop}

---

${teamRoster}

---

## Current Tracker State

${scenario.initialConditions}

## Trigger / Situation

${scenario.userStory}

---

## Your Task

Analyze this situation and produce a complete, detailed action plan. For each step:

1. Show the exact \`agt\` command you would run
2. Explain your reasoning

Show the COMPLETE issue hierarchy you would create (or modify), including:
- Every issue with its title, tags, assignee, and status
- Parent-child relationships (indented tree)
- All blockages between issues
- All comments you would add
- All status changes you would make

Use the ${teamLabel} team's agents for assignments. Follow the correct phase flow for the issue type (feature, bug, chore, strategy).`;
}

// Path to the canonical issue-managing skill (the PM's rulebook). The runner
// injects this because skills: frontmatter does NOT preload when an agent runs
// via `claude --agent ...`, and test mode (`--tools ""`) cannot read files.
function loadIssueManagingSkill(): string {
  const candidates = [
    join(process.cwd(), ".claude/skills/issue-managing/SKILL.md"),
    join(__dirname, "../../.claude/skills/issue-managing/SKILL.md"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      const raw = readFileSync(p, "utf-8");
      // strip YAML frontmatter, keep only the rulebook body
      const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
      return `# ISSUE-MANAGING SKILL (your operational rulebook — follow these rules exactly)\n${body}`;
    }
  }
  return "";
}

function buildAppendSystemPrompt(): string {
  return TESTING_MODE_PROMPT + "\n\n" + loadIssueManagingSkill() + "\n\n" + AGENTRACK_CLI_REF;
}

function buildJudgePrompt(scenario: Scenario, pmResponse: string): string {
  return `# Scenario Expected Output

${scenario.expectedOutput}

---

# Agent's Actual Response

${pmResponse}

---

Score the agent's response against the expected output. IMPORTANT: Respond with ONLY the JSON object, no other text. No markdown, no tables, no explanation.`;
}

// ─── Runner: Execute PM Agent Test ──────────────────────────────────────────

function runPmAgent(prompt: string): string {
  const appendPrompt = buildAppendSystemPrompt();

  // Write prompt to a temp file to avoid shell escaping issues
  const tmpFile = join(RESULTS_DIR, `.tmp-prompt-${Date.now()}.txt`);
  writeFileSync(tmpFile, prompt, "utf-8");

  try {
    const cmd = [
      "claude",
      `--agent "project-manager"`,
      `--tools ""`,
      `--append-system-prompt ${escapeShellArg(appendPrompt)}`,
      `-p "$(cat '${tmpFile}')"`,

      "--print",
      "--output-format text",
      "--no-session-persistence",
    ].join(" ");

    const result = execSync(cmd, {
      encoding: "utf-8",
      timeout: 600_000, // 10 minutes per scenario (opus can be slow on large scenarios)
      maxBuffer: 1024 * 1024,
      shell: "/bin/bash",
    });

    return result.trim();
  } catch (err: any) {
    if (err.status === 124 || err.killed) {
      throw new Error("PM agent timed out (10 min limit)");
    }
    throw new Error(`PM agent failed: ${err.message}`);
  } finally {
    try {
      require("fs").unlinkSync(tmpFile);
    } catch {}
  }
}

// ─── Runner: Execute Judge ──────────────────────────────────────────────────

function runJudge(scenario: Scenario, pmResponse: string): {
  scores: TestResult["scores"];
  totalScore: number;
  pass: boolean;
  feedback: string;
} {
  const judgePrompt = buildJudgePrompt(scenario, pmResponse);
  const schemaJson = JSON.stringify(JUDGE_JSON_SCHEMA);

  const tmpFile = join(RESULTS_DIR, `.tmp-judge-${Date.now()}.txt`);
  writeFileSync(tmpFile, judgePrompt, "utf-8");

  try {
    const cmd = [
      "claude",
      `-p "$(cat '${tmpFile}')"`,
      `--system-prompt ${escapeShellArg(JUDGE_SYSTEM_PROMPT)}`,
      "--print",
      "--output-format json",
      `--json-schema '${schemaJson}'`,
      "--no-session-persistence",
      "--model sonnet",
    ].join(" ");

    const result = execSync(cmd, {
      encoding: "utf-8",
      timeout: 300_000, // 5 minutes — the judge can run long on big responses
      maxBuffer: 512 * 1024,
      shell: "/bin/bash",
    });

    // claude --output-format json with --json-schema wraps the response in an envelope:
    // { "type": "result", "result": "<explanatory text>", "structured_output": { ... scores ... }, ... }
    // The structured_output field contains the parsed JSON when --json-schema is used.
    const envelope = JSON.parse(result.trim());

    // Priority 1: Use structured_output if available (most reliable with --json-schema)
    if (envelope.structured_output && envelope.structured_output.scores) {
      const so = envelope.structured_output;
      return {
        scores: so.scores,
        totalScore: so.totalScore,
        pass: so.pass,
        feedback: so.feedback || envelope.result?.slice(0, 300) || "",
      };
    }

    // Priority 2: Parse the result text field
    const agentText: string = envelope.result || result.trim();

    // The agent's text may be:
    // 1. Clean JSON
    // 2. Wrapped in markdown code fences
    // 3. Explanatory text with embedded JSON
    let jsonStr = agentText.trim();

    // Try direct parse first (most common with --json-schema)
    try {
      const directParsed = JSON.parse(jsonStr);
      return {
        scores: directParsed.scores,
        totalScore: directParsed.totalScore,
        pass: directParsed.pass,
        feedback: directParsed.feedback,
      };
    } catch {
      // Not clean JSON — try extraction
    }

    // Try code block extraction
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1].trim());
        return {
          scores: parsed.scores,
          totalScore: parsed.totalScore,
          pass: parsed.pass,
          feedback: parsed.feedback,
        };
      } catch {
        // Code block wasn't valid JSON either
      }
    }

    // Try finding the outermost JSON object in the text
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = jsonStr.slice(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(candidate);
        return {
          scores: parsed.scores,
          totalScore: parsed.totalScore,
          pass: parsed.pass,
          feedback: parsed.feedback,
        };
      } catch {
        // Still failed
      }
    }

    // Final fallback: parse markdown table format
    // The model sometimes outputs: **Score Summary: XX/70** followed by a table
    const tableScores = parseMarkdownScoreTable(agentText);
    if (tableScores) {
      return tableScores;
    }

    throw new Error(
      `Could not parse judge output. Agent text starts with: ${agentText.slice(0, 200)}`,
    );
  } catch (err: any) {
    throw new Error(`Judge failed: ${err.message}`);
  } finally {
    try {
      require("fs").unlinkSync(tmpFile);
    } catch {}
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse scores from a markdown table like:
 *   | Hierarchy & Tags | 5/10 | notes... |
 *   | Assignments | 8/10 | notes... |
 */
function parseMarkdownScoreTable(text: string): {
  scores: TestResult["scores"];
  totalScore: number;
  pass: boolean;
  feedback: string;
} | null {
  // Map dimension labels to score keys
  const dimMap: Record<string, keyof NonNullable<TestResult["scores"]>> = {
    "hierarchy": "hierarchy",
    "hierarchy & tags": "hierarchy",
    "assignments": "assignments",
    "dependencies": "dependencies",
    "sync pattern": "syncPattern",
    "sync": "syncPattern",
    "sync tracker": "syncPattern",
    "status management": "statusManagement",
    "status": "statusManagement",
    "status mgmt": "statusManagement",
    "behavioral accuracy": "behavioralAccuracy",
    "behavior": "behavioralAccuracy",
    "behavioural accuracy": "behavioralAccuracy",
    "completeness": "completeness",
  };

  const scores: Record<string, number> = {};
  const lines = text.split("\n");

  for (const line of lines) {
    const match = line.match(/\|\s*(.+?)\s*\|\s*(\d+)\s*\/\s*10\s*\|/);
    if (match) {
      const label = match[1].toLowerCase().replace(/[*\[\]]/g, "").trim();
      const score = parseInt(match[2], 10);

      for (const [key, dimKey] of Object.entries(dimMap)) {
        if (label.includes(key) && !scores[dimKey]) {
          scores[dimKey] = score;
          break;
        }
      }
    }
  }

  // Check we got at least 5 of 7 dimensions
  if (Object.keys(scores).length < 5) return null;

  // Fill missing dimensions with 0
  const allDims: (keyof NonNullable<TestResult["scores"]>)[] = [
    "hierarchy", "assignments", "dependencies", "syncPattern",
    "statusManagement", "behavioralAccuracy", "completeness",
  ];
  for (const dim of allDims) {
    if (scores[dim] === undefined) scores[dim] = 0;
  }

  const totalScore = allDims.reduce((sum, d) => sum + (scores[d] || 0), 0);

  // Extract feedback: first line or summary line
  const summaryMatch = text.match(/\*\*Score Summary:\s*(\d+)\/70\s*[—\-]\s*(PASS|FAIL)\*\*/i);
  const feedbackLine = text.split("\n").find((l) =>
    l.toLowerCase().includes("feedback") || l.toLowerCase().includes("summary")
  );
  const feedback = summaryMatch
    ? `${summaryMatch[2]} (${summaryMatch[1]}/70)`
    : feedbackLine?.replace(/[*|]/g, "").trim().slice(0, 200)
    || "Parsed from markdown table";

  return {
    scores: scores as NonNullable<TestResult["scores"]>,
    totalScore,
    pass: totalScore >= 49,
    feedback,
  };
}

function escapeShellArg(str: string): string {
  // Use single quotes, escaping any internal single quotes
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function formatScore(score: number | null, max: number): string {
  if (score === null) return "N/A";
  const pct = Math.round((score / max) * 100);
  return `${score}/${max} (${pct}%)`;
}

// ─── Reporter ───────────────────────────────────────────────────────────────

function printScenarioHeader(scenario: Scenario, index: number, total: number) {
  const teamLabel = TEAM_LABELS[scenario.team] || scenario.team;
  const loopLabel = LOOP_LABELS[LOOP_MAP[scenario.number]] || scenario.loop;

  console.log(`\n${"━".repeat(60)}`);
  console.log(
    `📋 [${index}/${total}] Scenario ${scenario.number}: ${scenario.title}`,
  );
  console.log(`   Team: ${teamLabel} | Loop: ${loopLabel}`);
}

function printScenarioResult(result: TestResult, verbose: boolean) {
  if (result.error) {
    console.log(`   ❌ ERROR: ${result.error}`);
    return;
  }

  if (result.scores) {
    const icon = result.pass ? "✅" : "❌";
    console.log(`   ${icon} Score: ${formatScore(result.totalScore, result.maxScore)}`);

    if (verbose) {
      const s = result.scores;
      console.log(`      Hierarchy:            ${s.hierarchy}/10`);
      console.log(`      Assignments:          ${s.assignments}/10`);
      console.log(`      Dependencies:         ${s.dependencies}/10`);
      console.log(`      Sync Pattern:         ${s.syncPattern}/10`);
      console.log(`      Status Management:    ${s.statusManagement}/10`);
      console.log(`      Behavioral Accuracy:  ${s.behavioralAccuracy}/10`);
      console.log(`      Completeness:         ${s.completeness}/10`);
    }

    if (result.feedback) {
      console.log(`   💬 ${result.feedback}`);
    }
  } else if (result.pmResponse) {
    console.log(`   📝 Response collected (no judge)`);

    if (verbose) {
      console.log(`   ─── Response ───`);
      console.log(
        result.pmResponse
          .split("\n")
          .map((l) => "   " + l)
          .join("\n"),
      );
    }
  }
}

function printSummary(results: TestResult[]) {
  console.log(`\n${"━".repeat(60)}`);
  console.log("SUMMARY");
  console.log("━".repeat(60));

  const judged = results.filter((r) => r.scores !== null);
  const passed = judged.filter((r) => r.pass);
  const failed = judged.filter((r) => !r.pass);
  const errors = results.filter((r) => r.error);
  const noJudge = results.filter((r) => !r.scores && !r.error);

  console.log(`Total scenarios: ${results.length}`);

  if (judged.length > 0) {
    const avgScore =
      judged.reduce((sum, r) => sum + (r.totalScore || 0), 0) / judged.length;
    const avgPct = Math.round((avgScore / 70) * 100);

    console.log(`Passed: ${passed.length}/${judged.length} (${Math.round((passed.length / judged.length) * 100)}%)`);
    console.log(`Failed: ${failed.length}/${judged.length}`);
    console.log(`Average Score: ${avgScore.toFixed(1)}/70 (${avgPct}%)`);

    if (errors.length > 0) {
      console.log(`Errors: ${errors.length}`);
    }

    // Per-dimension averages
    const dims = [
      "hierarchy",
      "assignments",
      "dependencies",
      "syncPattern",
      "statusManagement",
      "behavioralAccuracy",
      "completeness",
    ] as const;

    const dimLabels: Record<string, string> = {
      hierarchy: "Hierarchy & Tags",
      assignments: "Assignments",
      dependencies: "Dependencies",
      syncPattern: "Sync Pattern",
      statusManagement: "Status Mgmt",
      behavioralAccuracy: "Behavior",
      completeness: "Completeness",
    };

    console.log(`\nDimension Averages:`);
    for (const dim of dims) {
      const avg =
        judged.reduce((sum, r) => sum + (r.scores?.[dim] || 0), 0) /
        judged.length;
      const bar = "█".repeat(Math.round(avg)) + "░".repeat(10 - Math.round(avg));
      console.log(`  ${dimLabels[dim].padEnd(16)} ${bar} ${avg.toFixed(1)}/10`);
    }

    // Score breakdown by team
    console.log(`\nBy Team:`);
    for (const [team, label] of Object.entries(TEAM_LABELS)) {
      const teamResults = judged.filter(
        (r) => SCENARIO_TEAMS[r.scenario] === team,
      );
      if (teamResults.length === 0) continue;
      const teamAvg =
        teamResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) /
        teamResults.length;
      const teamPass = teamResults.filter((r) => r.pass).length;
      console.log(
        `  ${label.padEnd(18)} ${teamPass}/${teamResults.length} passed  avg ${teamAvg.toFixed(1)}/70`,
      );
    }

    // Score breakdown by loop
    console.log(`\nBy Loop:`);
    for (const [loop, label] of Object.entries(LOOP_LABELS)) {
      const loopResults = judged.filter(
        (r) => LOOP_MAP[r.scenario] === loop,
      );
      if (loopResults.length === 0) continue;
      const loopAvg =
        loopResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) /
        loopResults.length;
      const loopPass = loopResults.filter((r) => r.pass).length;
      console.log(
        `  ${label.padEnd(18)} ${loopPass}/${loopResults.length} passed  avg ${loopAvg.toFixed(1)}/70`,
      );
    }

    // Worst performers
    if (judged.length > 3) {
      const sorted = [...judged].sort(
        (a, b) => (a.totalScore || 0) - (b.totalScore || 0),
      );
      console.log(`\nLowest Scores (needs improvement):`);
      for (const r of sorted.slice(0, 5)) {
        console.log(
          `  ${r.scenario} ${r.title}: ${r.totalScore}/70 ${r.pass ? "✅" : "❌"}`,
        );
      }
    }
  }

  if (noJudge.length > 0) {
    console.log(`\nCollected without judging: ${noJudge.length}`);
  }

  console.log(`\nResults saved to: ${RESULTS_DIR}/`);
}

// ─── File I/O ───────────────────────────────────────────────────────────────

function saveResult(result: TestResult) {
  const filePath = join(RESULTS_DIR, `${result.scenario}-result.json`);
  writeFileSync(filePath, JSON.stringify(result, null, 2), "utf-8");
}

function saveSummary(results: TestResult[]) {
  const filePath = join(RESULTS_DIR, "summary.json");
  writeFileSync(filePath, JSON.stringify(results, null, 2), "utf-8");
}

function loadResult(scenarioNumber: string): TestResult | null {
  const filePath = join(RESULTS_DIR, `${scenarioNumber}-result.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

// ─── List Scenarios ─────────────────────────────────────────────────────────

function listScenarios(scenarios: Scenario[]) {
  console.log("\nProject Manager Test Suite — Scenario List\n");
  console.log(
    "Num  Team              Loop               Title",
  );
  console.log(`${"─".repeat(75)}`);

  for (const s of scenarios) {
    const teamLabel = (TEAM_LABELS[s.team] || s.team).padEnd(18);
    const loopLabel = (LOOP_LABELS[LOOP_MAP[s.number]] || s.loop).padEnd(19);
    console.log(` ${s.number}   ${teamLabel}${loopLabel}${s.title}`);
  }

  console.log(`\nTotal: ${scenarios.length} scenarios`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  // Ensure results directory exists
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const scenarios = discoverScenarios(opts);

  if (scenarios.length === 0) {
    console.error("No scenarios match the given filters.");
    process.exit(1);
  }

  // --list mode
  if (opts.list) {
    listScenarios(scenarios);
    process.exit(0);
  }

  const total = scenarios.length;
  console.log(`\n🧪 Project Manager Test Suite`);
  console.log(`   ${total} scenario(s) to run`);
  if (opts.noJudge) console.log("   Mode: Collect responses only (no judging)");
  if (opts.judgeOnly) console.log("   Mode: Judge only (use saved responses)");
  console.log();

  const results: TestResult[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    printScenarioHeader(scenario, i + 1, total);

    const result: TestResult = {
      scenario: scenario.number,
      title: scenario.title,
      team: scenario.team,
      loop: LOOP_MAP[scenario.number] || "unknown",
      pmResponse: "",
      scores: null,
      totalScore: null,
      maxScore: 70,
      pass: null,
      feedback: null,
    };

    // Step 1: Run PM agent (or load saved response)
    if (opts.judgeOnly) {
      const saved = loadResult(scenario.number);
      if (!saved || !saved.pmResponse) {
        console.log("   ⚠️  No saved response found. Skipping.");
        result.error = "No saved response for judge-only mode";
        results.push(result);
        continue;
      }
      result.pmResponse = saved.pmResponse;
      console.log("   📝 Loaded saved response");
    } else {
      try {
        process.stdout.write("   ⏳ Running PM agent...");
        const prompt = buildTestPrompt(scenario);
        const response = runPmAgent(prompt);
        result.pmResponse = response;
        process.stdout.write("\r   ✅ PM agent responded           \n");
      } catch (err: any) {
        result.error = err.message;
        console.log(`\r   ❌ PM agent error: ${err.message}`);
        results.push(result);
        saveResult(result);
        continue;
      }
    }

    // Step 2: Judge the response
    if (!opts.noJudge) {
      try {
        process.stdout.write("   ⏳ Judging response...");
        const judgeResult = runJudge(scenario, result.pmResponse);
        result.scores = judgeResult.scores;
        result.totalScore = judgeResult.totalScore;
        result.pass = judgeResult.pass;
        result.feedback = judgeResult.feedback;
        process.stdout.write("\r   ✅ Judge complete              \n");
      } catch (err: any) {
        result.error = `Judge error: ${err.message}`;
        console.log(`\r   ⚠️  Judge error: ${err.message}`);
        console.log("   Response saved but not scored.");
      }
    }

    results.push(result);
    saveResult(result);
    printScenarioResult(result, opts.verbose);
  }

  // Summary
  if (results.length > 1 || opts.verbose) {
    saveSummary(results);
    printSummary(results);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
