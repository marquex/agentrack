export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

// ---------------------------------------------------------------------------
// Raw session log types
// ---------------------------------------------------------------------------

export type AgentSessionLogEntry =
  | AssistantLogEntry
  | UserLogEntry
  | SystemLogEntry
  | ResultLogEntry
  | ObservableAgentLogEntry;

// ---------------------------------------------------------------------------
// Observable-agent raw log types (SDK / hook-driver sessions)
// ---------------------------------------------------------------------------

export type ObservableAgentLogEntry =
  | ObservableAgentSettingLogEntry
  | ObservableQueueOperationLogEntry
  | ObservableAttachmentLogEntry
  | ObservableLastPromptLogEntry
  | ObservableAssistantLogEntry
  | ObservableUserLogEntry
  | ObservableModeLogEntry
  | ObservablePermissionModeLogEntry
  | ObservableFileHistorySnapshotLogEntry
  | ObservableSystemLogEntry
  | ObservableStreamingAssistantLogEntry
  | ObservableStreamingToolLogEntry
  | ObservableStreamingToolResultLogEntry;

export interface ObservableAgentSettingLogEntry {
  type: "agent-setting";
  agentSetting: string;
  sessionId: string;
}

export interface ObservableQueueOperationLogEntry {
  type: "queue-operation";
  operation: "enqueue" | "dequeue";
  timestamp: string;
  sessionId: string;
  content?: string;
}

export type ObservableAttachmentLogEntry =
  | ObservableHookSuccessAttachment
  | ObservableHookAdditionalContextAttachment
  | ObservableHookBlockingErrorAttachment
  | ObservableHookSystemMessageAttachment;

export interface ObservableBaseAttachment {
  parentUuid: string | null;
  isSidechain: boolean;
  attachment: JsonObject;
}

export interface ObservableHookSuccessAttachment {
  parentUuid: string | null;
  isSidechain: boolean;
  attachment: {
    type: "hook_success";
    hookName: string;
    toolUseID: string;
    hookEvent: string;
    content: string;
    stdout: string;
    stderr?: string;
    exitCode?: number;
  };
}

export interface ObservableHookAdditionalContextAttachment {
  parentUuid: string | null;
  isSidechain: boolean;
  attachment: {
    type: "hook_additional_context";
    hookName: string;
    toolUseID: string;
    content: string | JsonObject[];
  };
}

export interface ObservableHookBlockingErrorAttachment {
  parentUuid: string | null;
  isSidechain: boolean;
  attachment: {
    type: "hook_blocking_error";
    hookName: string;
    toolUseID: string;
    hookEvent?: string;
    blockingError: {
      blockingError: string;
      command: string;
    };
  };
}

export interface ObservableHookSystemMessageAttachment {
  parentUuid: string | null;
  isSidechain: boolean;
  attachment: {
    type: "hook_system_message";
    hookName: string;
    toolUseID: string;
    content: string;
  };
}

export interface ObservableLastPromptLogEntry {
  type: "last-prompt";
  lastPrompt?: string;
  leafUuid: string;
  sessionId: string;
}

export interface ObservableModeLogEntry {
  type: "mode";
  mode: string;
  sessionId: string;
}

export interface ObservablePermissionModeLogEntry {
  type: "permission-mode";
  permissionMode: string;
  sessionId: string;
}

export interface ObservableFileHistorySnapshotLogEntry {
  type: "file-history-snapshot";
  messageId: string;
  snapshot: JsonObject;
  isSnapshotUpdate: boolean;
}

export interface ObservableSystemLogEntry {
  type: "system";
  subtype: string;
  parentUuid?: string | null;
  isSidechain?: boolean;
  [key: string]: JsonValue | string | null | boolean | undefined;
}

/**
 * Streaming assistant placeholder — `message` is a plain string like
 * `"thinking..."` rather than a full message object.
 */
export interface ObservableStreamingAssistantLogEntry {
  type: "assistant";
  message: string;
}

/**
 * Streaming tool call — simple marker with the tool name.
 */
export interface ObservableStreamingToolLogEntry {
  type: "tool";
  name: string;
}

/**
 * Streaming tool result — simple success/failure marker.
 */
export interface ObservableStreamingToolResultLogEntry {
  type: "tool_result";
  success: boolean;
}

