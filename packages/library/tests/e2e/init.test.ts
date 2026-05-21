/**
 * E2E: init — Type A tests (git worktree operations)
 *
 * Each test creates and destroys its own worktree to test fresh init scenarios.
 * Setup/teardown is done within each test (not hooks) to avoid hook timeout issues.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  E2E_GIT_BRANCH,
  getTrackerDir,
  initE2EWorktree,
  parseJson,
  runAgt,
  teardownE2EWorktree,
} from "./setup";

describe("E2E: init", () => {
  test(
    "fresh init creates worktree with correct output",
    async () => {
      await teardownE2EWorktree(E2E_GIT_BRANCH);
      const result = await initE2EWorktree(E2E_GIT_BRANCH);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("OK");
      expect(parsed.scenario).toBe("fresh");
      expect(parsed.path).toContain(`.${E2E_GIT_BRANCH}`);

      await teardownE2EWorktree(E2E_GIT_BRANCH);
    },
    { timeout: 120000 },
  );

  test(
    "init when already initialized returns ALREADY_INITIALIZED",
    async () => {
      await teardownE2EWorktree(E2E_GIT_BRANCH);
      await initE2EWorktree(E2E_GIT_BRANCH);

      const result = await runAgt(["init", "--branch", E2E_GIT_BRANCH]);

      expect(result.exitCode).toBe(0);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("ALREADY_INITIALIZED");
      expect(parsed.path).toContain(`.${E2E_GIT_BRANCH}`);

      await teardownE2EWorktree(E2E_GIT_BRANCH);
    },
    { timeout: 120000 },
  );

  test(
    "init creates correct data files",
    async () => {
      await teardownE2EWorktree(E2E_GIT_BRANCH);
      await initE2EWorktree(E2E_GIT_BRANCH);

      const trackerDir = getTrackerDir(E2E_GIT_BRANCH);

      expect(existsSync(join(trackerDir, "config.json"))).toBe(true);
      expect(existsSync(join(trackerDir, "index.json"))).toBe(true);
      expect(existsSync(join(trackerDir, "dependencies.json"))).toBe(true);
      expect(existsSync(join(trackerDir, "users.json"))).toBe(true);
      expect(existsSync(join(trackerDir, "issues"))).toBe(true);

      const index = JSON.parse(
        readFileSync(join(trackerDir, "index.json"), "utf-8"),
      );
      expect(index).toEqual({ open: [], closed: [], childrenOf: {} });

      await teardownE2EWorktree(E2E_GIT_BRANCH);
    },
    { timeout: 120000 },
  );

  test(
    "init creates issues/ directory",
    async () => {
      await teardownE2EWorktree(E2E_GIT_BRANCH);
      await initE2EWorktree(E2E_GIT_BRANCH);

      const issuesDir = join(getTrackerDir(E2E_GIT_BRANCH), "issues");
      expect(existsSync(issuesDir)).toBe(true);

      await teardownE2EWorktree(E2E_GIT_BRANCH);
    },
    { timeout: 120000 },
  );

  test(
    "init writes branch to config.json for non-default branch",
    async () => {
      await teardownE2EWorktree(E2E_GIT_BRANCH);
      await initE2EWorktree(E2E_GIT_BRANCH);

      const config = JSON.parse(
        readFileSync(
          join(getTrackerDir(E2E_GIT_BRANCH), "config.json"),
          "utf-8",
        ),
      );
      expect(config.branch).toBe(`_${E2E_GIT_BRANCH}`);

      await teardownE2EWorktree(E2E_GIT_BRANCH);
    },
    { timeout: 120000 },
  );
});
