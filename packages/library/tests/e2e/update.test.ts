/**
 * E2E: update — Type B tests (tracker operations)
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

describe("E2E: update", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  test("updates an issue and prints OK", async () => {
    const issueId = extractId(await runAgt(["create", "Original"]));

    const result = await runAgt([
      "update",
      issueId,
      "--title",
      "Updated",
      "--status",
      "done",
    ]);

    assertSuccess(result);

    // Verify via view
    const viewResult = await runAgt(["view", issueId]);
    const viewParsed = parseJson(viewResult.stdout);
    expect(viewParsed.title).toBe("Updated");
    expect(viewParsed.status).toBe("done");
  });

  test("prints INVALID_PARAMS when no flags provided", async () => {
    const issueId = extractId(await runAgt(["create", "Test"]));

    const result = await runAgt(["update", issueId]);

    assertError(result, "INVALID_PARAMS", 10);
  });

  test("prints NOT_FOUND for non-existent id", async () => {
    const result = await runAgt(["update", "missing12345", "--title", "New"]);

    assertError(result, "NOT_FOUND", 5);
  });

  test("clears parentId with 'null' string", async () => {
    // Create parent first
    const parentId = extractId(await runAgt(["create", "Parent"]));
    const issueId = extractId(
      await runAgt(["create", "Child", "--parentId", parentId]),
    );

    const result = await runAgt(["update", issueId, "--parentId", "null"]);

    expect(result.exitCode).toBe(0);

    const viewResult = await runAgt(["view", issueId]);
    const viewParsed = parseJson(viewResult.stdout);
    expect(viewParsed.parentId).toBeNull();
  });
});
