/**
 * E2E: hierarchy — Type B tests (tracker operations)
 *
 * Tests parent-child relationships, status constraints, and upward promotion.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertSuccess,
  createEphemeralDir,
  ensureE2EWorktree,
  extractId,
  initGitRepo,
  parseJson,
  resetWorktreeData,
  rmEphemeralDir,
  runAgt,
} from "./setup";

describe("E2E: hierarchy", () => {
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

  test("create with parentId establishes parent-child relationship", async () => {
    const parentId = extractId(await runAgt(["create", "Parent"], dir));
    const childId = extractId(
      await runAgt(["create", "Child", "--parentId", parentId], dir),
    );

    // Verify child has parentId
    const childView = parseJson(
      (await runAgt(["view", childId], dir)).stdout,
    );
    expect(childView.parentId).toBe(parentId);

    // Verify parent has child via list --parentId
    const childrenList = parseJson(
      (await runAgt(["list", "--parentId", parentId], dir)).stdout,
    );
    expect(childrenList).toHaveLength(1);
    expect(childrenList[0].id).toBe(childId);
  });

  test("update with parentId changes parent", async () => {
    const parent1Id = extractId(await runAgt(["create", "Parent 1"], dir));
    const parent2Id = extractId(await runAgt(["create", "Parent 2"], dir));
    const childId = extractId(
      await runAgt(["create", "Child", "--parentId", parent1Id], dir),
    );

    // Move child to parent2
    const result = await runAgt(
      ["update", childId, "--parentId", parent2Id],
      dir,
    );
    assertSuccess(result);

    // Verify new parent
    const childView = parseJson(
      (await runAgt(["view", childId], dir)).stdout,
    );
    expect(childView.parentId).toBe(parent2Id);
  });

  test("cannot create child on closed parent", async () => {
    const parentId = extractId(
      await runAgt(["create", "Closed Parent", "--status", "closed"], dir),
    );

    const result = await runAgt(
      ["create", "Child", "--parentId", parentId],
      dir,
    );

    expect(result.exitCode).toBe(12);

    const parsed = parseJson(result.stderr);
    expect(parsed.result).toBe("HIERARCHY_CONSTRAINT");
  });

  test("closing parent auto-closes done children", async () => {
    const parentId = extractId(
      await runAgt(["create", "Parent", "--status", "todo"], dir),
    );
    const childId = extractId(
      await runAgt(
        ["create", "Child", "--parentId", parentId, "--status", "done"],
        dir,
      ),
    );

    // Close the parent
    await runAgt(["update", parentId, "--status", "closed"], dir);

    // Verify child was auto-closed
    const childView = parseJson(
      (await runAgt(["view", childId], dir)).stdout,
    );
    expect(childView.status).toBe("closed");
  });
});
