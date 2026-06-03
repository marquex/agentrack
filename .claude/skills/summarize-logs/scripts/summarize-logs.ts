#!/usr/bin/env bun
/**
 * Summarize Agent Logs
 *
 * Reads a JSONL session log file produced by the observable-agent hook and
 * prints a human-readable narrative of what happened during the session.
 *
 * Extracts:
 *   - Hooks called (with command, exit code, duration)
 *   - The initial user prompt
 *   - Tool calls made by the agent and their results
 *   - Agent thinking (internal reasoning)
 *   - Agent text responses (what the agent said out loud)
 *
 * Usage:
 *   bun summarize-logs.ts <log-path> [--compact]
 *
 * Options:
 *   --compact   Omit full thinking blocks and truncate long tool results
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

// ── Types ─────────────────────────────────────────────────────────────

interface LogEntry {
  role: string;
  type?: string;
  data?: Record<string, unknown>;
}

interface ParsedEntry {
  lineNumber: number;
  role: string;
  type: string;
  data: Record<string, unknown>;
}

interface HookInfo {
  hookEvent: string;
  command: string;
  exitCode: number;
  durationMs: number;
  stdout?: string;
  stderr?: string;
  stdoutTruncated?: boolean;
  truncated?: boolean;
}

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResult {
  toolUseId: string;
  content: string;
  isError: boolean;
  truncated: boolean;
}

// ── CLI ───────────────────────────────────────────────────────────────

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    compact: { type: "boolean", default: false },
  },
  allowPositionals: true,
});

const logPath = positionals[0];

if (!logPath) {
  console.error("Usage: bun summarize-logs.ts <log-path> [--compact]");
  process.exit(1);
}

const resolvedPath = resolve(logPath);
if (!existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

const COMPACT = values.compact ?? false;

// ── Parsing ───────────────────────────────────────────────────────────

function parseLog(filePath: string): ParsedEntry[] {
  const raw = readFileSync(filePath, "utf-8");
  const entries: ParsedEntry[] = [];

  for (const [index, line] of raw.split("\n").entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry: LogEntry;
    try {
      entry = JSON.parse(trimmed) as LogEntry;
    } catch {
      // Skip malformed lines
      continue;
    }

    entries.push({
      lineNumber: index + 1,
      role: entry.role ?? "unknown",
      type: entry.type ?? (entry.data?.type as string) ?? "unknown",
      data: entry.data ?? {},
    });
  }

  return entries;
}

// ── Formatting helpers ────────────────────────────────────────────────

function truncate(str: string, maxLen: number): string {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + `... (${str.length} chars total)`;
}

function formatHookInfo(data: Record<string, unknown>): string {
  const hookEvent = (data.hookEvent as string) ?? "unknown";
  const command = (data.command as string) ?? "";
  const exitCode = data.exitCode as number;
  const durationMs = data.durationMs as number;
  const stdoutTruncated = data.stdout_truncated as boolean;
  const stderrTruncated = data.truncated as boolean;

  const lines: string[] = [];
  lines.push(`  Event:    ${hookEvent}`);

  if (command) {
    lines.push(`  Command:  ${command}`);
  }

  lines.push(`  Exit:     ${exitCode}`);
  lines.push(`  Duration: ${durationMs}ms`);

  const stdout = data.stdout as string;
  if (stdout) {
    const label = stdoutTruncated ? "Stdout (truncated):" : "Stdout:";
    lines.push(`  ${label} ${truncate(stdout, COMPACT ? 120 : 500)}`);
  }

  const stderr = data.stderr as string;
  if (stderr) {
    const label = stderrTruncated ? "Stderr (truncated):" : "Stderr:";
    lines.push(`  ${label} ${truncate(stderr, COMPACT ? 120 : 500)}`);
  }

  return lines.join("\n");
}

function formatToolInput(name: string, input: Record<string, unknown>): string {
  const parts: string[] = [name];

  if (name === "Read") {
    const path = input.file_path as string;
    if (path) {
      parts.push(path);
      if (input.offset || input.limit) {
        parts.push(`(lines ${input.offset ?? "?"}-${input.limit ?? "?"})`);
      }
    }
  } else if (name === "Grep") {
    parts.push(`"${input.pattern}"`);
    if (input.path) parts.push(`in ${input.path}`);
    if (input.output_mode) parts.push(`[${input.output_mode}]`);
  } else if (name === "Bash") {
    const cmd = input.command as string;
    if (cmd) parts.push(`→ ${truncate(cmd, COMPACT ? 80 : 200)}`);
  } else if (name === "Glob") {
    parts.push(input.pattern as string);
  } else if (name === "Write") {
    const filePath = input.file_path as string;
    if (filePath) parts.push(filePath);
  } else if (name === "Edit") {
    const filePath = input.file_path as string;
    if (filePath) parts.push(filePath);
  } else {
    // Generic: show keys
    const keys = Object.keys(input);
    if (keys.length > 0) {
      parts.push(`(${keys.join(", ")})`);
    }
  }

  return parts.join(" ");
}

function formatToolResultContent(content: string, isError: boolean): string {
  if (!content) return "(empty)";
  const prefix = isError ? "ERROR: " : "";
  return prefix + truncate(content, COMPACT ? 200 : 1000);
}

// ── Narrative builder ─────────────────────────────────────────────────

/**
 * Buffers tool calls until their matching result arrives, then emits
 * a single combined section.  Tool calls that never receive a result
 * (orphaned) are flushed at the end.
 */
