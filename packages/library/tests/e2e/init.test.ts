/**
 * E2E: init — Type A tests (git worktree operations)
 *
 * Each test runs inside its own ephemeral git repo (created and removed per
 * test) so we exercise the `agt init` flow from a clean state every time.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  E2E_GIT_BRANCH,
  createEphemeralDir,
  getTrackerDir,
  initGitRepo,
  parseJson,
  rmEphemeralDir,
  runAgt,
} from "./setup";

describe("E2E: init", () => {
  test(
    "fresh init creates worktree with correct output",
    async () => {
      const dir = createEphemeralDir();
      initGitRepo(dir);
      try {
        const result = await runAgt(["init", "--branch", E2E_GIT_BRANCH], dir);

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe("");

        const parsed = parseJson(result.stdout);
        expect(parsed.result).toBe("OK");
        expect(parsed.scenario).toBe("fresh");
        expect(parsed.path).toContain(`.${E2E_GIT_BRANCH}`);
      } finally {
        rmEphemeralDir(dir);
      }
    },
    { timeout: 120000 },
  );

  test(
    "init when already initialized returns ALREADY_INITIALIZED",
    async () => {
      const dir = createEphemeralDir();
      initGitRepo(dir);
      try {
        const first = await runAgt(["init", "--branch", E2E_GIT_BRANCH], dir);
        expect(first.exitCode).toBe(0);

        const result = await runAgt(["init", "--branch", E2E_GIT_BRANCH], dir);

        expect(result.exitCode).toBe(0);

        const parsed = parseJson(result.stdout);
        expect(parsed.result).toBe("ALREADY_INITIALIZED");
        expect(parsed.path).toContain(`.${E2E_GIT_BRANCH}`);
      } finally {
        rmEphemeralDir(dir);
      }
    },
    { timeout: 120000 },
  );

  test(
    "init creates correct data files",
    async () => {
      const dir = createEphemeralDir();
      initGitRepo(dir);
      try {
        const initResult = await runAgt(["init", "--branch", E2E_GIT_BRANCH], dir);
        expect(initResult.exitCode).toBe(0);

        const trackerDir = getTrackerDir(dir, E2E_GIT_BRANCH);

        expect(existsSync(join(trackerDir, "config.json"))).toBe(true);
        expect(existsSync(join(trackerDir, "index.json"))).toBe(true);
        expect(existsSync(join(trackerDir, "dependencies.json"))).toBe(true);
        expect(existsSync(join(trackerDir, "users.json"))).toBe(true);
        expect(existsSync(join(trackerDir, "issues"))).toBe(true);

        const index = JSON.parse(
          readFileSync(join(trackerDir, "index.json"), "utf-8"),
        );
        expect(index).toEqual({ open: [], closed: [], childrenOf: {} });
      } finally {
        rmEphemeralDir(dir);
      }
    },
    { timeout: 120000 },
  );

  test(
    "init creates issues/ directory",
    async () => {
      const dir = createEphemeralDir();
      initGitRepo(dir);
      try {
        const initResult = await runAgt(["init", "--branch", E2E_GIT_BRANCH], dir);
        expect(initResult.exitCode).toBe(0);

        const issuesDir = join(getTrackerDir(dir, E2E_GIT_BRANCH), "issues");
        expect(existsSync(issuesDir)).toBe(true);
      } finally {
        rmEphemeralDir(dir);
      }
    },
    { timeout: 120000 },
  );

  test(
    "init writes branch to config.json for non-default branch",
    async () => {
      const dir = createEphemeralDir();
      initGitRepo(dir);
      try {
        const initResult = await runAgt(["init", "--branch", E2E_GIT_BRANCH], dir);
        expect(initResult.exitCode).toBe(0);

        const config = JSON.parse(
          readFileSync(
            join(getTrackerDir(dir, E2E_GIT_BRANCH), "config.json"),
            "utf-8",
          ),
        );
        expect(config.branch).toBe(`_${E2E_GIT_BRANCH}`);
      } finally {
        rmEphemeralDir(dir);
      }
    },
    { timeout: 120000 },
  );
});
