/**
 * E2E: pull — Type A tests (git pull operations)
 *
 * Each test does its own init/teardown to avoid hook timeout issues.
 */
import { describe, expect, test } from "bun:test";
import {
  E2E_GIT_BRANCH,
  assertSuccess,
  initE2EWorktree,
  parseJson,
  runAgt,
  teardownE2EWorktree,
} from "./setup";

describe("E2E: pull", () => {
  test(
    "pull when already up to date",
    async () => {
      await teardownE2EWorktree(E2E_GIT_BRANCH);
      await initE2EWorktree(E2E_GIT_BRANCH);

      const result = await runAgt(["pull"]);

      expect(result.exitCode).toBe(0);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("OK");
      expect(parsed.updated).toBe(false);

      await teardownE2EWorktree(E2E_GIT_BRANCH);
    },
    { timeout: 120000 },
  );

  test(
    "pull after push is still up to date",
    async () => {
      await teardownE2EWorktree(E2E_GIT_BRANCH);
      await initE2EWorktree(E2E_GIT_BRANCH);

      // Create and push
      await runAgt(["create", "Test Issue"]);
      const pushResult = await runAgt(["push"]);
      assertSuccess(pushResult);

      // Pull should find no new updates (we just pushed)
      const result = await runAgt(["pull"]);

      expect(result.exitCode).toBe(0);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("OK");
      expect(parsed.updated).toBe(false);

      await teardownE2EWorktree(E2E_GIT_BRANCH);
    },
    { timeout: 120000 },
  );
});
