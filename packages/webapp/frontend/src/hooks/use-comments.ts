import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentsApi } from "@/api/comments";

export function useComments(issueId: string) {
  return useQuery({
    queryKey: ["comments", issueId],
    queryFn: () => commentsApi.list(issueId),
    enabled: !!issueId,
  });
}

export function useAddComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, author }: { content: string; author?: string }) =>
      commentsApi.add(issueId, content, author),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
    },
  });
}

export function useUpdateComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content, author }: { commentId: string; content: string; author?: string }) =>
      commentsApi.update(issueId, commentId, content, author),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", issueId] });
    },
  });
}

export function useDeleteComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, author }: { commentId: string; author?: string }) =>
      commentsApi.delete(issueId, commentId, author),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
    },
  });
}
