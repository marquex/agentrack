import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt, setAuthMode } from "./helpers/setup";
import { assertSuccess, assertError, parseJson, extractId, type CreateResult } from "./helpers/assertions";

/**
 * E2E tests for auth mode enforcement.
 *
 * These tests exercise the CLI's auth enforcement through the full process spawn
 * pipeline, including passing AGENTACK_USER_TOKEN via environment variables.
 *
 * Auth modes:
 * - open: anyone can read/write, defaultUser used as author
 * - read-only: anyone can read, writes require token
 * - strict: all operations require token
 */
describe("E2E: auth", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = createTestRepo("e2e-auth");
    await initAgt(testDir);
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  // ─── Open mode (default) ────────────────────────────────────────

  test("open mode: create without token succeeds", async () => {
    const result = await runAgt(["create", "Open Issue"], testDir);
    assertSuccess(result);
  });

  test("open mode: list without token succeeds", async () => {
    const result = await runAgt(["list"], testDir);
    assertSuccess(result);
  });

  test("open mode: view without token succeeds", async () => {
    const id = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Test"], testDir)).stdout,
    ));

    const result = await runAgt(["view", id], testDir);
    assertSuccess(result);
  });

  // ─── Read-only mode ─────────────────────────────────────────────

  describe("read-only mode", () => {
    beforeEach(() => {
      setAuthMode(testDir, "read-only");
    });

    test("list without token succeeds", async () => {
      const result = await runAgt(["list"], testDir);
      assertSuccess(result);
    });

    test("view without token succeeds", async () => {
      // Need to create in open mode first
      setAuthMode(testDir, "open");
      const id = extractId(parseJson<CreateResult>(
        (await runAgt(["create", "Visible"], testDir)).stdout,
      ));
      setAuthMode(testDir, "read-only");

      const result = await runAgt(["view", id], testDir);
      assertSuccess(result);
    });

    test("create without token returns TOKEN_REQUIRED", async () => {
      const result = await runAgt(["create", "Should Fail"], testDir);
      assertError(result, "TOKEN_REQUIRED", 2);
    });

    test("update without token returns TOKEN_REQUIRED", async () => {
      // Create in open mode
      setAuthMode(testDir, "open");
      const id = extractId(parseJson<CreateResult>(
        (await runAgt(["create", "To Update"], testDir)).stdout,
      ));
      setAuthMode(testDir, "read-only");

      const result = await runAgt(["update", id, "--title", "New"], testDir);
      assertError(result, "TOKEN_REQUIRED", 2);
    });

    test("comments add without token returns TOKEN_REQUIRED", async () => {
      // Create in open mode
      setAuthMode(testDir, "open");
      const id = extractId(parseJson<CreateResult>(
        (await runAgt(["create", "Comment Target"], testDir)).stdout,
      ));
      setAuthMode(testDir, "read-only");

      const result = await runAgt(["comments", "add", id, "--content", "Hello"], testDir);
      assertError(result, "TOKEN_REQUIRED", 2);
    });

    test("blockages add without token returns TOKEN_REQUIRED", async () => {
      // Create in open mode
      setAuthMode(testDir, "open");
      const id = extractId(parseJson<CreateResult>(
        (await runAgt(["create", "Blocked"], testDir)).stdout,
      ));
      const blockerId = extractId(parseJson<CreateResult>(
        (await runAgt(["create", "Blocker"], testDir)).stdout,
      ));
      setAuthMode(testDir, "read-only");

      const result = await runAgt(["blockages", "add", id, "--by", blockerId], testDir);
      assertError(result, "TOKEN_REQUIRED", 2);
    });

    test("create with valid token succeeds", async () => {
      // Register user in open mode first
      setAuthMode(testDir, "open");
      const regResult = parseJson<{ result: string; token: string }>(
        (await runAgt(["users", "register", "alice"], testDir)).stdout,
      );
      setAuthMode(testDir, "read-only");

      const result = await runAgt(
        ["create", "With Token"],
        testDir,
        { AGENTACK_USER_TOKEN: regResult.token },
      );
      assertSuccess(result);
    });

    test("create with invalid token returns INVALID_TOKEN", async () => {
      const result = await runAgt(
        ["create", "Bad Token"],
        testDir,
        { AGENTACK_USER_TOKEN: "tk_fake000" },
      );
      assertError(result, "INVALID_TOKEN", 3);
    });
  });

  // ─── Strict mode ────────────────────────────────────────────────

  describe("strict mode", () => {
    beforeEach(() => {
      setAuthMode(testDir, "strict");
    });

    test("list without token returns TOKEN_REQUIRED", async () => {
      const result = await runAgt(["list"], testDir);
      assertError(result, "TOKEN_REQUIRED", 2);
    });

    test("view without token returns TOKEN_REQUIRED", async () => {
      const result = await runAgt(["view", "any1234567"], testDir);
      assertError(result, "TOKEN_REQUIRED", 2);
    });

    test("create without token returns TOKEN_REQUIRED", async () => {
      const result = await runAgt(["create", "Should Fail"], testDir);
      assertError(result, "TOKEN_REQUIRED", 2);
    });

    test("list with valid token succeeds", async () => {
      // Register user in open mode first
      setAuthMode(testDir, "open");
      const regResult = parseJson<{ result: string; token: string }>(
        (await runAgt(["users", "register", "alice"], testDir)).stdout,
      );
      setAuthMode(testDir, "strict");

      const result = await runAgt(["list"], testDir, { AGENTACK_USER_TOKEN: regResult.token });
      assertSuccess(result);
    });
  });

  // ─── Token-based author attribution ─────────────────────────────

  test("create with token sets correct author in events", async () => {
    const regResult = parseJson<{ result: string; token: string }>(
      (await runAgt(["users", "register", "bob"], testDir)).stdout,
    );

    const createResult = await runAgt(
      ["create", "Authored"],
      testDir,
      { AGENTACK_USER_TOKEN: regResult.token },
    );
    const id = extractId(parseJson<CreateResult>(createResult.stdout));

    // Check history for author
    const historyResult = await runAgt(["history", id], testDir);
    const events = parseJson<Array<{ type: string; author?: string }>>(historyResult.stdout);
    expect(events[0].type).toBe("creation");
    expect(events[0].author).toBe("bob");
  });
});