/**
 * Observable assistant entries share the same `message.content[]` structure as
 * the regular session format but carry additional metadata at the root level.
 */
export interface ObservableAssistantLogEntry {
  type: "assistant";
  parentUuid: string | null;
  isSidechain: boolean;
  message: AssistantMessage;
}

/**
 * Observable user entries can have either string content (human messages) or
 * an array of tool_result content items, plus SDK-specific metadata.
 */
export interface ObservableUserLogEntry {
  type: "user";
  parentUuid: string | null;
  isSidechain: boolean;
  promptId?: string;
  message: {
    role: "user";
    content: string | ObservableUserContentItem[];
  };
  uuid?: string;
  timestamp?: string;
  permissionMode?: string;
  userType?: string;
  entrypoint?: string;
  cwd?: string;
  sessionId?: string;
  version?: string;
}

export type ObservableUserContentItem = ToolResultContent;

export type SystemLogEntry =
  | SystemHookStartedLogEntry
  | SystemHookResponseLogEntry
  | SystemInitLogEntry
  | SystemNotificationLogEntry
  | SystemTaskStartedLogEntry
  | SystemTaskUpdatedLogEntry
  | SystemTaskNotificationLogEntry;

export type ResultLogEntry = ResultSuccessLogEntry;

export interface BaseLogEntry {
  type: string;
  uuid: string;
  session_id: string;
}

/**
 * Compact transform: keep `type: "system"` and `subtype: "hook_started"` at
 * the root, then move `hook_id`, `hook_name`, `hook_event`, `uuid`, and
 * `session_id` into `content`.
 */
export interface SystemHookStartedLogEntry extends BaseLogEntry {
  type: "system";
  subtype: "hook_started";
  hook_id: string;
  hook_name: string;
  hook_event: string;
}

/**
 * Compact transform: keep `type: "system"` and `subtype: "hook_response"` at
 * the root, then move the hook metadata plus `output`, stdio, exit status,
 * `uuid`, and `session_id` into `content`.
 */
export interface SystemHookResponseLogEntry extends BaseLogEntry {
  type: "system";
  subtype: "hook_response";
  hook_id: string;
  hook_name: string;
  hook_event: string;
  output: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  outcome: string;
}

/**
 * Compact transform: keep `type: "system"` and `subtype: "init"` at the root,
 * then move session configuration, available tools, agents, skills, flags,
 * `uuid`, and `session_id` into `content`.
 */
export interface SystemInitLogEntry extends BaseLogEntry {
  type: "system";
  subtype: "init";
  cwd: string;
  tools: string[];
  mcp_servers: JsonValue[];
  model: string;
  permissionMode: string;
  slash_commands: string[];
  apiKeySource: string;
  claude_code_version: string;
  output_style: string;
  agents: string[];
  skills: string[];
  plugins: JsonValue[];
  analytics_disabled: boolean;
  product_feedback_disabled: boolean;
  memory_paths: Record<string, string>;
  fast_mode_state: string;
}

/**
 * Compact transform: keep `type: "system"` and `subtype: "notification"` at
 * the root, then move `key`, `text`, `priority`, `uuid`, and `session_id` into
 * `content`.
 */
export interface SystemNotificationLogEntry extends BaseLogEntry {
  type: "system";
  subtype: "notification";
  key: string;
  text: string;
  priority: string;
}

/**
 * Compact transform: keep `type: "system"` and `subtype: "task_started"` at
 * the root, then move task identity, linked tool call, description, task type,
 * `uuid`, and `session_id` into `content`.
 */
export interface SystemTaskStartedLogEntry extends BaseLogEntry {
  type: "system";
  subtype: "task_started";
  task_id: string;
  tool_use_id: string;
  description: string;
  task_type: string;
}

/**
 * Compact transform: keep `type: "system"` and `subtype: "task_updated"` at
 * the root, then move `task_id`, `patch`, `uuid`, and `session_id` into
 * `content`.
 */
export interface SystemTaskUpdatedLogEntry extends BaseLogEntry {
  type: "system";
  subtype: "task_updated";
  task_id: string;
  patch: TaskUpdatePatch;
}

export interface TaskUpdatePatch {
  is_backgrounded?: boolean;
}

/**
 * Compact transform: keep `type: "system"` and `subtype: "task_notification"`
 * at the root, then move task identity, linked tool call, status, output file,
 * summary, `uuid`, and `session_id` into `content`.
 */
