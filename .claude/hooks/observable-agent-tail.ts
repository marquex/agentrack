#!/usr/bin/env bun
/**
 * Background tail process for the observable-agent hook.
 *
 * Monitors a JSONL source file and copies new bytes to a separate output
 * log file. Runs as a detached background process spawned by the
 * observable-agent hook during SessionStart.
 *
 * Usage:
 *   bun observable-agent-tail.ts <source-path> <output-path> [stop-signal-path]
 *
 * Polling: checks for new content every 2 seconds.
 * Exit conditions:
 *   1. Stop signal file exists AND source hasn't grown in the last 3 polls (6s)
 *   2. Source hasn't grown in 60 seconds regardless (orphan protection)
 *   3. SIGTERM / SIGINT
 */

import {
    existsSync,
    statSync,
    openSync,
    closeSync,
    readSync,
    appendFileSync,
    mkdirSync,
} from 'node:fs';
import { dirname } from 'node:path';

const sourcePath = process.argv[2]!;
const outputPath = process.argv[3]!;
const stopSignalPath = process.argv[4] || '';

if (!sourcePath || !outputPath) {
    process.stderr.write(
        'Usage: bun observable-agent-tail.ts <source-path> <output-path> [stop-signal-path]\n',
    );
    process.exit(1);
}

// Ensure the output directory exists before we start writing.
mkdirSync(dirname(outputPath), { recursive: true });

// Byte offset tracks how much of the source file we have already copied.
// Start from the end of any existing content so we only copy lines written
// after this process starts.
let byteOffset = 0;

if (existsSync(sourcePath)) {
    byteOffset = statSync(sourcePath).size;
}

// Track how many consecutive polls had no new content.
let idlePolls = 0;

// Track when we last saw new content (for orphan protection).
let lastGrowthTime = Date.now();

// Clean exit on termination signals.
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

/** Entry types to exclude from the output entirely. */
const IGNORED_TYPES = new Set([
    'agent-setting',
    'queue-operation',
    'last-prompt',
    'hook_additional_context'
]);

/**
 * Parse a chunk of newline-delimited JSON and return the lines that should
 * be copied to the output, transformed per the filtering rules:
 *
 *   1. Skip entries whose `type` is in IGNORED_TYPES.
 *   2. For remaining entries that have an `attachment` object, emit only the
 *      `attachment` value as a standalone JSON line.
 *   3. For remaining entries that have a `message` object, emit only the
 *      `message` value as a standalone JSON line.
 *   4. Lines that fail JSON parsing are silently skipped.
 */
function filterChunk(chunk: string): string[] {
    const output: string[] = [];

    for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let entry: Record<string, unknown>;
        try {
            entry = JSON.parse(trimmed) as Record<string, unknown>;
        } catch {
            // Malformed JSON — skip this entry.
            continue;
        }

        // Skip ignored entry types.
        if (typeof entry.type === 'string' && IGNORED_TYPES.has(entry.type)) {
            continue;
        }

        // If the entry carries an `attachment`, emit only the attachment.
        if (typeof entry.attachment === 'object' && entry.attachment !== null) {
            const systemEntry = {
                role: 'system',
                type: entry.attachment!.type,
                data: cleanObject( entry.attachment, ['type'])
            }
            output.push(JSON.stringify(systemEntry));
            continue;
        }

        // If the entry carries a `message`, emit only the message.
        if (typeof entry.message === 'object' && entry.message !== null) {
            const {message} = entry;
            const {content} = message;
            const isPrompt = typeof content === 'string';
            const messageEntry ={
                role: message.role,
                type: content.type,
                data: isPrompt ? 
                    {type: 'prompt', content} :
                    cleanObject( content, ['type'] )
            }
            output.push(JSON.stringify(messageEntry));
            continue;
        }

        // Entries without attachment or message are silently skipped.
    }

    return output;
}

function cleanObject( obj: Object, attrs: string[] ) {
    const clean = {};
    Object.keys(obj).forEach(key => {
        if (attrs.includes(key)) return;
        clean[key] = obj[key];
    });
    return clean;
}

const POLL_INTERVAL_MS = 2000;
const IDLE_POLLS_BEFORE_EXIT = 10; // 20 seconds of no growth after stop signal
// This must be long enough to survive a blocked-stop cycle: the expertise
// hook blocks the stop, then Claude thinks for several seconds before
// producing new output. 20 s covers API latency + thinking time.
const ORPHAN_TIMEOUT_MS = 120_000; // 2 minutes of no growth = exit regardless

async function tail(): Promise<void> {
    while (true) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        try {
            if (!existsSync(sourcePath)) {
                idlePolls++;
                continue;
            }

            const stat = statSync(sourcePath);

            if (stat.size > byteOffset) {
                // New content available — read and copy it.
                const bytesToRead = stat.size - byteOffset;
                const buffer = Buffer.alloc(bytesToRead);
                const fd = openSync(sourcePath, 'r');
                readSync(fd, buffer, 0, bytesToRead, byteOffset);
                closeSync(fd);

                byteOffset = stat.size;
                idlePolls = 0;
                lastGrowthTime = Date.now();

                const newContent = buffer.toString('utf8');
                if (newContent.trim()) {
                    const lines = filterChunk(newContent);
                    if (lines.length > 0) {
                        appendFileSync(outputPath, lines.join('\n') + '\n');
                    }
                }
            } else {
                // No new content this poll.
                idlePolls++;

                // Orphan protection: if no growth for a long time, exit.
                if (Date.now() - lastGrowthTime > ORPHAN_TIMEOUT_MS) {
                    process.exit(0);
                }

                // Graceful exit: if a stop signal exists AND the source file
                // hasn't grown for several consecutive polls, we're done.
                if (
                    stopSignalPath &&
                    existsSync(stopSignalPath) &&
                    idlePolls >= IDLE_POLLS_BEFORE_EXIT
                ) {
                    process.exit(0);
                }
            }
        } catch {
            // Source file may be temporarily unavailable during concurrent
            // writes — retry on the next poll cycle.
        }
    }
}

tail();
