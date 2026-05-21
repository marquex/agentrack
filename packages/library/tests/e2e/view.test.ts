/**
 * E2E: view — Type B tests (tracker operations)
 */
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertError,
  ensureE2EWorktree,
  extractId,
  getTrackerDir,
  parseJson,
  resetWorktreeData,
  runAgt,
} from "./setup";

describe("E2E: view", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  test("views an issue with full computed state", async () => {
    const issueId = extractId(await runAgt(["create", "View Test"]));

    const result = await runAgt(["view", issueId]);

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
    const result = await runAgt(["view", "missing12345"]);

    assertError(result, "NOT_FOUND", 5);
  });

  test("prints ISSUE_MISSING when file is deleted", async () => {
    const issueId = extractId(await runAgt(["create", "Will Be Deleted"]));

    // Delete the issue file to trigger ISSUE_MISSING
    const issuePath = join(
      getTrackerDir(E2E_DATA_BRANCH),
      "issues",
      `${issueId}.json`,
    );
    unlinkSync(issuePath);

    const result = await runAgt(["view", issueId]);

    assertError(result, "ISSUE_MISSING", 6);
  });
});
