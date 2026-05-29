import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { blockagesApi } from "@/api/blockages";

export function useBlockages(issueId: string) {
  return useQuery({
    queryKey: ["blockages", issueId],
    queryFn: () => blockagesApi.list(issueId),
    enabled: !!issueId,
  });
}

export function useAddBlockage(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ blockerIds, author }: { blockerIds: string[]; author?: string }) =>
      blockagesApi.add(issueId, blockerIds, author),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockages", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useResolveBlockage(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ blockerIds, author }: { blockerIds: string[]; author?: string }) =>
      blockagesApi.resolve(issueId, blockerIds, author),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockages", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useDeleteBlockage(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ blockerIds, author }: { blockerIds: string[]; author?: string }) =>
      blockagesApi.delete(issueId, blockerIds, author),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockages", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}
