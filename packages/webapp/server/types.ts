/**
 * Shared types for the webapp server
 */

export interface AgentrackError {
  result: string;
  message: string;
}

export interface HealthResponse {
  status: "ok";
  tracker: "initialized" | "not_initialized";
}

/**
 * Response shape for GET /api/status — the authoritative environment endpoint.
 *
 * `agentrackPath` is the resolved tracker cwd (AGENTRACK_CWD or process.cwd()),
 * identical to the value the Tracker singleton was constructed with.
 */
export interface StatusResponse {
  agentrackPath: string;
}

export interface ApiErrorResponse {
  error: true;
  code: string;
  message: string;
}
