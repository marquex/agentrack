/**
 * E2E: push — Type A tests (git push operations)
 *
 * Each test does its own init/teardown to avoid hook timeout issues.
 * Pushes initial commit after init to establish a clean baseline.
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

async function setupPushTest(): Promise<void> {
  await teardownE2EWorktree(E2E_GIT_BRANCH);
  await initE2EWorktree(E2E_GIT_BRANCH);
  // Push the initial data commit from init to establish a clean baseline
  await runAgt(["push"]);
}

describe("E2E: push", () => {
  test(
    "push with no changes returns no changes to sync",
    async () => {
      await setupPushTest();

      const result = await runAgt(["push"]);

      expect(result.exitCode).toBe(0);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("OK");
      expect(parsed.synced).toBe(false);
      expect(parsed.message).toContain("No changes");

      await teardownE2EWorktree(E2E_GIT_BRANCH);
    },
    { timeout: 120000 },
  );

  test(
    "push after creating issue syncs successfully",
    async () => {
      await setupPushTest();

      const createResult = await runAgt(["create", "Test Issue"]);
      assertSuccess(createResult);

      const result = await runAgt(["push"]);

      expect(result.exitCode).toBe(0);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("OK");
      expect(parsed.synced).toBe(true);

      await teardownE2EWorktree(E2E_GIT_BRANCH);
    },
    { timeout: 120000 },
  );

  test(
    "push with custom message",
    async () => {
      await setupPushTest();

      await runAgt(["create", "Test Issue"]);

      const result = await runAgt(["push", "--message", "custom push message"]);

      expect(result.exitCode).toBe(0);

      const parsed = parseJson(result.stdout);
      expect(parsed.result).toBe("OK");
      expect(parsed.synced).toBe(true);

      await teardownE2EWorktree(E2E_GIT_BRANCH);
    },
    { timeout: 120000 },
  );
});
