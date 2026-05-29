import { apiClient } from "./client";
import type { Comment } from "@/types";

export const commentsApi = {
  list(issueId: string): Promise<Comment[]> {
    return apiClient<Comment[]>(`/issues/${issueId}/comments`);
  },

  add(issueId: string, content: string, author?: string): Promise<{ result: string; commentId: string }> {
    return apiClient<{ result: string; commentId: string }>(`/issues/${issueId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, author }),
    });
  },

  update(issueId: string, commentId: string, content: string, author?: string): Promise<{ result: string }> {
    return apiClient<{ result: string }>(`/issues/${issueId}/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ content, author }),
    });
  },

  delete(issueId: string, commentId: string, author?: string): Promise<{ result: string }> {
    return apiClient<{ result: string }>(`/issues/${issueId}/comments/${commentId}`, {
      method: "DELETE",
      body: JSON.stringify({ author }),
    });
  },
};
