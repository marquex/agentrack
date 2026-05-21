/**
 * E2E: create — Type B tests (tracker operations)
 *
 * Uses a shared long-lived worktree with data reset between tests.
 */
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertSuccess,
  ensureE2EWorktree,
  extractId,
  parseJson,
  resetWorktreeData,
  runAgt,
} from "./setup";

describe("E2E: create", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  test("creates an issue with default values", async () => {
    const result = await runAgt(["create", "Test Issue"]);

    assertSuccess(result);

    const parsed = parseJson(result.stdout);
    expect(parsed.id).toHaveLength(10);
  });

  test("creates with all flags", async () => {
    const result = await runAgt([
      "create",
      "Full Issue",
      "--description",
      "A description",
      "--assignee",
      "alice",
      "--tags",
      "bug,urgent",
      "--status",
      "todo",
      "--priority",
      "1",
    ]);

    assertSuccess(result);

    const parsed = parseJson(result.stdout);
    expect(parsed.id).toHaveLength(10);
  });

  test("creates with --parentId flag", async () => {
    const parentResult = await runAgt(["create", "Parent"]);
    const parentId = extractId(parentResult);

    const result = await runAgt([
      "create",
      "Child Issue",
      "--parentId",
      parentId,
    ]);

    assertSuccess(result);

    // Verify child has parentId via view
    const viewResult = await runAgt(["view", extractId(result)]);
    const viewParsed = parseJson(viewResult.stdout);
    expect(viewParsed.parentId).toBe(parentId);
  });

  test("create with --parentId to closed parent returns HIERARCHY_CONSTRAINT", async () => {
    const parentResult = await runAgt(["create", "Parent", "--status", "closed"]);
    const parentId = extractId(parentResult);

    const result = await runAgt(["create", "Child", "--parentId", parentId]);

    expect(result.exitCode).toBe(12);

    const parsed = parseJson(result.stderr);
    expect(parsed.result).toBe("HIERARCHY_CONSTRAINT");
  });
});
