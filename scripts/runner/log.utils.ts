import { readFileSync } from "node:fs";
import type {
  AgentSessionLogEntry,
  AssistantContentItem,
  AssistantLogEntry,
  CompactAgentSessionLogEntry,
  CompactAssistantLogEntry,
  CompactSystemLogEntry,
  CompactUserLogEntry,
  ResultSuccessLogEntry,
  SystemLogEntry,
  ToolResultContent,
  UserLogEntry,
} from "./log.types";

export function normalizeLogs(logFilePath: string): CompactAgentSessionLogEntry[] {
  const raw = readFileSync(logFilePath, "utf-8");
  const normalized: CompactAgentSessionLogEntry[] = [];

  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;

    const lineNumber = index + 1;
    const entry = parseLogLine(line, lineNumber);
    normalized.push(...normalizeLogEntry(entry, lineNumber));
  }

  return normalized;
}

function parseLogLine(line: string, lineNumber: number): AgentSessionLogEntry {
  try {
    return JSON.parse(line) as AgentSessionLogEntry;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON on log line ${lineNumber}: ${message}`);
  }
}

function normalizeLogEntry(
  entry: AgentSessionLogEntry,
  lineNumber: number,
): CompactAgentSessionLogEntry[] {
  switch (entry.type) {
    case "system":
      return [normalizeSystemEntry(entry)];
    case "assistant":
      return normalizeAssistantEntry(entry);
    case "user":
      return normalizeUserEntry(entry);
    case "result":
      return [normalizeResultEntry(entry)];
    default:
      throw new Error(`Unsupported log entry type on line ${lineNumber}: ${getType(entry)}`);
  }
}

function normalizeSystemEntry(entry: SystemLogEntry): CompactSystemLogEntry {
  switch (entry.subtype) {
    case "hook_started": {
      const { type, subtype, ...content } = entry;
      void type;
      return { type: "system", subtype, content };
    }
    case "hook_response": {
      const { type, subtype, ...content } = entry;
      void type;
      return { type: "system", subtype, content };
    }
    case "init": {
      const { type, subtype, ...content } = entry;
      void type;
      return { type: "system", subtype, content };
    }
    case "notification": {
      const { type, subtype, ...content } = entry;
      void type;
      return { type: "system", subtype, content };
    }
    case "task_started": {
      const { type, subtype, ...content } = entry;
      void type;
      return { type: "system", subtype, content };
    }
    case "task_updated": {
      const { type, subtype, ...content } = entry;
      void type;
      return { type: "system", subtype, content };
    }
    case "task_notification": {
      const { type, subtype, ...content } = entry;
      void type;
      return { type: "system", subtype, content };
    }
    default:
      throw new Error(`Unsupported system subtype: ${getSubtype(entry)}`);
  }
}

function normalizeAssistantEntry(entry: AssistantLogEntry): CompactAssistantLogEntry[] {
  return entry.message.content.map(normalizeAssistantContent);
}

function normalizeAssistantContent(contentItem: AssistantContentItem): CompactAssistantLogEntry {
  switch (contentItem.type) {
    case "thinking": {
      const { type, ...content } = contentItem;
      void type;
      return { type: "assistant", subtype: "thinking", content };
    }
    case "text": {
      const { type, ...content } = contentItem;
      void type;
      return { type: "assistant", subtype: "text", content };
    }
    case "tool_use": {
      const { type, ...content } = contentItem;
      void type;
      return { type: "assistant", subtype: "tool_use", content };
    }
    default:
      throw new Error(`Unsupported assistant content type: ${getType(contentItem)}`);
  }
}

function normalizeUserEntry(entry: UserLogEntry): CompactUserLogEntry[] {
  return entry.message.content.map(normalizeUserContent);
}

function normalizeUserContent(contentItem: ToolResultContent): CompactUserLogEntry {
  const { type, ...content } = contentItem;
  void type;

  return {
    type: "user",
    subtype: "tool_result",
    content,
  };
}

function normalizeResultEntry(entry: ResultSuccessLogEntry): CompactSystemLogEntry {
  const { type, subtype, ...content } = entry;
  void type;
  void subtype;

  return {
    type: "system",
    subtype: "result_success",
    content,
  };
}

function getType(value: unknown): string {
  if (value && typeof value === "object" && "type" in value) {
    return String(value.type);
  }

  return typeof value;
}

function getSubtype(value: unknown): string {
  if (value && typeof value === "object" && "subtype" in value) {
    return String(value.subtype);
  }

  return typeof value;
}
