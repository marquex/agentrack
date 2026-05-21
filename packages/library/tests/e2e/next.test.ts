/**
 * E2E: next — Type B tests (tracker operations)
 */
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  ensureE2EWorktree,
  extractId,
  parseJson,
  resetWorktreeData,
  runAgt,
} from "./setup";

describe("E2E: next", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  test("returns the best issue for a user", async () => {
    await runAgt([
      "create",
      "Low Priority",
      "--assignee",
      "alice",
      "--priority",
      "5",
      "--status",
      "todo",
    ]);
    await runAgt([
      "create",
      "High Priority",
      "--assignee",
      "alice",
      "--priority",
      "1",
      "--status",
      "todo",
    ]);
    await runAgt([
      "create",
      "Medium Priority",
      "--assignee",
      "alice",
      "--priority",
      "3",
      "--status",
      "todo",
    ]);

    const result = await runAgt(["next", "alice"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");

    const parsed = parseJson(result.stdout);
    expect(parsed.title).toBe("High Priority");
    expect(parsed.assignee).toBe("alice");
    expect(parsed.priority).toBe(1);
  });

  test("excludes blocked issues", async () => {
    const blockedResult = await runAgt([
      "create",
      "Blocked",
      "--assignee",
      "alice",
      "--priority",
      "1",
      "--status",
      "todo",
    ]);
    const blockedId = extractId(blockedResult);
    await runAgt([
      "create",
      "Unblocked",
      "--assignee",
      "alice",
      "--priority",
      "3",
      "--status",
      "todo",
    ]);
    const blockerId = extractId(await runAgt(["create", "Blocker"]));

    await runAgt(["blockages", "add", blockedId, "--by", blockerId]);

    const result = await runAgt(["next", "alice"]);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed.title).toBe("Unblocked");
  });

  test("returns NO_ISSUES_AVAILABLE when no matching issues", async () => {
    await runAgt([
      "create",
      "Bob's Issue",
      "--assignee",
      "bob",
      "--priority",
      "1",
    ]);

    const result = await runAgt(["next", "alice"]);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed.result).toBe("NO_ISSUES_AVAILABLE");
    expect(parsed.message).toContain("alice");
  });

  test("excludes done and closed issues", async () => {
    await runAgt([
      "create",
      "Done Issue",
      "--assignee",
      "alice",
      "--status",
      "done",
    ]);
    await runAgt([
      "create",
      "Closed Issue",
      "--assignee",
      "alice",
      "--status",
      "closed",
    ]);
    await runAgt([
      "create",
      "Todo Issue",
      "--assignee",
      "alice",
      "--status",
      "todo",
      "--priority",
      "3",
    ]);

    const result = await runAgt(["next", "alice"]);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed.title).toBe("Todo Issue");
  });

  test("resolved blockage treated as unblocked", async () => {
    const issueResult = await runAgt([
      "create",
      "Previously Blocked",
      "--assignee",
      "alice",
      "--priority",
      "1",
      "--status",
      "todo",
    ]);
    const issueId = extractId(issueResult);
    const blockerId = extractId(await runAgt(["create", "Blocker"]));

    await runAgt(["blockages", "add", issueId, "--by", blockerId]);
    await runAgt(["blockages", "resolve", issueId, "--by", blockerId]);

    const result = await runAgt(["next", "alice"]);

    expect(result.exitCode).toBe(0);

    const parsed = parseJson(result.stdout);
    expect(parsed.title).toBe("Previously Blocked");
  });
});
