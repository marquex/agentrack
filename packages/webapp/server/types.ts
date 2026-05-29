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

export interface ApiErrorResponse {
  error: true;
  code: string;
  message: string;
}
