/**
 * E2E: update — Type B tests (tracker operations)
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertError,
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

describe("E2E: update", () => {
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

  test("updates an issue and prints OK", async () => {
    const issueId = extractId(await runAgt(["create", "Original"], dir));

    const result = await runAgt(
      ["update", issueId, "--title", "Updated", "--status", "done"],
      dir,
    );

    assertSuccess(result);

    // Verify via view
    const viewResult = await runAgt(["view", issueId], dir);
    const viewParsed = parseJson(viewResult.stdout);
    expect(viewParsed.title).toBe("Updated");
    expect(viewParsed.status).toBe("done");
  });

  test("prints INVALID_PARAMS when no flags provided", async () => {
    const issueId = extractId(await runAgt(["create", "Test"], dir));

    const result = await runAgt(["update", issueId], dir);

    assertError(result, "INVALID_PARAMS", 10);
  });

  test("prints NOT_FOUND for non-existent id", async () => {
    const result = await runAgt(["update", "missing12345", "--title", "New"], dir);

    assertError(result, "NOT_FOUND", 5);
  });

  test("clears parentId with 'null' string", async () => {
    // Create parent first
    const parentId = extractId(await runAgt(["create", "Parent"], dir));
    const issueId = extractId(
      await runAgt(["create", "Child", "--parentId", parentId], dir),
    );

    const result = await runAgt(["update", issueId, "--parentId", "null"], dir);

    expect(result.exitCode).toBe(0);

    const viewResult = await runAgt(["view", issueId], dir);
    const viewParsed = parseJson(viewResult.stdout);
    expect(viewParsed.parentId).toBeNull();
  });
});
