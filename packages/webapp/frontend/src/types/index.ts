/**
 * TypeScript types matching the API shapes.
 */

export type IssueStatus = "idea" | "todo" | "in-progress" | "done" | "closed";

/**
 * Status values selectable from the dashboard filter.
 * - `open`: meta-status mapping to todo + in-progress + done (idea excluded client-side).
 * - `all`: show every status (including idea and closed).
 * - concrete IssueStatus values are forwarded as-is.
 */
export type DashboardStatus = "open" | "all" | IssueStatus;

export const DASHBOARD_STATUS_VALUES: DashboardStatus[] = [
  "open",
  "all",
  "idea",
  "todo",
  "in-progress",
  "done",
  "closed",
];

export function isDashboardStatus(value: string | null): value is DashboardStatus {
  return (
    value !== null &&
    (DASHBOARD_STATUS_VALUES as string[]).includes(value)
  );
}

export interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  assignee: string | null;
  parentId: string | null;
  tags: string[];
  priority: number;
}

export interface IssueDetail extends Issue {
  description: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface HealthResponse {
  status: "ok";
  tracker: "initialized" | "not_initialized";
}

export interface User {
  name: string;
  registeredAt: string;
}

export interface IssueFilters {
  status?: string;
  assignee?: string;
  tags?: string[];
  parentId?: string | null;
  search?: string;
}

export interface CreateIssueData {
  title: string;
  description?: string;
  status?: IssueStatus;
  assignee?: string | null;
  tags?: string[];
  priority?: number;
  parentId?: string | null;
  author?: string;
}

export interface UpdateIssueData {
  title?: string;
  description?: string;
  status?: IssueStatus;
  assignee?: string | null;
  tags?: string[];
  priority?: number;
  parentId?: string | null;
  author?: string;
}

// ─── Comments ────────────────────────────────────────────────────

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  editedAt: string | null;
}

// ─── Blockages ───────────────────────────────────────────────────

export interface BlockageEntry {
  blockerId: string;
  blockedId: string;
  status: "active" | "resolved";
}

export interface BlockageInfo {
  issueId: string;
  blockedBy: BlockageEntry[];
  blocks: BlockageEntry[];
}

// ─── History ─────────────────────────────────────────────────────

export interface HistoryEvent {
  timestamp: string;
  type: string;
  author?: string;
  content?: Record<string, unknown>;
}

// ─── Next Issue ──────────────────────────────────────────────────

export type NextIssueResult =
  | { result: string; message: string }
  | IssueDetail;

// ─── Users ──────────────────────────────────────────────────────

export interface RegisterUserResult {
  result: "OK";
  name: string;
  token: string;
}

export interface RegenerateTokenResult {
  result: "OK";
  name: string;
  token: string;
}

// ─── Sync ───────────────────────────────────────────────────────

export interface SyncPushResult {
  synced: boolean;
  commitCount?: number;
  message?: string;
}

export interface SyncPullResult {
  updated: boolean;
}

// ─── Error ───────────────────────────────────────────────────────

export interface ApiErrorResponse {
  error: true;
  code: string;
  message: string;
}
