import { describe, expect, test } from "bun:test";
import type { DependenciesFile } from "../../src/types";
import {
  addBlockage,
  deleteBlockage,
  detectCycle,
  getImpactScore,
  removeAllBlockagesForIssue,
  resolveBlockage,
} from "../../src/core/dependency-manager";

const EMPTY_DEPS: DependenciesFile = { blockedBy: {}, blocks: {} };

describe("dependency-manager", () => {
  describe("addBlockage", () => {
    test("adds entry to both maps with active status", () => {
      const result = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");

      // blockedBy["issue0001"] should have entry
      expect(result.blockedBy["issue0001"]).toHaveLength(1);
      expect(result.blockedBy["issue0001"]![0]).toEqual({
        blockerId: "issue0002",
        blockedId: "issue0001",
        status: "active",
      });

      // blocks["issue0002"] should have entry
      expect(result.blocks["issue0002"]).toHaveLength(1);
      expect(result.blocks["issue0002"]![0]).toEqual({
        blockerId: "issue0002",
        blockedId: "issue0001",
        status: "active",
      });
    });

    test("idempotency: adding same blockage twice does not duplicate", () => {
      const step1 = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      const step2 = addBlockage(step1, "issue0001", "issue0002");

      expect(step2.blockedBy["issue0001"]).toHaveLength(1);
      expect(step2.blocks["issue0002"]).toHaveLength(1);
    });

    test("does not mutate the original", () => {
      const original = { blockedBy: {}, blocks: {} };
      addBlockage(original, "issue0001", "issue0002");

      expect(original.blockedBy).toEqual({});
      expect(original.blocks).toEqual({});
    });
  });

  describe("resolveBlockage", () => {
    test("marks as resolved in both maps", () => {
      const added = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      const resolved = resolveBlockage(added, "issue0001", "issue0002");

      expect(resolved.blockedBy["issue0001"]![0]!.status).toBe("resolved");
      expect(resolved.blocks["issue0002"]![0]!.status).toBe("resolved");
    });

    test("on non-existent entry: no error, no-op", () => {
      const result = resolveBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      // Should not crash, and maps should remain empty
      expect(result.blockedBy["issue0001"]).toBeUndefined();
      expect(result.blocks["issue0002"]).toBeUndefined();
    });

    test("already resolved entry stays resolved", () => {
      const added = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      const resolved1 = resolveBlockage(added, "issue0001", "issue0002");
      const resolved2 = resolveBlockage(resolved1, "issue0001", "issue0002");

      expect(resolved2.blockedBy["issue0001"]![0]!.status).toBe("resolved");
    });
  });

  describe("deleteBlockage", () => {
    test("removes entry from both maps", () => {
      const added = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      const deleted = deleteBlockage(added, "issue0001", "issue0002");

      expect(deleted.blockedBy["issue0001"]).toBeUndefined();
      expect(deleted.blocks["issue0002"]).toBeUndefined();
    });

    test("on non-existent entry: no error, no-op", () => {
      const result = deleteBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      expect(result.blockedBy).toEqual({});
      expect(result.blocks).toEqual({});
    });

    test("removes only the matching entry, not others (blockedBy)", () => {
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      deps = addBlockage(deps, "issue0001", "issue0003");

      const deleted = deleteBlockage(deps, "issue0001", "issue0002");

      // issue0002 should be removed from blockedBy["issue0001"]
      expect(deleted.blockedBy["issue0001"]).toHaveLength(1);
      expect(deleted.blockedBy["issue0001"]![0]!.blockerId).toBe("issue0003");

      // issue0002 should be gone from blocks, issue0003 should remain
      expect(deleted.blocks["issue0002"]).toBeUndefined();
      expect(deleted.blocks["issue0003"]).toHaveLength(1);
    });

    test("removes only the matching entry from blocks map (blocker blocks multiple issues)", () => {
      // blocker01 blocks both issue0001 and issue0002
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "blocker01");
      deps = addBlockage(deps, "issue0002", "blocker01");

      // Delete only issue0001's blockage from blocker01
      const deleted = deleteBlockage(deps, "issue0001", "blocker01");

      // blockedBy["issue0001"] should be gone entirely
      expect(deleted.blockedBy["issue0001"]).toBeUndefined();

      // blockedBy["issue0002"] should still have the entry
      expect(deleted.blockedBy["issue0002"]).toHaveLength(1);
      expect(deleted.blockedBy["issue0002"]![0]!.blockerId).toBe("blocker01");

      // blocks["blocker01"] should still have issue0002 but not issue0001
      expect(deleted.blocks["blocker01"]).toHaveLength(1);
      expect(deleted.blocks["blocker01"]![0]!.blockedId).toBe("issue0002");
    });
  });

  describe("getImpactScore", () => {
    test("returns count of active blocks entries", () => {
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "blocker01");
      deps = addBlockage(deps, "issue0002", "blocker01");
      deps = addBlockage(deps, "issue0003", "blocker01");

      // blocker01 blocks 3 issues → impact score = 3
      expect(getImpactScore(deps, "blocker01")).toBe(3);
    });

    test("for issue with no blocks: returns 0", () => {
      expect(getImpactScore(EMPTY_DEPS, "issue0001")).toBe(0);
    });

    test("ignores resolved entries", () => {
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "blocker01");
      deps = addBlockage(deps, "issue0002", "blocker01");
      deps = resolveBlockage(deps, "issue0001", "blocker01");

      // Only issue0002 is still active
      expect(getImpactScore(deps, "blocker01")).toBe(1);
    });
  });

  describe("detectCycle", () => {
    test("direct cycle: A blocks B, B blocks A → detected", () => {
      // issue0001 is blocked by issue0002
      const deps = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      // Now check if adding issue0002 blocked by issue0001 would be a cycle
      expect(detectCycle(deps, "issue0002", "issue0001")).toBe(true);
    });

    test("transitive cycle: A blocks B, B blocks C, C blocks A → detected", () => {
      // A blocked by B, B blocked by C
      const step1 = addBlockage(EMPTY_DEPS, "issueA0000", "issueB0000");
      const deps = addBlockage(step1, "issueB0000", "issueC0000");
      // Would adding C blocked by A be a cycle?
      // Walk from A through blockedBy: A → B → C, then check if C blockedBy reaches A
      // Actually: detectCycle(deps, blockedId=C, blockerId=A)
      // Walk blockedBy from A: blockedBy[A] has B (active), walk to B, blockedBy[B] has C (active), walk to C
      // Check: does C === C (blockedId)? Yes → cycle!
      expect(detectCycle(deps, "issueC0000", "issueA0000")).toBe(true);
    });

    test("no cycle: A blocks B, C blocks D → not detected", () => {
      const step1 = addBlockage(EMPTY_DEPS, "issueA0000", "issueB0000");
      const deps = addBlockage(step1, "issueC0000", "issueD0000");

      // Would adding D blocked by B be a cycle?
      // Walk from B through blockedBy: blockedBy[B] → undefined → no cycle
      expect(detectCycle(deps, "issueD0000", "issueB0000")).toBe(false);
    });

    test("ignores resolved entries", () => {
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      deps = resolveBlockage(deps, "issue0001", "issue0002");

      // Resolved, so no cycle should be detected
      expect(detectCycle(deps, "issue0002", "issue0001")).toBe(false);
    });

    test("self-block: A blocks A → detected", () => {
      const deps = addBlockage(EMPTY_DEPS, "issue0001", "issue0001");
      // Adding issue0001 blocked by issue0001 would be detected by detectCycle
      // blockedId=issue0001, blockerId=issue0001
      // Walk from issue0001: current=issue0001, check if === blockedId(issue0001) → true → cycle!
      expect(detectCycle(deps, "issue0001", "issue0001")).toBe(true);
    });

    test("no cycle with same blocker used by multiple issues", () => {
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "blocker01");
      deps = addBlockage(deps, "issue0002", "blocker01");

      // Would adding blocker01 blocked by issue0003 be a cycle?
      // Walk from issue0003 through blockedBy: blockedBy[issue0003] → undefined → no cycle
      expect(detectCycle(deps, "blocker01", "issue0003")).toBe(false);
    });
  });

  describe("removeAllBlockagesForIssue", () => {
    test("removes blockedBy entries and their counterparts in blocks", () => {
      // issue0001 is blocked by issue0002
      const deps = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");

      const result = removeAllBlockagesForIssue(deps, "issue0001");

      // blockedBy["issue0001"] should be gone
      expect(result.blockedBy["issue0001"]).toBeUndefined();
      // blocks["issue0002"] should be gone (counterpart cleaned up)
      expect(result.blocks["issue0002"]).toBeUndefined();
    });

    test("removes blocks entries and their counterparts in blockedBy", () => {
      // issue0002 blocks issue0001
      const deps = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");

      // Remove issue0002 (the blocker) from all blockages
      const result = removeAllBlockagesForIssue(deps, "issue0002");

      // blocks["issue0002"] should be gone
      expect(result.blocks["issue0002"]).toBeUndefined();
      // blockedBy["issue0001"] should be gone (counterpart cleaned up)
      expect(result.blockedBy["issue0001"]).toBeUndefined();
    });

    test("removes blockages in both directions for the same issue", () => {
      // issue0001 is blocked by issue0002 AND issue0001 blocks issue0003
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      deps = addBlockage(deps, "issue0003", "issue0001");

      const result = removeAllBlockagesForIssue(deps, "issue0001");

      // blockedBy["issue0001"] gone (was blocked by issue0002)
      expect(result.blockedBy["issue0001"]).toBeUndefined();
      // blocks["issue0001"] gone (was blocking issue0003)
      expect(result.blocks["issue0001"]).toBeUndefined();
      // Counterparts also cleaned
      expect(result.blocks["issue0002"]).toBeUndefined();
      expect(result.blockedBy["issue0003"]).toBeUndefined();
    });

    test("preserves unrelated blockages", () => {
      // issue0001 blocked by issue0002
      // issue0003 blocked by issue0004 (unrelated)
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      deps = addBlockage(deps, "issue0003", "issue0004");

      const result = removeAllBlockagesForIssue(deps, "issue0001");

      // issue0001 blockages removed
      expect(result.blockedBy["issue0001"]).toBeUndefined();
      expect(result.blocks["issue0002"]).toBeUndefined();
      // issue0003/issue0004 blockages preserved
      expect(result.blockedBy["issue0003"]).toHaveLength(1);
      expect(result.blocks["issue0004"]).toHaveLength(1);
    });

    test("no-op for issue with no blockages", () => {
      const result = removeAllBlockagesForIssue(EMPTY_DEPS, "nonexistent");

      expect(result.blockedBy).toEqual({});
      expect(result.blocks).toEqual({});
    });

    test("removes multiple blockedBy entries", () => {
      // issue0001 is blocked by issue0002, issue0003, issue0004
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      deps = addBlockage(deps, "issue0001", "issue0003");
      deps = addBlockage(deps, "issue0001", "issue0004");

      const result = removeAllBlockagesForIssue(deps, "issue0001");

      expect(result.blockedBy["issue0001"]).toBeUndefined();
      // All counterpart blocks entries cleaned
      expect(result.blocks["issue0002"]).toBeUndefined();
      expect(result.blocks["issue0003"]).toBeUndefined();
      expect(result.blocks["issue0004"]).toBeUndefined();
    });

    test("removes multiple blocks entries (issue blocks multiple others)", () => {
      // blocker01 blocks issue0001, issue0002, issue0003
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "blocker01");
      deps = addBlockage(deps, "issue0002", "blocker01");
      deps = addBlockage(deps, "issue0003", "blocker01");

      const result = removeAllBlockagesForIssue(deps, "blocker01");

      expect(result.blocks["blocker01"]).toBeUndefined();
      // All counterpart blockedBy entries cleaned
      expect(result.blockedBy["issue0001"]).toBeUndefined();
      expect(result.blockedBy["issue0002"]).toBeUndefined();
      expect(result.blockedBy["issue0003"]).toBeUndefined();
    });

    test("cleans up empty arrays after removal", () => {
      // blocker01 blocks issue0001 and issue0002
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "blocker01");
      deps = addBlockage(deps, "issue0002", "blocker01");

      // Remove issue0001's blockage — blocker01 still has issue0002
      deps = removeAllBlockagesForIssue(deps, "issue0001");

      // blocks["blocker01"] should still have issue0002
      expect(deps.blocks["blocker01"]).toHaveLength(1);

      // Now remove issue0002 — blocker01's blocks should be fully gone
      const result = removeAllBlockagesForIssue(deps, "issue0002");
      expect(result.blocks["blocker01"]).toBeUndefined();
    });

    test("preserves other blockers on a shared blocked issue (else branch)", () => {
      // issue0001 is blocked by BOTH blocker01 AND blocker02
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "blocker01");
      deps = addBlockage(deps, "issue0001", "blocker02");

      // Remove blocker01 — issue0001 is still blocked by blocker02
      const result = removeAllBlockagesForIssue(deps, "blocker01");

      // blocker01's blocks key is gone
      expect(result.blocks["blocker01"]).toBeUndefined();
      // issue0001 still has blocker02 in blockedBy
      expect(result.blockedBy["issue0001"]).toHaveLength(1);
      expect(result.blockedBy["issue0001"]![0]!.blockerId).toBe("blocker02");
    });

    test("preserves other blocked issues on a shared blocker (else branch)", () => {
      // blocker01 blocks BOTH issue0001 AND issue0002
      let deps = addBlockage(EMPTY_DEPS, "issue0001", "blocker01");
      deps = addBlockage(deps, "issue0002", "blocker01");

      // Remove issue0001 — blocker01 still blocks issue0002
      const result = removeAllBlockagesForIssue(deps, "issue0001");

      // issue0001's blockedBy is gone
      expect(result.blockedBy["issue0001"]).toBeUndefined();
      // blocker01 still has issue0002 in blocks
      expect(result.blocks["blocker01"]).toHaveLength(1);
      expect(result.blocks["blocker01"]![0]!.blockedId).toBe("issue0002");
    });

    test("cleans up pre-existing empty arrays in blockedBy", () => {
      const deps = {
        blockedBy: { emptykey: [] as Array<{ blockerId: string; blockedId: string }> },
        blocks: {},
      };

      const result = removeAllBlockagesForIssue(deps, "unrelated");

      expect(result.blockedBy["emptykey"]).toBeUndefined();
    });

    test("cleans up pre-existing empty arrays in blocks", () => {
      const deps = {
        blockedBy: {},
        blocks: { emptykey: [] as Array<{ blockerId: string; blockedId: string }> },
      };

      const result = removeAllBlockagesForIssue(deps, "unrelated");

      expect(result.blocks["emptykey"]).toBeUndefined();
    });

    test("does not mutate the original", () => {
      const deps = addBlockage(EMPTY_DEPS, "issue0001", "issue0002");
      const originalBlockedBy = { ...deps.blockedBy };
      const originalBlocks = { ...deps.blocks };

      removeAllBlockagesForIssue(deps, "issue0001");

      expect(deps.blockedBy).toEqual(originalBlockedBy);
      expect(deps.blocks).toEqual(originalBlocks);
    });
  });
});