export interface SystemTaskNotificationLogEntry extends BaseLogEntry {
  type: "system";
  subtype: "task_notification";
  task_id: string;
  tool_use_id: string;
  status: string;
  output_file: string;
  summary: string;
}

/**
 * Compact transform: discard everything outside `message.content`. Emit one
 * compact assistant entry per content item, using the content item's `type` as
 * the compact `subtype` and copying the rest of that item into `content`.
 */
export interface AssistantLogEntry extends BaseLogEntry {
  type: "assistant";
  message: AssistantMessage;
  parent_tool_use_id: string | null;
}

export interface AssistantMessage {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  content: AssistantContentItem[];
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: AssistantTurnUsage;
  context_management: JsonObject | null;
}

export interface AssistantTurnUsage {
  input_tokens: number;
  output_tokens: number;
}

export type AssistantContentItem =
  | AssistantThinkingContent
  | AssistantTextContent
  | AssistantToolUseContent;

/**
 * Compact transform: this `message.content[]` item becomes
 * `{ type: "assistant", subtype: "thinking", content: { thinking, signature } }`.
 */
export interface AssistantThinkingContent {
  type: "thinking";
  thinking: string;
  signature: string;
}

/**
 * Compact transform: this `message.content[]` item becomes
 * `{ type: "assistant", subtype: "text", content: { text } }`.
 */
export interface AssistantTextContent {
  type: "text";
  text: string;
}

export type AssistantToolUseContent =
  | BashToolUseContent
  | ReadToolUseContent
  | EditToolUseContent
  | UnknownToolUseContent;

export interface BaseToolUseContent {
  type: "tool_use";
  id: string;
  name: string;
  input: JsonObject;
}

/**
 * Compact transform: this `message.content[]` item becomes
 * `{ type: "assistant", subtype: "tool_use", content: { id, name, input } }`.
 */
export interface BashToolUseContent extends BaseToolUseContent {
  name: "Bash";
  input: {
    command: string;
    description?: string;
    timeout?: number;
  };
}

/**
 * Compact transform: same as every assistant `tool_use`; the `Read` name and
 * input shape are preserved inside `content`.
 */
export interface ReadToolUseContent extends BaseToolUseContent {
  name: "Read";
  input: {
    file_path: string;
    offset?: number;
    limit?: number;
  };
}

/**
 * Compact transform: same as every assistant `tool_use`; the `Edit` name and
 * input shape are preserved inside `content`.
 */
export interface EditToolUseContent extends BaseToolUseContent {
  name: "Edit";
  input: {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  };
}

/**
 * Compact transform: same as every assistant `tool_use`; unknown tool names keep
 * their original `name` and JSON input inside `content`.
 */
export interface UnknownToolUseContent extends BaseToolUseContent {
  name: string;
  input: JsonObject;
}

/**
 * Compact transform: discard everything outside `message.content`, including the
 * duplicated raw `tool_use_result`. Emit one compact user entry per content item,
 * using the content item's `type` as the compact `subtype` and copying the rest
 * into `content`.
 */
export interface UserLogEntry extends BaseLogEntry {
  type: "user";
  message: UserMessage;
  parent_tool_use_id: string | null;
  timestamp: string;
  tool_use_result: ToolUseResult;
}

export interface UserMessage {
  role: "user";
  content: UserContentItem[];
}

export type UserContentItem = ToolResultContent;

/**
 * Compact transform: this `message.content[]` item becomes
 * `{ type: "user", subtype: "tool_result", content: { tool_use_id, content,
 * is_error? } }`.
 */
export interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Raw tool execution detail outside `message.content`; compact user entries
 * intentionally discard it to keep only the normalized content payload.
 */
export type ToolUseResult =
  | BashToolUseResult
  | ReadToolUseResult
  | EditToolUseResult
  | string;

export interface BashToolUseResult {
  stdout: string;
  stderr: string;
  interrupted: boolean;
  isImage: boolean;
  noOutputExpected: boolean;
  backgroundTaskId?: string;
  assistantAutoBackgrounded?: boolean;
}

export interface ReadToolUseResult {
  type: "text";
  file: ReadToolUseResultFile;
}

