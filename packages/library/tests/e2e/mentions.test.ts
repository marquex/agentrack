/**
 * E2E: mentions — Type B tests (tracker operations via CLI)
 *
 * Tests the mentions CLI commands: list, view, read, unread, rebuild.
 * Also tests auto-indexing integration: add/update/delete comments.
 *
 * Note: resetWorktreeData() does not currently reset mentions.json (spec
 * deviation CL5). We manually reset it in beforeEach as a workaround.
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertError,
  assertSuccess,
  ensureE2EWorktree,
  extractId,
  getTrackerDir,
  parseJson,
  resetWorktreeData,
  runAgt,
} from "./setup";

describe("E2E: mentions", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
    // Workaround: resetWorktreeData doesn't reset mentions.json (spec deviation CL5)
    const trackerDir = getTrackerDir(E2E_DATA_BRANCH);
    const mentionsPath = join(trackerDir, "mentions.json");
    if (existsSync(mentionsPath)) {
      writeFileSync(mentionsPath, "{}\n", "utf-8");
    }
  });

  // ─── mentions list ────────────────────────────────────────────────

  describe("mentions list", () => {
    test("returns empty array for user with no mentions", async () => {
      await runAgt(["users", "register", "alice"]);

      const result = await runAgt(["mentions", "list", "alice"]);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed).toEqual([]);
    });

    test("returns USER_NOT_FOUND for unregistered user", async () => {
      const result = await runAgt(["mentions", "list", "nonexistent"]);
      assertError(result, "USER_NOT_FOUND", 9);
    });

    test("lists mentions after comment with @mention", async () => {
      await runAgt(["users", "register", "alice"]);
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Bug Fix"]));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review this"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );

      const result = await runAgt(["mentions", "list", "alice"]);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].mentionedBy).toBe("bob");
      expect(parsed[0].isRead).toBe(false);
    });

    test("includes read mentions with --include-reads flag", async () => {
      const aliceReg = await runAgt(["users", "register", "alice"]);
      const aliceToken = parseJson(aliceReg.stdout).token;
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"]));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );

      // Get mention id and mark as read
      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"]);
      const mentionId = parseJson(listResult.stdout)[0].id;
      await runAgt(["mentions", "read", mentionId], undefined, {
        AGT_USER_TOKEN: aliceToken,
      });

      // Without --include-reads: empty
      const unreadResult = await runAgt(["mentions", "list", "alice"]);
      assertSuccess(unreadResult);
      expect(parseJson(unreadResult.stdout)).toHaveLength(0);

      // With --include-reads: 1 result
      const allResult = await runAgt(["mentions", "list", "alice", "--include-reads"]);
      assertSuccess(allResult);
      expect(parseJson(allResult.stdout)).toHaveLength(1);
      expect(parseJson(allResult.stdout)[0].isRead).toBe(true);
    });

    test("results sorted by createdAt descending", async () => {
      await runAgt(["users", "register", "alice"]);
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"]));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice first"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice second"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );

      const result = await runAgt(["mentions", "list", "alice", "--include-reads"]);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].createdAt >= parsed[1].createdAt).toBe(true);
    });
  });

  // ─── mentions view ────────────────────────────────────────────────

  describe("mentions view", () => {
    test("returns mention with full context", async () => {
      await runAgt(["users", "register", "alice"]);
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Fix login"]));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice can you review?"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );

      // Get mention id
      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"]);
      const mentionId = parseJson(listResult.stdout)[0].id;

      const result = await runAgt(["mentions", "view", mentionId]);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed.mention.id).toBe(mentionId);
      expect(parsed.mention.mentionedUser).toBe("alice");
      expect(parsed.mention.mentionedBy).toBe("bob");
      expect(parsed.comment.content).toBe("@alice can you review?");
      expect(parsed.issue.title).toBe("Fix login");
    });

    test("returns MENTION_NOT_FOUND for nonexistent id", async () => {
      const result = await runAgt(["mentions", "view", "nonexistent"]);
      assertError(result, "MENTION_NOT_FOUND", 20);
    });
  });

  // ─── mentions read ────────────────────────────────────────────────

  describe("mentions read", () => {
    test("marks mention as read when called by mentioned user", async () => {
      const aliceReg = await runAgt(["users", "register", "alice"]);
      const aliceToken = parseJson(aliceReg.stdout).token;
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"]));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );

      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"]);
      const mentionId = parseJson(listResult.stdout)[0].id;

      const result = await runAgt(["mentions", "read", mentionId], undefined, {
        AGT_USER_TOKEN: aliceToken,
      });
      assertSuccess(result);
      expect(parseJson(result.stdout)).toEqual({ result: "OK" });
    });

    test("returns MENTION_ACCESS_DENIED when wrong user", async () => {
      await runAgt(["users", "register", "alice"]);
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"]));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );

      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"]);
      const mentionId = parseJson(listResult.stdout)[0].id;

      // Bob tries to mark alice's mention as read — should be denied
      const result = await runAgt(["mentions", "read", mentionId], undefined, {
        AGT_USER_TOKEN: bobToken,
      });
      assertError(result, "MENTION_ACCESS_DENIED", 21);
    });

    test("returns MENTION_NOT_FOUND for nonexistent id", async () => {
      const aliceReg = await runAgt(["users", "register", "alice"]);
      const aliceToken = parseJson(aliceReg.stdout).token;

      const result = await runAgt(["mentions", "read", "nonexistent"], undefined, {
        AGT_USER_TOKEN: aliceToken,
      });
      assertError(result, "MENTION_NOT_FOUND", 20);
    });
  });

  // ─── mentions unread ──────────────────────────────────────────────

  describe("mentions unread", () => {
    test("marks mention as unread when called by mentioned user", async () => {
      const aliceReg = await runAgt(["users", "register", "alice"]);
      const aliceToken = parseJson(aliceReg.stdout).token;
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"]));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );

      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"]);
      const mentionId = parseJson(listResult.stdout)[0].id;

      // First mark as read
      await runAgt(["mentions", "read", mentionId], undefined, {
        AGT_USER_TOKEN: aliceToken,
      });

      // Then mark as unread
      const result = await runAgt(["mentions", "unread", mentionId], undefined, {
        AGT_USER_TOKEN: aliceToken,
      });
      assertSuccess(result);
      expect(parseJson(result.stdout)).toEqual({ result: "OK" });

      // Verify it shows up in unread list
      const unreadList = await runAgt(["mentions", "list", "alice"]);
      assertSuccess(unreadList);
      expect(parseJson(unreadList.stdout)).toHaveLength(1);
    });

    test("returns MENTION_ACCESS_DENIED when wrong user", async () => {
      const aliceReg = await runAgt(["users", "register", "alice"]);
      const aliceToken = parseJson(aliceReg.stdout).token;
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"]));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        undefined,
        { AGT_USER_TOKEN: aliceToken },
      );

      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"]);
      const mentionId = parseJson(listResult.stdout)[0].id;

      const result = await runAgt(["mentions", "unread", mentionId], undefined, {
        AGT_USER_TOKEN: bobToken,
      });
      assertError(result, "MENTION_ACCESS_DENIED", 21);
    });
  });

  // ─── mentions rebuild ─────────────────────────────────────────────

  describe("mentions rebuild", () => {
    test("rebuilds mentions index from scratch", async () => {
      await runAgt(["users", "register", "alice"]);
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Rebuild Test"]));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review this"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );

      const result = await runAgt(["mentions", "rebuild"]);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("OK");
      expect(parsed.mentionCount).toBe(1);
    });

    test("rebuild returns 0 for no mentions", async () => {
      await runAgt(["users", "register", "alice"]);

      const result = await runAgt(["mentions", "rebuild"]);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("OK");
      expect(parsed.mentionCount).toBe(0);
    });
  });

  // ─── Integration: add/update/delete comments affect mentions ──────

  describe("auto-indexing integration", () => {
    test("adding comment indexes mention", async () => {
      await runAgt(["users", "register", "alice"]);
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"]));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice check"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );

      const listResult = await runAgt(["mentions", "list", "alice"]);
      assertSuccess(listResult);
      expect(parseJson(listResult.stdout)).toHaveLength(1);
    });

    test("deleting comment removes mention", async () => {
      await runAgt(["users", "register", "alice"]);
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"]));
      const addResult = await runAgt(
        ["comments", "add", issueId, "--content", "@alice check"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );
      const commentId = parseJson(addResult.stdout).commentId;

      // Verify mention exists
      let listResult = await runAgt(["mentions", "list", "alice"]);
      expect(parseJson(listResult.stdout)).toHaveLength(1);

      // Delete the comment
      await runAgt(["comments", "delete", issueId, commentId], undefined, {
        AGT_USER_TOKEN: bobToken,
      });

      // Mention should be gone
      listResult = await runAgt(["mentions", "list", "alice"]);
      assertSuccess(listResult);
      expect(parseJson(listResult.stdout)).toHaveLength(0);
    });

    test("updating comment changes mentions", async () => {
      await runAgt(["users", "register", "alice"]);
      const bobReg = await runAgt(["users", "register", "bob"]);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"]));
      const addResult = await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );
      const commentId = parseJson(addResult.stdout).commentId;

      // Update: change from @alice to @bob
      await runAgt(
        ["comments", "update", issueId, commentId, "--content", "@bob check instead"],
        undefined,
        { AGT_USER_TOKEN: bobToken },
      );

      // Alice should have 0 mentions
      const aliceResult = await runAgt(["mentions", "list", "alice", "--include-reads"]);
      assertSuccess(aliceResult);
      expect(parseJson(aliceResult.stdout)).toHaveLength(0);

      // Bob should have 1 mention
      const bobResult = await runAgt(["mentions", "list", "bob"]);
      assertSuccess(bobResult);
      expect(parseJson(bobResult.stdout)).toHaveLength(1);
    });
  });
});
