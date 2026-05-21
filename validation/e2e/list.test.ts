import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt, createIsolatedDir, cleanupIsolatedDir } from "./helpers/setup";
import { assertSuccess, assertError, parseJson, type CreateResult } from "./helpers/assertions";

describe("E2E: list", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = createTestRepo("e2e-list");
    await initAgt(testDir);
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("returns empty array when no issues", async () => {
    const result = await runAgt(["list"], testDir);
    const issues = assertSuccess<unknown[]>(result);
    expect(issues).toEqual([]);
  });

  test("lists all issues", async () => {
    await runAgt(["create", "Issue 1"], testDir);
    await runAgt(["create", "Issue 2"], testDir);
    await runAgt(["create", "Issue 3"], testDir);

    const result = await runAgt(["list"], testDir);
    const issues = assertSuccess<unknown[]>(result);
    expect(issues).toHaveLength(3);
  });

  test("filters by status", async () => {
    await runAgt(["create", "Todo Issue", "--status", "todo"], testDir);
    await runAgt(["create", "Done Issue", "--status", "done"], testDir);
    await runAgt(["create", "In-Progress Issue", "--status", "in-progress"], testDir);

    const result = await runAgt(["list", "--status", "todo"], testDir);
    const issues = assertSuccess<Array<{ title: string }>>(result);
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toBe("Todo Issue");
  });

  test("filters by assignee", async () => {
    await runAgt(["create", "Alice Issue", "--assignee", "alice"], testDir);
    await runAgt(["create", "Bob Issue", "--assignee", "bob"], testDir);
    await runAgt(["create", "Unassigned Issue"], testDir);

    const result = await runAgt(["list", "--assignee", "alice"], testDir);
    const issues = assertSuccess<Array<{ title: string; assignee: string | null }>>(result);
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toBe("Alice Issue");
  });

  test("filters by tags", async () => {
    await runAgt(["create", "Bug Issue", "--tags", "bug"], testDir);
    await runAgt(["create", "Feature Issue", "--tags", "feature"], testDir);
    await runAgt(["create", "Both Issue", "--tags", "bug,feature"], testDir);

    const result = await runAgt(["list", "--tags", "bug"], testDir);
    const issues = assertSuccess<Array<{ title: string; tags: string[] }>>(result);
    expect(issues).toHaveLength(2);
    const titles = issues.map((i) => i.title);
    expect(titles).toContain("Bug Issue");
    expect(titles).toContain("Both Issue");
  });

  test("filters by parentId", async () => {
    const parentResult = await runAgt(["create", "Parent"], testDir);
    const parentId = JSON.parse(parentResult.stdout.trim()).id;

    await runAgt(["create", "Child 1", "--parentId", parentId], testDir);
    await runAgt(["create", "Child 2", "--parentId", parentId], testDir);
    await runAgt(["create", "Standalone"], testDir);

    const result = await runAgt(["list", "--parentId", parentId], testDir);
    const issues = assertSuccess<Array<{ title: string; parentId: string | null }>>(result);
    expect(issues).toHaveLength(2);
    const titles = issues.map((i) => i.title);
    expect(titles).toContain("Child 1");
    expect(titles).toContain("Child 2");
  });

  test("when not initialized returns NOT_INITIALIZED", async () => {
    const freshDir = createIsolatedDir();

    const result = await runAgt(["list"], freshDir);
    const error = assertError(result, "NOT_INITIALIZED", 1);
    expect(error.result).toBe("NOT_INITIALIZED");

    cleanupIsolatedDir(freshDir);
  });

  test("list with many issues", async () => {
    for (let i = 0; i < 20; i++) {
      await runAgt(["create", `Issue ${i}`], testDir);
    }

    const result = await runAgt(["list"], testDir);
    const issues = assertSuccess<unknown[]>(result);
    expect(issues).toHaveLength(20);
  });
});
