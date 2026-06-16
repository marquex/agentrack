#!/usr/bin/env bun
/**
 * Agent runner — manages a team of Claude agents pulling issues from agentrack.
 *
 * Reads agent names from .agentrack/users.json, polls every 60s for available work
 * and new mentions, and spawns `claude --agent <name> -p "/work-issue <id>"` or
 * `/work-mention <id>` child processes. Two extra timers target only the project
 * manager: a status loop (fix sick issues) and an ideas loop (triage ideas).
 *
 * Agents log their own sessions at .agentic/agent_logs (named by Claude's
 * session_id) via the observable-agent hook; this script does not store session
 * logs. It only reads the subprocess's stream-json stdout to surface Claude's
 * real session id (prefix) in the TUI.
 *
 * Displays a live TUI showing each agent's status.
 *
 * Press `q` for a graceful stop: the loops stop taking new work, but running
 * agents finish on their own, and once all are free the runner exits. Press
 * Ctrl+C to hard-kill running agents immediately and exit at once.
 */

import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

type AgentWorkType = "issue" | "mention" | "status" | "ideas";

interface AgentState {
  name: string;
  token: string;
  status: "free" | "busy";
  workType: AgentWorkType | null;
  issueId: string | null;
  mentionId: string | null;
  /**
   * Claude's session id (a UUID), surfaced from the stream-json output. Shown
   * truncated in the TUI and used to reap the session's observable-agent tail.
   */
  sessionId: string | null;
  startedAt: number | null;
  process: Subprocess | null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 60_000; // 1 minute

/** Name of the project-manager agent (.claude/agents/project-manager.md). */
const PROJECT_MANAGER = "project-manager";

const ROOT = resolve(import.meta.dir, "..");
const USERS_PATH = resolve(ROOT, ".agentrack/users.json");

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

/** Number of leading chars of Claude's session UUID to show in the TUI. */
const SESSION_ID_PREFIX = 8;

/**
 * Where the observable-agent hook stores per-session state (incl. the tail PID).
 * Mirrors STATE_DIR in .claude/hooks/observable-agent.ts — used to reap the tail.
 */
const OBSERVABLE_STATE_DIR = resolve(tmpdir(), "claude-observable-agent");

/**
 * Launch a `claude --agent` subprocess for `agent`. One launcher for all four work
 * types — the caller owns the prompt; we only differ in TUI labelling.
 *
 * `targetId` populates the TUI Target column for issue/mention wake-ups. The status
 * and ideas loops operate on the whole queue, so they pass no id (column shows `—`).
 *
 * The subprocess runs with `--output-format stream-json --verbose` only so we can
 * read Claude's real session id out of the stream and show its prefix in the TUI.
 * The stream is parsed for that one field and discarded — nothing is written to disk
 * (agents log their own sessions via the observable-agent hook).
 */
function launchAgent(
  agent: AgentState,
  opts: { prompt: string; workType: AgentWorkType; targetId?: string },
): void {
  const { prompt, workType, targetId } = opts;

  agent.status = "busy";
  agent.workType = workType;
  agent.issueId = workType === "issue" && targetId ? targetId : null;
  agent.mentionId = workType === "mention" && targetId ? targetId : null;
  agent.sessionId = null;
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
      stdin: "ignore", // -p runs non-interactively; avoids a 3s stdin-wait warning
      stdout: "pipe",  // read only to extract the session id (drained below)
      stderr: "ignore",
    },
  );

  agent.process = proc;

  // Drain stdout, capturing Claude's session id from the first stream event that
  // carries one (the `system/init` event emits it immediately). We keep consuming
  // until EOF so the subprocess never blocks on a full pipe, but discard the bytes.
  (async () => {
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (agent.sessionId) continue; // already captured — keep draining, skip parsing
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
          const sid = (JSON.parse(line) as { session_id?: unknown }).session_id;
          if (typeof sid === "string" && sid) {
            agent.sessionId = sid;
            render();
            break;
          }
        } catch {
          // Not a JSON line — ignore.
        }
      }
    }
  })();

  // When the process exits, reap its observable-agent tail (the hook spawns it
  // detached, so it outlives claude and would otherwise leak), then mark free.
  proc.exited.then(() => {
    const finishedSessionId = agent.sessionId;
    agent.status = "free";
    agent.workType = null;
    agent.issueId = null;
    agent.mentionId = null;
    agent.sessionId = null;
    agent.startedAt = null;
    agent.process = null;
    if (finishedSessionId) killObservableTail(finishedSessionId);
    render();
    // If we're draining and this was the last busy agent, the runner is done.
    maybeFinishAfterDrain();
  });
}

