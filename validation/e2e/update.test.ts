import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt } from "./helpers/setup";
import { assertSuccess, assertError, parseJson, extractId, type CreateResult } from "./helpers/assertions";

describe("E2E: update", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = createTestRepo("e2e-update");
    await initAgt(testDir);
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  async function createIssue(title = "Test"): Promise<string> {
    const result = await runAgt(["create", title], testDir);
    return extractId(parseJson<CreateResult>(result.stdout));
  }

  test("updates title", async () => {
    const id = await createIssue();

    const result = await runAgt(["update", id, "--title", "Updated Title"], testDir);
    assertSuccess(result);

    const viewResult = await runAgt(["view", id], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.title).toBe("Updated Title");
  });

  test("updates status", async () => {
    const id = await createIssue();

    const result = await runAgt(["update", id, "--status", "in-progress"], testDir);
    assertSuccess(result);

    const viewResult = await runAgt(["view", id], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.status).toBe("in-progress");
  });

  test("updates priority", async () => {
    const id = await createIssue();

    const result = await runAgt(["update", id, "--priority", "1"], testDir);
    assertSuccess(result);

    const viewResult = await runAgt(["view", id], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.priority).toBe(1);
  });

  test("updates assignee", async () => {
    const id = await createIssue();

    const result = await runAgt(["update", id, "--assignee", "bob"], testDir);
    assertSuccess(result);

    const viewResult = await runAgt(["view", id], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.assignee).toBe("bob");
  });

  test("updates multiple fields at once", async () => {
    const id = await createIssue();

    const result = await runAgt(
      ["update", id, "--title", "New", "--status", "done", "--priority", "1", "--assignee", "alice"],
      testDir,
    );
    assertSuccess(result);

    const viewResult = await runAgt(["view", id], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.title).toBe("New");
    expect(viewed.status).toBe("done");
    expect(viewed.priority).toBe(1);
    expect(viewed.assignee).toBe("alice");
  });

  test("clears parentId with 'null' string", async () => {
    // Create parent
    const parentId = await createIssue("Parent");
    // Create child
    const childResult = await runAgt(["create", "Child", "--parentId", parentId], testDir);
    const childId = extractId(parseJson<CreateResult>(childResult.stdout));

    // Clear parentId
    const result = await runAgt(["update", childId, "--parentId", "null"], testDir);
    assertSuccess(result);

    const viewResult = await runAgt(["view", childId], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.parentId).toBeNull();
  });

  test("update with no flags returns INVALID_PARAMS", async () => {
    const id = await createIssue();

    const result = await runAgt(["update", id], testDir);
    const error = assertError(result, "INVALID_PARAMS", 10);
    expect(error.result).toBe("INVALID_PARAMS");
  });

  test("update non-existent issue returns NOT_FOUND", async () => {
    const result = await runAgt(["update", "missing12345", "--title", "New"], testDir);
    const error = assertError(result, "NOT_FOUND", 5);
    expect(error.result).toBe("NOT_FOUND");
  });

  test("update same value is a no-op (succeeds)", async () => {
    const id = await createIssue("Original");

    // Update title to same value
    const result = await runAgt(["update", id, "--title", "Original"], testDir);
    assertSuccess(result);

    const viewResult = await runAgt(["view", id], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.title).toBe("Original");
  });
});
