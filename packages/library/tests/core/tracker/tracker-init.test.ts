import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Tracker } from "../../../src/core/tracker";

describe("Tracker", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `agentrack-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("init()", () => {
    test("creates .agentrack/ with all files and correct contents", async () => {
      const tracker = new Tracker(testDir);
      const result = await tracker.init();

      expect(result.result).toBe("OK");
      expect(result.path).toBe(resolve(join(testDir, ".agentrack")));

      // Verify directory exists
      expect(existsSync(join(testDir, ".agentrack"))).toBe(true);

      // Verify issues directory exists
      expect(existsSync(join(testDir, ".agentrack", "issues"))).toBe(true);

      // Verify config.json
      const config = JSON.parse(
        readFileSync(join(testDir, ".agentrack", "config.json"), "utf-8"),
      );
      expect(config).toEqual({
        auth: {
          mode: "open",
          defaultUser: "anonymous",
        },
      });

      // Verify index.json
      const index = JSON.parse(readFileSync(join(testDir, ".agentrack", "index.json"), "utf-8"));
      expect(index).toEqual({
        open: [],
        closed: [],
        childrenOf: {},
      });

      // Verify dependencies.json
      const deps = JSON.parse(
        readFileSync(join(testDir, ".agentrack", "dependencies.json"), "utf-8"),
      );
      expect(deps).toEqual({
        blockedBy: {},
        blocks: {},
      });

      // Verify users.json
      const users = JSON.parse(readFileSync(join(testDir, ".agentrack", "users.json"), "utf-8"));
      expect(users).toEqual({
        users: [],
      });
    });

    test("is idempotent — second call returns ALREADY_INITIALIZED", async () => {
      const tracker = new Tracker(testDir);

      const first = await tracker.init();
      expect(first.result).toBe("OK");

      const second = await tracker.init();
      expect(second.result).toBe("ALREADY_INITIALIZED");
      expect(second.path).toBe(resolve(join(testDir, ".agentrack")));
    });

    test("does not overwrite existing files", async () => {
      const tracker = new Tracker(testDir);

      await tracker.init();

      // Read config to get original content
      const configPath = join(testDir, ".agentrack", "config.json");
      const originalContent = readFileSync(configPath, "utf-8");

      // Call init again
      await tracker.init();

      // Verify config was NOT overwritten
      const contentAfter = readFileSync(configPath, "utf-8");
      expect(contentAfter).toBe(originalContent);
    });

    test("config.json has default auth config", async () => {
      const tracker = new Tracker(testDir);
      await tracker.init();

      const config = JSON.parse(
        readFileSync(join(testDir, ".agentrack", "config.json"), "utf-8"),
      );
      expect(config.auth.mode).toBe("open");
      expect(config.auth.defaultUser).toBe("anonymous");
    });

    test("index.json has empty arrays", async () => {
      const tracker = new Tracker(testDir);
      await tracker.init();

      const index = JSON.parse(readFileSync(join(testDir, ".agentrack", "index.json"), "utf-8"));
      expect(index.open).toEqual([]);
      expect(index.closed).toEqual([]);
      expect(index.childrenOf).toEqual({});
    });

    test("issues/ directory exists", async () => {
      const tracker = new Tracker(testDir);
      await tracker.init();

      expect(existsSync(join(testDir, ".agentrack", "issues"))).toBe(true);
    });
  });
});
