import { AgentrackError } from "../../core/errors";
import { resolveWorktreeOptions } from "../../core/branch-config";
import { pushWorktree } from "../../core/worktree";
import { writeStderr, writeStdout } from "../output";

/**
 * Handler for the `agt push` command.
 * Stages all changes in the worktree, commits, and pushes to remote.
 * Resolves the active branch from the pointer file.
 */
export async function pushAction(options?: { message?: string }): Promise<void> {
  try {
    const cwd = process.cwd();
    const opts = resolveWorktreeOptions(cwd);
    const result = pushWorktree(cwd, options?.message, opts);
    writeStdout({
      result: "OK",
      synced: result.synced,
      ...(result.commitCount !== undefined && { commitCount: result.commitCount }),
      ...(result.message && { message: result.message }),
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
