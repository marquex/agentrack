/**
 * E2E: create — Type B tests (tracker operations)
 *
 * Uses a per-file ephemeral directory with data reset between tests.
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

describe("E2E: create", () => {
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

  test("creates an issue with default values", async () => {
    const result = await runAgt(["create", "Test Issue"], dir);

    assertSuccess(result);

    const parsed = parseJson(result.stdout);
    expect(parsed.id).toHaveLength(10);
  });

  test("creates with all flags", async () => {
    const result = await runAgt(
      [
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
      ],
      dir,
    );

    assertSuccess(result);

    const parsed = parseJson(result.stdout);
    expect(parsed.id).toHaveLength(10);
  });

  test("creates with --parentId flag", async () => {
    const parentResult = await runAgt(["create", "Parent"], dir);
    const parentId = extractId(parentResult);

    const result = await runAgt(
      ["create", "Child Issue", "--parentId", parentId],
      dir,
    );

    assertSuccess(result);

    // Verify child has parentId via view
    const viewResult = await runAgt(["view", extractId(result)], dir);
    const viewParsed = parseJson(viewResult.stdout);
    expect(viewParsed.parentId).toBe(parentId);
  });

  test("create with --parentId to closed parent returns HIERARCHY_CONSTRAINT", async () => {
    const parentResult = await runAgt(
      ["create", "Parent", "--status", "closed"],
      dir,
    );
    const parentId = extractId(parentResult);

    const result = await runAgt(["create", "Child", "--parentId", parentId], dir);

    expect(result.exitCode).toBe(12);

    const parsed = parseJson(result.stderr);
    expect(parsed.result).toBe("HIERARCHY_CONSTRAINT");
  });
});
