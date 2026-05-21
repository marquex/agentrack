import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { AgentrackError, ErrorCodes } from "./errors";

/** Default branch name for agentrack data. */
export const DEFAULT_BRANCH = "_agentrack";

/** Default directory name for agentrack data. */
export const DEFAULT_DIR = ".agentrack";

/** Pointer file name stored at the repo root. */
const BRANCH_POINTER_FILE = ".agentrack.json";

/**
 * Worktree options that parameterize branch/directory names.
 * Passed to worktree functions instead of using hardcoded constants.
 */
export interface WorktreeOptions {
  branch: string;
  dir: string;
}

/**
 * Normalize a user-provided branch name.
 *
 * Strips leading underscores, validates the name, then prepends
 * `_` for the branch name and `.` for the directory name.
 *
 * @throws {AgentrackError} INVALID_BRANCH_NAME if the name is empty or contains invalid chars
 */
export function normalizeBranchName(input: string): WorktreeOptions {
  // Strip leading underscores
  const cleaned = input.replace(/^_+/, "");
  if (!cleaned) {
    throw new AgentrackError(
      ErrorCodes.INVALID_BRANCH_NAME.result,
      "Branch name cannot be empty",
      ErrorCodes.INVALID_BRANCH_NAME.exitCode,
    );
  }

  // Reject slashes — they create nested directories (AC8)
  if (cleaned.includes("/")) {
    throw new AgentrackError(
      ErrorCodes.INVALID_BRANCH_NAME.result,
      "Branch name cannot contain slashes (slashes would create nested directories)",
      ErrorCodes.INVALID_BRANCH_NAME.exitCode,
    );
  }

  // Validate: no spaces or special chars that git rejects
  // Allow: letters, digits, dots, underscores, hyphens
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(cleaned)) {
    throw new AgentrackError(
      ErrorCodes.INVALID_BRANCH_NAME.result,
      `Branch name '${input}' is not a valid git branch name`,
      ErrorCodes.INVALID_BRANCH_NAME.exitCode,
    );
  }

  return {
    branch: `_${cleaned}`,
    dir: `.${cleaned}`,
  };
}

/**
 * Get default worktree options (for when no --branch flag is provided).
 */
export function defaultWorktreeOptions(): WorktreeOptions {
  return { branch: DEFAULT_BRANCH, dir: DEFAULT_DIR };
}

/**
 * Derive directory name from branch name.
 * `_agentrack` → `.agentrack`
 */
export function dirFromBranch(branch: string): string {
  return "." + branch.slice(1);
}

/**
 * Read the branch pointer file from a directory.
 * Returns the branch name or null if no pointer file exists.
 */
export function readBranchPointer(dir: string): string | null {
  const pointerPath = join(dir, BRANCH_POINTER_FILE);
  if (!existsSync(pointerPath)) return null;
  try {
    const content = readFileSync(pointerPath, "utf-8");
    const parsed = JSON.parse(content) as { branch?: string };
    return parsed.branch ?? null;
  } catch {
    return null;
  }
}

/**
 * Write the branch pointer file to a directory.
 */
export function writeBranchPointer(dir: string, branch: string): void {
  const pointerPath = join(dir, BRANCH_POINTER_FILE);
  writeFileSync(pointerPath, JSON.stringify({ branch }, null, 2) + "\n", "utf-8");
}

/**
 * Resolve worktree options by reading the branch pointer file.
 * Walks up from cwd looking for the pointer file. Falls back to defaults
 * if no pointer file is found.
 *
 * @param cwd - Starting directory to search from
 * @returns WorktreeOptions with the resolved branch and dir
 */
export function resolveWorktreeOptions(cwd: string): WorktreeOptions {
  let current = resolve(cwd);

  while (true) {
    const branch = readBranchPointer(current);
    if (branch) {
      return { branch, dir: dirFromBranch(branch) };
    }

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return defaultWorktreeOptions();
}
