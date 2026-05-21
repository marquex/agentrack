/**
 * E2E: hierarchy — Type B tests (tracker operations)
 *
 * Tests parent-child relationships, status constraints, and upward promotion.
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

describe("E2E: hierarchy", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  test("create with parentId establishes parent-child relationship", async () => {
    const parentId = extractId(await runAgt(["create", "Parent"]));
    const childId = extractId(
      await runAgt(["create", "Child", "--parentId", parentId]),
    );

    // Verify child has parentId
    const childView = parseJson(
      (await runAgt(["view", childId])).stdout,
    );
    expect(childView.parentId).toBe(parentId);

    // Verify parent has child via list --parentId
    const childrenList = parseJson(
      (await runAgt(["list", "--parentId", parentId])).stdout,
    );
    expect(childrenList).toHaveLength(1);
    expect(childrenList[0].id).toBe(childId);
  });

  test("update with parentId changes parent", async () => {
    const parent1Id = extractId(await runAgt(["create", "Parent 1"]));
    const parent2Id = extractId(await runAgt(["create", "Parent 2"]));
    const childId = extractId(
      await runAgt(["create", "Child", "--parentId", parent1Id]),
    );

    // Move child to parent2
    const result = await runAgt([
      "update",
      childId,
      "--parentId",
      parent2Id,
    ]);
    assertSuccess(result);

    // Verify new parent
    const childView = parseJson(
      (await runAgt(["view", childId])).stdout,
    );
    expect(childView.parentId).toBe(parent2Id);
  });

  test("cannot create child on closed parent", async () => {
    const parentId = extractId(
      await runAgt(["create", "Closed Parent", "--status", "closed"]),
    );

    const result = await runAgt([
      "create",
      "Child",
      "--parentId",
      parentId,
    ]);

    expect(result.exitCode).toBe(12);

    const parsed = parseJson(result.stderr);
    expect(parsed.result).toBe("HIERARCHY_CONSTRAINT");
  });

  test("closing parent auto-closes done children", async () => {
    const parentId = extractId(
      await runAgt(["create", "Parent", "--status", "todo"]),
    );
    const childId = extractId(
      await runAgt([
        "create",
        "Child",
        "--parentId",
        parentId,
        "--status",
        "done",
      ]),
    );

    // Close the parent
    await runAgt(["update", parentId, "--status", "closed"]);

    // Verify child was auto-closed
    const childView = parseJson(
      (await runAgt(["view", childId])).stdout,
    );
    expect(childView.status).toBe("closed");
  });
});
