import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAgt } from "./helpers/runner";
import { createTestRepo, cleanupTestRepo, initAgt } from "./helpers/setup";
import { assertSuccess, assertError, parseJson, extractId, type CreateResult } from "./helpers/assertions";

describe("E2E: history", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = createTestRepo("e2e-history");
    await initAgt(testDir);
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("returns event array for an issue", async () => {
    const id = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "History Test"], testDir)).stdout,
    ));

    const result = await runAgt(["history", id], testDir);
    const events = assertSuccess<Array<{ type: string }>>(result);

    expect(events).toHaveLength(2); // creation + initial update
    expect(events[0].type).toBe("creation");
    expect(events[1].type).toBe("update");
  });

  test("shows events after update", async () => {
    const id = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Test"], testDir)).stdout,
    ));

    await runAgt(["update", id, "--title", "Updated"], testDir);

    const result = await runAgt(["history", id], testDir);
    const events = assertSuccess<Array<{ type: string }>>(result);

    expect(events).toHaveLength(3);
    expect(events[2].type).toBe("update");
  });

  test("shows comment events in history", async () => {
    const id = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Test"], testDir)).stdout,
    ));

    await runAgt(["comments", "add", id, "--content", "Hello"], testDir);

    const result = await runAgt(["history", id], testDir);
    const events = assertSuccess<Array<{ type: string }>>(result);

    expect(events).toHaveLength(3);
    expect(events[2].type).toBe("comment");
  });

  test("shows blockage events in history", async () => {
    const blockedId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Blocked"], testDir)).stdout,
    ));
    const blockerId = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Blocker"], testDir)).stdout,
    ));

    await runAgt(["blockages", "add", blockedId, "--by", blockerId], testDir);

    const result = await runAgt(["history", blockedId], testDir);
    const events = assertSuccess<Array<{ type: string }>>(result);

    // creation + update for blocked, then blockage-added
    expect(events.some((e) => e.type === "blockage-added")).toBe(true);
  });

  test("non-existent issue returns NOT_FOUND", async () => {
    const result = await runAgt(["history", "missing12345"], testDir);
    const error = assertError(result, "NOT_FOUND", 5);
    expect(error.result).toBe("NOT_FOUND");
  });

  test("issue with many events", async () => {
    const id = extractId(parseJson<CreateResult>(
      (await runAgt(["create", "Many Events"], testDir)).stdout,
    ));

    for (let i = 0; i < 10; i++) {
      await runAgt(["update", id, "--title", `Update ${i}`], testDir);
    }

    const result = await runAgt(["history", id], testDir);
    const events = assertSuccess<Array<{ type: string }>>(result);

    // 2 initial (creation + update) + 10 updates = 12
    expect(events).toHaveLength(12);
  });
});
