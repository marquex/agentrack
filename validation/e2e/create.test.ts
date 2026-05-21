import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt, createIsolatedDir, cleanupIsolatedDir } from "./helpers/setup";
import { assertSuccess, assertError, parseJson, extractId, type CreateResult } from "./helpers/assertions";

describe("E2E: create", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = createTestRepo("e2e-create");
    await initAgt(testDir);
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("creates an issue with default values", async () => {
    const result = await runAgt(["create", "Test Issue"], testDir);
    const output = assertSuccess<CreateResult>(result);

    expect(output.id).toHaveLength(10);

    // Verify via view
    const viewResult = await runAgt(["view", output.id], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.title).toBe("Test Issue");
    expect(viewed.status).toBe("idea");
    expect(viewed.priority).toBe(3);
    expect(viewed.assignee).toBeNull();
    expect(viewed.tags).toEqual([]);
    expect(viewed.parentId).toBeNull();
  });

  test("creates with all flags", async () => {
    const result = await runAgt(
      ["create", "Full Issue", "--description", "A description", "--assignee", "alice",
       "--tags", "bug,urgent", "--status", "todo", "--priority", "1"],
      testDir,
    );

    const output = assertSuccess<CreateResult>(result);
    const id = extractId(output);

    const viewResult = await runAgt(["view", id], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.title).toBe("Full Issue");
    expect(viewed.description).toBe("A description");
    expect(viewed.assignee).toBe("alice");
    expect(viewed.tags).toEqual(["bug", "urgent"]);
    expect(viewed.status).toBe("todo");
    expect(viewed.priority).toBe(1);
  });

  test("creates with --parentId sets parent-child relationship", async () => {
    const parentResult = await runAgt(["create", "Parent"], testDir);
    const parentId = extractId(parseJson<CreateResult>(parentResult.stdout));

    const childResult = await runAgt(["create", "Child", "--parentId", parentId], testDir);
    const childOutput = assertSuccess<CreateResult>(childResult);

    const viewResult = await runAgt(["view", childOutput.id], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.parentId).toBe(parentId);
  });

  test("create with --parentId to closed parent returns HIERARCHY_CONSTRAINT", async () => {
    const parentResult = await runAgt(["create", "Parent", "--status", "closed"], testDir);
    const parentId = extractId(parseJson<CreateResult>(parentResult.stdout));

    const result = await runAgt(["create", "Child", "--parentId", parentId], testDir);
    const error = assertError(result, "HIERARCHY_CONSTRAINT", 12);
    expect(error.result).toBe("HIERARCHY_CONSTRAINT");
  });

  test("create when not initialized returns NOT_INITIALIZED", async () => {
    // Use a directory outside the project tree so resolveTrackerDir()
    // cannot find any .agentrack/ by walking up.
    const freshDir = createIsolatedDir();

    const result = await runAgt(["create", "No Init"], freshDir);
    const error = assertError(result, "NOT_INITIALIZED", 1);
    expect(error.result).toBe("NOT_INITIALIZED");

    cleanupIsolatedDir(freshDir);
  });

  test("creates with special characters in title", async () => {
    const result = await runAgt(["create", "Fix: API /users endpoint (v2) — urgent!"], testDir);
    const output = assertSuccess<CreateResult>(result);

    const viewResult = await runAgt(["view", output.id], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.title).toBe("Fix: API /users endpoint (v2) — urgent!");
  });

  test("creates with many tags", async () => {
    const tags = ["tag1", "tag2", "tag3", "tag4", "tag5"].join(",");
    const result = await runAgt(["create", "Tagged Issue", "--tags", tags], testDir);
    const output = assertSuccess<CreateResult>(result);

    const viewResult = await runAgt(["view", output.id], testDir);
    const viewed = parseJson(viewResult.stdout);
    expect(viewed.tags).toEqual(["tag1", "tag2", "tag3", "tag4", "tag5"]);
  });
});
