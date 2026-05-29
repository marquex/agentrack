import { apiClient } from "./client";
import type { User } from "@/types";

export const usersApi = {
  list(): Promise<User[]> {
    return apiClient<User[]>("/users");
  },
};
