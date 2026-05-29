import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncApi } from "@/api/sync";

export function useSyncPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncApi.push(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useSyncPull() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncApi.pull(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
