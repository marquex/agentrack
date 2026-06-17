/**
 * E2E: list — Type B tests (tracker operations)
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertSuccess,
  createEphemeralDir,
  ensureE2EWorktree,
  initGitRepo,
  parseJson,
  resetWorktreeData,
  rmEphemeralDir,
  runAgt,
} from "./setup";

describe("E2E: list", () => {
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

  test("lists issues as JSON array", async () => {
    await runAgt(["create", "Issue 1"], dir);
    await runAgt(["create", "Issue 2"], dir);

    const result = await runAgt(["list"], dir);

    assertSuccess(result);

    const parsed = parseJson(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  test("filters by status", async () => {
    await runAgt(["create", "Open Issue"], dir);
    await runAgt(["create", "Closed Issue", "--status", "closed"], dir);

    const result = await runAgt(["list", "--status", "open"], dir);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Open Issue");
  });

  test("empty list returns []", async () => {
    const result = await runAgt(["list"], dir);

    assertSuccess(result);

    const parsed = parseJson(result.stdout);
    expect(parsed).toEqual([]);
  });

  test("filters by assignee", async () => {
    await runAgt(["create", "Alice Issue", "--assignee", "alice"], dir);
    await runAgt(["create", "Bob Issue", "--assignee", "bob"], dir);

    const result = await runAgt(["list", "--assignee", "alice"], dir);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Alice Issue");
  });
});
