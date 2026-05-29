import type { Context } from "hono";
import type { AgentrackError, ApiErrorResponse } from "../types.js";

/**
 * Maps agentrack errors to appropriate HTTP responses.
 */
function handleAgentrackError(error: AgentrackError, c: Context) {
  const statusMap: Record<string, number> = {
    NOT_FOUND: 404,
    NOT_INITIALIZED: 500,
    TOKEN_REQUIRED: 403,
    INVALID_TOKEN: 401,
    VALIDATION_ERROR: 400,
  };
  const status = statusMap[error.result] || 500;
  return c.json<ApiErrorResponse>(
    { error: true, code: error.result, message: error.message },
    status
  );
}

/**
 * Global error handler middleware for the Hono app.
 * Catches agentrack errors and maps them to HTTP responses.
 */
export function errorHandler(err: Error, c: Context) {
  console.error(`[Error] ${err.message}`);

  // Check if it's an agentrack error (has result property)
  const agentrackError = err as AgentrackError & Error;
  if (agentrackError.result) {
    return handleAgentrackError(agentrackError, c);
  }

  return c.json<ApiErrorResponse>(
    { error: true, code: "INTERNAL_ERROR", message: err.message },
    500
  );
}
