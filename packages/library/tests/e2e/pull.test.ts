/**
 * E2E: pull — Type A tests (git pull operations)
 *
 * Each test runs inside its own ephemeral git repo with a local bare `origin`.
 */
import { describe, expect, test } from "bun:test";
import {
  E2E_GIT_BRANCH,
  assertSuccess,
  parseJson,
  runAgt,
  withEphemeralWorktree,
} from "./setup";

describe("E2E: pull", () => {
  test(
    "pull when already up to date",
    async () => {
      await withEphemeralWorktree(
        E2E_GIT_BRANCH,
        async (dir) => {
          // Establish clean baseline (push initial commit to origin)
          await runAgt(["push"], dir);

          const result = await runAgt(["pull"], dir);

          expect(result.exitCode).toBe(0);

          const parsed = parseJson(result.stdout);
          expect(parsed.result).toBe("OK");
          expect(parsed.updated).toBe(false);
        },
        { withRemote: true },
      );
    },
    { timeout: 120000 },
  );

  test(
    "pull after push is still up to date",
    async () => {
      await withEphemeralWorktree(
        E2E_GIT_BRANCH,
        async (dir) => {
          // Establish clean baseline
          await runAgt(["push"], dir);

          // Create and push
          await runAgt(["create", "Test Issue"], dir);
          const pushResult = await runAgt(["push"], dir);
          assertSuccess(pushResult);

          // Pull should find no new updates (we just pushed)
          const result = await runAgt(["pull"], dir);

          expect(result.exitCode).toBe(0);

          const parsed = parseJson(result.stdout);
          expect(parsed.result).toBe("OK");
          expect(parsed.updated).toBe(false);
        },
        { withRemote: true },
      );
    },
    { timeout: 120000 },
  );
});
