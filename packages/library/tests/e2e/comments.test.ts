/**
 * E2E: comments — Type B tests (tracker operations)
 */
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertError,
  assertSuccess,
  ensureE2EWorktree,
  extractId,
  parseJson,
  resetWorktreeData,
  runAgt,
} from "./setup";

describe("E2E: comments", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  describe("comments add", () => {
    test("adds a comment and returns OK with commentId", async () => {
      const issueId = extractId(await runAgt(["create", "Test Issue"]));

      const result = await runAgt([
        "comments",
        "add",
        issueId,
        "--content",
        "Hello world",
      ]);

      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed.commentId).toHaveLength(10);
    });
  });

  describe("comments update", () => {
    test("updates a comment and returns OK", async () => {
      const issueId = extractId(await runAgt(["create", "Test Issue"]));
      const addResult = await runAgt([
        "comments",
        "add",
        issueId,
        "--content",
        "Original",
      ]);
      const commentId = parseJson(addResult.stdout).commentId;

      const result = await runAgt([
        "comments",
        "update",
        issueId,
        commentId,
        "--content",
        "Updated",
      ]);

      assertSuccess(result);
    });
  });

  describe("comments delete", () => {
    test("deletes a comment and returns OK", async () => {
      const issueId = extractId(await runAgt(["create", "Test Issue"]));
      const addResult = await runAgt([
        "comments",
        "add",
        issueId,
        "--content",
        "To delete",
      ]);
      const commentId = parseJson(addResult.stdout).commentId;

      const result = await runAgt([
        "comments",
        "delete",
        issueId,
        commentId,
      ]);

      assertSuccess(result);
    });
  });

  describe("comments list", () => {
    test("returns comment array", async () => {
      const issueId = extractId(await runAgt(["create", "Test Issue"]));
      await runAgt(["comments", "add", issueId, "--content", "First"]);
      await runAgt(["comments", "add", issueId, "--content", "Second"]);

      const result = await runAgt(["comments", "list", issueId]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");

      const parsed = parseJson(result.stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].content).toBe("First");
      expect(parsed[1].content).toBe("Second");
      // Verify computed comment fields
      expect(parsed[0].id).toHaveLength(10);
      expect(parsed[0].author).toBe("anonymous");
      expect(parsed[0].timestamp).toBeTruthy();
      expect(parsed[0].editedAt).toBeNull();
    });
  });

  describe("comments error paths", () => {
    test("comments add on non-existent issue prints NOT_FOUND", async () => {
      const result = await runAgt([
        "comments",
        "add",
        "missing12345",
        "--content",
        "Hello",
      ]);

      assertError(result, "NOT_FOUND", 5);
    });

    test("comments update on non-existent comment prints COMMENT_NOT_FOUND", async () => {
      const issueId = extractId(await runAgt(["create", "Test Issue"]));

      const result = await runAgt([
        "comments",
        "update",
        issueId,
        "fake000000",
        "--content",
        "Updated",
      ]);

      assertError(result, "COMMENT_NOT_FOUND", 7);
    });

    test("comments delete on non-existent comment prints COMMENT_NOT_FOUND", async () => {
      const issueId = extractId(await runAgt(["create", "Test Issue"]));

      const result = await runAgt([
        "comments",
        "delete",
        issueId,
        "fake000000",
      ]);

      assertError(result, "COMMENT_NOT_FOUND", 7);
    });

    test("comments list on non-existent issue prints NOT_FOUND", async () => {
      const result = await runAgt(["comments", "list", "missing12345"]);

      assertError(result, "NOT_FOUND", 5);
    });
  });
});
