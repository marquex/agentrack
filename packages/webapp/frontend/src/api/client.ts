import type { ApiErrorResponse } from "@/types";

const BASE_URL = "/api";

/**
 * Generic fetch wrapper with error handling.
 */
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    const message = body?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
