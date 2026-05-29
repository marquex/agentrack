/**
 * E2E test setup helpers.
 *
 * Provides utilities for managing the isolated validation/.e2edata/ worktree
 * so that E2E tests don't pollute the main .agentrack/ directory.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

/**
 * Resolve the project root directory using git.
 */
export function getProjectRoot(): string {
  return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
}

/**
 * Resolve the validation/ directory path.
 */
export function getValidationDir(): string {
  return join(getProjectRoot(), "validation");
}

/**
 * Resolve the validation/.e2edata/ directory path.
 */
export function getE2EDataDir(): string {
  return join(getValidationDir(), ".e2edata");
}

const EMPTY_INDEX = {
  open: [],
  closed: [],
  childrenOf: {},
};

const EMPTY_DEPENDENCIES = {
  blockedBy: {},
  blocks: {},
};

const EMPTY_USERS = {
  users: [],
};

const EMPTY_MENTIONS = {
  mentions: [],
};

const EMPTY_CONFIG = {
  auth: {
    mode: "open",
    defaultUser: "anonymous",
  },
  branch: "_e2edata",
};

/**
 * Reset all data files in the e2edata directory to empty defaults.
 * Deletes all issue files and resets index/dependencies/users/config/mentions.
 * ~1ms, no git operations.
 */
export function resetWorktreeData(): void {
  const e2eDir = getE2EDataDir();
  const issuesDir = join(e2eDir, "issues");

  // Ensure issues directory exists
  mkdirSync(issuesDir, { recursive: true });

  // Delete all files in issues/ directory
  try {
    const files = readdirSync(issuesDir);
    for (const file of files) {
      unlinkSync(join(issuesDir, file));
    }
  } catch {
    // Directory might not exist yet, mkdirSync handles it above
  }

  // Reset all JSON data files to empty defaults
  writeFileSync(join(e2eDir, "index.json"), JSON.stringify(EMPTY_INDEX, null, 2) + "\n");
  writeFileSync(join(e2eDir, "dependencies.json"), JSON.stringify(EMPTY_DEPENDENCIES, null, 2) + "\n");
  writeFileSync(join(e2eDir, "users.json"), JSON.stringify(EMPTY_USERS, null, 2) + "\n");
  writeFileSync(join(e2eDir, "config.json"), JSON.stringify(EMPTY_CONFIG, null, 2) + "\n");
  writeFileSync(join(e2eDir, "mentions.json"), JSON.stringify(EMPTY_MENTIONS, null, 2) + "\n");

  // Ensure the pointer file exists at validation/.agentrack.json
  const validationDir = getValidationDir();
  const pointerFile = join(validationDir, ".agentrack.json");
  try {
    readFileSync(pointerFile, "utf-8");
  } catch {
    writeFileSync(pointerFile, JSON.stringify({ branch: "_e2edata" }, null, 2) + "\n");
  }
}

/**
 * Ensure the e2edata worktree exists. Idempotent — checks first.
 * If validation/.e2edata/ doesn't exist, initializes it with `agt init --branch e2edata`.
 */
export function ensureE2EWorktree(): void {
  const e2eDir = getE2EDataDir();
  try {
    readdirSync(e2eDir);
  } catch {
    // Worktree doesn't exist yet, create it
    const validationDir = getValidationDir();
    execSync("agt init --branch e2edata", {
      cwd: validationDir,
      encoding: "utf-8",
      stdio: "pipe",
    });
  }
}
