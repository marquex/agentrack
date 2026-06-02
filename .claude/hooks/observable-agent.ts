#!/usr/bin/env bun
/**
 * Observable Agent Hook
 *
 * Tracks Claude session output by monitoring the session's JSONL transcript
 * file and copying new lines to a separate observable log file. A background
 * tail process is spawned on SessionStart and signaled on Stop.
 *
 * Events handled:
 *   SessionStart — starts a background tail process, reports the log path
 *   Stop / SubagentStop — writes a stop signal; the tail exits when idle
 *
 * Output logs are stored at:
 *   $OBSERVABLE_AGENT_LOGS_PATH/<sessionId>.jsonl
 *
 * Falls back to the Claude process CWD when OBSERVABLE_AGENT_LOGS_PATH is
 * not defined (can be set in .env).
 */

import {
    existsSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

// ── types ────────────────────────────────────────────────────────────

interface HookInput {
    session_id?: string;
    transcript_path?: string;
    cwd?: string;
    hook_event_name?: string;
    agent_type?: string;
    source?: string;
}

interface ObservableState {
    sourcePath: string;
    outputPath: string;
    observableSessionId: string;
    tailPid: number;
}

// ── helpers ──────────────────────────────────────────────────────────

function generateSessionId(): string {
    return Date.now().toString(36);
}

const STATE_DIR = join(tmpdir(), 'claude-observable-agent');

function statePath(sessionId: string): string {
    mkdirSync(STATE_DIR, { recursive: true });
    return join(STATE_DIR, `${sessionId}.json`);
}

/** Path for the stop signal file — its existence tells the tail to wind down. */
function stopSignalPath(sessionId: string): string {
    return join(STATE_DIR, `${sessionId}.stop`);
}

function getLogsBasePath(cwd: string): string {
    const envPath = process.env.OBSERVABLE_AGENT_LOGS_PATH;
    if (envPath) {
        mkdirSync(envPath, { recursive: true });
        return envPath;
    }
    return cwd;
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

function emit(output: unknown): void {
    process.stdout.write(JSON.stringify(output));
    process.exit(0);
}

// ── SessionStart ─────────────────────────────────────────────────────

function handleSessionStart(input: HookInput): void {
    const { session_id, transcript_path, cwd } = input;
    if (!session_id || !transcript_path || !cwd) process.exit(0);

    const sPath = statePath(session_id);

    // If we are already monitoring this session and the tail process is
    // still alive (e.g. on compact or resume), skip re-creating it.
    if (existsSync(sPath)) {
        try {
            const state = JSON.parse(
                readFileSync(sPath, 'utf8'),
            ) as ObservableState;
            process.kill(state.tailPid, 0); // signal 0 = check existence
            process.exit(0); // tail still running — nothing to do
        } catch {
            // Tail process is dead (e.g. previous session crashed). Clean up
            // the stale state and start fresh.
            rmSync(sPath, { force: true });
        }
    }

    const observableSessionId = generateSessionId();
    const logsBasePath = getLogsBasePath(cwd);
    const outputPath = join(logsBasePath, `${observableSessionId}.jsonl`);

    // Ensure the output directory exists.
    mkdirSync(dirname(outputPath), { recursive: true });

    // Spawn the background tail process (detached so it survives the hook).
    // Pass the stop signal path as a third argument so the tail knows where
    // to look for the graceful-shutdown signal.
    const hookDir = import.meta.dir;
    const tailScript = join(hookDir, 'observable-agent-tail.ts');
    const stopSigPath = stopSignalPath(session_id);

    const child = spawn(
        'bun',
        [tailScript, transcript_path, outputPath, stopSigPath],
        {
            detached: true,
            stdio: 'ignore',
        },
    );
    child.unref();

    const tailPid = child.pid!;

    // Persist state so the Stop hook can write the signal file.
    const state: ObservableState = {
        sourcePath: transcript_path,
        outputPath,
        observableSessionId,
        tailPid,
    };
    writeFileSync(sPath, JSON.stringify(state, null, 2));

    // Report the log path back into the agent's conversation.
    emit({
        hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: `Observable session logs: ${outputPath}`,
        },
    });
}

// ── Stop / SubagentStop ──────────────────────────────────────────────

function handleStop(input: HookInput): void {
    const { session_id } = input;
    if (!session_id) process.exit(0);

    const sPath = statePath(session_id);
    if (!existsSync(sPath)) process.exit(0);

    // Verify state file is valid before writing the signal.
    try {
        JSON.parse(readFileSync(sPath, 'utf8')) as ObservableState;
    } catch {
        process.exit(0);
    }

    // Write the stop signal file. The tail process checks for this on each
    // poll cycle. When it sees the signal AND the source file has stopped
    // growing, it does one final read and exits. This is more robust than
    // killing the tail immediately because other Stop hooks (like expertise)
    // may block the stop, causing Claude to continue writing to the
    // transcript. The tail stays alive until the writing truly stops.
    const sigPath = stopSignalPath(session_id);
    writeFileSync(sigPath, Date.now().toString());

    process.exit(0);
}

// ── main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const input = await readStdin();
    if (!input) process.exit(0);

    switch (input.hook_event_name) {
        case 'SessionStart':
            return handleSessionStart(input);
        case 'Stop':
        case 'SubagentStop':
            return handleStop(input);
        default:
            process.exit(0);
    }
}

main();
