/**
 * E2E: blockages — Type B tests (tracker operations)
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

describe("E2E: blockages", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  describe("blockages add", () => {
    test("adds a blockage and returns OK", async () => {
      const blockedId = extractId(await runAgt(["create", "Blocked"]));
      const blockerId = extractId(await runAgt(["create", "Blocker"]));

      const result = await runAgt([
        "blockages",
        "add",
        blockedId,
        "--by",
        blockerId,
      ]);

      assertSuccess(result);
    });

    test("adds multiple blockers at once", async () => {
      const blockedId = extractId(await runAgt(["create", "Blocked"]));
      const blocker1Id = extractId(await runAgt(["create", "Blocker 1"]));
      const blocker2Id = extractId(await runAgt(["create", "Blocker 2"]));

      const result = await runAgt([
        "blockages",
        "add",
        blockedId,
        "--by",
        blocker1Id,
        blocker2Id,
      ]);

      assertSuccess(result);
    });

    test("with cycle returns BLOCKAGE_CYCLE error", async () => {
      const aId = extractId(await runAgt(["create", "A"]));
      const bId = extractId(await runAgt(["create", "B"]));

      // A blocked by B
      await runAgt(["blockages", "add", aId, "--by", bId]);

      // Try B blocked by A -> cycle
      const result = await runAgt(["blockages", "add", bId, "--by", aId]);

      assertError(result, "BLOCKAGE_CYCLE", 11);
    });

    test("on non-existent issue returns NOT_FOUND", async () => {
      const blockerId = extractId(await runAgt(["create", "Blocker"]));

      const result = await runAgt([
        "blockages",
        "add",
        "missing12345",
        "--by",
        blockerId,
      ]);

      assertError(result, "NOT_FOUND", 5);
    });
  });

  describe("blockages resolve", () => {
    test("resolves a blockage and returns OK", async () => {
      const blockedId = extractId(await runAgt(["create", "Blocked"]));
      const blockerId = extractId(await runAgt(["create", "Blocker"]));

      await runAgt(["blockages", "add", blockedId, "--by", blockerId]);

      const result = await runAgt([
        "blockages",
        "resolve",
        blockedId,
        "--by",
        blockerId,
      ]);

      assertSuccess(result);
    });
  });

  describe("blockages delete", () => {
    test("deletes a blockage and returns OK", async () => {
      const blockedId = extractId(await runAgt(["create", "Blocked"]));
      const blockerId = extractId(await runAgt(["create", "Blocker"]));

      await runAgt(["blockages", "add", blockedId, "--by", blockerId]);

      const result = await runAgt([
        "blockages",
        "delete",
        blockedId,
        "--by",
        blockerId,
      ]);

      assertSuccess(result);
    });
  });

  describe("blockages list", () => {
    test("returns correct blockage info JSON", async () => {
      const blockedId = extractId(await runAgt(["create", "Blocked"]));
      const blockerId = extractId(await runAgt(["create", "Blocker"]));

      await runAgt(["blockages", "add", blockedId, "--by", blockerId]);

      const result = await runAgt(["blockages", "list", blockedId]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");

      const parsed = parseJson(result.stdout);
      expect(parsed.issueId).toBe(blockedId);
      expect(parsed.blockedBy).toHaveLength(1);
      expect(parsed.blockedBy[0].blockerId).toBe(blockerId);
      expect(parsed.blockedBy[0].blockedId).toBe(blockedId);
      expect(parsed.blockedBy[0].status).toBe("active");
      expect(parsed.blocks).toHaveLength(0);
    });

    test("returns empty arrays for issue with no blockages", async () => {
      const issueId = extractId(await runAgt(["create", "Standalone"]));

      const result = await runAgt(["blockages", "list", issueId]);

      expect(result.exitCode).toBe(0);

      const parsed = parseJson(result.stdout);
      expect(parsed.blockedBy).toEqual([]);
      expect(parsed.blocks).toEqual([]);
    });

    test("on non-existent issue returns NOT_FOUND", async () => {
      const result = await runAgt(["blockages", "list", "missing12345"]);

      assertError(result, "NOT_FOUND", 5);
    });
  });
});
