import { resolve } from "node:path";
import { AgentrackError } from "../../core/errors";
import { Tracker } from "../../core/tracker";
import {
  WORKTREE_DIR,
  commitGitignoreChange,
  commitWorktreeData,
  initWorktree,
  isWorktreeInitialized,
} from "../../core/worktree";
import { writeStderr, writeStdout } from "../output";

/**
 * Handler for the `agt init` command.
 *
 * When inside a git repo, sets up a git worktree for .agentrack/ data
 * (orphan branch _agentrack). When not inside a git repo, falls back
 * to classic Tracker.init() which creates a plain directory.
 */
export async function initAction(): Promise<void> {
  try {
    const cwd = process.cwd();

    // Try worktree-based init (only works in git repos)
    try {
      // Check if already initialized as a worktree
      if (isWorktreeInitialized(cwd)) {
        writeStdout({
          result: "ALREADY_INITIALIZED",
          path: resolve(cwd, WORKTREE_DIR),
        });
        process.exit(0);
      }

      // Perform worktree setup (checks preconditions, detects scenario, mounts)
      const worktreeResult = initWorktree(cwd);

      // Run tracker.init() - will return ALREADY_INITIALIZED since worktree
      // already contains the initial data files (from plumbing or remote).
      const tracker = new Tracker(cwd);
      await tracker.init();

      // Auto-commit gitignore change and initialized data (fresh scenario)
      if (worktreeResult.scenario === "fresh") {
        commitGitignoreChange(cwd);
        commitWorktreeData(cwd, "init agentrack data");
      }

      writeStdout({
        result: "OK",
        scenario: worktreeResult.scenario,
        path: worktreeResult.path,
      });
      process.exit(0);
    } catch (worktreeErr) {
      // If not a git repo, fall back to classic directory-based init
      if (
        worktreeErr instanceof AgentrackError &&
        worktreeErr.result === "NOT_A_GIT_REPO"
      ) {
        const tracker = new Tracker();
        const result = await tracker.init();
        writeStdout(result);
        process.exit(0);
      }
      throw worktreeErr;
    }
  } catch (err) {
    if (err instanceof AgentrackError) {
      writeStderr({ result: err.result, message: err.message });
      process.exit(err.exitCode);
    }
    // Unexpected errors
    writeStderr({ result: "INTERNAL_ERROR", message: (err as Error).message });
    process.exit(1);
  }
}
