/**
 * E2E: push — Type A tests (git push operations)
 *
 * Each test runs inside its own ephemeral git repo with a local bare `origin`
 * so push/pull exercises a real round-trip without depending on any project
 * remote.
 */
import { describe, expect, test } from "bun:test";
import {
  E2E_GIT_BRANCH,
  assertSuccess,
  parseJson,
  runAgt,
  withEphemeralWorktree,
} from "./setup";

describe("E2E: push", () => {
  test(
    "push with no changes returns no changes to sync",
    async () => {
      await withEphemeralWorktree(
        E2E_GIT_BRANCH,
        async (dir) => {
          // Push the initial data commit from init to establish a clean baseline
          await runAgt(["push"], dir);

          const result = await runAgt(["push"], dir);

          expect(result.exitCode).toBe(0);

          const parsed = parseJson(result.stdout);
          expect(parsed.result).toBe("OK");
          expect(parsed.synced).toBe(false);
          expect(parsed.message).toContain("No changes");
        },
        { withRemote: true },
      );
    },
    { timeout: 120000 },
  );

  test(
    "push after creating issue syncs successfully",
    async () => {
      await withEphemeralWorktree(
        E2E_GIT_BRANCH,
        async (dir) => {
          // Establish clean baseline
          await runAgt(["push"], dir);

          const createResult = await runAgt(["create", "Test Issue"], dir);
          assertSuccess(createResult);

          const result = await runAgt(["push"], dir);

          expect(result.exitCode).toBe(0);

          const parsed = parseJson(result.stdout);
          expect(parsed.result).toBe("OK");
          expect(parsed.synced).toBe(true);
        },
        { withRemote: true },
      );
    },
    { timeout: 120000 },
  );

  test(
    "push with custom message",
    async () => {
      await withEphemeralWorktree(
        E2E_GIT_BRANCH,
        async (dir) => {
          // Establish clean baseline
          await runAgt(["push"], dir);

          await runAgt(["create", "Test Issue"], dir);

          const result = await runAgt(["push", "--message", "custom push message"], dir);

          expect(result.exitCode).toBe(0);

          const parsed = parseJson(result.stdout);
          expect(parsed.result).toBe("OK");
          expect(parsed.synced).toBe(true);
        },
        { withRemote: true },
      );
    },
    { timeout: 120000 },
  );
});
