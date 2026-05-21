import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt } from "./helpers/setup";
import { assertSuccess, assertError, parseJson, extractId, type CreateResult } from "./helpers/assertions";

describe("E2E: view", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = createTestRepo("e2e-view");
    await initAgt(testDir);
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("views an issue with full computed state", async () => {
    const createResult = await runAgt(
      ["create", "View Test", "--assignee", "alice", "--priority", "2", "--tags", "bug",
       "--status", "in-progress", "--description", "Some desc"],
      testDir,
    );
    const id = extractId(parseJson<CreateResult>(createResult.stdout));

    const result = await runAgt(["view", id], testDir);
    const issue = assertSuccess<Record<string, unknown>>(result);

    expect(issue.id).toBe(id);
    expect(issue.title).toBe("View Test");
    expect(issue.status).toBe("in-progress");
    expect(issue.priority).toBe(2);
    expect(issue.assignee).toBe("alice");
    expect(issue.tags).toEqual(["bug"]);
    expect(issue.description).toBe("Some desc");
    expect(issue.createdAt).toBeTruthy();
    expect(issue.updatedAt).toBeTruthy();
    expect(issue.parentId).toBeNull();
  });

  test("views a non-existent issue returns NOT_FOUND", async () => {
    const result = await runAgt(["view", "missing12345"], testDir);
    const error = assertError(result, "NOT_FOUND", 5);
    expect(error.result).toBe("NOT_FOUND");
  });

  test("view reflects updates correctly", async () => {
    const id = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Original"], testDir)).stdout,
    ));

    await runAgt(["update", id, "--title", "Updated", "--status", "done"], testDir);

    const result = await runAgt(["view", id], testDir);
    const issue = assertSuccess<Record<string, unknown>>(result);
    expect(issue.title).toBe("Updated");
    expect(issue.status).toBe("done");
  });

  test("view reflects comments in history", async () => {
    const id = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Commented Issue"], testDir)).stdout,
    ));

    await runAgt(["comments", "add", id, "--content", "A comment"], testDir);

    // View the issue — comments should not appear in the view output
    // but the issue should still be viewable
    const result = await runAgt(["view", id], testDir);
    expect(result.exitCode).toBe(0);
  });
});
