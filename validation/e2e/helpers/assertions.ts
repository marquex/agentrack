import { expect } from "bun:test";
import type { CommandResult } from "./runner";

/**
 * Parse JSON from a CLI command's stdout.
 * Throws a descriptive error if parsing fails.
 */
export function parseJson<T = unknown>(output: string): T {
  return JSON.parse(output.trim()) as T;
}

/**
 * Assert that a CLI command succeeded (exit code 0, no stderr).
 * Returns parsed JSON from stdout.
 */
export function assertSuccess<T = unknown>(result: CommandResult, message?: string): T {
  const context = message ?? `Command with exitCode=${result.exitCode}`;
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  return parseJson<T>(result.stdout);
}

/**
 * Assert that a CLI command failed with a specific error result code.
 * Returns parsed JSON from stderr.
 */
export function assertError<T = { result: string; message?: string }>(
  result: CommandResult,
  expectedResult: string,
  expectedExitCode?: number,
  message?: string,
): T {
  const context = message ?? `Command expected to fail with ${expectedResult}`;
  if (expectedExitCode !== undefined) {
    expect(result.exitCode, `${context}: exitCode`).toBe(expectedExitCode);
  } else {
    expect(result.exitCode, `${context}: should be non-zero`).not.toBe(0);
  }
  expect(result.stdout, `${context}: stdout should be empty`).toBe("");
  const parsed = parseJson<T>(result.stderr);
  return parsed;
}

/**
 * Extract an issue ID from a create command result.
 */
export interface CreateResult {
  id: string;
}

export function extractId(result: { id: string }): string {
  expect(result.id).toBeDefined();
  expect(result.id).toHaveLength(10);
  return result.id;
}
