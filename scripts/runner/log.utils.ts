import { readFileSync } from "node:fs";
import type {
  AgentSessionLogEntry,
  AssistantContentItem,
  AssistantLogEntry,
  CompactAgentSessionLogEntry,
  CompactAssistantLogEntry,
  CompactSystemLogEntry,
  CompactUserLogEntry,
  GenericCompactEntry,
  ObservableAgentLogEntry,
  ObservableAttachmentLogEntry,
  ObservableAssistantLogEntry,
  ObservableUserLogEntry,
  ResultSuccessLogEntry,
  SystemLogEntry,
  ToolResultContent,
  UserLogEntry,
} from "./log.types";

type AnyCompactEntry = CompactAgentSessionLogEntry | GenericCompactEntry<"system" | "assistant" | "user", string>;

export function normalizeLogs(logFilePath: string): AnyCompactEntry[] {
  const raw = readFileSync(logFilePath, "utf-8");
  const normalized: AnyCompactEntry[] = [];

  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;

    const lineNumber = index + 1;
    const entry = parseLogLine(line, lineNumber);
    normalized.push(...normalizeLogEntry(entry, lineNumber));
  }

  return normalized;
}

function parseLogLine(line: string, lineNumber: number): Record<string, unknown> {
  try {
    return JSON.parse(line) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON on log line ${lineNumber}: ${message}`);
  }
}

function normalizeLogEntry(
  entry: Record<string, unknown>,
  lineNumber: number,
): AnyCompactEntry[] {
  // Attachment entries are detected by the presence of an `attachment` object
  // rather than a root-level `type` discriminator.
  if (typeof entry.attachment === "object" && entry.attachment !== null) {
    return [normalizeAttachmentEntry(entry as unknown as ObservableAttachmentLogEntry)];
  }

  const entryType = entry.type as string;

  switch (entryType) {
    // Old session-log types
    case "result":
      return [normalizeResultEntry(entry as unknown as ResultSuccessLogEntry)];
    // System: route by origin format
    case "system": {
      if ("parentUuid" in entry || "isSidechain" in entry) {
        return [normalizeObservableSystemEntry(entry)];
      }
      return [normalizeSystemEntry(entry as unknown as SystemLogEntry)];
    }
    // Shared by both formats
    case "assistant": {
      const msg = entry.message;
      if (typeof msg === "string") {
        return [normalizeStreamingAssistantEntry(entry as unknown as { type: "assistant"; message: string })];
      }
      if ("parentUuid" in entry) {
        return normalizeObservableAssistantEntry(entry as unknown as ObservableAssistantLogEntry);
      }
      return normalizeAssistantEntry(entry as unknown as AssistantLogEntry);
    }
    case "user":
      if ("parentUuid" in entry) {
        return normalizeObservableUserEntry(entry as unknown as ObservableUserLogEntry);
      }
      return normalizeUserEntry(entry as unknown as UserLogEntry);
    // Observable-agent only types
    case "agent-setting":
      return [normalizeAgentSettingEntry(entry as unknown as { type: "agent-setting"; agentSetting: string; sessionId: string })];
    case "queue-operation":
      return [normalizeQueueOperationEntry(entry as unknown as { type: "queue-operation"; operation: string; timestamp: string; sessionId: string; content?: string })];
    case "last-prompt":
      return [normalizeLastPromptEntry(entry as unknown as { type: "last-prompt"; lastPrompt?: string; leafUuid: string; sessionId: string })];
    case "mode":
      return [normalizeModeEntry(entry as unknown as { type: "mode"; mode: string; sessionId: string })];
    case "permission-mode":
      return [normalizePermissionModeEntry(entry as unknown as { type: "permission-mode"; permissionMode: string; sessionId: string })];
    case "file-history-snapshot":
      return [normalizeFileHistorySnapshotEntry(entry as unknown as { type: "file-history-snapshot"; messageId: string; snapshot: unknown; isSnapshotUpdate: boolean })];
    case "tool":
      return [normalizeStreamingToolEntry(entry as unknown as { type: "tool"; name: string })];
    case "tool_result":
      return [normalizeStreamingToolResultEntry(entry as unknown as { type: "tool_result"; success: boolean })];
    default:
      throw new Error(`Unsupported log entry type on line ${lineNumber}: ${entryType}`);
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

// ---------------------------------------------------------------------------
// Observable-agent normalization
// ---------------------------------------------------------------------------

function normalizeAgentSettingEntry(
  entry: { type: "agent-setting"; agentSetting: string; sessionId: string },
): AnyCompactEntry {
  const { type, ...content } = entry;
  void type;
  return { type: "system", subtype: "agent_setting", content };
}

function normalizeQueueOperationEntry(
  entry: { type: "queue-operation"; operation: string; timestamp: string; sessionId: string; content?: string },
): AnyCompactEntry {
  const { type, operation, ...rest } = entry;
  void type;
  const subtype = operation === "enqueue" ? "queue_enqueue" : "queue_dequeue";
  return { type: "system", subtype, content: rest };
}

function normalizeAttachmentEntry(entry: ObservableAttachmentLogEntry): AnyCompactEntry {
  const attachment = entry.attachment as { type: string; [k: string]: unknown };
  const { parentUuid, isSidechain } = entry;

  switch (attachment.type) {
    case "hook_success": {
      const { type: _at, ...rest } = attachment;
      void _at;
      return {
        type: "system",
        subtype: "hook_response",
        content: { attachment: rest, parentUuid, isSidechain },
      };
    }
    case "hook_additional_context": {
      const { type: _at, ...rest } = attachment;
      void _at;
      return {
        type: "system",
        subtype: "hook_additional_context",
        content: { attachment: rest, parentUuid, isSidechain },
      };
    }
    case "hook_blocking_error": {
      const { type: _at, ...rest } = attachment;
      void _at;
      return {
        type: "system",
        subtype: "hook_blocking_error",
        content: { attachment: rest, parentUuid, isSidechain },
      };
    }
    case "hook_system_message": {
      const { type: _at, ...rest } = attachment;
      void _at;
      return {
        type: "system",
        subtype: "hook_system_message",
        content: { attachment: rest, parentUuid, isSidechain },
      };
    }
    default:
      return {
        type: "system",
        subtype: "attachment_unknown",
        content: { attachment, parentUuid, isSidechain },
      };
  }
}

function normalizeLastPromptEntry(
  entry: { type: "last-prompt"; lastPrompt?: string; leafUuid: string; sessionId: string },
): AnyCompactEntry {
  const { type, ...content } = entry;
  void type;
  return { type: "system", subtype: "last_prompt", content };
}

function normalizeObservableAssistantEntry(
  entry: ObservableAssistantLogEntry,
): CompactAssistantLogEntry[] {
  return entry.message.content.map(normalizeAssistantContent);
}

function normalizeObservableUserEntry(
  entry: ObservableUserLogEntry,
): AnyCompactEntry[] {
  const content = entry.message.content;

  // String content → user/text entry
  if (typeof content === "string") {
    return [{ type: "user", subtype: "text", content: { text: content } }];
  }

  // Array of content items → one entry per item
  return content.map(normalizeUserContent);
}

function normalizeObservableSystemEntry(
  entry: Record<string, unknown>,
): AnyCompactEntry {
  const { type, subtype, ...content } = entry;
  void type;
  return { type: "system", subtype: String(subtype ?? "unknown"), content };
}

function normalizeStreamingAssistantEntry(
  entry: { type: "assistant"; message: string },
): AnyCompactEntry {
  const { type, message } = entry;
  void type;
  return { type: "assistant", subtype: "text", content: { text: message } };
}

function normalizeStreamingToolEntry(
  entry: { type: "tool"; name: string },
): AnyCompactEntry {
  const { type, ...content } = entry;
  void type;
  return { type: "assistant", subtype: "tool_use", content };
}

function normalizeStreamingToolResultEntry(
  entry: { type: "tool_result"; success: boolean },
): AnyCompactEntry {
  const { type, ...content } = entry;
  void type;
  return { type: "user", subtype: "tool_result_summary", content };
}

function normalizeModeEntry(
  entry: { type: "mode"; mode: string; sessionId: string },
): AnyCompactEntry {
  const { type, ...content } = entry;
  void type;
  return { type: "system", subtype: "mode", content };
}

function normalizePermissionModeEntry(
  entry: { type: "permission-mode"; permissionMode: string; sessionId: string },
): AnyCompactEntry {
  const { type, ...content } = entry;
  void type;
  return { type: "system", subtype: "permission_mode", content };
}

function normalizeFileHistorySnapshotEntry(
  entry: { type: "file-history-snapshot"; messageId: string; snapshot: unknown; isSnapshotUpdate: boolean },
): AnyCompactEntry {
  const { type, ...content } = entry;
  void type;
  return { type: "system", subtype: "file_history_snapshot", content };
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
