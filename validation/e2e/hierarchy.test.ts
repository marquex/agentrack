import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt } from "./helpers/setup";
import { assertSuccess, assertError, parseJson, extractId, type CreateResult } from "./helpers/assertions";

/**
 * E2E tests for parent-child hierarchy workflows.
 *
 * These tests exercise the CLI's hierarchy features including:
 * - Parent-child CRUD
 * - Auto-promotion (upward)
 * - Auto-close (downward cascade)
 * - Reparenting
 *
 * These scenarios are well-covered at the unit level (tracker-hierarchy.test.ts)
 * but NOT at the CLI level. This E2E test validates that the CLI correctly
 * invokes the tracker hierarchy logic through the full process spawn pipeline.
 */
describe("E2E: hierarchy", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = createTestRepo("e2e-hierarchy");
    await initAgt(testDir);
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  // ─── Parent-child CRUD ──────────────────────────────────────────

  test("create child with parentId", async () => {
    const parentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Parent"], testDir)).stdout,
    ));
    const childId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Child", "--parentId", parentId], testDir)).stdout,
    ));

    // Verify via view
    const viewResult = await runAgt(["view", childId], testDir);
    const child = parseJson<Record<string, unknown>>(viewResult.stdout);
    expect(child.parentId).toBe(parentId);

    // Verify childrenOf in index
    const index = JSON.parse(readFileSync(join(testDir, ".agentrack", "index.json"), "utf-8"));
    expect(index.childrenOf[parentId]).toEqual([childId]);
  });

  test("create child under non-existent parent returns NOT_FOUND", async () => {
    const result = await runAgt(["create", "Child", "--parentId", "missing12345"], testDir);
    assertError(result, "NOT_FOUND", 5);
  });

  test("create child under closed parent returns HIERARCHY_CONSTRAINT", async () => {
    const parentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Parent", "--status", "closed"], testDir)).stdout,
    ));

    const result = await runAgt(["create", "Child", "--parentId", parentId], testDir);
    assertError(result, "HIERARCHY_CONSTRAINT", 12);
  });

  test("create child under done parent is allowed", async () => {
    const parentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Parent", "--status", "done"], testDir)).stdout,
    ));

    const result = await runAgt(["create", "Child", "--parentId", parentId], testDir);
    expect(result.exitCode).toBe(0);
  });

  // ─── Downward cascade (auto-close) ──────────────────────────────

  test("closing parent auto-closes done children", async () => {
    const parentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Parent", "--status", "done"], testDir)).stdout,
    ));
    const childId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Child", "--parentId", parentId, "--status", "done"], testDir)).stdout,
    ));

    // Close parent
    await runAgt(["update", parentId, "--status", "closed"], testDir);

    // Verify child was auto-closed
    const viewResult = await runAgt(["view", childId], testDir);
    const child = parseJson<Record<string, unknown>>(viewResult.stdout);
    expect(child.status).toBe("closed");
  });

  test("closing parent with in-progress child fails", async () => {
    const parentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Parent"], testDir)).stdout,
    ));
    await runAgt(["create", "Child", "--parentId", parentId, "--status", "in-progress"], testDir);

    const result = await runAgt(["update", parentId, "--status", "closed"], testDir);
    assertError(result, "HIERARCHY_CONSTRAINT", 12);
  });

  test("closing parent with all children done/closed succeeds", async () => {
    const parentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Parent"], testDir)).stdout,
    ));
    await runAgt(["create", "Child 1", "--parentId", parentId, "--status", "done"], testDir);
    await runAgt(["create", "Child 2", "--parentId", parentId, "--status", "closed"], testDir);

    const result = await runAgt(["update", parentId, "--status", "closed"], testDir);
    expect(result.exitCode).toBe(0);
  });

  test("recursive cascade: grandchild auto-closed", async () => {
    const gpId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Grandparent", "--status", "done"], testDir)).stdout,
    ));
    const parentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Parent", "--parentId", gpId, "--status", "done"], testDir)).stdout,
    ));
    const gcId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Grandchild", "--parentId", parentId, "--status", "done"], testDir)).stdout,
    ));

    await runAgt(["update", gpId, "--status", "closed"], testDir);

    // All should be closed
    for (const id of [gpId, parentId, gcId]) {
      const viewResult = await runAgt(["view", id], testDir);
      const issue = parseJson<Record<string, unknown>>(viewResult.stdout);
      expect(issue.status).toBe("closed");
    }
  });

  // ─── Upward promotion ───────────────────────────────────────────

  test("child → in-progress promotes idea parent to in-progress", async () => {
    const parentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Parent", "--status", "idea"], testDir)).stdout,
    ));
    const childId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Child", "--parentId", parentId, "--status", "todo"], testDir)).stdout,
    ));

    await runAgt(["update", childId, "--status", "in-progress"], testDir);

    // Parent should be auto-promoted to in-progress
    const viewResult = await runAgt(["view", parentId], testDir);
    const parent = parseJson<Record<string, unknown>>(viewResult.stdout);
    expect(parent.status).toBe("in-progress");
  });

  test("child → done does not promote in-progress parent further", async () => {
    const parentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Parent", "--status", "in-progress"], testDir)).stdout,
    ));
    const childId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Child", "--parentId", parentId, "--status", "todo"], testDir)).stdout,
    ));

    await runAgt(["update", childId, "--status", "done"], testDir);

    // Parent stays at in-progress (capped)
    const viewResult = await runAgt(["view", parentId], testDir);
    const parent = parseJson<Record<string, unknown>>(viewResult.stdout);
    expect(parent.status).toBe("in-progress");
  });

  // ─── Reparenting ────────────────────────────────────────────────

  test("reparent child to new parent", async () => {
    const oldParentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Old Parent"], testDir)).stdout,
    ));
    const newParentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "New Parent"], testDir)).stdout,
    ));
    const childId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Child", "--parentId", oldParentId], testDir)).stdout,
    ));

    await runAgt(["update", childId, "--parentId", newParentId], testDir);

    // Verify child's parentId changed
    const viewResult = await runAgt(["view", childId], testDir);
    const child = parseJson<Record<string, unknown>>(viewResult.stdout);
    expect(child.parentId).toBe(newParentId);

    // Verify index updated
    const index = JSON.parse(readFileSync(join(testDir, ".agentrack", "index.json"), "utf-8"));
    expect(index.childrenOf[oldParentId]).toBeUndefined();
    expect(index.childrenOf[newParentId]).toEqual([childId]);
  });

  test("detach child with --parentId null", async () => {
    const parentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Parent"], testDir)).stdout,
    ));
    const childId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Child", "--parentId", parentId], testDir)).stdout,
    ));

    await runAgt(["update", childId, "--parentId", "null"], testDir);

    const viewResult = await runAgt(["view", childId], testDir);
    const child = parseJson<Record<string, unknown>>(viewResult.stdout);
    expect(child.parentId).toBeNull();

    // Verify childrenOf updated
    const index = JSON.parse(readFileSync(join(testDir, ".agentrack", "index.json"), "utf-8"));
    expect(index.childrenOf[parentId]).toBeUndefined();
  });

  test("reparent to closed parent fails", async () => {
    const oldParentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Old Parent"], testDir)).stdout,
    ));
    const newParentId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "New Parent", "--status", "closed"], testDir)).stdout,
    ));
    const childId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Child", "--parentId", oldParentId], testDir)).stdout,
    ));

    const result = await runAgt(["update", childId, "--parentId", newParentId], testDir);
    assertError(result, "HIERARCHY_CONSTRAINT", 12);
  });
});
