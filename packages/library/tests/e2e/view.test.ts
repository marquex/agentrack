/**
 * E2E: view — Type B tests (tracker operations)
 */
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertError,
  createEphemeralDir,
  ensureE2EWorktree,
  extractId,
  getTrackerDir,
  initGitRepo,
  parseJson,
  resetWorktreeData,
  rmEphemeralDir,
  runAgt,
} from "./setup";

describe("E2E: view", () => {
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

  test("views an issue with full computed state", async () => {
    const issueId = extractId(await runAgt(["create", "View Test"], dir));

    const result = await runAgt(["view", issueId], dir);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");

    const parsed = parseJson(result.stdout);
    expect(parsed.id).toBe(issueId);
    expect(parsed.title).toBe("View Test");
    expect(parsed.status).toBe("idea");
    expect(parsed.createdAt).toBeTruthy();
    expect(parsed.updatedAt).toBeTruthy();
  });

  test("prints NOT_FOUND for non-existent id", async () => {
    const result = await runAgt(["view", "missing12345"], dir);

    assertError(result, "NOT_FOUND", 5);
  });

  test("prints ISSUE_MISSING when file is deleted", async () => {
    const issueId = extractId(await runAgt(["create", "Will Be Deleted"], dir));

    // Delete the issue file to trigger ISSUE_MISSING
    const issuePath = join(
      getTrackerDir(dir, E2E_DATA_BRANCH),
      "issues",
      `${issueId}.json`,
    );
    unlinkSync(issuePath);

    const result = await runAgt(["view", issueId], dir);

    assertError(result, "ISSUE_MISSING", 6);
  });
});
