/**
 * E2E: delete — Type B tests (tracker operations)
 *
 * Tests the `agt delete <issueId>` CLI command through the actual binary.
 * Covers simple delete, cascade delete, blockages cleanup, mentions cleanup,
 * error handling, and post-delete verification.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertError,
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

describe("E2E: delete", () => {
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

  // ─── Basic delete ─────────────────────────────────────────────────────

  test("deletes a simple issue and returns deletedIds", async () => {
    const id = extractId(await runAgt(["create", "To Delete"], dir));

    const result = await runAgt(["delete", id], dir);

    assertSuccess(result);
    const parsed = parseJson(result.stdout);
    expect(parsed.result).toBe("OK");
    expect(parsed.deletedIds).toHaveLength(1);
    expect(parsed.deletedIds[0]).toBe(id);
  });

  test("after delete, list no longer shows the issue", async () => {
    const id = extractId(await runAgt(["create", "To Delete"], dir));
    await runAgt(["create", "Keep"], dir);

    await runAgt(["delete", id], dir);

    const listResult = await runAgt(["list"], dir);
    const list = parseJson(listResult.stdout);
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Keep");
  });

  test("delete non-existent issue returns NOT_FOUND", async () => {
    const result = await runAgt(["delete", "nonexistent"], dir);

    assertError(result, "NOT_FOUND");
  });

  // ─── Cascade delete ───────────────────────────────────────────────────

  test("deletes issue with children — cascade", async () => {
    const parentId = extractId(await runAgt(["create", "Parent"], dir));
    const child1Id = extractId(
      await runAgt(["create", "Child 1", "--parentId", parentId], dir),
    );
    const child2Id = extractId(
      await runAgt(["create", "Child 2", "--parentId", parentId], dir),
    );

    const result = await runAgt(["delete", parentId], dir);

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
    const gpId = extractId(await runAgt(["create", "Grandparent"], dir));
    const parentId = extractId(
      await runAgt(["create", "Parent", "--parentId", gpId], dir),
    );
    const childId = extractId(
      await runAgt(["create", "Child", "--parentId", parentId], dir),
    );

    const result = await runAgt(["delete", gpId], dir);

    assertSuccess(result);
    const parsed = parseJson(result.stdout);
    expect(parsed.deletedIds).toHaveLength(3);
    // Depth-first: child (leaf) first, then parent, then grandparent
    expect(parsed.deletedIds[0]).toBe(childId);
    expect(parsed.deletedIds[1]).toBe(parentId);
    expect(parsed.deletedIds[2]).toBe(gpId);
  });

  test("after cascade delete, children are gone from list", async () => {
    const parentId = extractId(await runAgt(["create", "Parent"], dir));
    extractId(await runAgt(["create", "Child", "--parentId", parentId], dir));

    await runAgt(["delete", parentId], dir);

    const list = parseJson((await runAgt(["list"], dir)).stdout);
    expect(list).toHaveLength(0);
  });

  test("deleting a child does not delete the parent", async () => {
    const parentId = extractId(await runAgt(["create", "Parent"], dir));
    const childId = extractId(
      await runAgt(["create", "Child", "--parentId", parentId], dir),
    );

    const result = await runAgt(["delete", childId], dir);

    assertSuccess(result);
    const parsed = parseJson(result.stdout);
    expect(parsed.deletedIds).toHaveLength(1);
    expect(parsed.deletedIds[0]).toBe(childId);

    // Parent still exists
    const list = parseJson((await runAgt(["list"], dir)).stdout);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(parentId);
  });

  // ─── Blockages cleanup ────────────────────────────────────────────────

  test("delete removes blockages where issue was blocked", async () => {
    const blockedId = extractId(await runAgt(["create", "Blocked"], dir));
    const blockerId = extractId(await runAgt(["create", "Blocker"], dir));

    await runAgt(["blockages", "add", blockedId, "--by", blockerId], dir);

    // Delete the blocked issue
    await runAgt(["delete", blockedId], dir);

    // Blocker's blocks list should be clean
    const blockages = parseJson(
      (await runAgt(["blockages", "list", blockerId], dir)).stdout,
    );
    expect(blockages.blocks).toHaveLength(0);
    expect(blockages.blockedBy).toHaveLength(0);
  });

  test("delete removes blockages where issue was a blocker", async () => {
    const blockedId = extractId(await runAgt(["create", "Blocked"], dir));
    const blockerId = extractId(await runAgt(["create", "Blocker"], dir));

    await runAgt(["blockages", "add", blockedId, "--by", blockerId], dir);

    // Delete the blocker issue
    await runAgt(["delete", blockerId], dir);

    // Blocked issue's blockedBy list should be clean
    const blockages = parseJson(
      (await runAgt(["blockages", "list", blockedId], dir)).stdout,
    );
    expect(blockages.blockedBy).toHaveLength(0);
    expect(blockages.blocks).toHaveLength(0);
  });

  // ─── Mentions cleanup ─────────────────────────────────────────────────

  test("delete removes mentions referencing the deleted issue", async () => {
    // Register users first
    await runAgt(["users", "register", "alice"], dir);
    await runAgt(["users", "register", "bob"], dir);

    const issue1Id = extractId(await runAgt(["create", "Issue 1"], dir));
    const issue2Id = extractId(await runAgt(["create", "Issue 2"], dir));

    // Mention alice on issue1
    await runAgt(
      ["comments", "add", issue1Id, "--content", "@alice please review"],
      dir,
    );
    // Mention alice on issue2 (should survive)
    await runAgt(
      ["comments", "add", issue2Id, "--content", "@alice also check this"],
      dir,
    );

    // Delete issue1
    await runAgt(["delete", issue1Id], dir);

    // Check alice's mentions — should only have issue2's mention
    const mentions = parseJson(
      (await runAgt(["mentions", "list", "alice", "--include-reads"], dir))
        .stdout,
    );
    expect(mentions).toHaveLength(1);
    expect(mentions[0].issueId).toBe(issue2Id);
  });

  // ─── Status variants ──────────────────────────────────────────────────

  test("delete works on closed issues", async () => {
    const id = extractId(await runAgt(["create", "Done Issue"], dir));
    await runAgt(["update", id, "--status", "done"], dir);
    await runAgt(["update", id, "--status", "closed"], dir);

    const result = await runAgt(["delete", id], dir);

    assertSuccess(result);
    const list = parseJson((await runAgt(["list", "--status", "closed"], dir)).stdout);
    expect(list).toHaveLength(0);
  });

  test("delete works on issues in any status", async () => {
    const statuses = [
      { create: "idea", updates: [] },
      { create: "todo", updates: [] },
      { create: "in-progress", updates: [] },
    ];

    for (const s of statuses) {
      const id = extractId(
        await runAgt(["create", `${s.create} issue`, "--status", s.create], dir),
      );

      const result = await runAgt(["delete", id], dir);
      assertSuccess(result);
    }

    const list = parseJson((await runAgt(["list"], dir)).stdout);
    expect(list).toHaveLength(0);
  });

  // ─── Multiple deletes ─────────────────────────────────────────────────

  test("can delete multiple issues sequentially", async () => {
    const id1 = extractId(await runAgt(["create", "Issue 1"], dir));
    const id2 = extractId(await runAgt(["create", "Issue 2"], dir));

    await runAgt(["delete", id1], dir);
    await runAgt(["delete", id2], dir);

    const list = parseJson((await runAgt(["list"], dir)).stdout);
    expect(list).toHaveLength(0);
  });

  // ─── Edge cases ───────────────────────────────────────────────────────

  test("delete with cascade cleans up all child event files", async () => {
    const parentId = extractId(await runAgt(["create", "Parent"], dir));
    const childId = extractId(
      await runAgt(["create", "Child", "--parentId", parentId], dir),
    );

    // Verify child file exists
    const childView = parseJson((await runAgt(["view", childId], dir)).stdout);
    expect(childView.id).toBe(childId);

    await runAgt(["delete", parentId], dir);

    // Both issues should be gone from view
    const viewResult = await runAgt(["view", parentId], dir);
    assertError(viewResult, "NOT_FOUND");

    const childViewResult = await runAgt(["view", childId], dir);
    assertError(childViewResult, "NOT_FOUND");
  });
});
