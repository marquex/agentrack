/**
 * E2E: list — Type B tests (tracker operations)
 */
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertSuccess,
  ensureE2EWorktree,
  parseJson,
  resetWorktreeData,
  runAgt,
} from "./setup";

describe("E2E: list", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  test("lists issues as JSON array", async () => {
    await runAgt(["create", "Issue 1"]);
    await runAgt(["create", "Issue 2"]);

    const result = await runAgt(["list"]);

    assertSuccess(result);

    const parsed = parseJson(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  test("filters by status", async () => {
    await runAgt(["create", "Open Issue"]);
    await runAgt(["create", "Closed Issue", "--status", "closed"]);

    const result = await runAgt(["list", "--status", "open"]);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Open Issue");
  });

  test("empty list returns []", async () => {
    const result = await runAgt(["list"]);

    assertSuccess(result);

    const parsed = parseJson(result.stdout);
    expect(parsed).toEqual([]);
  });

  test("filters by assignee", async () => {
    await runAgt(["create", "Alice Issue", "--assignee", "alice"]);
    await runAgt(["create", "Bob Issue", "--assignee", "bob"]);

    const result = await runAgt(["list", "--assignee", "alice"]);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Alice Issue");
  });
});
