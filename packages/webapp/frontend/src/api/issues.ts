import { apiClient } from "./client";
import type { Issue, IssueDetail, IssueFilters, CreateIssueData, UpdateIssueData, HistoryEvent } from "@/types";

/**
 * Build query string from filters.
 */
function buildQueryString(filters: IssueFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.tags && filters.tags.length > 0) params.set("tags", filters.tags.join(","));
  if (filters.parentId !== undefined) params.set("parentId", filters.parentId === null ? "null" : filters.parentId);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const issuesApi = {
  list(filters: IssueFilters = {}): Promise<Issue[]> {
    return apiClient<Issue[]>(`/issues${buildQueryString(filters)}`);
  },

  create(data: CreateIssueData): Promise<{ id: string }> {
    return apiClient<{ id: string }>("/issues", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  view(id: string): Promise<IssueDetail> {
    return apiClient<IssueDetail>(`/issues/${id}`);
  },

  update(id: string, data: UpdateIssueData): Promise<{ result: string }> {
    return apiClient<{ result: string }>(`/issues/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  history(id: string): Promise<HistoryEvent[]> {
    return apiClient<HistoryEvent[]>(`/issues/${id}/history`);
  },

  next(assignee: string): Promise<IssueDetail | { result: string; message: string }> {
    return apiClient<IssueDetail | { result: string; message: string }>(`/issues/next/${assignee}`);
  },
};