/**
 * Reap the observable-agent tail for `sessionId`. The tail is spawned detached by
 * the hook, so it is invisible to our process tree; we look up its PID from the
 * hook's state file and SIGTERM it directly (the tail's SIGTERM handler exits
 * cleanly). No-op if the tail is already gone (state missing/stale or pid dead).
 */
function killObservableTail(sessionId: string): void {
  const statePath = resolve(OBSERVABLE_STATE_DIR, `${sessionId}.json`);
  if (!existsSync(statePath)) return;
  let tailPid: unknown;
  try {
    tailPid = (JSON.parse(readFileSync(statePath, "utf-8")) as { tailPid?: unknown }).tailPid;
  } catch {
    return; // malformed state — nothing to kill
  }
  if (typeof tailPid !== "number") return;
  try {
    process.kill(tailPid); // SIGTERM; ESRCH (already dead) is caught below
  } catch {
    // Process already exited — expected on normal completion.
  }
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

/** Compact countdown until `targetAt` from `now`: "Ns" under a minute, else "Nm". */
function formatCountdown(targetAt: number, now: number): string {
  const s = Math.max(0, Math.ceil((targetAt - now) / 1000));
  if (s >= 60) return `${Math.ceil(s / 60)}m`;
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
    const session = (agent.sessionId ? agent.sessionId.slice(0, SESSION_ID_PREFIX) : "—").padEnd(14);
    const duration = agent.startedAt ? formatDuration(now - agent.startedAt) : "—";
    lines.push(`  ${name} ${status} ${work} ${target} ${session} ${duration}`);
  }

  lines.push("");
  lines.push(sep);
  if (draining) {
    const busyCount = agents.filter((a) => a.status === "busy").length;
    lines.push(
      `  \x1b[33mDraining\x1b[0m — no new work taken, waiting for ${busyCount} agent(s) to finish  |  Ctrl+C to force-kill`,
    );
  } else {
    lines.push(
      `  Next poll in ${Math.max(0, Math.ceil((nextPollAt - now) / 1000))}s  |  Status in ${formatCountdown(nextStatusAt, now)}  |  Ideas in ${formatCountdown(nextIdeasAt, now)}  |  q graceful stop  |  Ctrl+C force-kill`,
    );
  }
  lines.push("");

  process.stdout.write(lines.join("\n"));
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

/**
 * Graceful-drain flag. Set by pressing `q` (see the raw stdin handler in Main):
 * the work/status/ideas loops stop taking new work, but running agents are left
 * alone to finish. Once every agent is free again, the runner exits cleanly.
 */
let draining = false;

let nextPollAt = Date.now();

async function poll(): Promise<void> {
  if (draining) return; // graceful drain: stop taking new work
  for (const agent of agents) {
    if (agent.status === "busy") continue;

    // Check for new issues first
    const issueId = await getNextIssue(agent.name);
    if (issueId) {
      launchAgent(agent, { prompt: `/work-issue ${issueId}`, workType: "issue", targetId: issueId });
      render();
      continue;
    }

    // Then check for unread mentions — handle one at a time
    const mentionId = await getFirstUnreadMention(agent.name);
    if (mentionId) {
      launchAgent(agent, { prompt: `/work-mention ${mentionId}`, workType: "mention", targetId: mentionId });
      render();
    }
  }

  nextPollAt = Date.now() + POLL_INTERVAL_MS;
}

// ---------------------------------------------------------------------------
// Project-manager loops
//
// Two extra timers that target only the PM: the status loop (fix sick issues)
// and the ideas loop (triage `idea`-status issues). Both just wake the PM and
// delegate to the matching recipe in the `issue-managing` skill — the script
// does no triage/status-fix logic itself.
// ---------------------------------------------------------------------------

const STATUS_INTERVAL_MS = 5 * 60_000; // 5 minutes
const IDEAS_INTERVAL_MS = 10 * 60_000; // 10 minutes

let nextStatusAt = Date.now() + STATUS_INTERVAL_MS;
let nextIdeasAt = Date.now() + IDEAS_INTERVAL_MS;

const STATUS_PROMPT = `Run the status loop from your \`issue-managing\` skill. Scan the open queue for sick issues — \`in-progress\` with no active work, \`in-progress\` parents whose children are stalled, broken or stale blockages — and fix each one so work flows again. Follow the skill's status-loop recipe exactly. If nothing is sick, stop.`;

const IDEAS_PROMPT = `Run the ideas loop from your \`issue-managing\` skill. There are \`idea\`-status issues waiting. For each: dedupe against existing ideas/issues, route it to the right decider (team lead for purely technical/internal ideas, product owner for product ideas, auto-accept if a manager created it), create the decision task and the PM follow-up task, and once a decision lands either plan the implementation issues or discard (\`closed\` + \`idea\` + \`discarded\` tags + a comment explaining why). Follow the skill's ideas-loop recipe exactly.`;

/** Look up the PM's AgentState. Asserted to exist at startup. */
function getProjectManager(): AgentState {
  const pm = agents.find((a) => a.name === PROJECT_MANAGER);
  if (!pm) {
    // Unreachable: startup asserts the PM exists in users.json.
    throw new Error(`No "${PROJECT_MANAGER}" agent loaded.`);
  }
  return pm;
}

/**
 * Promote `todo` parents to `in-progress` once any of their children has started
 * (status `in-progress` or `done`). A parent parked in `todo` while its children
 * are already underway is stale — move it along so the queue reflects reality.
 *
 * Handled in-process (no agent spawn): the index already exposes each child's
 * `parentId`, so this is just two list() calls and a set intersection.
 */
async function moveParentsToInProgress(): Promise<void> {
  // Collect the parent ids of every child already underway or finished.
  const activeParentIds = new Set<string>();
  for (const status of ["in-progress", "done"] as const) {
    const children = await tracker.list({ status });
    if (!Array.isArray(children)) continue;
    for (const child of children) {
      if (child.parentId) activeParentIds.add(child.parentId);
    }
  }
  if (activeParentIds.size === 0) return;

  // Promote any `todo` parent that owns an active child.
  const todo = await tracker.list({ status: "todo" });
  if (!Array.isArray(todo)) return;
  for (const parent of todo) {
    if (activeParentIds.has(parent.id)) {
      await tracker.update(parent.id, { status: "in-progress" });
    }
  }
}

/** Wake the PM to fix sick in-progress issues. Gated on a cheap pre-check + PM free. */
async function runStatusLoop(): Promise<void> {
  if (draining) return; // graceful drain: skip PM status wake-ups
  nextStatusAt = Date.now() + STATUS_INTERVAL_MS;

  // Promote stale todo parents whose children have already started. Pure library
  // work — no agent needed, so it runs every status tick regardless of PM state.
  await moveParentsToInProgress();

  // Cheap pre-check: only in-progress issues can become sick. Empty list => skip the spawn.
  const inProgress = await tracker.list({ status: "in-progress" });
  if (!Array.isArray(inProgress) || inProgress.length === 0) {
    render();
    return;
  }

  const pm = getProjectManager();
  if (pm.status !== "free") {
    render();
    return; // PM busy — next tick retries
  }

  launchAgent(pm, { prompt: STATUS_PROMPT, workType: "status" });
  render();
}

/** Wake the PM to triage idea-status issues. Gated on a cheap pre-check + PM free. */
async function runIdeasLoop(): Promise<void> {
  if (draining) return; // graceful drain: skip PM ideas wake-ups
  nextIdeasAt = Date.now() + IDEAS_INTERVAL_MS;

  // Cheap pre-check: only wake the PM if there are ideas to triage.
  const ideas = await tracker.list({ status: "idea" });
  if (!Array.isArray(ideas) || ideas.length === 0) {
    render();
    return;
  }

  const pm = getProjectManager();
  if (pm.status !== "free") {
    render();
    return; // PM busy — next tick retries (ideas will still be there)
  }

  launchAgent(pm, { prompt: IDEAS_PROMPT, workType: "ideas" });
  render();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const users = loadUsers();
if (users.length === 0) {
  console.error("No users found in .agentrack/users.json");
  process.exit(1);
}
if (!users.some((u) => u.name === PROJECT_MANAGER)) {
  console.error(
    `No "${PROJECT_MANAGER}" agent found in .agentrack/users.json — the status and ideas loops need it.`,
  );
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

// Interval handles, so a graceful exit can stop all the timers cleanly.
const intervalHandles: ReturnType<typeof setInterval>[] = [];

/** Kill every running agent's claude process AND its observable-agent tail. */
function killAllAgents(): void {
  for (const agent of agents) {
    if (agent.process) agent.process.kill();
    if (agent.sessionId) killObservableTail(agent.sessionId);
  }
}

/** Hard stop: restore the cursor, kill everything, exit immediately. */
function forceExit(): void {
  process.stdout.write("\x1b[?25h\n");
  killAllAgents();
  process.exit(0);
}

/** Graceful exit: stop timers, restore the cursor, exit. Assumes no busy agents. */
function finishGracefully(): void {
  for (const handle of intervalHandles) clearInterval(handle);
  process.stdout.write("\x1b[?25h\n");
  process.exit(0);
}

/**
 * Called whenever the drain state may have advanced. If we're draining and no
 * agent is busy anymore, the runner has nothing left to wait on — exit cleanly.
 */
function maybeFinishAfterDrain(): void {
  if (!draining) return;
  if (agents.every((a) => a.status === "free")) finishGracefully();
}

/**
 * Begin a graceful drain: loops stop taking new work, running agents keep going.
 * Pressing `q` again while already draining is a no-op.
 */
function gracefulStop(): void {
  if (draining) return;
  draining = true;
  render();
  maybeFinishAfterDrain(); // nothing was busy — we're already done
}

// Hard stop on SIGINT (fallback for when stdin isn't a raw TTY — e.g. piped —
// where the raw-mode keypress handler below never sees the Ctrl+C byte).
process.on("SIGINT", forceExit);

// Read keys in raw mode so we can bind `q` (graceful drain) and still honor
// Ctrl+C (0x03) as a hard kill. Raw mode disables ISIG, so Ctrl+C arrives as a
// byte here rather than raising SIGINT — handle it explicitly to keep the old
// behavior alongside the new gentle one.
if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (data: string) => {
    for (const ch of data) {
      const code = ch.codePointAt(0);
      if (ch === "q" || ch === "Q") {
        gracefulStop();
      } else if (code === 0x03) {
        forceExit();
      }
    }
  });
}

// Initial poll
await poll();
render();

// Run the status loop once immediately so sick issues are caught right away,
// rather than waiting up to STATUS_INTERVAL_MS for the first tick.
await runStatusLoop();
render();

// Re-render every second (for duration counter updates)
intervalHandles.push(setInterval(render, 1000));

// Poll for new work every POLL_INTERVAL_MS
intervalHandles.push(setInterval(poll, POLL_INTERVAL_MS));

// PM-only periodic loops: status fixes and ideas triage. Both gate on a cheap
// pre-check + PM being free, so they never collide with the work loop or each other.
intervalHandles.push(setInterval(runStatusLoop, STATUS_INTERVAL_MS));
intervalHandles.push(setInterval(runIdeasLoop, IDEAS_INTERVAL_MS));
