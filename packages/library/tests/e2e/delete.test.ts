/**
 * E2E: delete — Type B tests (tracker operations)
 *
 * Tests the `agt delete <issueId>` CLI command through the actual binary.
 * Covers simple delete, cascade delete, blockages cleanup, mentions cleanup,
 * error handling, and post-delete verification.
 */
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertError,
  assertSuccess,
  ensureE2EWorktree,
  extractId,
  parseJson,
  resetWorktreeData,
  runAgt,
} from "./setup";

describe("E2E: delete", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  // ─── Basic delete ─────────────────────────────────────────────────────

  test("deletes a simple issue and returns deletedIds", async () => {
    const id = extractId(await runAgt(["create", "To Delete"]));

    const result = await runAgt(["delete", id]);

    assertSuccess(result);
    const parsed = parseJson(result.stdout);
    expect(parsed.result).toBe("OK");
    expect(parsed.deletedIds).toHaveLength(1);
    expect(parsed.deletedIds[0]).toBe(id);
  });

  test("after delete, list no longer shows the issue", async () => {
    const id = extractId(await runAgt(["create", "To Delete"]));
    await runAgt(["create", "Keep"]);

    await runAgt(["delete", id]);

    const listResult = await runAgt(["list"]);
    const list = parseJson(listResult.stdout);
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Keep");
  });

  test("delete non-existent issue returns NOT_FOUND", async () => {
    const result = await runAgt(["delete", "nonexistent"]);

    assertError(result, "NOT_FOUND");
  });

  // ─── Cascade delete ───────────────────────────────────────────────────

  test("deletes issue with children — cascade", async () => {
    const parentId = extractId(await runAgt(["create", "Parent"]));
    const child1Id = extractId(
      await runAgt(["create", "Child 1", "--parentId", parentId]),
    );
    const child2Id = extractId(
      await runAgt(["create", "Child 2", "--parentId", parentId]),
    );

    const result = await runAgt(["delete", parentId]);

    assertSuccess(result);
    const parsed = parseJson(result.stdout);
    expect(parsed.deletedIds).toHaveLength(3);
    expect(parsed.deletedIds).toContain(child1Id);
    expect(parsed.deletedIds).toContain(child2Id);
    expect(parsed.deletedIds).toContain(parentId);
    // Target should be last
    expect(parsed.deletedIds[parsed.deletedIds.length - 1]).toBe(parentId);
  });

  test("deletes issue with grandchildren — depth-first cascade", async () => {
    const gpId = extractId(await runAgt(["create", "Grandparent"]));
    const parentId = extractId(
      await runAgt(["create", "Parent", "--parentId", gpId]),
    );
    const childId = extractId(
      await runAgt(["create", "Child", "--parentId", parentId]),
    );

    const result = await runAgt(["delete", gpId]);

    assertSuccess(result);
    const parsed = parseJson(result.stdout);
    expect(parsed.deletedIds).toHaveLength(3);
    // Depth-first: child (leaf) first, then parent, then grandparent
    expect(parsed.deletedIds[0]).toBe(childId);
    expect(parsed.deletedIds[1]).toBe(parentId);
    expect(parsed.deletedIds[2]).toBe(gpId);
  });

  test("after cascade delete, children are gone from list", async () => {
    const parentId = extractId(await runAgt(["create", "Parent"]));
    extractId(await runAgt(["create", "Child", "--parentId", parentId]));

    await runAgt(["delete", parentId]);

    const list = parseJson((await runAgt(["list"])).stdout);
    expect(list).toHaveLength(0);
  });

  test("deleting a child does not delete the parent", async () => {
    const parentId = extractId(await runAgt(["create", "Parent"]));
    const childId = extractId(
      await runAgt(["create", "Child", "--parentId", parentId]),
    );

    const result = await runAgt(["delete", childId]);

    assertSuccess(result);
    const parsed = parseJson(result.stdout);
    expect(parsed.deletedIds).toHaveLength(1);
    expect(parsed.deletedIds[0]).toBe(childId);

    // Parent still exists
    const list = parseJson((await runAgt(["list"])).stdout);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(parentId);
  });

  // ─── Blockages cleanup ────────────────────────────────────────────────

  test("delete removes blockages where issue was blocked", async () => {
    const blockedId = extractId(await runAgt(["create", "Blocked"]));
    const blockerId = extractId(await runAgt(["create", "Blocker"]));

    await runAgt(["blockages", "add", blockedId, "--by", blockerId]);

    // Delete the blocked issue
    await runAgt(["delete", blockedId]);

    // Blocker's blocks list should be clean
    const blockages = parseJson(
      (await runAgt(["blockages", "list", blockerId])).stdout,
    );
    expect(blockages.blocks).toHaveLength(0);
    expect(blockages.blockedBy).toHaveLength(0);
  });

  test("delete removes blockages where issue was a blocker", async () => {
    const blockedId = extractId(await runAgt(["create", "Blocked"]));
    const blockerId = extractId(await runAgt(["create", "Blocker"]));

    await runAgt(["blockages", "add", blockedId, "--by", blockerId]);

    // Delete the blocker issue
    await runAgt(["delete", blockerId]);

    // Blocked issue's blockedBy list should be clean
    const blockages = parseJson(
      (await runAgt(["blockages", "list", blockedId])).stdout,
    );
    expect(blockages.blockedBy).toHaveLength(0);
    expect(blockages.blocks).toHaveLength(0);
  });

  // ─── Mentions cleanup ─────────────────────────────────────────────────

  test("delete removes mentions referencing the deleted issue", async () => {
    // Register users first
    await runAgt(["users", "register", "alice"]);
    await runAgt(["users", "register", "bob"]);

    const issue1Id = extractId(await runAgt(["create", "Issue 1"]));
    const issue2Id = extractId(await runAgt(["create", "Issue 2"]));

    // Mention alice on issue1
    await runAgt([
      "comments",
      "add",
      issue1Id,
      "--content",
      "@alice please review",
    ]);
    // Mention alice on issue2 (should survive)
    await runAgt([
      "comments",
      "add",
      issue2Id,
      "--content",
      "@alice also check this",
    ]);

    // Delete issue1
    await runAgt(["delete", issue1Id]);

    // Check alice's mentions — should only have issue2's mention
    const mentions = parseJson(
      (await runAgt(["mentions", "list", "alice", "--include-reads"])).stdout,
    );
    expect(mentions).toHaveLength(1);
    expect(mentions[0].issueId).toBe(issue2Id);
  });

  // ─── Status variants ──────────────────────────────────────────────────

  test("delete works on closed issues", async () => {
    const id = extractId(await runAgt(["create", "Done Issue"]));
    await runAgt(["update", id, "--status", "done"]);
    await runAgt(["update", id, "--status", "closed"]);

    const result = await runAgt(["delete", id]);

    assertSuccess(result);
    const list = parseJson((await runAgt(["list", "--status", "closed"])).stdout);
    expect(list).toHaveLength(0);
  });

  test("delete works on issues in any status", async () => {
    const statuses = [
      { create: "idea", updates: [] },
      { create: "todo", updates: [] },
      { create: "in-progress", updates: [] },
    ];

    for (const s of statuses) {
      const id = extractId(await runAgt(["create", `${s.create} issue`, "--status", s.create]));

      const result = await runAgt(["delete", id]);
      assertSuccess(result);
    }

    const list = parseJson((await runAgt(["list"])).stdout);
    expect(list).toHaveLength(0);
  });

  // ─── Multiple deletes ─────────────────────────────────────────────────

  test("can delete multiple issues sequentially", async () => {
    const id1 = extractId(await runAgt(["create", "Issue 1"]));
    const id2 = extractId(await runAgt(["create", "Issue 2"]));

    await runAgt(["delete", id1]);
    await runAgt(["delete", id2]);

    const list = parseJson((await runAgt(["list"])).stdout);
    expect(list).toHaveLength(0);
  });

  // ─── Edge cases ───────────────────────────────────────────────────────

  test("delete with cascade cleans up all child event files", async () => {
    const parentId = extractId(await runAgt(["create", "Parent"]));
    const childId = extractId(
      await runAgt(["create", "Child", "--parentId", parentId]),
    );

    // Verify child file exists
    const childView = parseJson((await runAgt(["view", childId])).stdout);
    expect(childView.id).toBe(childId);

    await runAgt(["delete", parentId]);

    // Both issues should be gone from view
    const viewResult = await runAgt(["view", parentId]);
    assertError(viewResult, "NOT_FOUND");

    const childViewResult = await runAgt(["view", childId]);
    assertError(childViewResult, "NOT_FOUND");
  });
});
