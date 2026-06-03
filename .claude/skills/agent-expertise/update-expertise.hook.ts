#!/usr/bin/env bun
/**
 * Update Expertise Hook
 *
 * Runs at Stop/SubagentStop to trigger asynchronous expertise updates.
 * Computes the observable log path from session_id, waits briefly for the
 * tail process to finish, then spawns a background claude process that
 * calls the expertise-manager to analyze the log and update expertise files.
 *
 * This hook does NOT block the agent — it exits immediately after spawning
 * the background process.
 *
 * Events handled:
 *   Stop — main agent finishes
 *   SubagentStop — subagent finishes
 */

import {
    existsSync,
    statSync,
    openSync,
    readSync,
    closeSync,
} from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

// ── types ────────────────────────────────────────────────────────────

interface HookInput {
    session_id?: string;
    transcript_path?: string;
    cwd?: string;
    hook_event_name?: string;
    agent_type?: string;
}

// ── helpers ──────────────────────────────────────────────────────────

function getLogsBasePath(cwd: string): string {
    const envPath = process.env.OBSERVABLE_AGENT_LOGS_PATH;
    if (envPath) return envPath;
    return cwd;
}

/** Compute the observable log path directly from session_id. */
function getLogPath(sessionId: string, cwd: string): string {
    return join(getLogsBasePath(cwd), `${sessionId}.jsonl`);
}

async function readStdin(): Promise<HookInput | null> {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    try {
        return JSON.parse(Buffer.concat(chunks).toString()) as HookInput;
    } catch {
        return null;
    }
}

/**
 * Check if the log file has a process_end marker (written by the tail
 * on exit). Reads the last 4KB for efficiency.
 */
function hasProcessEndMarker(logPath: string): boolean {
    if (!existsSync(logPath)) return false;
    try {
        const stat = statSync(logPath);
        if (stat.size === 0) return false;
        const readSize = Math.min(stat.size, 4096);
        const offset = stat.size - readSize;
        const buffer = Buffer.alloc(readSize);
        const fd = openSync(logPath, 'r');
        readSync(fd, buffer, 0, readSize, offset);
        closeSync(fd);
        return buffer.toString('utf8').includes('"process_end"');
    } catch {
        return false;
    }
}

/**
 * Wait for the observable tail process to finish writing the process_end
 * marker. Polls every 2 seconds, up to maxWaitMs.
 * If the marker never arrives, proceeds with whatever content is available.
 */
async function waitForLogReady(
    logPath: string,
    maxWaitMs = 30000,
    pollIntervalMs = 2000,
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        if (hasProcessEndMarker(logPath)) return;
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    // Timeout — proceed with whatever content is available.
}

// ── main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const input = await readStdin();
    if (!input) process.exit(0);

    const { session_id, agent_type, cwd } = input;

    // Not an agent session — skip.
    if (!agent_type || !session_id || !cwd) process.exit(0);

    const logPath = getLogPath(session_id, cwd);

    // No observable log — nothing to learn from.
    if (!existsSync(logPath) || statSync(logPath).size === 0) {
        process.exit(0);
    }

    // Wait for the tail process to finish writing the process_end marker.
    // The observable-agent Stop hook writes the stop signal, then the tail
    // winds down and writes process_end. Since update-expertise runs BEFORE
    // observable-agent on Stop, the tail is still running. We wait for it.
    await waitForLogReady(logPath);

    const prompt =
        `Update the expertise for the '${agent_type}' agent based on its completed work session.\n\n` +
        `The observable session log is at: ${logPath}\n\n` +
        `Read the log file to understand:\n` +
        `1. What task the agent was working on.\n` +
        `2. What the agent discovered or learned during the work.\n` +
        `3. Any patterns, decisions, or important observations the agent made.\n` +
        `4. Any errors encountered and how they were resolved.\n\n` +
        `Then update the expertise files for '${agent_type}' following your standard updating workflow.\n` +
        `Focus on capturing new knowledge, not repeating what's already stored.`;

    // Spawn a detached background process. It runs after this hook exits.
    const child = spawn(
        'claude',
        ['-p', '--agent', 'expertise-manager', '--permission-mode', 'auto', prompt],
        {
            detached: true,
            stdio: 'ignore',
            cwd,
        },
    );
    child.unref();

    process.exit(0);
}

main();
