import { expect } from "bun:test";
import type { AgentrackError } from "../../src/core/errors";

/**
 * Assert that a result is a AgentrackError with the expected result code.
 */
export function expectError(result: unknown, expectedCode: string): void {
  expect(result).toBeDefined();
  const err = result as AgentrackError;
  expect(err.result).toBe(expectedCode);
}

/**
 * Assert that a result is a success (has result: "OK").
 */
export function expectOk(result: { result: string }): void {
  expect(result.result).toBe("OK");
}
