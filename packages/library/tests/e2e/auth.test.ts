/**
 * E2E: auth — Type B tests (tracker operations)
 *
 * Tests auth mode enforcement using setAuthMode to switch modes.
 * Auth modes: "open" (no auth), "strict" (token required for all),
 * "read-only" (token required for writes, reads are open).
 */
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  ensureE2EWorktree,
  parseJson,
  resetWorktreeData,
  runAgt,
  setAuthMode,
} from "./setup";

describe("E2E: auth", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  test("open mode allows anonymous operations", async () => {
    setAuthMode(E2E_DATA_BRANCH, "open");

    const result = await runAgt(["create", "Open Mode Issue"]);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed.id).toBeDefined();
  });

  test("strict mode requires valid token for all operations", async () => {
    setAuthMode(E2E_DATA_BRANCH, "strict");

    // Register a user to get a token
    const regResult = await runAgt(["users", "register", "alice"]);
    const token = parseJson(regResult.stdout).token;

    // Write without token should fail
    const noTokenResult = await runAgt(["create", "No Token Issue"]);
    expect(noTokenResult.exitCode).toBe(2);

    const errorParsed = parseJson(noTokenResult.stderr);
    expect(errorParsed.result).toBe("TOKEN_REQUIRED");

    // Write with valid token should succeed
    const result = await runAgt(
      ["create", "With Token Issue"],
      undefined,
      { AGENTACK_USER_TOKEN: token },
    );

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed.id).toBeDefined();
  });

  test("invalid token is rejected", async () => {
    setAuthMode(E2E_DATA_BRANCH, "strict");

    const result = await runAgt(
      ["create", "Bad Token Issue"],
      undefined,
      { AGENTACK_USER_TOKEN: "tk_invalid" },
    );

    expect(result.exitCode).toBe(3);

    const parsed = parseJson(result.stderr);
    expect(parsed.result).toBe("INVALID_TOKEN");
  });

  test("read-only mode allows reads without token but requires token for writes", async () => {
    setAuthMode(E2E_DATA_BRANCH, "read-only");

    // Register user and create issue with token
    const regResult = await runAgt(["users", "register", "alice"]);
    const token = parseJson(regResult.stdout).token;
    await runAgt(["create", "Test"], undefined, {
      AGENTACK_USER_TOKEN: token,
    });

    // List should work without token (read operation)
    const listResult = await runAgt(["list"]);
    expect(listResult.exitCode).toBe(0);

    // Write without token should fail in read-only mode
    const writeResult = await runAgt(["create", "No Token Write"]);
    expect(writeResult.exitCode).toBe(2);

    const errorParsed = parseJson(writeResult.stderr);
    expect(errorParsed.result).toBe("TOKEN_REQUIRED");
  });
});
