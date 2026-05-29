/**
 * TypeScript types matching the API shapes.
 */

export type IssueStatus = "idea" | "todo" | "in-progress" | "done" | "closed";

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

// ─── Error ───────────────────────────────────────────────────────

export interface ApiErrorResponse {
  error: true;
  code: string;
  message: string;
}
