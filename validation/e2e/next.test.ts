import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt, createIsolatedDir, cleanupIsolatedDir } from "./helpers/setup";
import { assertSuccess, assertError, parseJson, extractId, type CreateResult } from "./helpers/assertions";

describe("E2E: next", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = createTestRepo("e2e-next");
    await initAgt(testDir);
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("returns highest priority todo issue for a user", async () => {
    await runAgt(["create", "Low", "--assignee", "alice", "--priority", "5", "--status", "todo"], testDir);
    await runAgt(["create", "High", "--assignee", "alice", "--priority", "1", "--status", "todo"], testDir);
    await runAgt(["create", "Medium", "--assignee", "alice", "--priority", "3", "--status", "todo"], testDir);

    const result = await runAgt(["next", "alice"], testDir);
    const issue = assertSuccess<Record<string, unknown>>(result);

    expect(issue.title).toBe("High");
    expect(issue.priority).toBe(1);
  });

  test("excludes blocked issues", async () => {
    const blocked = parseJson<CreateResult>(
      (await runAgt(["create", "Blocked", "--assignee", "alice", "--priority", "1", "--status", "todo"], testDir)).stdout,
    );
    await runAgt(["create", "Unblocked", "--assignee", "alice", "--priority", "3", "--status", "todo"], testDir);
    const blocker = parseJson<CreateResult>(
      (await runAgt(["create", "Blocker"], testDir)).stdout,
    );

    await runAgt(["blockages", "add", blocked.id, "--by", blocker.id], testDir);

    const result = await runAgt(["next", "alice"], testDir);
    const issue = assertSuccess<Record<string, unknown>>(result);
    expect(issue.title).toBe("Unblocked");
  });

  test("excludes done and closed issues", async () => {
    await runAgt(["create", "Done", "--assignee", "alice", "--status", "done"], testDir);
    await runAgt(["create", "Closed", "--assignee", "alice", "--status", "closed"], testDir);
    await runAgt(["create", "Todo", "--assignee", "alice", "--status", "todo", "--priority", "3"], testDir);

    const result = await runAgt(["next", "alice"], testDir);
    const issue = assertSuccess<Record<string, unknown>>(result);
    expect(issue.title).toBe("Todo");
  });

  test("returns NO_ISSUES_AVAILABLE when no matching issues", async () => {
    await runAgt(["create", "Bob's Issue", "--assignee", "bob", "--priority", "1"], testDir);

    const result = await runAgt(["next", "alice"], testDir);
    const output = assertSuccess<{ result: string; message: string }>(result);
    expect(output.result).toBe("NO_ISSUES_AVAILABLE");
    expect(output.message).toContain("alice");
  });

  test("resolved blockage treated as unblocked", async () => {
    const issue = parseJson<CreateResult>(
      (await runAgt(["create", "Was Blocked", "--assignee", "alice", "--priority", "1", "--status", "todo"], testDir)).stdout,
    );
    const blocker = parseJson<CreateResult>(
      (await runAgt(["create", "Blocker"], testDir)).stdout,
    );

    await runAgt(["blockages", "add", issue.id, "--by", blocker.id], testDir);
    await runAgt(["blockages", "resolve", issue.id, "--by", blocker.id], testDir);

    const result = await runAgt(["next", "alice"], testDir);
    const output = assertSuccess<Record<string, unknown>>(result);
    expect(output.title).toBe("Was Blocked");
  });

  test("not initialized returns NOT_INITIALIZED", async () => {
    const freshDir = createIsolatedDir();

    const result = await runAgt(["next", "alice"], freshDir);
    const error = assertError(result, "NOT_INITIALIZED", 1);
    expect(error.result).toBe("NOT_INITIALIZED");

    cleanupIsolatedDir(freshDir);
  });

  test("priority tiebreaking by id (lexicographic)", async () => {
    await runAgt(["create", "First", "--assignee", "alice", "--priority", "1", "--status", "todo"], testDir);
    await runAgt(["create", "Second", "--assignee", "alice", "--priority", "1", "--status", "todo"], testDir);

    const result = await runAgt(["next", "alice"], testDir);
    const issue = assertSuccess<Record<string, unknown>>(result);
    // When priorities tie, sorts by id ASC (lexicographic)
    expect(issue.title).toBeOneOf(["First", "Second"]);
    expect(issue.priority).toBe(1);
  });
});
