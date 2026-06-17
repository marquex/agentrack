/**
 * E2E: blockages — Type B tests (tracker operations)
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

describe("E2E: blockages", () => {
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

  describe("blockages add", () => {
    test("adds a blockage and returns OK", async () => {
      const blockedId = extractId(await runAgt(["create", "Blocked"], dir));
      const blockerId = extractId(await runAgt(["create", "Blocker"], dir));

      const result = await runAgt(
        ["blockages", "add", blockedId, "--by", blockerId],
        dir,
      );

      assertSuccess(result);
    });

    test("adds multiple blockers at once", async () => {
      const blockedId = extractId(await runAgt(["create", "Blocked"], dir));
      const blocker1Id = extractId(await runAgt(["create", "Blocker 1"], dir));
      const blocker2Id = extractId(await runAgt(["create", "Blocker 2"], dir));

      const result = await runAgt(
        ["blockages", "add", blockedId, "--by", blocker1Id, blocker2Id],
        dir,
      );

      assertSuccess(result);
    });

    test("with cycle returns BLOCKAGE_CYCLE error", async () => {
      const aId = extractId(await runAgt(["create", "A"], dir));
      const bId = extractId(await runAgt(["create", "B"], dir));

      // A blocked by B
      await runAgt(["blockages", "add", aId, "--by", bId], dir);

      // Try B blocked by A -> cycle
      const result = await runAgt(["blockages", "add", bId, "--by", aId], dir);

      assertError(result, "BLOCKAGE_CYCLE", 11);
    });

    test("on non-existent issue returns NOT_FOUND", async () => {
      const blockerId = extractId(await runAgt(["create", "Blocker"], dir));

      const result = await runAgt(
        ["blockages", "add", "missing12345", "--by", blockerId],
        dir,
      );

      assertError(result, "NOT_FOUND", 5);
    });
  });

  describe("blockages resolve", () => {
    test("resolves a blockage and returns OK", async () => {
      const blockedId = extractId(await runAgt(["create", "Blocked"], dir));
      const blockerId = extractId(await runAgt(["create", "Blocker"], dir));

      await runAgt(["blockages", "add", blockedId, "--by", blockerId], dir);

      const result = await runAgt(
        ["blockages", "resolve", blockedId, "--by", blockerId],
        dir,
      );

      assertSuccess(result);
    });
  });

  describe("blockages delete", () => {
    test("deletes a blockage and returns OK", async () => {
      const blockedId = extractId(await runAgt(["create", "Blocked"], dir));
      const blockerId = extractId(await runAgt(["create", "Blocker"], dir));

      await runAgt(["blockages", "add", blockedId, "--by", blockerId], dir);

      const result = await runAgt(
        ["blockages", "delete", blockedId, "--by", blockerId],
        dir,
      );

      assertSuccess(result);
    });
  });

  describe("blockages list", () => {
    test("returns correct blockage info JSON", async () => {
      const blockedId = extractId(await runAgt(["create", "Blocked"], dir));
      const blockerId = extractId(await runAgt(["create", "Blocker"], dir));

      await runAgt(["blockages", "add", blockedId, "--by", blockerId], dir);

      const result = await runAgt(["blockages", "list", blockedId], dir);

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
      const issueId = extractId(await runAgt(["create", "Standalone"], dir));

      const result = await runAgt(["blockages", "list", issueId], dir);

      expect(result.exitCode).toBe(0);

      const parsed = parseJson(result.stdout);
      expect(parsed.blockedBy).toEqual([]);
      expect(parsed.blocks).toEqual([]);
    });

    test("on non-existent issue returns NOT_FOUND", async () => {
      const result = await runAgt(["blockages", "list", "missing12345"], dir);

      assertError(result, "NOT_FOUND", 5);
    });
  });
});
