/**
 * E2E: lifecycle — Type B tests (full workflow)
 *
 * Tests complete issue lifecycle: create -> update -> comment -> block -> resolve -> close.
 */
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  E2E_DATA_BRANCH,
  assertSuccess,
  ensureE2EWorktree,
  extractId,
  parseJson,
  resetWorktreeData,
  runAgt,
} from "./setup";

describe("E2E: lifecycle", () => {
  beforeAll(async () => {
    await ensureE2EWorktree(E2E_DATA_BRANCH);
  });

  beforeEach(() => {
    resetWorktreeData(E2E_DATA_BRANCH);
  });

  test("full issue lifecycle: create -> progress -> comment -> block -> resolve -> close", async () => {
    // 1. Create an issue
    const issueId = extractId(
      await runAgt(["create", "Lifecycle Bug", "--priority", "2", "--status", "todo"]),
    );

    // Verify creation
    let view = parseJson((await runAgt(["view", issueId])).stdout);
    expect(view.title).toBe("Lifecycle Bug");
    expect(view.status).toBe("todo");
    expect(view.priority).toBe(2);

    // 2. Update to in-progress
    assertSuccess(
      await runAgt(["update", issueId, "--status", "in-progress", "--assignee", "alice"]),
    );

    view = parseJson((await runAgt(["view", issueId])).stdout);
    expect(view.status).toBe("in-progress");
    expect(view.assignee).toBe("alice");

    // 3. Add comments
    const commentResult = await runAgt([
      "comments",
      "add",
      issueId,
      "--content",
      "Investigating the root cause",
    ]);
    assertSuccess(commentResult);

    const comments = parseJson(
      (await runAgt(["comments", "list", issueId])).stdout,
    );
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe("Investigating the root cause");

    // 4. Block by another issue
    const blockerId = extractId(await runAgt(["create", "Blocker Task"]));
    assertSuccess(
      await runAgt(["blockages", "add", issueId, "--by", blockerId]),
    );

    let blockages = parseJson(
      (await runAgt(["blockages", "list", issueId])).stdout,
    );
    expect(blockages.blockedBy).toHaveLength(1);
    expect(blockages.blockedBy[0].status).toBe("active");

    // 5. Resolve the blocker
    assertSuccess(
      await runAgt(["blockages", "resolve", issueId, "--by", blockerId]),
    );

    blockages = parseJson(
      (await runAgt(["blockages", "list", issueId])).stdout,
    );
    expect(blockages.blockedBy[0].status).toBe("resolved");

    // 6. Mark as done
    assertSuccess(await runAgt(["update", issueId, "--status", "done"]));

    view = parseJson((await runAgt(["view", issueId])).stdout);
    expect(view.status).toBe("done");

    // 7. Verify full history
    const history = parseJson(
      (await runAgt(["history", issueId])).stdout,
    );
    expect(history.length).toBeGreaterThanOrEqual(4); // creation, update(status+assignee), update(done)
  });

  test("multi-issue workflow with hierarchy and filtering", async () => {
    // Create a parent with two children
    const parentId = extractId(
      await runAgt(["create", "Epic", "--status", "todo", "--priority", "1"]),
    );
    const child1Id = extractId(
      await runAgt(["create", "Task 1", "--parentId", parentId, "--status", "todo"]),
    );
    const child2Id = extractId(
      await runAgt(["create", "Task 2", "--parentId", parentId, "--status", "in-progress"]),
    );

    // List should show all issues
    const list = parseJson((await runAgt(["list"])).stdout);
    expect(list).toHaveLength(3);

    // Verify children via list --parentId
    const childrenOfParent = parseJson(
      (await runAgt(["list", "--parentId", parentId])).stdout,
    );
    expect(childrenOfParent).toHaveLength(2);

    // Complete child1
    assertSuccess(await runAgt(["update", child1Id, "--status", "done"]));

    // Verify child1 is now done
    const child1View = parseJson(
      (await runAgt(["view", child1Id])).stdout,
    );
    expect(child1View.status).toBe("done");

    // Complete child2 too so all children are done
    assertSuccess(await runAgt(["update", child2Id, "--status", "done"]));

    // Now close parent — auto-closes done children
    assertSuccess(await runAgt(["update", parentId, "--status", "closed"]));

    const child1AfterClose = parseJson(
      (await runAgt(["view", child1Id])).stdout,
    );
    expect(child1AfterClose.status).toBe("closed");

    const child2AfterClose = parseJson(
      (await runAgt(["view", child2Id])).stdout,
    );
    expect(child2AfterClose.status).toBe("closed");
  });
});
