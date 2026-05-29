import { apiClient } from "./client";
import type { User, RegisterUserResult, RegenerateTokenResult } from "@/types";

export const usersApi = {
  list(): Promise<User[]> {
    return apiClient<User[]>("/users");
  },

  register(name: string): Promise<RegisterUserResult> {
    return apiClient<RegisterUserResult>("/users", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  revoke(name: string): Promise<{ result: string }> {
    return apiClient<{ result: string }>(`/users/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  },

  regenerate(name: string): Promise<RegenerateTokenResult> {
    return apiClient<RegenerateTokenResult>(
      `/users/${encodeURIComponent(name)}/regenerate`,
      {
        method: "POST",
      }
    );
  },
};
