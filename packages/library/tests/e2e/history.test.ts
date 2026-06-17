/**
 * E2E: events list — Type B tests (tracker operations)
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

describe("E2E: events list", () => {
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

  test("returns raw event array", async () => {
    const issueId = extractId(await runAgt(["create", "History Test"], dir));

    const result = await runAgt(["events", "list", issueId], dir);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");

    const parsed = parseJson(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2); // creation + initial update
    expect(parsed[0].type).toBe("creation");
    expect(parsed[1].type).toBe("update");
  });

  test("shows events after update", async () => {
    const issueId = extractId(await runAgt(["create", "Test"], dir));
    await runAgt(["update", issueId, "--title", "Updated"], dir);

    const result = await runAgt(["events", "list", issueId], dir);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed).toHaveLength(3);
    expect(parsed[2].type).toBe("update");
  });

  test("prints NOT_FOUND for non-existent id", async () => {
    const result = await runAgt(["events", "list", "missing12345"], dir);

    assertError(result, "NOT_FOUND", 5);
  });

  test("prints ISSUE_MISSING when file is deleted", async () => {
    const issueId = extractId(await runAgt(["create", "History Gone"], dir));

    const issuePath = join(
      getTrackerDir(dir, E2E_DATA_BRANCH),
      "issues",
      `${issueId}.json`,
    );
    unlinkSync(issuePath);

    const result = await runAgt(["events", "list", issueId], dir);

    assertError(result, "ISSUE_MISSING", 6);
  });
});
