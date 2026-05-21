import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt, createIsolatedDir, cleanupIsolatedDir } from "./helpers/setup";
import { assertSuccess, assertError, parseJson, extractId, type CreateResult } from "./helpers/assertions";

describe("E2E: comments", () => {
  let testDir: string;
  let issueId: string;

  beforeEach(async () => {
    testDir = createTestRepo("e2e-comments");
    await initAgt(testDir);
    const result = await runAgt(["create", "Comment Target"], testDir);
    issueId = extractId(parseJson<CreateResult>(result.stdout));
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("add a comment", async () => {
    const result = await runAgt(
      ["comments", "add", issueId, "--content", "Hello world"],
      testDir,
    );
    const output = assertSuccess<{ result: string; commentId: string }>(result);
    expect(output.result).toBe("OK");
    expect(output.commentId).toHaveLength(10);
  });

  test("list comments", async () => {
    await runAgt(["comments", "add", issueId, "--content", "First"], testDir);
    await runAgt(["comments", "add", issueId, "--content", "Second"], testDir);

    const result = await runAgt(["comments", "list", issueId], testDir);
    const comments = assertSuccess<Array<{ content: string; author: string; id: string }>>(result);

    expect(comments).toHaveLength(2);
    expect(comments[0].content).toBe("First");
    expect(comments[1].content).toBe("Second");
    expect(comments[0].author).toBe("anonymous");
    expect(comments[0].id).toHaveLength(10);
  });

  test("update a comment", async () => {
    const addResult = await runAgt(["comments", "add", issueId, "--content", "Original"], testDir);
    const commentId = parseJson<{ commentId: string }>(addResult.stdout).commentId;

    const result = await runAgt(
      ["comments", "update", issueId, commentId, "--content", "Updated"],
      testDir,
    );
    assertSuccess(result);

    // Verify via list
    const listResult = await runAgt(["comments", "list", issueId], testDir);
    const comments = parseJson<Array<{ content: string; editedAt: string | null }>>(listResult.stdout);
    expect(comments[0].content).toBe("Updated");
    expect(comments[0].editedAt).not.toBeNull();
  });

  test("delete a comment", async () => {
    const addResult = await runAgt(["comments", "add", issueId, "--content", "To delete"], testDir);
    const commentId = parseJson<{ commentId: string }>(addResult.stdout).commentId;

    const result = await runAgt(["comments", "delete", issueId, commentId], testDir);
    assertSuccess(result);

    // Verify via list
    const listResult = await runAgt(["comments", "list", issueId], testDir);
    const comments = parseJson<unknown[]>(listResult.stdout);
    expect(comments).toHaveLength(0);
  });

  test("add comment on non-existent issue returns NOT_FOUND", async () => {
    const result = await runAgt(["comments", "add", "missing12345", "--content", "Hello"], testDir);
    assertError(result, "NOT_FOUND", 5);
  });

  test("update non-existent comment returns COMMENT_NOT_FOUND", async () => {
    const result = await runAgt(
      ["comments", "update", issueId, "fake000000", "--content", "Updated"],
      testDir,
    );
    assertError(result, "COMMENT_NOT_FOUND", 7);
  });

  test("delete non-existent comment returns COMMENT_NOT_FOUND", async () => {
    const result = await runAgt(["comments", "delete", issueId, "fake000000"], testDir);
    assertError(result, "COMMENT_NOT_FOUND", 7);
  });

  test("list comments on non-existent issue returns NOT_FOUND", async () => {
    const result = await runAgt(["comments", "list", "missing12345"], testDir);
    assertError(result, "NOT_FOUND", 5);
  });

  test("add comment when not initialized returns NOT_INITIALIZED", async () => {
    const freshDir = createIsolatedDir();

    const result = await runAgt(["comments", "add", "missing12345", "--content", "Hello"], freshDir);
    assertError(result, "NOT_INITIALIZED", 1);

    cleanupIsolatedDir(freshDir);
  });

  test("delete then re-add a comment", async () => {
    const addResult = await runAgt(["comments", "add", issueId, "--content", "First"], testDir);
    const commentId = parseJson<{ commentId: string }>(addResult.stdout).commentId;

    await runAgt(["comments", "delete", issueId, commentId], testDir);
    await runAgt(["comments", "add", issueId, "--content", "Second"], testDir);

    const listResult = await runAgt(["comments", "list", issueId], testDir);
    const comments = parseJson<Array<{ content: string }>>(listResult.stdout);
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe("Second");
  });
});