export interface ReadToolUseResultFile {
  filePath: string;
  content: string;
  numLines: number;
  startLine: number;
  totalLines: number;
}

export interface EditToolUseResult {
  filePath: string;
  oldString: string;
  newString: string;
  originalFile: string;
  structuredPatch: StructuredPatchHunk[];
  userModified: boolean;
  replaceAll: boolean;
}

export interface StructuredPatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

/**
 * Compact transform: final raw `type: "result"` is session-level metadata, so it
 * is normalized to `type: "system"` with `subtype: "result_success"`; every
 * other first-level field moves into `content`.
 */
export interface ResultSuccessLogEntry extends BaseLogEntry {
  type: "result";
  subtype: "success";
  is_error: false;
  api_error_status: string | number | null;
  duration_ms: number;
  duration_api_ms: number;
  ttft_ms: number;
  num_turns: number;
  result: string;
  stop_reason: string;
  total_cost_usd: number;
  usage: ResultUsage;
  modelUsage: Record<string, ModelUsage>;
  permission_denials: PermissionDenial[];
  terminal_reason: string;
  fast_mode_state: string;
}

export interface ResultUsage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
  server_tool_use: ServerToolUse;
  service_tier: string;
  cache_creation: CacheCreationUsage;
  inference_geo: string;
  iterations: JsonValue[];
  speed: string;
}

export interface ServerToolUse {
  web_search_requests: number;
  web_fetch_requests: number;
}

export interface CacheCreationUsage {
  ephemeral_1h_input_tokens: number;
  ephemeral_5m_input_tokens: number;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
  contextWindow: number;
  maxOutputTokens: number;
}

export interface PermissionDenial {
  tool_name: string;
  tool_use_id: string;
  tool_input: JsonObject;
}

// ---------------------------------------------------------------------------
// Compact session log output types
// ---------------------------------------------------------------------------

export type CompactAgentSessionLogEntry =
  | CompactSystemLogEntry
  | CompactAssistantLogEntry
  | CompactUserLogEntry;

export type CompactSystemLogEntry =
  | CompactSystemHookStartedLogEntry
  | CompactSystemHookResponseLogEntry
  | CompactSystemInitLogEntry
  | CompactSystemNotificationLogEntry
  | CompactSystemTaskStartedLogEntry
  | CompactSystemTaskUpdatedLogEntry
  | CompactSystemTaskNotificationLogEntry
  | CompactResultSuccessLogEntry;

export type CompactAssistantLogEntry =
  | CompactAssistantThinkingLogEntry
  | CompactAssistantTextLogEntry
  | CompactAssistantToolUseLogEntry;

export type CompactUserLogEntry = CompactToolResultLogEntry;

export interface CompactBaseLogEntry<
  TType extends "system" | "assistant" | "user",
  TSubtype extends string,
  TContent,
> {
  type: TType;
  subtype: TSubtype;
  content: TContent;
}

export type CompactSystemContent<TEntry extends { type: string; subtype: string }> =
  Omit<TEntry, "type" | "subtype">;

export interface CompactSystemHookStartedLogEntry
  extends CompactBaseLogEntry<
    "system",
    "hook_started",
    CompactSystemContent<SystemHookStartedLogEntry>
  > {}

export interface CompactSystemHookResponseLogEntry
  extends CompactBaseLogEntry<
    "system",
    "hook_response",
    CompactSystemContent<SystemHookResponseLogEntry>
  > {}

export interface CompactSystemInitLogEntry
  extends CompactBaseLogEntry<
    "system",
    "init",
    CompactSystemContent<SystemInitLogEntry>
  > {}

export interface CompactSystemNotificationLogEntry
  extends CompactBaseLogEntry<
    "system",
    "notification",
    CompactSystemContent<SystemNotificationLogEntry>
  > {}

export interface CompactSystemTaskStartedLogEntry
  extends CompactBaseLogEntry<
    "system",
    "task_started",
    CompactSystemContent<SystemTaskStartedLogEntry>
  > {}

export interface CompactSystemTaskUpdatedLogEntry
  extends CompactBaseLogEntry<
    "system",
    "task_updated",
    CompactSystemContent<SystemTaskUpdatedLogEntry>
  > {}

export interface CompactSystemTaskNotificationLogEntry
  extends CompactBaseLogEntry<
    "system",
    "task_notification",
    CompactSystemContent<SystemTaskNotificationLogEntry>
  > {}

