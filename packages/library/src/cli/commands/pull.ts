import { AgentrackError } from "../../core/errors";
import { resolveWorktreeOptions } from "../../core/branch-config";
import { pullWorktree } from "../../core/worktree";
import { writeStderr, writeStdout } from "../output";

/**
 * Handler for the `agt pull` command.
 * Pulls latest changes from remote into the worktree.
 * Resolves the active branch from the pointer file.
 */
export async function pullAction(): Promise<void> {
  try {
    const cwd = process.cwd();
    const opts = resolveWorktreeOptions(cwd);
    const result = pullWorktree(cwd, opts);
    writeStdout({
      result: "OK",
      updated: result.updated,
    });
    process.exit(0);
  } catch (err) {
    if (err instanceof AgentrackError) {
      writeStderr({ result: err.result, message: err.message });
      process.exit(err.exitCode);
    }
    writeStderr({ result: "INTERNAL_ERROR", message: (err as Error).message });
    process.exit(1);
  }
}
