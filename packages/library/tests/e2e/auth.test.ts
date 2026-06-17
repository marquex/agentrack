/**
 * E2E: auth — Type B tests (tracker operations)
 *
 * Tests auth mode enforcement using setAuthMode to switch modes.
 * Auth modes: "open" (no auth), "strict" (token required for all),
 * "read-only" (token required for writes, reads are open).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  createEphemeralDir,
  ensureE2EWorktree,
  initGitRepo,
  parseJson,
  resetWorktreeData,
  rmEphemeralDir,
  runAgt,
  setAuthMode,
} from "./setup";

describe("E2E: auth", () => {
  let dir: string;

  beforeAll(async () => {
    dir = createEphemeralDir();
    initGitRepo(dir);
    await ensureE2EWorktree(dir, E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(dir, E2E_DATA_BRANCH);
  });

  afterAll(() => {
    rmEphemeralDir(dir);
  });

  test("open mode allows anonymous operations", async () => {
    setAuthMode(dir, E2E_DATA_BRANCH, "open");

    const result = await runAgt(["create", "Open Mode Issue"], dir);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed.id).toBeDefined();
  });

  test("strict mode requires valid token for all operations", async () => {
    setAuthMode(dir, E2E_DATA_BRANCH, "strict");

    // Register a user to get a token
    const regResult = await runAgt(["users", "register", "alice"], dir);
    const token = parseJson(regResult.stdout).token;

    // Write without token should fail
    const noTokenResult = await runAgt(["create", "No Token Issue"], dir);
    expect(noTokenResult.exitCode).toBe(2);

    const errorParsed = parseJson(noTokenResult.stderr);
    expect(errorParsed.result).toBe("TOKEN_REQUIRED");

    // Write with valid token should succeed
    const result = await runAgt(
      ["create", "With Token Issue"],
      dir,
      { AGT_USER_TOKEN: token },
    );

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed.id).toBeDefined();
  });

  test("invalid token is rejected", async () => {
    setAuthMode(dir, E2E_DATA_BRANCH, "strict");

    const result = await runAgt(
      ["create", "Bad Token Issue"],
      dir,
      { AGT_USER_TOKEN: "tk_invalid" },
    );

    expect(result.exitCode).toBe(3);

    const parsed = parseJson(result.stderr);
    expect(parsed.result).toBe("INVALID_TOKEN");
  });

  test("read-only mode allows reads without token but requires token for writes", async () => {
    setAuthMode(dir, E2E_DATA_BRANCH, "read-only");

    // Register user and create issue with token
    const regResult = await runAgt(["users", "register", "alice"], dir);
    const token = parseJson(regResult.stdout).token;
    await runAgt(["create", "Test"], dir, {
      AGT_USER_TOKEN: token,
    });

    // List should work without token (read operation)
    const listResult = await runAgt(["list"], dir);
    expect(listResult.exitCode).toBe(0);

    // Write without token should fail in read-only mode
    const writeResult = await runAgt(["create", "No Token Write"], dir);
    expect(writeResult.exitCode).toBe(2);

    const errorParsed = parseJson(writeResult.stderr);
    expect(errorParsed.result).toBe("TOKEN_REQUIRED");
  });
});