function buildNarrative(entries: ParsedEntry[]): string {
  const sections: string[] = [];
  // Pending tool calls keyed by tool_use_id
  const pendingCalls = new Map<string, ToolCall>();

  let sectionIndex = 0;

  function addSection(title: string, body: string): void {
    const separator = sectionIndex === 0 ? "" : "\n";
    sections.push(`${separator}--- ${title} ---\n${body}`);
    sectionIndex++;
  }

  /** Emit a buffered tool call together with its result. */
  function emitToolWithResult(call: ToolCall, content: string, isError: boolean, truncated: boolean): void {
    const callLine = formatToolInput(call.name, call.input);
    const truncationNote = truncated ? " (truncated)" : "";
    const resultLabel = isError ? "ERROR: " : "";
    const resultLine = resultLabel + truncate(content, COMPACT ? 200 : 1000);
    addSection("Tool Call", `${callLine}\nResult${truncationNote}: ${resultLine}`);
  }

  for (const entry of entries) {
    const { role, type, data } = entry;

    // 1. Hook events
    if (role === "system" && type === "hook_success") {
      addSection("Hook Called", formatHookInfo(data));
      continue;
    }

    // 2. User prompt (the initial task)
    if (role === "user" && data?.type === "prompt") {
      const content = data.content as string;
      addSection("User Prompt", content);
      continue;
    }

    // 3. Agent thinking
    if (role === "assistant" && type === "thinking") {
      const thinking = data.thinking as string;
      if (thinking) {
        if (COMPACT) {
          addSection("Thinking", truncate(thinking, 300));
        } else {
          addSection("Thinking", thinking);
        }
      }
      continue;
    }

    // 4. Agent tool use — buffer until result arrives
    if (role === "assistant" && type === "tool_use") {
      const call: ToolCall = {
        id: (data.id as string) ?? "",
        name: (data.name as string) ?? "unknown",
        input: (data.input as Record<string, unknown>) ?? {},
      };
      pendingCalls.set(call.id, call);
      continue;
    }

    // 5. Tool result — match back to the buffered tool call and emit together
    if (role === "user" && type === "tool_result") {
      const toolUseId = (data.tool_use_id as string) ?? "";
      const content = (data.content as string) ?? "";
      const isError = (data.is_error as boolean) ?? false;
      const truncated = (data.truncated as boolean) ?? false;

      const matched = pendingCalls.get(toolUseId);
      if (matched) {
        pendingCalls.delete(toolUseId);
        emitToolWithResult(matched, content, isError, truncated);
      } else {
        // Result without a buffered call — emit standalone
        const resultLabel = isError ? "ERROR: " : "";
        const truncationNote = truncated ? " (truncated)" : "";
        addSection("Tool Result", `${resultLabel}${truncate(content, COMPACT ? 200 : 1000)}${truncationNote}`);
      }
      continue;
    }

    // 6. Agent text response
    if (role === "assistant" && type === "text") {
      const text = data.text as string;
      if (text) {
        addSection("Agent Says", text);
      }
      continue;
    }

    // 7. Process end
    if (role === "system" && type === "process_end") {
      // Flush any orphaned tool calls (calls that never got a result)
      for (const call of pendingCalls.values()) {
        addSection("Tool Call", `${formatToolInput(call.name, call.input)}\nResult: (no result received)`);
      }
      pendingCalls.clear();

      addSection("Session Ended", "(process_end marker)");
      continue;
    }

    // 8. Unknown entries — include for completeness
    const dataPreview = truncate(JSON.stringify(data), COMPACT ? 100 : 300);
    addSection(`Unknown (${role}/${type})`, dataPreview);
  }

  // Final flush for any orphaned calls (if no process_end marker)
  for (const call of pendingCalls.values()) {
    addSection("Tool Call", `${formatToolInput(call.name, call.input)}\nResult: (no result received)`);
  }

  return sections.join("\n");
}

// ── Stats summary ─────────────────────────────────────────────────────

function buildStats(entries: ParsedEntry[]): string {
  let hooks = 0;
  let toolCalls = 0;
  let toolResults = 0;
  let thinkingBlocks = 0;
  let textResponses = 0;
  let prompts = 0;
  let errors = 0;
  let unknown = 0;

  for (const entry of entries) {
    const { role, type, data } = entry;

    if (role === "system" && type === "hook_success") hooks++;
    else if (role === "user" && data?.type === "prompt") prompts++;
    else if (role === "assistant" && type === "thinking") thinkingBlocks++;
    else if (role === "assistant" && type === "tool_use") toolCalls++;
    else if (role === "user" && type === "tool_result") {
      toolResults++;
      if ((data?.is_error as boolean) ?? false) errors++;
    }
    else if (role === "assistant" && type === "text") textResponses++;
    else unknown++;
  }

  const lines: string[] = [
    `Total entries: ${entries.length}`,
    `  Hooks:          ${hooks}`,
    `  Prompts:        ${prompts}`,
    `  Tool calls:     ${toolCalls}`,
    `  Tool results:   ${toolResults} (${errors} errors)`,
    `  Thinking:       ${thinkingBlocks}`,
    `  Text responses: ${textResponses}`,
  ];

  if (unknown > 0) {
    lines.push(`  Unknown:        ${unknown}`);
  }

  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────

const entries = parseLog(resolvedPath);

if (entries.length === 0) {
  console.log("No entries found in the log file.");
  process.exit(0);
}

console.log(`=== Session Log Summary ===`);
console.log(`File: ${resolvedPath}`);
console.log(`\n--- Stats ---\n${buildStats(entries)}`);
console.log(`\n--- Narrative ---`);
console.log(buildNarrative(entries));
