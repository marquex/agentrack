import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/api/users";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
  });
}

export function useRegisterUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => usersApi.register(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useRevokeUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => usersApi.revoke(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useRegenerateToken() {
  return useMutation({
    mutationFn: (name: string) => usersApi.regenerate(name),
  });
}
