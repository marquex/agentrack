/**
 * E2E: history — Type B tests (tracker operations)
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

describe("E2E: history", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  test("returns raw event array", async () => {
    const issueId = extractId(await runAgt(["create", "History Test"]));

    const result = await runAgt(["history", issueId]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");

    const parsed = parseJson(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2); // creation + initial update
    expect(parsed[0].type).toBe("creation");
    expect(parsed[1].type).toBe("update");
  });

  test("shows events after update", async () => {
    const issueId = extractId(await runAgt(["create", "Test"]));
    await runAgt(["update", issueId, "--title", "Updated"]);

    const result = await runAgt(["history", issueId]);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed).toHaveLength(3);
    expect(parsed[2].type).toBe("update");
  });

  test("prints NOT_FOUND for non-existent id", async () => {
    const result = await runAgt(["history", "missing12345"]);

    assertError(result, "NOT_FOUND", 5);
  });

  test("prints ISSUE_MISSING when file is deleted", async () => {
    const issueId = extractId(await runAgt(["create", "History Gone"]));

    const issuePath = join(
      getTrackerDir(E2E_DATA_BRANCH),
      "issues",
      `${issueId}.json`,
    );
    unlinkSync(issuePath);

    const result = await runAgt(["history", issueId]);

    assertError(result, "ISSUE_MISSING", 6);
  });
});
