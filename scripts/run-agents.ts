#!/usr/bin/env bun
/**
 * Agent runner — manages a team of Claude agents pulling issues from agentrack.
 *
 * Reads agent names from .agentrack/users.json, polls every 60s for available work
 * and new mentions, and spawns `claude --agent <name> -p "/work-issue <issueId>"` or
 * `claude --agent <name> -p "/work-mention <mentionId>"` child processes.
 *
 * Displays a live TUI showing each agent's status.
 */

import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, type Subprocess } from "bun";
import { Tracker } from "agentrack";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserEntry {
  name: string;
  token: string;
  registeredAt: string;
}

interface UsersFile {
  users: UserEntry[];
}

type AgentWorkType = "issue" | "mention";

interface AgentState {
  name: string;
  token: string;
  status: "free" | "busy";
  workType: AgentWorkType | null;
  issueId: string | null;
  mentionId: string | null;
  sessionId: string | null;
  startedAt: number | null;
  process: Subprocess | null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 60_000; // 1 minute
const ROOT = resolve(import.meta.dir, "..");
const USERS_PATH = resolve(ROOT, ".agentrack/users.json");
const SESSIONS_DIR = resolve(ROOT, ".agentic/session");

// Ensure sessions directory exists
mkdirSync(SESSIONS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Tracker instance
// ---------------------------------------------------------------------------

const tracker = new Tracker(ROOT);

// ---------------------------------------------------------------------------
// Load users
// ---------------------------------------------------------------------------

function loadUsers(): UserEntry[] {
  const raw = readFileSync(USERS_PATH, "utf-8");
  const data: UsersFile = JSON.parse(raw);
  return data.users;
}

// ---------------------------------------------------------------------------
// Get next issue for an agent via library
// ---------------------------------------------------------------------------

async function getNextIssue(agentName: string): Promise<string | null> {
  const result = await tracker.next(agentName);
  return "id" in result ? result.id : null;
}

// ---------------------------------------------------------------------------
// Get first unread mention for an agent via library
// ---------------------------------------------------------------------------

async function getFirstUnreadMention(agentName: string): Promise<string | null> {
  const mentions = await tracker.mentionsList(agentName);
  if (!Array.isArray(mentions) || mentions.length === 0) return null;

  return mentions[0].id;
}

// ---------------------------------------------------------------------------
// Launch agent process
// ---------------------------------------------------------------------------

function generateSessionId(): string {
  return Date.now().toString(36);
}

function launchAgent(agent: AgentState, workType: "issue", issueId: string): void;
function launchAgent(agent: AgentState, workType: "mention", mentionId: string): void;
function launchAgent(
  agent: AgentState,
  workType: AgentWorkType,
  targetId: string,
): void {
  const sessionId = generateSessionId();
  const logPath = resolve(SESSIONS_DIR, `${sessionId}.jsonl`);
  const logFile = Bun.file(logPath).writer();

  const prompt =
    workType === "issue"
      ? `/work-issue ${targetId}`
      : `/work-mention ${targetId}`;

  agent.status = "busy";
  agent.workType = workType;
  agent.issueId = workType === "issue" ? targetId : null;
  agent.mentionId = workType === "mention" ? targetId : null;
  agent.sessionId = sessionId;
  agent.startedAt = Date.now();

  const proc = spawn(
    [
      "claude",
      "--agent", agent.name,
      "-p", prompt,
      "--output-format", "stream-json",
      "--verbose",
      "--permission-mode", "auto",
    ],
    {
      cwd: ROOT,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, AGENT_SESSION_ID: sessionId },
    },
  );

  agent.process = proc;

  // Pipe stdout to the session log file
  (async () => {
    const reader = proc.stdout.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      logFile.write(value);
    }
    logFile.flush();
    logFile.end();
  })();

  // When the process exits, mark the agent as free
  proc.exited.then(() => {
    agent.status = "free";
    agent.workType = null;
    agent.issueId = null;
    agent.mentionId = null;
    agent.sessionId = null;
    agent.startedAt = null;
    agent.process = null;
    render();
  });
}

// ---------------------------------------------------------------------------
// TUI rendering
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function render(): void {
  // Clear entire screen and move cursor to top-left
  process.stdout.write("\x1b[2J\x1b[H");

  const now = Date.now();
  const header = "  AGENTRACK AGENT RUNNER";
  const sep = "  " + "─".repeat(70);

  const lines: string[] = [
    "",
    header,
    sep,
    "",
    `  ${"Agent".padEnd(22)} ${"Status".padEnd(10)} ${"Work".padEnd(10)} ${"Target".padEnd(14)} ${"Session".padEnd(14)} Duration`,
    `  ${"─".repeat(22)} ${"─".repeat(10)} ${"─".repeat(10)} ${"─".repeat(14)} ${"─".repeat(14)} ${"─".repeat(10)}`,
  ];

  for (const agent of agents) {
    const name = agent.name.padEnd(22);
    const statusColor = agent.status === "busy" ? "\x1b[33m" : "\x1b[32m";
    const status = `${statusColor}${agent.status.padEnd(10)}\x1b[0m`;
    const work = agent.workType
      ? `\x1b[36m${agent.workType.padEnd(10)}\x1b[0m`
      : "—".padEnd(10);
    const target = (agent.issueId ?? agent.mentionId ?? "—").padEnd(14);
    const session = (agent.sessionId ?? "—").padEnd(14);
    const duration = agent.startedAt ? formatDuration(now - agent.startedAt) : "—";
    lines.push(`  ${name} ${status} ${work} ${target} ${session} ${duration}`);
  }

  lines.push("");
  lines.push(sep);
  lines.push(`  Next poll in ${Math.max(0, Math.ceil((nextPollAt - now) / 1000))}s  |  Ctrl+C to stop`);
  lines.push("");

  process.stdout.write(lines.join("\n"));
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

let nextPollAt = Date.now();

async function poll(): Promise<void> {
  for (const agent of agents) {
    if (agent.status === "busy") continue;

    // Check for new issues first
    const issueId = await getNextIssue(agent.name);
    if (issueId) {
      launchAgent(agent, "issue", issueId);
      render();
      continue;
    }

    // Then check for unread mentions — handle one at a time
    const mentionId = await getFirstUnreadMention(agent.name);
    if (mentionId) {
      launchAgent(agent, "mention", mentionId);
      render();
    }
  }

  nextPollAt = Date.now() + POLL_INTERVAL_MS;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const users = loadUsers();
if (users.length === 0) {
  console.error("No users found in .agentrack/users.json");
  process.exit(1);
}

const agents: AgentState[] = users.map((u) => ({
  name: u.name,
  token: u.token,
  status: "free",
  workType: null,
  issueId: null,
  mentionId: null,
  sessionId: null,
  startedAt: null,
  process: null,
}));

// Hide cursor
process.stdout.write("\x1b[?25l");

// Show cursor on exit
process.on("SIGINT", () => {
  process.stdout.write("\x1b[?25h\n");
  // Kill any running agent processes
  for (const agent of agents) {
    if (agent.process) {
      agent.process.kill();
    }
  }
  process.exit(0);
});

// Initial poll
await poll();
render();

// Re-render every second (for duration counter updates)
setInterval(render, 1000);

// Poll for new work every POLL_INTERVAL_MS
setInterval(poll, POLL_INTERVAL_MS);
