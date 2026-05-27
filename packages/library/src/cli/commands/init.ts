import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { AgentrackError } from "../../core/errors";
import { Tracker } from "../../core/tracker";
import {
  DEFAULT_BRANCH,
  commitGitignoreChange,
  commitWorktreeData,
  initWorktree,
  isWorktreeInitialized,
} from "../../core/worktree";
import { normalizeBranchName, writeBranchPointer, defaultWorktreeOptions } from "../../core/branch-config";
import type { WorktreeOptions } from "../../core/branch-config";
import { writeStderr, writeStdout } from "../output";

/**
 * Handler for the `agt init` command.
 *
 * When inside a git repo, sets up a git worktree for agentrack data
 * (orphan branch, default _agentrack). When not inside a git repo, falls back
 * to classic Tracker.init() which creates a plain directory.
 *
 * Accepts optional `--branch <name>` flag to customize the branch/directory names.
 */
export async function initAction(options?: { branch?: string }): Promise<void> {
  try {
    const cwd = process.cwd();

    // Resolve branch/directory from flag or defaults
    let opts: WorktreeOptions;
    if (options?.branch !== undefined) {
      opts = normalizeBranchName(options.branch);
    } else {
      opts = defaultWorktreeOptions();
    }

    // Try worktree-based init (only works in git repos)
    try {
      // Check if already initialized as a worktree
      if (isWorktreeInitialized(cwd, opts)) {
        writeStdout({
          result: "ALREADY_INITIALIZED",
          path: resolve(cwd, opts.dir),
        });
        process.exit(0);
      }

      // Perform worktree setup (checks preconditions, detects scenario, mounts)
      const worktreeResult = initWorktree(cwd, opts);

      // The worktree already contains data files from the plumbing commands
      // (or remote fetch). We only need to ensure the issues/ directory exists
      // (plumbing creates files but not the issues/ subdirectory).
      const issuesDir = join(resolve(cwd, opts.dir), "issues");
      if (!existsSync(issuesDir)) {
        mkdirSync(issuesDir, { recursive: true });
      }

      // Ensure mentions.json exists (upgrade scenario for joins)
      const mentionsPath = join(resolve(cwd, opts.dir), "mentions.json");
      if (!existsSync(mentionsPath)) {
        writeFileSync(mentionsPath, "{}\n", "utf-8");
      }

      // Write branch to config.json inside the worktree (only for non-default)
      if (opts.branch !== DEFAULT_BRANCH) {
        writeBranchToConfig(cwd, opts);
      }

      // Write pointer file at repo root for discovery
      if (opts.branch !== DEFAULT_BRANCH) {
        writeBranchPointer(cwd, opts.branch);
      }

      // Auto-commit gitignore change and initialized data (fresh scenario)
      if (worktreeResult.scenario === "fresh") {
        // Also commit the pointer file if present
        commitGitignoreChange(cwd, opts.dir);
        commitWorktreeData(cwd, `init agentrack data`, opts);
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
        const result = await tracker.init(opts.dir);
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

/**
 * Write the branch name into config.json inside the worktree.
 */
function writeBranchToConfig(cwd: string, opts: WorktreeOptions): void {
  const configPath = resolve(cwd, opts.dir, "config.json");
  if (!existsSync(configPath)) return;

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as Record<string, unknown>;
    config["branch"] = opts.branch;
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  } catch {
    // Non-critical — config update is best-effort
  }
}
