import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt, setAuthMode } from "./helpers/setup";
import { parseJson, type CreateResult } from "./helpers/assertions";

/**
 * Full lifecycle E2E test.
 *
 * This test exercises a realistic multi-step workflow that spans many CLI commands:
 *
 * init → create parent → create child → update child → add comment →
 * add blockage → resolve blockage → update parent (auto-promotion) →
 * close parent → verify cascade → list → history → users register →
 * auth mode change → verify auth enforcement
 *
 * This validates that commands compose correctly and state is consistent
 * across operations — something no individual command test can verify.
 */
describe("E2E: full lifecycle", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestRepo("e2e-lifecycle");
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("complete issue lifecycle from init to close", async () => {
    // ─── Step 1: Init ────────────────────────────────────────────
    const initResult = await runAgt(["init"], testDir);
    expect(initResult.exitCode).toBe(0);
    const initOutput = parseJson<{ result: string; scenario: string; path: string }>(initResult.stdout);
    expect(initOutput.result).toBe("OK");
    expect(initOutput.scenario).toBe("fresh");
    expect(existsSync(join(testDir, ".agentrack", "config.json"))).toBe(true);

    // ─── Step 2: Create parent issue ─────────────────────────────
    const parentResult = await runAgt(
      ["create", "Build feature X", "--description", "Implement the feature",
       "--assignee", "alice", "--priority", "1", "--status", "todo",
       "--tags", "feature,backend"],
      testDir,
    );
    expect(parentResult.exitCode).toBe(0);
    const parent = parseJson<CreateResult>(parentResult.stdout);
    expect(parent.id).toHaveLength(10);

    // ─── Step 3: Create child issues ─────────────────────────────
    const child1Result = await runAgt(
      ["create", "Design API", "--parentId", parent.id, "--assignee", "alice",
       "--priority", "1", "--status", "todo"],
      testDir,
    );
    expect(child1Result.exitCode).toBe(0);
    const child1 = parseJson<CreateResult>(child1Result.stdout);

    const child2Result = await runAgt(
      ["create", "Write tests", "--parentId", parent.id, "--assignee", "bob",
       "--priority", "2", "--status", "todo"],
      testDir,
    );
    expect(child2Result.exitCode).toBe(0);
    const child2 = parseJson<CreateResult>(child2Result.stdout);

    // ─── Step 4: Verify hierarchy via list ────────────────────────
    const listResult = await runAgt(["list", "--parentId", parent.id], testDir);
    expect(listResult.exitCode).toBe(0);
    const children = parseJson<Array<{ id: string; parentId: string }>>(listResult.stdout);
    expect(children).toHaveLength(2);
    for (const child of children) {
      expect(child.parentId).toBe(parent.id);
    }

    // ─── Step 5: Update child to in-progress → parent auto-promotes ──
    const updateChildResult = await runAgt(
      ["update", child1.id, "--status", "in-progress"],
      testDir,
    );
    expect(updateChildResult.exitCode).toBe(0);

    // Verify parent was auto-promoted to in-progress
    const parentView1 = await runAgt(["view", parent.id], testDir);
    const parentState1 = parseJson<Record<string, unknown>>(parentView1.stdout);
    expect(parentState1.status).toBe("in-progress");

    // ─── Step 6: Add comments ────────────────────────────────────
    const comment1Result = await runAgt(
      ["comments", "add", child1.id, "--content", "Starting the API design"],
      testDir,
    );
    expect(comment1Result.exitCode).toBe(0);

    const comment2Result = await runAgt(
      ["comments", "add", child1.id, "--content", "Design complete, ready for review"],
      testDir,
    );
    expect(comment2Result.exitCode).toBe(0);

    // Verify comments
    const commentsListResult = await runAgt(["comments", "list", child1.id], testDir);
    const comments = parseJson<Array<{ content: string }>>(commentsListResult.stdout);
    expect(comments).toHaveLength(2);

    // ─── Step 7: Add blockage on child2 ──────────────────────────
    const blockerResult = await runAgt(
      ["create", "External dependency", "--status", "todo"],
      testDir,
    );
    const blocker = parseJson<CreateResult>(blockerResult.stdout);

    await runAgt(["blockages", "add", child2.id, "--by", blocker.id], testDir);

    // Verify blockage exists
    const blockagesResult = await runAgt(["blockages", "list", child2.id], testDir);
    const blockages = parseJson<{ blockedBy: Array<{ status: string }> }>(blockagesResult.stdout);
    expect(blockages.blockedBy).toHaveLength(1);
    expect(blockages.blockedBy[0].status).toBe("active");

    // ─── Step 8: Verify next command skips blocked issue ──────────
    const nextResult = await runAgt(["next", "bob"], testDir);
    const nextIssue = parseJson<Record<string, unknown>>(nextResult.stdout);
    // child2 is blocked, so bob should get NO_ISSUES_AVAILABLE (only child2 is assigned to bob)
    expect(nextIssue.result).toBe("NO_ISSUES_AVAILABLE");

    // ─── Step 9: Resolve blockage ────────────────────────────────
    await runAgt(
      ["update", blocker.id, "--status", "done"],
      testDir,
    );
    await runAgt(["blockages", "resolve", child2.id, "--by", blocker.id], testDir);

    // Verify blockage resolved
    const blockagesAfterResolve = await runAgt(["blockages", "list", child2.id], testDir);
    const resolvedBlockages = parseJson<{ blockedBy: Array<{ status: string }> }>(
      blockagesAfterResolve.stdout,
    );
    expect(resolvedBlockages.blockedBy[0].status).toBe("resolved");

    // ─── Step 10: Now bob's next issue is child2 ──────────────────
    const nextResult2 = await runAgt(["next", "bob"], testDir);
    const nextIssue2 = parseJson<Record<string, unknown>>(nextResult2.stdout);
    expect(nextIssue2.title).toBe("Write tests");

    // ─── Step 11: Complete child1 ────────────────────────────────
    await runAgt(["update", child1.id, "--status", "done"], testDir);

    // ─── Step 12: Complete child2 ────────────────────────────────
    await runAgt(["update", child2.id, "--status", "done"], testDir);

    // ─── Step 13: Close parent → children auto-close ─────────────
    await runAgt(["update", parent.id, "--status", "closed"], testDir);

    // Verify all are closed
    const parentId = parent.id;
    for (const id of [parentId, child1.id, child2.id]) {
      const viewResult = await runAgt(["view", id], testDir);
      const issue = parseJson<Record<string, unknown>>(viewResult.stdout);
      expect(issue.status).toBe("closed");
    }

    // ─── Step 14: History reflects full lifecycle ────────────────
    const historyResult = await runAgt(["history", child1.id], testDir);
    const history = parseJson<Array<{ type: string; author?: string }>>(historyResult.stdout);
    // Should have: creation, update(initial), update(in-progress), update(done), update(auto-closed)
    expect(history.length).toBeGreaterThan(3);

    // ─── Step 15: List all issues ────────────────────────────────
    const allListResult = await runAgt(["list"], testDir);
    const allIssues = parseJson<Array<{ id: string; status: string }>>(allListResult.stdout);
    expect(allIssues.length).toBe(4); // parent + child1 + child2 + blocker
    // Parent, child1, child2 are closed (auto-closed cascade)
    // Blocker was set to "done" in step 9 — it's not a child of parent so not auto-closed
    for (const issue of allIssues) {
      if (issue.id === blocker.id) {
        expect(issue.status).toBe("done");
      } else {
        expect(issue.status).toBe("closed");
      }
    }

    // ─── Step 16: Users register ─────────────────────────────────
    const regResult = await runAgt(["users", "register", "charlie"], testDir);
    expect(regResult.exitCode).toBe(0);
    const regOutput = parseJson<{ result: string; token: string }>(regResult.stdout);
    expect(regOutput.result).toBe("OK");

    // ─── Step 17: Change auth mode to read-only ──────────────────
    setAuthMode(testDir, "read-only");

    // Verify read operations still work
    const listAfterAuth = await runAgt(["list"], testDir);
    expect(listAfterAuth.exitCode).toBe(0);

    // Verify write operations are blocked
    const createAfterAuth = await runAgt(["create", "Should Fail"], testDir);
    expect(createAfterAuth.exitCode).toBe(2);

    // ─── Step 18: Write with token succeeds ──────────────────────
    const createWithToken = await runAgt(
      ["create", "With Token"],
      testDir,
      { AGENTACK_USER_TOKEN: regOutput.token },
    );
    expect(createWithToken.exitCode).toBe(0);
  });

  test("lifecycle with multiple related issues and blockages", async () => {
    await initAgt(testDir);

    // Create a chain of issues: A → B → C (each blocks the next)
    const a = parseJson<CreateResult>((await runAgt(["create", "Foundation", "--priority", "1", "--status", "todo"], testDir)).stdout);
    const b = parseJson<CreateResult>((await runAgt(["create", "Middle", "--priority", "2", "--status", "todo"], testDir)).stdout);
    const c = parseJson<CreateResult>((await runAgt(["create", "Top", "--priority", "3", "--status", "todo"], testDir)).stdout);

    // B blocked by A, C blocked by B
    await runAgt(["blockages", "add", b.id, "--by", a.id], testDir);
    await runAgt(["blockages", "add", c.id, "--by", b.id], testDir);

    // Verify chain via blockages list
    const bBlockages = parseJson<{ blockedBy: Array<{ blockerId: string }>; blocks: Array<{ blockedId: string }> }>(
      (await runAgt(["blockages", "list", b.id], testDir)).stdout,
    );
    expect(bBlockages.blockedBy[0].blockerId).toBe(a.id);
    expect(bBlockages.blocks[0].blockedId).toBe(c.id);

    // Complete A, resolve its blockage on B
    await runAgt(["update", a.id, "--status", "done"], testDir);
    await runAgt(["blockages", "resolve", b.id, "--by", a.id], testDir);

    // Complete B, resolve its blockage on C
    await runAgt(["update", b.id, "--status", "done"], testDir);
    await runAgt(["blockages", "resolve", c.id, "--by", b.id], testDir);

    // Complete C
    await runAgt(["update", c.id, "--status", "done"], testDir);

    // Verify all done
    for (const id of [a.id, b.id, c.id]) {
      const viewResult = await runAgt(["view", id], testDir);
      const issue = parseJson<Record<string, unknown>>(viewResult.stdout);
      expect(issue.status).toBe("done");
    }
  });
});