export interface CompactResultSuccessLogEntry
  extends CompactBaseLogEntry<
    "system",
    "result_success",
    Omit<ResultSuccessLogEntry, "type" | "subtype">
  > {}

export interface CompactAssistantThinkingLogEntry
  extends CompactBaseLogEntry<
    "assistant",
    "thinking",
    Omit<AssistantThinkingContent, "type">
  > {}

export interface CompactAssistantTextLogEntry
  extends CompactBaseLogEntry<
    "assistant",
    "text",
    Omit<AssistantTextContent, "type">
  > {}

export interface CompactAssistantToolUseLogEntry
  extends CompactBaseLogEntry<
    "assistant",
    "tool_use",
    Omit<AssistantToolUseContent, "type">
  > {}

export interface CompactToolResultLogEntry
  extends CompactBaseLogEntry<
    "user",
    "tool_result",
    Omit<ToolResultContent, "type">
  > {}

// ---------------------------------------------------------------------------
// Compact observable-agent log output types
// ---------------------------------------------------------------------------

export type CompactObservableLogEntry =
  | CompactObservableAgentSettingLogEntry
  | CompactObservableQueueEnqueueLogEntry
  | CompactObservableQueueDequeueLogEntry
  | CompactObservableHookResponseLogEntry
  | CompactObservableHookAdditionalContextLogEntry
  | CompactObservableHookBlockingErrorLogEntry
  | CompactObservableHookSystemMessageLogEntry
  | CompactObservableLastPromptLogEntry
  | CompactAssistantLogEntry
  | CompactUserTextLogEntry
  | CompactToolResultLogEntry;

export interface CompactObservableAgentSettingLogEntry
  extends CompactBaseLogEntry<
    "system",
    "agent_setting",
    Omit<ObservableAgentSettingLogEntry, "type">
  > {}

export interface CompactObservableQueueEnqueueLogEntry
  extends CompactBaseLogEntry<
    "system",
    "queue_enqueue",
    Omit<ObservableQueueOperationLogEntry, "type" | "operation">
  > {}

export interface CompactObservableQueueDequeueLogEntry
  extends CompactBaseLogEntry<
    "system",
    "queue_dequeue",
    Omit<ObservableQueueOperationLogEntry, "type" | "operation">
  > {}

export interface CompactObservableHookResponseLogEntry
  extends CompactBaseLogEntry<
    "system",
    "hook_response",
    Omit<ObservableHookSuccessAttachment, "parentUuid" | "isSidechain"> & {
      parentUuid?: string | null;
      isSidechain?: boolean;
    }
  > {}

export interface CompactObservableHookAdditionalContextLogEntry
  extends CompactBaseLogEntry<
    "system",
    "hook_additional_context",
    Omit<ObservableHookAdditionalContextAttachment, "parentUuid" | "isSidechain"> & {
      parentUuid?: string | null;
      isSidechain?: boolean;
    }
  > {}

export interface CompactObservableHookBlockingErrorLogEntry
  extends CompactBaseLogEntry<
    "system",
    "hook_blocking_error",
    Omit<ObservableHookBlockingErrorAttachment, "parentUuid" | "isSidechain"> & {
      parentUuid?: string | null;
      isSidechain?: boolean;
    }
  > {}

export interface CompactObservableHookSystemMessageLogEntry
  extends CompactBaseLogEntry<
    "system",
    "hook_system_message",
    Omit<ObservableHookSystemMessageAttachment, "parentUuid" | "isSidechain"> & {
      parentUuid?: string | null;
      isSidechain?: boolean;
    }
  > {}

export interface CompactObservableLastPromptLogEntry
  extends CompactBaseLogEntry<
    "system",
    "last_prompt",
    Omit<ObservableLastPromptLogEntry, "type">
  > {}

export interface CompactUserTextLogEntry
  extends CompactBaseLogEntry<
    "user",
    "text",
    { text: string }
  > {}

// Generic compact entry for observable-agent subtypes that don't need
// dedicated interfaces. Keeps the normalizer extensible for new log shapes.
export interface GenericCompactEntry<
  TType extends "system" | "assistant" | "user",
  TSubtype extends string,
> {
  type: TType;
  subtype: TSubtype;
  content: Record<string, unknown>;
}
