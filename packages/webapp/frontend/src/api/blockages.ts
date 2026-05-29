import { apiClient } from "./client";
import type { BlockageInfo } from "@/types";

export const blockagesApi = {
  list(issueId: string): Promise<BlockageInfo> {
    return apiClient<BlockageInfo>(`/issues/${issueId}/blockages`);
  },

  add(issueId: string, blockerIds: string[], author?: string): Promise<{ result: string }> {
    return apiClient<{ result: string }>(`/issues/${issueId}/blockages`, {
      method: "POST",
      body: JSON.stringify({ blockerIds, author }),
    });
  },

  resolve(issueId: string, blockerIds: string[], author?: string): Promise<{ result: string }> {
    return apiClient<{ result: string }>(`/issues/${issueId}/blockages/resolve`, {
      method: "PATCH",
      body: JSON.stringify({ blockerIds, author }),
    });
  },

  delete(issueId: string, blockerIds: string[], author?: string): Promise<{ result: string }> {
    return apiClient<{ result: string }>(`/issues/${issueId}/blockages`, {
      method: "DELETE",
      body: JSON.stringify({ blockerIds, author }),
    });
  },
};
