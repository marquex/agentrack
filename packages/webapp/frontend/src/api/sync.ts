import { apiClient } from "./client";
import type { SyncPushResult, SyncPullResult } from "@/types";

export const syncApi = {
  push(): Promise<SyncPushResult> {
    return apiClient<SyncPushResult>("/sync/push", {
      method: "POST",
    });
  },

  pull(): Promise<SyncPullResult> {
    return apiClient<SyncPullResult>("/sync/pull", {
      method: "POST",
    });
  },
};
