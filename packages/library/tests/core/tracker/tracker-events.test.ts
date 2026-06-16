/**
 * Tests for the events namespace: tracker.eventsList, tracker.eventsAdd,
 * the deprecated tracker.history alias, and CustomEvent semantics.
 *
 * Covers spec §4 (tracker API), §6 (acceptance criteria 1, 3, 4, 5, 7, 8, 9),
 * and §7 (tests to add: eventsList filter, eventsAdd success + all error paths).
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentrackError } from "../../../src/core/errors";
import { Tracker } from "../../../src/core/tracker";
import {
  RESERVED_EVENT_TYPES,
  isReservedEventType,
} from "../../../src/types/event";

describe("Tracker events namespace", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `agentrack-events-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // ─── eventsList ───────────────────────────────────────────────────

  describe("eventsList()", () => {
    let tracker: Tracker;

    beforeEach(async () => {
      tracker = new Tracker(testDir);
      await tracker.init();
    });

    test("returns full event list with no filter", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      const result = await tracker.eventsList(created.id);

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result).toHaveLength(2); // creation + initial update
        expect(result[0].type).toBe("creation");
        expect(result[1].type).toBe("update");
      }
    });

    test("returns filtered subset with --type update", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");
      await tracker.update(created.id, { title: "Updated" });
      await tracker.commentsAdd(created.id, { content: "hi" });

      const updates = await tracker.eventsList(created.id, { type: "update" });

      expect(Array.isArray(updates)).toBe(true);
      if (Array.isArray(updates)) {
        expect(updates.length).toBe(2); // initial + explicit update
        for (const event of updates) expect(event.type).toBe("update");
      }
    });

    test("returns filtered subset with type comment", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");
      await tracker.commentsAdd(created.id, { content: "first" });
      await tracker.commentsAdd(created.id, { content: "second" });

      const comments = await tracker.eventsList(created.id, { type: "comment" });

      expect(Array.isArray(comments)).toBe(true);
      if (Array.isArray(comments)) {
        expect(comments).toHaveLength(2);
        for (const event of comments) expect(event.type).toBe("comment");
      }
    });

    test("returns empty array for a type with no matches", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      const result = await tracker.eventsList(created.id, {
        type: "blockage-resolved",
      });

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) expect(result).toHaveLength(0);
    });

    test("filters by custom event type too", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");
      await tracker.eventsAdd(created.id, {
        type: "label.added",
        content: { label: "bug" },
      });

      const customs = await tracker.eventsList(created.id, {
        type: "label.added",
      });

      expect(Array.isArray(customs)).toBe(true);
      if (Array.isArray(customs)) {
        expect(customs).toHaveLength(1);
        expect(customs[0].type).toBe("label.added");
      }
    });

    test("throws NOT_FOUND for non-existent id", async () => {
      expect(tracker.eventsList("missing12345")).rejects.toThrow(AgentrackError);
    });

    test("throws ISSUE_MISSING when file is deleted", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      unlinkSync(join(testDir, ".agentrack", "issues", `${created.id}.json`));

      expect(tracker.eventsList(created.id)).rejects.toThrow(AgentrackError);
    });

    test("throws NOT_INITIALIZED when no .agentrack/ exists", async () => {
      const uninitDir = join(tmpdir(), `no-agentrack-${Date.now()}`);
      mkdirSync(uninitDir, { recursive: true });
      const uninitTracker = new Tracker(uninitDir);
      try {
        await expect(uninitTracker.eventsList("abc1234567")).rejects.toThrow(
          AgentrackError,
        );
      } finally {
        rmSync(uninitDir, { recursive: true, force: true });
      }
    });
  });

  // ─── eventsAdd ────────────────────────────────────────────────────

  describe("eventsAdd()", () => {
    let tracker: Tracker;

    beforeEach(async () => {
      tracker = new Tracker(testDir);
      await tracker.init();
    });

    test("appends a custom event read back via eventsList", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      const result = await tracker.eventsAdd(created.id, {
        type: "label.added",
        content: { label: "bug" },
      });

      expect(result).toEqual({ result: "OK" });

      const events = await tracker.eventsList(created.id);
      if (!Array.isArray(events)) throw new Error("eventsList failed");
      const custom = events[events.length - 1];
      expect(custom.type).toBe("label.added");
      expect(custom.content).toEqual({ label: "bug" });
      expect(custom.author).toBeDefined();
      expect(typeof custom.timestamp).toBe("string");
      // ISO 8601 parseable
      expect(() => new Date(custom.timestamp).toISOString()).not.toThrow();
    });

    test("stamps an ISO 8601 timestamp and resolves author", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      const before = new Date().toISOString();
      await tracker.eventsAdd(created.id, {
        type: "review.requested",
        content: { reviewer: "alice" },
      });
      const after = new Date().toISOString();

      const events = await tracker.eventsList(created.id);
      if (!Array.isArray(events)) throw new Error("eventsList failed");
      const custom = events[events.length - 1] as {
        timestamp: string;
        author: string;
      };
      expect(custom.timestamp >= before).toBe(true);
      expect(custom.timestamp <= after).toBe(true);
      expect(custom.author.length).toBeGreaterThan(0);
    });

    test("honors an explicit author override", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      await tracker.eventsAdd(created.id, {
        type: "deploy",
        content: { env: "prod" },
        author: "ci-bot",
      });

      const events = await tracker.eventsList(created.id);
      if (!Array.isArray(events)) throw new Error("eventsList failed");
      const custom = events[events.length - 1] as { author: string };
      expect(custom.author).toBe("ci-bot");
    });

    test("bumps updatedAt but leaves computed state unchanged", async () => {
      const created = await tracker.create({
        title: "Original",
        tags: ["x"],
        priority: 2,
      });
      if (!("id" in created)) throw new Error("Create failed");

      const before = await tracker.view(created.id);
      if (!("title" in before)) throw new Error("view failed");

      await tracker.eventsAdd(created.id, {
        type: "label.added",
        content: { label: "bug" },
      });

      const after = await tracker.view(created.id);
      if (!("title" in after)) throw new Error("view failed after add");

      // State fields unchanged
      expect(after.title).toBe(before.title);
      expect(after.status).toBe(before.status);
      expect(after.assignee).toBe(before.assignee);
      expect(after.tags).toEqual(before.tags);
      expect(after.priority).toBe(before.priority);
      expect(after.parentId).toBe(before.parentId);
      // updatedAt bumped (custom event is real activity)
      expect(after.updatedAt >= before.updatedAt).toBe(true);
    });

    test("does not appear in computed comments", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");
      await tracker.commentsAdd(created.id, { content: "real comment" });

      await tracker.eventsAdd(created.id, {
        type: "note",
        content: { text: "not a comment" },
      });

      const commentsResult = await tracker.commentsList(created.id);
      if (!Array.isArray(commentsResult)) throw new Error("commentsList failed");
      expect(commentsResult).toHaveLength(1);
      expect(commentsResult[0].content).toBe("real comment");
    });

    test("rejects every reserved type with RESERVED_EVENT_TYPE", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      for (const reserved of RESERVED_EVENT_TYPES) {
        const result = await tracker.eventsAdd(created.id, {
          type: reserved,
          content: { x: 1 },
        });
        expect(result).toBeInstanceOf(AgentrackError);
        if (result instanceof AgentrackError) {
          expect(result.result).toBe("RESERVED_EVENT_TYPE");
          expect(result.exitCode).toBe(22);
        }
      }
    });

    test("rejects missing type with INVALID_PARAMS", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      const result = await tracker.eventsAdd(created.id, {
        type: "",
        content: { x: 1 },
      });
      expect(result).toBeInstanceOf(AgentrackError);
      if (result instanceof AgentrackError) {
        expect(result.result).toBe("INVALID_PARAMS");
        expect(result.exitCode).toBe(10);
      }
    });

    test("rejects whitespace-only type with INVALID_PARAMS", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      const result = await tracker.eventsAdd(created.id, {
        type: "   ",
        content: { x: 1 },
      });
      expect(result).toBeInstanceOf(AgentrackError);
      if (result instanceof AgentrackError) expect(result.exitCode).toBe(10);
    });

    test("rejects array content with INVALID_PARAMS", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      const result = await tracker.eventsAdd(created.id, {
        type: "label.added",
        content: [1, 2, 3] as unknown as Record<string, unknown>,
      });
      expect(result).toBeInstanceOf(AgentrackError);
      if (result instanceof AgentrackError) {
        expect(result.result).toBe("INVALID_PARAMS");
        expect(result.exitCode).toBe(10);
      }
    });

    test("rejects null content with INVALID_PARAMS", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      const result = await tracker.eventsAdd(created.id, {
        type: "label.added",
        content: null as unknown as Record<string, unknown>,
      });
      expect(result).toBeInstanceOf(AgentrackError);
      if (result instanceof AgentrackError) expect(result.exitCode).toBe(10);
    });

    test("throws NOT_FOUND for non-existent id", async () => {
      // NOT_FOUND / ISSUE_MISSING surface as thrown errors because they are
      // checked before the validation return-paths.
      await expect(
        tracker.eventsAdd("missing12345", { type: "x", content: {} }),
      ).rejects.toThrow(AgentrackError);
    });

    test("throws ISSUE_MISSING when file is deleted", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");
      unlinkSync(join(testDir, ".agentrack", "issues", `${created.id}.json`));

      await expect(
        tracker.eventsAdd(created.id, { type: "x", content: {} }),
      ).rejects.toThrow(AgentrackError);
    });

    test("throws NOT_INITIALIZED when no .agentrack/ exists", async () => {
      const uninitDir = join(tmpdir(), `no-agentrack-${Date.now()}`);
      mkdirSync(uninitDir, { recursive: true });
      const uninitTracker = new Tracker(uninitDir);
      try {
        await expect(
          uninitTracker.eventsAdd("abc1234567", { type: "x", content: {} }),
        ).rejects.toThrow(AgentrackError);
      } finally {
        rmSync(uninitDir, { recursive: true, force: true });
      }
    });

    test("round-trips content through replayEvents identically", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");

      const payload = { nested: { a: 1, b: [2, 3] }, flag: true, name: "x" };
      await tracker.eventsAdd(created.id, {
        type: "complex.event",
        content: payload,
      });

      const events = await tracker.eventsList(created.id, {
        type: "complex.event",
      });
      if (!Array.isArray(events)) throw new Error("eventsList failed");
      expect(events).toHaveLength(1);
      expect(events[0].content).toEqual(payload);
      expect(events[0].type).toBe("complex.event");
    });
  });

  // ─── history (deprecated alias) ───────────────────────────────────

  describe("history() deprecated alias", () => {
    let tracker: Tracker;

    beforeEach(async () => {
      tracker = new Tracker(testDir);
      await tracker.init();
    });

    test("still works and returns the unfiltered list", async () => {
      const created = await tracker.create({ title: "Test" });
      if (!("id" in created)) throw new Error("Create failed");
      await tracker.commentsAdd(created.id, { content: "hi" });

      const history = await tracker.history(created.id);
      const eventsList = await tracker.eventsList(created.id);

      expect(history).toEqual(eventsList);
      if (Array.isArray(history)) expect(history.length).toBe(3);
    });
  });

  // ─── reserved-type registry helpers ───────────────────────────────

  describe("RESERVED_EVENT_TYPES registry", () => {
    test("contains exactly the 8 agentrack reserved types", () => {
      expect([...RESERVED_EVENT_TYPES]).toEqual([
        "creation",
        "update",
        "comment",
        "comment-update",
        "comment-delete",
        "blockage-added",
        "blockage-resolved",
        "blockage-deleted",
      ]);
    });

    test("isReservedEventType returns true for each reserved type", () => {
      for (const reserved of RESERVED_EVENT_TYPES) {
        expect(isReservedEventType(reserved)).toBe(true);
      }
    });

    test("isReservedEventType returns false for custom types", () => {
      expect(isReservedEventType("label.added")).toBe(false);
      expect(isReservedEventType("review.requested")).toBe(false);
      expect(isReservedEventType("")).toBe(false);
      expect(isReservedEventType("creation ")).toBe(false); // trailing space
    });
  });

});
