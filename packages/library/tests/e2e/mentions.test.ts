/**
 * E2E: mentions — Type B tests (tracker operations via CLI)
 *
 * Tests the mentions CLI commands: list, view, read, unread, rebuild.
 * Also tests auto-indexing integration: add/update/delete comments.
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

describe("E2E: mentions", () => {
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

  // ─── mentions list ────────────────────────────────────────────────

  describe("mentions list", () => {
    test("returns empty array for user with no mentions", async () => {
      await runAgt(["users", "register", "alice"], dir);

      const result = await runAgt(["mentions", "list", "alice"], dir);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed).toEqual([]);
    });

    test("returns USER_NOT_FOUND for unregistered user", async () => {
      const result = await runAgt(["mentions", "list", "nonexistent"], dir);
      assertError(result, "USER_NOT_FOUND", 9);
    });

    test("lists mentions after comment with @mention", async () => {
      await runAgt(["users", "register", "alice"], dir);
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Bug Fix"], dir));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review this"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );

      const result = await runAgt(["mentions", "list", "alice"], dir);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].mentionedBy).toBe("bob");
      expect(parsed[0].isRead).toBe(false);
    });

    test("includes read mentions with --include-reads flag", async () => {
      const aliceReg = await runAgt(["users", "register", "alice"], dir);
      const aliceToken = parseJson(aliceReg.stdout).token;
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"], dir));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );

      // Get mention id and mark as read
      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"], dir);
      const mentionId = parseJson(listResult.stdout)[0].id;
      await runAgt(["mentions", "read", mentionId], dir, {
        AGT_USER_TOKEN: aliceToken,
      });

      // Without --include-reads: empty
      const unreadResult = await runAgt(["mentions", "list", "alice"], dir);
      assertSuccess(unreadResult);
      expect(parseJson(unreadResult.stdout)).toHaveLength(0);

      // With --include-reads: 1 result
      const allResult = await runAgt(["mentions", "list", "alice", "--include-reads"], dir);
      assertSuccess(allResult);
      expect(parseJson(allResult.stdout)).toHaveLength(1);
      expect(parseJson(allResult.stdout)[0].isRead).toBe(true);
    });

    test("results sorted by createdAt descending", async () => {
      await runAgt(["users", "register", "alice"], dir);
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"], dir));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice first"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice second"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );

      const result = await runAgt(["mentions", "list", "alice", "--include-reads"], dir);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].createdAt >= parsed[1].createdAt).toBe(true);
    });
  });

  // ─── mentions view ────────────────────────────────────────────────

  describe("mentions view", () => {
    test("returns mention with full context", async () => {
      await runAgt(["users", "register", "alice"], dir);
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Fix login"], dir));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice can you review?"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );

      // Get mention id
      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"], dir);
      const mentionId = parseJson(listResult.stdout)[0].id;

      const result = await runAgt(["mentions", "view", mentionId], dir);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed.mention.id).toBe(mentionId);
      expect(parsed.mention.mentionedUser).toBe("alice");
      expect(parsed.mention.mentionedBy).toBe("bob");
      expect(parsed.comment.content).toBe("@alice can you review?");
      expect(parsed.issue.title).toBe("Fix login");
    });

    test("returns MENTION_NOT_FOUND for nonexistent id", async () => {
      const result = await runAgt(["mentions", "view", "nonexistent"], dir);
      assertError(result, "MENTION_NOT_FOUND", 20);
    });
  });

  // ─── mentions read ────────────────────────────────────────────────

  describe("mentions read", () => {
    test("marks mention as read when called by mentioned user", async () => {
      const aliceReg = await runAgt(["users", "register", "alice"], dir);
      const aliceToken = parseJson(aliceReg.stdout).token;
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"], dir));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );

      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"], dir);
      const mentionId = parseJson(listResult.stdout)[0].id;

      const result = await runAgt(["mentions", "read", mentionId], dir, {
        AGT_USER_TOKEN: aliceToken,
      });
      assertSuccess(result);
      expect(parseJson(result.stdout)).toEqual({ result: "OK" });
    });

    test("returns MENTION_ACCESS_DENIED when wrong user", async () => {
      await runAgt(["users", "register", "alice"], dir);
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"], dir));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );

      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"], dir);
      const mentionId = parseJson(listResult.stdout)[0].id;

      // Bob tries to mark alice's mention as read — should be denied
      const result = await runAgt(["mentions", "read", mentionId], dir, {
        AGT_USER_TOKEN: bobToken,
      });
      assertError(result, "MENTION_ACCESS_DENIED", 21);
    });

    test("returns MENTION_NOT_FOUND for nonexistent id", async () => {
      const aliceReg = await runAgt(["users", "register", "alice"], dir);
      const aliceToken = parseJson(aliceReg.stdout).token;

      const result = await runAgt(["mentions", "read", "nonexistent"], dir, {
        AGT_USER_TOKEN: aliceToken,
      });
      assertError(result, "MENTION_NOT_FOUND", 20);
    });
  });

  // ─── mentions unread ──────────────────────────────────────────────

  describe("mentions unread", () => {
    test("marks mention as unread when called by mentioned user", async () => {
      const aliceReg = await runAgt(["users", "register", "alice"], dir);
      const aliceToken = parseJson(aliceReg.stdout).token;
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"], dir));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );

      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"], dir);
      const mentionId = parseJson(listResult.stdout)[0].id;

      // First mark as read
      await runAgt(["mentions", "read", mentionId], dir, {
        AGT_USER_TOKEN: aliceToken,
      });

      // Then mark as unread
      const result = await runAgt(["mentions", "unread", mentionId], dir, {
        AGT_USER_TOKEN: aliceToken,
      });
      assertSuccess(result);
      expect(parseJson(result.stdout)).toEqual({ result: "OK" });

      // Verify it shows up in unread list
      const unreadList = await runAgt(["mentions", "list", "alice"], dir);
      assertSuccess(unreadList);
      expect(parseJson(unreadList.stdout)).toHaveLength(1);
    });

    test("returns MENTION_ACCESS_DENIED when wrong user", async () => {
      const aliceReg = await runAgt(["users", "register", "alice"], dir);
      const aliceToken = parseJson(aliceReg.stdout).token;
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"], dir));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        dir,
        { AGT_USER_TOKEN: aliceToken },
      );

      const listResult = await runAgt(["mentions", "list", "alice", "--include-reads"], dir);
      const mentionId = parseJson(listResult.stdout)[0].id;

      const result = await runAgt(["mentions", "unread", mentionId], dir, {
        AGT_USER_TOKEN: bobToken,
      });
      assertError(result, "MENTION_ACCESS_DENIED", 21);
    });
  });

  // ─── mentions rebuild ─────────────────────────────────────────────

  describe("mentions rebuild", () => {
    test("rebuilds mentions index from scratch", async () => {
      await runAgt(["users", "register", "alice"], dir);
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Rebuild Test"], dir));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice review this"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );

      const result = await runAgt(["mentions", "rebuild"], dir);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("OK");
      expect(parsed.mentionCount).toBe(1);
    });

    test("rebuild returns 0 for no mentions", async () => {
      await runAgt(["users", "register", "alice"], dir);

      const result = await runAgt(["mentions", "rebuild"], dir);
      assertSuccess(result);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("OK");
      expect(parsed.mentionCount).toBe(0);
    });
  });

  // ─── Integration: add/update/delete comments affect mentions ──────

  describe("auto-indexing integration", () => {
    test("adding comment indexes mention", async () => {
      await runAgt(["users", "register", "alice"], dir);
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"], dir));
      await runAgt(
        ["comments", "add", issueId, "--content", "@alice check"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );

      const listResult = await runAgt(["mentions", "list", "alice"], dir);
      assertSuccess(listResult);
      expect(parseJson(listResult.stdout)).toHaveLength(1);
    });

    test("deleting comment removes mention", async () => {
      await runAgt(["users", "register", "alice"], dir);
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"], dir));
      const addResult = await runAgt(
        ["comments", "add", issueId, "--content", "@alice check"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );
      const commentId = parseJson(addResult.stdout).commentId;

      // Verify mention exists
      let listResult = await runAgt(["mentions", "list", "alice"], dir);
      expect(parseJson(listResult.stdout)).toHaveLength(1);

      // Delete the comment
      await runAgt(["comments", "delete", issueId, commentId], dir, {
        AGT_USER_TOKEN: bobToken,
      });

      // Mention should be gone
      listResult = await runAgt(["mentions", "list", "alice"], dir);
      assertSuccess(listResult);
      expect(parseJson(listResult.stdout)).toHaveLength(0);
    });

    test("updating comment changes mentions", async () => {
      await runAgt(["users", "register", "alice"], dir);
      const bobReg = await runAgt(["users", "register", "bob"], dir);
      const bobToken = parseJson(bobReg.stdout).token;

      const issueId = extractId(await runAgt(["create", "Test"], dir));
      const addResult = await runAgt(
        ["comments", "add", issueId, "--content", "@alice review"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );
      const commentId = parseJson(addResult.stdout).commentId;

      // Update: change from @alice to @bob
      await runAgt(
        ["comments", "update", issueId, commentId, "--content", "@bob check instead"],
        dir,
        { AGT_USER_TOKEN: bobToken },
      );

      // Alice should have 0 mentions
      const aliceResult = await runAgt(["mentions", "list", "alice", "--include-reads"], dir);
      assertSuccess(aliceResult);
      expect(parseJson(aliceResult.stdout)).toHaveLength(0);

      // Bob should have 1 mention
      const bobResult = await runAgt(["mentions", "list", "bob"], dir);
      assertSuccess(bobResult);
      expect(parseJson(bobResult.stdout)).toHaveLength(1);
    });
  });
});
