import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt } from "./helpers/setup";
import { assertSuccess, assertError, parseJson, extractId, type CreateResult } from "./helpers/assertions";

describe("E2E: blockages", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = createTestRepo("e2e-blockages");
    await initAgt(testDir);
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  async function createTwoIssues(): Promise<{ blocked: CreateResult; blocker: CreateResult }> {
    const blocked = parseJson<CreateResult>((await runAgt(["create", "Blocked"], testDir)).stdout);
    const blocker = parseJson<CreateResult>((await runAgt(["create", "Blocker"], testDir)).stdout);
    return { blocked, blocker };
  }

  test("add a blockage", async () => {
    const { blocked, blocker } = await createTwoIssues();

    const result = await runAgt(["blockages", "add", blocked.id, "--by", blocker.id], testDir);
    assertSuccess(result);
  });

  test("add multiple blockers at once", async () => {
    const blocked = parseJson<CreateResult>((await runAgt(["create", "Blocked"], testDir)).stdout);
    const blocker1 = parseJson<CreateResult>((await runAgt(["create", "Blocker 1"], testDir)).stdout);
    const blocker2 = parseJson<CreateResult>((await runAgt(["create", "Blocker 2"], testDir)).stdout);

    const result = await runAgt(
      ["blockages", "add", blocked.id, "--by", blocker1.id, blocker2.id],
      testDir,
    );
    assertSuccess(result);

    // Verify via list
    const listResult = await runAgt(["blockages", "list", blocked.id], testDir);
    const blockages = parseJson<{ blockedBy: Array<{ blockerId: string }> }>(listResult.stdout);
    expect(blockages.blockedBy).toHaveLength(2);
  });

  test("resolve a blockage", async () => {
    const { blocked, blocker } = await createTwoIssues();
    await runAgt(["blockages", "add", blocked.id, "--by", blocker.id], testDir);

    const result = await runAgt(["blockages", "resolve", blocked.id, "--by", blocker.id], testDir);
    assertSuccess(result);

    // Verify via list
    const listResult = await runAgt(["blockages", "list", blocked.id], testDir);
    const blockages = parseJson<{ blockedBy: Array<{ status: string }> }>(listResult.stdout);
    expect(blockages.blockedBy[0].status).toBe("resolved");
  });

  test("delete a blockage", async () => {
    const { blocked, blocker } = await createTwoIssues();
    await runAgt(["blockages", "add", blocked.id, "--by", blocker.id], testDir);

    const result = await runAgt(["blockages", "delete", blocked.id, "--by", blocker.id], testDir);
    assertSuccess(result);

    // Verify via list
    const listResult = await runAgt(["blockages", "list", blocked.id], testDir);
    const blockages = parseJson<{ blockedBy: unknown[] }>(listResult.stdout);
    expect(blockages.blockedBy).toHaveLength(0);
  });

  test("list blockages returns correct structure", async () => {
    const { blocked, blocker } = await createTwoIssues();
    await runAgt(["blockages", "add", blocked.id, "--by", blocker.id], testDir);

    const result = await runAgt(["blockages", "list", blocked.id], testDir);
    const blockages = assertSuccess<{
      issueId: string;
      blockedBy: Array<{ blockerId: string; blockedId: string; status: string }>;
      blocks: unknown[];
    }>(result);

    expect(blockages.issueId).toBe(blocked.id);
    expect(blockages.blockedBy).toHaveLength(1);
    expect(blockages.blockedBy[0].blockerId).toBe(blocker.id);
    expect(blockages.blockedBy[0].blockedId).toBe(blocked.id);
    expect(blockages.blockedBy[0].status).toBe("active");
    expect(blockages.blocks).toHaveLength(0);
  });

  test("empty blockage list for standalone issue", async () => {
    const issue = parseJson<CreateResult>((await runAgt(["create", "Standalone"], testDir)).stdout);

    const result = await runAgt(["blockages", "list", issue.id], testDir);
    const blockages = assertSuccess<{ blockedBy: unknown[]; blocks: unknown[] }>(result);
    expect(blockages.blockedBy).toEqual([]);
    expect(blockages.blocks).toEqual([]);
  });

  test("cycle detection prevents circular blockage", async () => {
    const a = parseJson<CreateResult>((await runAgt(["create", "A"], testDir)).stdout);
    const b = parseJson<CreateResult>((await runAgt(["create", "B"], testDir)).stdout);

    await runAgt(["blockages", "add", a.id, "--by", b.id], testDir);

    const result = await runAgt(["blockages", "add", b.id, "--by", a.id], testDir);
    assertError(result, "BLOCKAGE_CYCLE", 11);
  });

  test("blockage on non-existent issue returns NOT_FOUND", async () => {
    const blocker = parseJson<CreateResult>((await runAgt(["create", "Blocker"], testDir)).stdout);

    const result = await runAgt(["blockages", "add", "missing12345", "--by", blocker.id], testDir);
    assertError(result, "NOT_FOUND", 5);
  });

  test("blockage list on non-existent issue returns NOT_FOUND", async () => {
    const result = await runAgt(["blockages", "list", "missing12345"], testDir);
    assertError(result, "NOT_FOUND", 5);
  });

  test("blockage chain: A blocks B blocks C", async () => {
    const a = parseJson<CreateResult>((await runAgt(["create", "A"], testDir)).stdout);
    const b = parseHashResult((await runAgt(["create", "B"], testDir)).stdout);
    const c = parseHashResult((await runAgt(["create", "C"], testDir)).stdout);

    // B blocked by A
    await runAgt(["blockages", "add", b.id, "--by", a.id], testDir);
    // C blocked by B
    await runAgt(["blockages", "add", c.id, "--by", b.id], testDir);

    // Verify B is blocked by A and blocks C
    const bBlockages = parseJson<{
      blockedBy: Array<{ blockerId: string }>;
      blocks: Array<{ blockedId: string }>;
    }>((await runAgt(["blockages", "list", b.id], testDir)).stdout);

    expect(bBlockages.blockedBy).toHaveLength(1);
    expect(bBlockages.blockedBy[0].blockerId).toBe(a.id);
    expect(bBlockages.blocks).toHaveLength(1);
    expect(bBlockages.blocks[0].blockedId).toBe(c.id);
  });
});

function parseHashResult(stdout: string): CreateResult {
  return JSON.parse(stdout.trim()) as CreateResult;
}
