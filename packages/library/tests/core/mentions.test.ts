/**
 * Unit tests for src/core/mentions.ts
 *
 * Tests mention extraction, file I/O, index operations, and rebuild.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IndexEntry } from "../../src/types";
import type { MentionEntry, MentionsFile } from "../../src/types/mention";
import {
  addMentionEntries,
  extractMentions,
  findMentionById,
  readMentionsFile,
  rebuildMentionsIndex,
  removeCommentMentions,
  removeIssueMentions,
  writeMentionsFile,
} from "../../src/core/mentions";

// ─── extractMentions ──────────────────────────────────────────────────

describe("extractMentions", () => {
  const registered = ["alice", "bob", "charlie-brown", "dave_jones"];

  test("single mention at start of string", () => {
    expect(extractMentions("@alice review this", registered)).toEqual(["alice"]);
  });

  test("single mention in middle of string", () => {
    expect(extractMentions("hey @bob check this", registered)).toEqual(["bob"]);
  });

  test("single mention at end of string", () => {
    expect(extractMentions("please review @alice", registered)).toEqual(["alice"]);
  });

  test("multiple mentions", () => {
    expect(extractMentions("@alice and @bob review this", registered)).toEqual([
      "alice",
      "bob",
    ]);
  });

  test("duplicate mentions produce single entry", () => {
    expect(extractMentions("@alice @alice @alice", registered)).toEqual(["alice"]);
  });

  test("unregistered user is silently ignored", () => {
    expect(extractMentions("@unknown-user hello", registered)).toEqual([]);
  });

  test("no mentions returns empty array", () => {
    expect(extractMentions("no mentions here", registered)).toEqual([]);
  });

  test("empty content returns empty array", () => {
    expect(extractMentions("", registered)).toEqual([]);
  });

  test("bare @ with no name does not match", () => {
    expect(extractMentions("@ hello", registered)).toEqual([]);
  });

  test("email addresses are not matched (foo@bar)", () => {
    expect(extractMentions("email is foo@bar.com", registered)).toEqual([]);
  });

  test("hyphenated names are matched", () => {
    expect(extractMentions("@charlie-brown looks good", registered)).toEqual([
      "charlie-brown",
    ]);
  });

  test("underscore names are matched", () => {
    expect(extractMentions("@dave_jones check this", registered)).toEqual([
      "dave_jones",
    ]);
  });

  test("mixed case is lowercased", () => {
    expect(extractMentions("@ALICE @Bob @CHARLIE-BROWN", registered)).toEqual([
      "alice",
      "bob",
      "charlie-brown",
    ]);
  });

  test("empty registered users list matches nothing", () => {
    expect(extractMentions("@alice hello", [])).toEqual([]);
  });

  test("self-mention works (mentioning registered user)", () => {
    expect(extractMentions("@alice talking to myself", registered)).toEqual(["alice"]);
  });

  test("mention after punctuation works", () => {
    expect(extractMentions("Done.@alice review", registered)).toEqual(["alice"]);
  });

  test("mention in parentheses works", () => {
    expect(extractMentions("(@bob) please check", registered)).toEqual(["bob"]);
  });

  test("double @@ should NOT match (spec regex deviation test)", () => {
    // Spec says: /(?:^|(?<=[^@\w]))@([\w-]+)/g — avoids @@name
    // This tests whether the implementation handles this edge case
    const result = extractMentions("@@alice", registered);
    // Per spec, this should be [] — if it returns ["alice"], there's a regex deviation
    expect(result).toEqual([]);
  });

  test("double @@ in middle of text should NOT match", () => {
    const result = extractMentions("test@@alice end", registered);
    expect(result).toEqual([]);
  });
});

// ─── readMentionsFile ─────────────────────────────────────────────────

describe("readMentionsFile", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `mentions-test-read-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("reads existing mentions.json", () => {
    const data: MentionsFile = {
      alice: [
        {
          id: "mpmvd123ab",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    const result = readMentionsFile(testDir);
    expect(result).toEqual(data);
  });

  test("returns empty object for missing file (upgrade scenario)", () => {
    const result = readMentionsFile(testDir);
    expect(result).toEqual({});
  });
});

// ─── writeMentionsFile ────────────────────────────────────────────────

describe("writeMentionsFile", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `mentions-test-write-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("writes mentions.json with correct content", async () => {
    const data: MentionsFile = {
      bob: [
        {
          id: "mpmvd456cd",
          createdAt: "2026-05-27T11:00:00.000Z",
          mentionedUser: "bob",
          mentionedBy: "alice",
          issueId: "issue002",
          commentId: "comment002",
          isRead: true,
        },
      ],
    };

    await writeMentionsFile(testDir, data);

    const written = readFileSync(join(testDir, "mentions.json"), "utf-8");
    expect(JSON.parse(written)).toEqual(data);
  });

  test("overwrites existing file", async () => {
    writeFileSync(join(testDir, "mentions.json"), '{"old": []}');

    await writeMentionsFile(testDir, {});

    const written = readFileSync(join(testDir, "mentions.json"), "utf-8");
    expect(JSON.parse(written)).toEqual({});
  });
});

// ─── addMentionEntries ────────────────────────────────────────────────

describe("addMentionEntries", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `mentions-test-add-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("adds a single entry", async () => {
    const entry: MentionEntry = {
      id: "aaaa000001",
      createdAt: "2026-05-27T10:00:00.000Z",
      mentionedUser: "alice",
      mentionedBy: "bob",
      issueId: "issue001",
      commentId: "comment001",
      isRead: false,
    };

    await addMentionEntries(testDir, [entry]);

    const result = readMentionsFile(testDir);
    expect(result.alice).toHaveLength(1);
    expect(result.alice![0]).toEqual(entry);
  });

  test("adds multiple entries for different users", async () => {
    const entries: MentionEntry[] = [
      {
        id: "aaaa000001",
        createdAt: "2026-05-27T10:00:00.000Z",
        mentionedUser: "alice",
        mentionedBy: "bob",
        issueId: "issue001",
        commentId: "comment001",
        isRead: false,
      },
      {
        id: "bbbb000002",
        createdAt: "2026-05-27T11:00:00.000Z",
        mentionedUser: "bob",
        mentionedBy: "alice",
        issueId: "issue002",
        commentId: "comment002",
        isRead: false,
      },
    ];

    await addMentionEntries(testDir, entries);

    const result = readMentionsFile(testDir);
    expect(result.alice).toHaveLength(1);
    expect(result.bob).toHaveLength(1);
  });

  test("empty entries array is no-op", async () => {
    await addMentionEntries(testDir, []);
    const result = readMentionsFile(testDir);
    expect(result).toEqual({});
  });

  test("preserves existing entries when adding new ones", async () => {
    const existing: MentionsFile = {
      alice: [
        {
          id: "aaaa000001",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(existing));

    const newEntry: MentionEntry = {
      id: "zzzz999999",
      createdAt: "2026-05-27T12:00:00.000Z",
      mentionedUser: "alice",
      mentionedBy: "charlie",
      issueId: "issue003",
      commentId: "comment003",
      isRead: false,
    };

    await addMentionEntries(testDir, [newEntry]);

    const result = readMentionsFile(testDir);
    expect(result.alice).toHaveLength(2);
    // Should be sorted by id
    expect(result.alice![0]!.id).toBe("aaaa000001");
    expect(result.alice![1]!.id).toBe("zzzz999999");
  });

  test("maintains sort by id after insertion", async () => {
    const entry1: MentionEntry = {
      id: "mmmm555555",
      createdAt: "2026-05-27T10:00:00.000Z",
      mentionedUser: "alice",
      mentionedBy: "bob",
      issueId: "issue001",
      commentId: "comment001",
      isRead: false,
    };

    await addMentionEntries(testDir, [entry1]);

    // Insert an entry that sorts before the existing one
    const entry2: MentionEntry = {
      id: "aaaa000001",
      createdAt: "2026-05-27T09:00:00.000Z",
      mentionedUser: "alice",
      mentionedBy: "bob",
      issueId: "issue002",
      commentId: "comment002",
      isRead: false,
    };

    await addMentionEntries(testDir, [entry2]);

    const result = readMentionsFile(testDir);
    expect(result.alice).toHaveLength(2);
    expect(result.alice![0]!.id).toBe("aaaa000001");
    expect(result.alice![1]!.id).toBe("mmmm555555");
  });
});

// ─── removeCommentMentions ────────────────────────────────────────────

describe("removeCommentMentions", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `mentions-test-remove-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("removes entries with matching commentId", async () => {
    const data: MentionsFile = {
      alice: [
        {
          id: "aaaa000001",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    await removeCommentMentions(testDir, "comment001");

    const result = readMentionsFile(testDir);
    expect(result.alice).toBeUndefined();
  });

  test("preserves entries with different commentId", async () => {
    const data: MentionsFile = {
      alice: [
        {
          id: "aaaa000001",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
        {
          id: "bbbb000002",
          createdAt: "2026-05-27T11:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "charlie",
          issueId: "issue002",
          commentId: "comment002",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    await removeCommentMentions(testDir, "comment001");

    const result = readMentionsFile(testDir);
    expect(result.alice).toHaveLength(1);
    expect(result.alice![0]!.commentId).toBe("comment002");
  });

  test("removes empty user key after cleanup", async () => {
    const data: MentionsFile = {
      alice: [
        {
          id: "aaaa000001",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
      ],
      bob: [
        {
          id: "bbbb000002",
          createdAt: "2026-05-27T11:00:00.000Z",
          mentionedUser: "bob",
          mentionedBy: "alice",
          issueId: "issue002",
          commentId: "comment002",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    await removeCommentMentions(testDir, "comment001");

    const result = readMentionsFile(testDir);
    expect(result.alice).toBeUndefined();
    expect(result.bob).toHaveLength(1);
  });

  test("nonexistent commentId is no-op", async () => {
    const data: MentionsFile = {
      alice: [
        {
          id: "aaaa000001",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    await removeCommentMentions(testDir, "nonexistent");

    const result = readMentionsFile(testDir);
    expect(result.alice).toHaveLength(1);
  });

  test("no-op when mentions file is empty", async () => {
    writeFileSync(join(testDir, "mentions.json"), "{}");

    await removeCommentMentions(testDir, "comment001");

    const result = readMentionsFile(testDir);
    expect(result).toEqual({});
  });
});

// ─── removeIssueMentions ───────────────────────────────────────────────

describe("removeIssueMentions", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `mentions-test-remove-issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("removes all entries for a given issueId", async () => {
    const data: MentionsFile = {
      alice: [
        {
          id: "aaaa000001",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
        {
          id: "bbbb000002",
          createdAt: "2026-05-27T11:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "charlie",
          issueId: "issue001",
          commentId: "comment002",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    await removeIssueMentions(testDir, "issue001");

    const result = readMentionsFile(testDir);
    expect(result.alice).toBeUndefined();
  });

  test("removes entries across multiple users for the same issue", async () => {
    const data: MentionsFile = {
      alice: [
        {
          id: "aaaa000001",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
      ],
      bob: [
        {
          id: "bbbb000002",
          createdAt: "2026-05-27T11:00:00.000Z",
          mentionedUser: "bob",
          mentionedBy: "alice",
          issueId: "issue001",
          commentId: "comment002",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    await removeIssueMentions(testDir, "issue001");

    const result = readMentionsFile(testDir);
    expect(result.alice).toBeUndefined();
    expect(result.bob).toBeUndefined();
  });

  test("preserves entries for other issues", async () => {
    const data: MentionsFile = {
      alice: [
        {
          id: "aaaa000001",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
        {
          id: "bbbb000002",
          createdAt: "2026-05-27T11:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "charlie",
          issueId: "issue002",
          commentId: "comment002",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    await removeIssueMentions(testDir, "issue001");

    const result = readMentionsFile(testDir);
    expect(result.alice).toHaveLength(1);
    expect(result.alice![0]!.issueId).toBe("issue002");
  });

  test("cleans up empty user keys", async () => {
    const data: MentionsFile = {
      alice: [
        {
          id: "aaaa000001",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
      ],
      bob: [
        {
          id: "bbbb000002",
          createdAt: "2026-05-27T11:00:00.000Z",
          mentionedUser: "bob",
          mentionedBy: "alice",
          issueId: "issue002",
          commentId: "comment002",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    // Remove alice's only mention — alice key should be cleaned up
    await removeIssueMentions(testDir, "issue001");

    const result = readMentionsFile(testDir);
    expect(result.alice).toBeUndefined();
    expect(result.bob).toHaveLength(1);
  });

  test("no-op for issue with no mentions", async () => {
    const data: MentionsFile = {
      alice: [
        {
          id: "aaaa000001",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    await removeIssueMentions(testDir, "nonexistent_issue");

    const result = readMentionsFile(testDir);
    expect(result.alice).toHaveLength(1);
  });

  test("no-op when mentions file is empty", async () => {
    writeFileSync(join(testDir, "mentions.json"), "{}");

    await removeIssueMentions(testDir, "issue001");

    const result = readMentionsFile(testDir);
    expect(result).toEqual({});
  });

  test("no-op when mentions file does not exist", async () => {
    // No mentions.json file at all
    await removeIssueMentions(testDir, "issue001");

    // Should not crash
    const result = readMentionsFile(testDir);
    expect(result).toEqual({});
  });
});

// ─── findMentionById ──────────────────────────────────────────────────

describe("findMentionById", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `mentions-test-find-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("finds an entry by id", () => {
    const entry: MentionEntry = {
      id: "mpmvd123ab",
      createdAt: "2026-05-27T10:00:00.000Z",
      mentionedUser: "alice",
      mentionedBy: "bob",
      issueId: "issue001",
      commentId: "comment001",
      isRead: false,
    };
    const data: MentionsFile = { alice: [entry] };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    const result = findMentionById(testDir, "mpmvd123ab");
    expect(result).toEqual({ entry, user: "alice" });
  });

  test("returns null for non-existent id", () => {
    const data: MentionsFile = {
      alice: [
        {
          id: "mpmvd123ab",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "comment001",
          isRead: false,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    const result = findMentionById(testDir, "nonexistent");
    expect(result).toBeNull();
  });

  test("finds entry across multiple users", () => {
    const aliceEntry: MentionEntry = {
      id: "aaaa000001",
      createdAt: "2026-05-27T10:00:00.000Z",
      mentionedUser: "alice",
      mentionedBy: "bob",
      issueId: "issue001",
      commentId: "comment001",
      isRead: false,
    };
    const bobEntry: MentionEntry = {
      id: "bbbb000002",
      createdAt: "2026-05-27T11:00:00.000Z",
      mentionedUser: "bob",
      mentionedBy: "alice",
      issueId: "issue002",
      commentId: "comment002",
      isRead: false,
    };
    const data: MentionsFile = { alice: [aliceEntry], bob: [bobEntry] };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(data));

    expect(findMentionById(testDir, "bbbb000002")).toEqual({
      entry: bobEntry,
      user: "bob",
    });
    expect(findMentionById(testDir, "aaaa000001")).toEqual({
      entry: aliceEntry,
      user: "alice",
    });
  });

  test("returns null when mentions file is empty", () => {
    writeFileSync(join(testDir, "mentions.json"), "{}");
    expect(findMentionById(testDir, "any")).toBeNull();
  });
});

// ─── rebuildMentionsIndex ─────────────────────────────────────────────

describe("rebuildMentionsIndex", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `mentions-test-rebuild-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "issues"), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("rebuilds from issue event files", async () => {
    // Create an issue event file with a comment containing @alice
    const issueFile = join(testDir, "issues", "issue001.json");
    const events = [
      { type: "create", timestamp: "2026-05-27T09:00:00.000Z", author: "bob", content: { title: "Test" } },
      { type: "update", timestamp: "2026-05-27T09:01:00.000Z", author: "bob", content: { title: "Test Issue" } },
      { type: "comment", timestamp: "2026-05-27T10:00:00.000Z", author: "bob", content: { id: "comment001", content: "@alice please review" } },
    ];
    writeFileSync(issueFile, JSON.stringify(events) + "\n");

    const issues: IndexEntry[] = [
      { id: "issue001", title: "Test Issue", status: "open", priority: 3, path: "issues/issue001.json" },
    ];

    const count = await rebuildMentionsIndex(testDir, issues, () => ["alice"]);

    expect(count).toBe(1);
    const result = readMentionsFile(testDir);
    expect(result.alice).toHaveLength(1);
    expect(result.alice![0]!.mentionedUser).toBe("alice");
    expect(result.alice![0]!.mentionedBy).toBe("bob");
    expect(result.alice![0]!.commentId).toBe("comment001");
    expect(result.alice![0]!.isRead).toBe(false);
  });

  test("returns 0 for empty index", async () => {
    const count = await rebuildMentionsIndex(testDir, [], () => []);
    expect(count).toBe(0);

    const result = readMentionsFile(testDir);
    expect(result).toEqual({});
  });

  test("skips missing issue files", async () => {
    const issues: IndexEntry[] = [
      { id: "missing1", title: "Gone", status: "open", priority: 3, path: "issues/missing1.json" },
    ];

    const count = await rebuildMentionsIndex(testDir, issues, () => ["alice"]);
    expect(count).toBe(0);
  });

  test("rebuilds from multiple issues", async () => {
    // Issue 1: mentions @alice
    const issue1File = join(testDir, "issues", "issue001.json");
    writeFileSync(
      issue1File,
      JSON.stringify([
        { type: "create", timestamp: "2026-05-27T09:00:00.000Z", author: "bob", content: { title: "Issue 1" } },
        { type: "update", timestamp: "2026-05-27T09:01:00.000Z", author: "bob", content: { title: "Issue 1" } },
        { type: "comment", timestamp: "2026-05-27T10:00:00.000Z", author: "bob", content: { id: "c001", content: "@alice review" } },
      ]) + "\n",
    );

    // Issue 2: mentions @bob
    const issue2File = join(testDir, "issues", "issue002.json");
    writeFileSync(
      issue2File,
      JSON.stringify([
        { type: "create", timestamp: "2026-05-27T09:00:00.000Z", author: "alice", content: { title: "Issue 2" } },
        { type: "update", timestamp: "2026-05-27T09:01:00.000Z", author: "alice", content: { title: "Issue 2" } },
        { type: "comment", timestamp: "2026-05-27T11:00:00.000Z", author: "alice", content: { id: "c002", content: "@bob check" } },
      ]) + "\n",
    );

    const issues: IndexEntry[] = [
      { id: "issue001", title: "Issue 1", status: "open", priority: 3, path: "issues/issue001.json" },
      { id: "issue002", title: "Issue 2", status: "open", priority: 3, path: "issues/issue002.json" },
    ];

    const count = await rebuildMentionsIndex(testDir, issues, () => ["alice", "bob"]);

    expect(count).toBe(2);
    const result = readMentionsFile(testDir);
    expect(result.alice).toHaveLength(1);
    expect(result.bob).toHaveLength(1);
  });

  test("excludes deleted comments from rebuild", async () => {
    const issueFile = join(testDir, "issues", "issue001.json");
    writeFileSync(
      issueFile,
      JSON.stringify([
        { type: "create", timestamp: "2026-05-27T09:00:00.000Z", author: "bob", content: { title: "Test" } },
        { type: "update", timestamp: "2026-05-27T09:01:00.000Z", author: "bob", content: { title: "Test" } },
        { type: "comment", timestamp: "2026-05-27T10:00:00.000Z", author: "bob", content: { id: "c001", content: "@alice review" } },
        { type: "comment-delete", timestamp: "2026-05-27T10:01:00.000Z", author: "bob", content: { id: "c001" } },
      ]) + "\n",
    );

    const issues: IndexEntry[] = [
      { id: "issue001", title: "Test", status: "open", priority: 3, path: "issues/issue001.json" },
    ];

    const count = await rebuildMentionsIndex(testDir, issues, () => ["alice"]);
    expect(count).toBe(0);
  });

  test("clears existing index before rebuild", async () => {
    // Pre-populate with stale data
    const existing: MentionsFile = {
      alice: [
        {
          id: "stale00001",
          createdAt: "2026-05-27T10:00:00.000Z",
          mentionedUser: "alice",
          mentionedBy: "bob",
          issueId: "issue001",
          commentId: "c001",
          isRead: true,
        },
      ],
    };
    writeFileSync(join(testDir, "mentions.json"), JSON.stringify(existing));

    // Rebuild with no issues
    const count = await rebuildMentionsIndex(testDir, [], () => ["alice"]);

    expect(count).toBe(0);
    const result = readMentionsFile(testDir);
    expect(result).toEqual({});
  });

  test("spec deviation: rebuild should extract ALL @names, not just registered (AC9)", async () => {
    // Per spec: "Rebuild extracts ALL @names regardless of current user registration status."
    // This test documents that the current implementation filters by registered users during rebuild,
    // which deviates from the spec. If this test fails, the spec deviation has been fixed.
    const issueFile = join(testDir, "issues", "issue001.json");
    writeFileSync(
      issueFile,
      JSON.stringify([
        { type: "create", timestamp: "2026-05-27T09:00:00.000Z", author: "bob", content: { title: "Test" } },
        { type: "update", timestamp: "2026-05-27T09:01:00.000Z", author: "bob", content: { title: "Test" } },
        { type: "comment", timestamp: "2026-05-27T10:00:00.000Z", author: "bob", content: { id: "c001", content: "@revoked-user check this" } },
      ]) + "\n",
    );

    const issues: IndexEntry[] = [
      { id: "issue001", title: "Test", status: "open", priority: 3, path: "issues/issue001.json" },
    ];

    // "revoked-user" is NOT in the registered users list
    // Per spec, rebuild should still extract this mention
    const count = await rebuildMentionsIndex(testDir, issues, () => ["alice"]);

    // Per spec: count should be 1 and result should contain "revoked-user"
    // Current implementation: count will be 0 (filtered out)
    expect(count).toBe(1);
    const result = readMentionsFile(testDir);
    expect(result["revoked-user"]).toHaveLength(1);
  });
});
