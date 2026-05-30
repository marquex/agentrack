/**
 * Integration tests for Tracker.issueDelete()
 *
 * Tests hard delete of issues with cascade behavior, blockage cleanup,
 * mentions cleanup, and various edge cases.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentrackError } from "../../../src/core/errors";
import { Tracker } from "../../../src/core/tracker";

describe("Tracker issueDelete()", () => {
  let testDir: string;
  let tracker: Tracker;

  beforeEach(async () => {
    testDir = join(
      tmpdir(),
      `agentrack-delete-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    tracker = new Tracker(testDir);
    await tracker.init();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // ─── Basic delete ─────────────────────────────────────────────────────

  test("deletes a simple issue with no children", async () => {
    const { id } = await tracker.create({ title: "To Delete" });
    const result = await tracker.issueDelete(id!);

    expect(result.result).toBe("OK");
    if (result.result === "OK") {
      expect(result.deletedIds).toHaveLength(1);
      expect(result.deletedIds[0]).toBe(id);
    }
  });

  test("removes the issue from the index after delete", async () => {
    const { id } = await tracker.create({ title: "To Delete" });
    await tracker.issueDelete(id!);

    const list = await tracker.list();
    expect(list).toHaveLength(0);
  });

  test("removes the event file from disk", async () => {
    const { id } = await tracker.create({ title: "To Delete" });
    const issuePath = join(testDir, ".agentrack", "issues", `${id}.json`);
    expect(existsSync(issuePath)).toBe(true);

    await tracker.issueDelete(id!);

    expect(existsSync(issuePath)).toBe(false);
  });

  test("throws NOT_FOUND for non-existent issue", async () => {
    try {
      await tracker.issueDelete("nonexistent");
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AgentrackError);
      expect((err as AgentrackError).result).toBe("NOT_FOUND");
      expect((err as AgentrackError).message).toContain("nonexistent");
    }
  });

  // ─── Cascade delete (children) ────────────────────────────────────────

  test("cascades delete to children", async () => {
    const parent = await tracker.create({ title: "Parent" });
    const child1 = await tracker.create({ title: "Child 1", parentId: parent.id });
    const child2 = await tracker.create({ title: "Child 2", parentId: parent.id });

    const result = await tracker.issueDelete(parent.id!);

    expect(result.result).toBe("OK");
    if (result.result === "OK") {
      // Children first, then parent
      expect(result.deletedIds).toHaveLength(3);
      expect(result.deletedIds).toContain(child1.id);
      expect(result.deletedIds).toContain(child2.id);
      expect(result.deletedIds).toContain(parent.id);
      // Parent should be last
      expect(result.deletedIds[result.deletedIds.length - 1]).toBe(parent.id);
    }
  });

  test("cascades delete depth-first (grandchildren)", async () => {
    const grandparent = await tracker.create({ title: "Grandparent" });
    const parent = await tracker.create({ title: "Parent", parentId: grandparent.id });
    const child = await tracker.create({ title: "Child", parentId: parent.id });

    const result = await tracker.issueDelete(grandparent.id!);

    expect(result.result).toBe("OK");
    if (result.result === "OK") {
      expect(result.deletedIds).toHaveLength(3);
      // Depth-first: child first, then parent, then grandparent
      expect(result.deletedIds[0]).toBe(child.id);
      expect(result.deletedIds[1]).toBe(parent.id);
      expect(result.deletedIds[2]).toBe(grandparent.id);
    }
  });

  test("removes childrenOf map entries after cascade", async () => {
    const parent = await tracker.create({ title: "Parent" });
    await tracker.create({ title: "Child", parentId: parent.id });

    await tracker.issueDelete(parent.id!);

    const index = JSON.parse(
      readFileSync(join(testDir, ".agentrack", "index.json"), "utf-8"),
    );
    expect(index.childrenOf[parent.id]).toBeUndefined();
  });

  test("removes parentId reference from parent when deleting a child directly", async () => {
    const parent = await tracker.create({ title: "Parent" });
    const child = await tracker.create({ title: "Child", parentId: parent.id });

    // Delete just the child
    const result = await tracker.issueDelete(child.id!);

    expect(result.result).toBe("OK");
    if (result.result === "OK") {
      expect(result.deletedIds).toHaveLength(1);
      expect(result.deletedIds[0]).toBe(child.id);
    }

    // Parent should still exist but no longer have children
    const list = await tracker.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(parent.id);

    const index = JSON.parse(
      readFileSync(join(testDir, ".agentrack", "index.json"), "utf-8"),
    );
    expect(index.childrenOf[parent.id]).toBeUndefined();
  });

  // ─── Blockages cleanup ────────────────────────────────────────────────

  test("removes blockages where deleted issue was blocked", async () => {
    const issue1 = await tracker.create({ title: "Issue 1" });
    const issue2 = await tracker.create({ title: "Issue 2" });

    // issue1 is blocked by issue2
    await tracker.blockagesAdd(issue1.id!, { blockerIds: [issue2.id!] });

    // Delete issue1 (the blocked one)
    await tracker.issueDelete(issue1.id!);

    // Verify dependencies are clean
    const deps = JSON.parse(
      readFileSync(join(testDir, ".agentrack", "dependencies.json"), "utf-8"),
    );
    expect(deps.blockedBy[issue1.id]).toBeUndefined();
    expect(deps.blocks[issue2.id]).toBeUndefined();
  });

  test("removes blockages where deleted issue was a blocker", async () => {
    const issue1 = await tracker.create({ title: "Issue 1" });
    const issue2 = await tracker.create({ title: "Issue 2" });

    // issue1 is blocked by issue2
    await tracker.blockagesAdd(issue1.id!, { blockerIds: [issue2.id!] });

    // Delete issue2 (the blocker)
    await tracker.issueDelete(issue2.id!);

    // Verify dependencies are clean
    const deps = JSON.parse(
      readFileSync(join(testDir, ".agentrack", "dependencies.json"), "utf-8"),
    );
    expect(deps.blockedBy[issue1.id]).toBeUndefined();
    expect(deps.blocks[issue2.id]).toBeUndefined();

    // issue1 still exists
    const list = await tracker.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(issue1.id);
  });

  test("removes blockages in both directions for the same issue", async () => {
    const issue1 = await tracker.create({ title: "Issue 1" });
    const issue2 = await tracker.create({ title: "Issue 2" });
    const issue3 = await tracker.create({ title: "Issue 3" });

    // issue1 blocked by issue2 AND issue1 blocks issue3
    await tracker.blockagesAdd(issue1.id!, { blockerIds: [issue2.id!] });
    await tracker.blockagesAdd(issue3.id!, { blockerIds: [issue1.id!] });

    await tracker.issueDelete(issue1.id!);

    const deps = JSON.parse(
      readFileSync(join(testDir, ".agentrack", "dependencies.json"), "utf-8"),
    );
    // All references to issue1 should be gone
    expect(deps.blockedBy[issue1.id]).toBeUndefined();
    expect(deps.blocks[issue1.id]).toBeUndefined();
    expect(deps.blocks[issue2.id]).toBeUndefined();
    expect(deps.blockedBy[issue3.id]).toBeUndefined();
  });

  test("preserves unrelated blockages during delete", async () => {
    const toDelete = await tracker.create({ title: "Delete Me" });
    const other1 = await tracker.create({ title: "Other 1" });
    const other2 = await tracker.create({ title: "Other 2" });

    // Unrelated blockage: other1 blocked by other2
    await tracker.blockagesAdd(other1.id!, { blockerIds: [other2.id!] });

    await tracker.issueDelete(toDelete.id!);

    const deps = JSON.parse(
      readFileSync(join(testDir, ".agentrack", "dependencies.json"), "utf-8"),
    );
    // Unrelated blockage preserved
    expect(deps.blockedBy[other1.id]).toHaveLength(1);
    expect(deps.blocks[other2.id]).toHaveLength(1);
  });

  // ─── Mentions cleanup ─────────────────────────────────────────────────

  test("removes mentions referencing the deleted issue", async () => {
    // Register a user so mentions work
    await tracker.usersRegister("alice");
    await tracker.usersRegister("bob");

    const issue1 = await tracker.create({ title: "Issue 1" });
    const issue2 = await tracker.create({ title: "Issue 2" });

    // Add a comment mentioning alice on issue1
    await tracker.commentsAdd(issue1.id!, {
      content: "@alice please review",
      author: "bob",
    });
    // Add a comment mentioning alice on issue2 (should survive)
    await tracker.commentsAdd(issue2.id!, {
      content: "@alice also check this",
      author: "bob",
    });

    // Delete issue1
    await tracker.issueDelete(issue1.id!);

    // Mentions for issue1 should be gone, issue2's mention preserved
    const mentions = await tracker.mentionsList("alice", { includeReads: true });
    expect(mentions).toHaveLength(1);
    if ("mentionedBy" in mentions[0]!) {
      expect(mentions[0]!.issueId).toBe(issue2.id);
    }
  });

  // ─── Status variants ──────────────────────────────────────────────────

  test("deletes issues in closed status", async () => {
    const { id } = await tracker.create({ title: "Closed Issue", status: "done" });
    // Move to closed
    await tracker.update(id!, { status: "closed" });

    const result = await tracker.issueDelete(id!);

    expect(result.result).toBe("OK");
    const list = await tracker.list();
    expect(list).toHaveLength(0);
  });

  test("deletes issues in any status", async () => {
    const statuses = ["idea", "todo", "in-progress", "done"] as const;

    for (const status of statuses) {
      const { id } = await tracker.create({ title: `${status} issue`, status });

      const result = await tracker.issueDelete(id!);

      expect(result.result).toBe("OK");
    }

    const list = await tracker.list();
    expect(list).toHaveLength(0);
  });

  // ─── Post-delete verification ─────────────────────────────────────────

  test("after delete, list no longer shows the issue", async () => {
    const { id } = await tracker.create({ title: "To Delete" });
    await tracker.create({ title: "Keep" });

    await tracker.issueDelete(id!);

    const list = await tracker.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe("Keep");
  });

  test("after cascade delete, children are also gone from list", async () => {
    const parent = await tracker.create({ title: "Parent" });
    await tracker.create({ title: "Child", parentId: parent.id });
    await tracker.create({ title: "Unrelated" });

    await tracker.issueDelete(parent.id!);

    const list = await tracker.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe("Unrelated");

    // Children of deleted parent also gone
    const children = await tracker.list({ parentId: parent.id });
    expect(children).toHaveLength(0);
  });

  test("after delete, blockages list is clean", async () => {
    const issue1 = await tracker.create({ title: "Issue 1" });
    const issue2 = await tracker.create({ title: "Issue 2" });

    await tracker.blockagesAdd(issue1.id!, { blockerIds: [issue2.id!] });
    await tracker.issueDelete(issue1.id!);

    // issue2's blockages list should be empty
    const blockages = await tracker.blockagesList(issue2.id!);
    expect(blockages.blocks).toHaveLength(0);
  });

  // ─── deletedIds order verification ────────────────────────────────────

  test("deletedIds has correct order: children first, target last", async () => {
    const root = await tracker.create({ title: "Root" });
    const child1 = await tracker.create({ title: "Child 1", parentId: root.id });
    const child2 = await tracker.create({ title: "Child 2", parentId: root.id });
    const grandchild = await tracker.create({ title: "Grandchild", parentId: child1.id });

    const result = await tracker.issueDelete(root.id!);

    expect(result.result).toBe("OK");
    if (result.result === "OK") {
      expect(result.deletedIds).toHaveLength(4);
      // Depth-first: grandchild first (leaf), then child1, then child2, then root
      expect(result.deletedIds[0]).toBe(grandchild.id);
      expect(result.deletedIds[1]).toBe(child1.id);
      expect(result.deletedIds[2]).toBe(child2.id);
      expect(result.deletedIds[3]).toBe(root.id);
    }
  });

  // ─── Multiple deletes ─────────────────────────────────────────────────

  test("can delete multiple issues sequentially", async () => {
    const issue1 = await tracker.create({ title: "Issue 1" });
    const issue2 = await tracker.create({ title: "Issue 2" });

    await tracker.issueDelete(issue1.id!);
    await tracker.issueDelete(issue2.id!);

    const list = await tracker.list();
    expect(list).toHaveLength(0);
  });
});
