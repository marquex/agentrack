import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, normalize, resolve } from "node:path";
import type { WorktreeInitResult, WorktreePullResult, WorktreeSyncResult } from "../types";
import { AgentrackError, ErrorCodes } from "./errors";

/** Branch name used for the agentrack data worktree. */
export const WORKTREE_BRANCH = "_agentrack";

/** Directory name for the agentrack data worktree. */
export const WORKTREE_DIR = ".agentrack";

/**
 * Default file contents for the orphan branch.
 * These match the Tracker.init() defaults exactly.
 */
const DEFAULT_CONFIG = { auth: { mode: "open", defaultUser: "anonymous" } };
const DEFAULT_INDEX = { open: [], closed: [], childrenOf: {} };
const DEFAULT_DEPENDENCIES = { blockedBy: {}, blocks: {} };
const DEFAULT_USERS = { users: [] };

// ─── Git helpers ─────────────────────────────────────────────────────

/**
 * Execute a git command synchronously using array-based argument passing.
 * Uses execFileSync to avoid shell injection.
 */
function gitExec(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
}

/**
 * Extract stderr from an execFileSync error.
 */
function getGitError(err: unknown): string {
  if (typeof err === "object" && err !== null && "stderr" in err) {
    const stderr = (err as { stderr: unknown }).stderr;
    if (typeof stderr === "string") return stderr;
  }
  return (err as Error).message || String(err);
}

/**
 * Check if `cwd` is inside a git repository.
 */
function isGitRepo(cwd: string): boolean {
  try {
    gitExec(cwd, ["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current branch name.
 */
function getCurrentBranch(cwd: string): string {
  return gitExec(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
}

/**
 * Check if a remote named 'origin' is configured.
 */
function hasRemote(cwd: string): boolean {
  try {
    const remotes = gitExec(cwd, ["remote"]);
    return remotes.split("\n").some((r) => r.trim() === "origin");
  } catch {
    return false;
  }
}

/**
 * Create a blob object from content via stdin.
 * Returns the blob hash.
 */
function gitHashObject(cwd: string, content: string): string {
  // execFileSync supports Buffer input via input option
  return execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd,
    encoding: "utf-8",
    input: content,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

/**
 * Create a tree object from formatted entries.
 */
function gitMkTree(cwd: string, entries: string): string {
  return execFileSync("git", ["mktree"], {
    cwd,
    encoding: "utf-8",
    input: entries,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

/**
 * Create a commit from a tree hash.
 */
function gitCommitTree(cwd: string, tree: string, message: string): string {
  return execFileSync("git", ["commit-tree", tree, "-m", message], {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

// ─── Gitignore helpers ───────────────────────────────────────────────

/**
 * Check if the gitignore content already has an entry for .agentrack.
 * Matches common patterns: /.agentrack/, .agentrack/, /.agentrack, .agentrack
 */
function gitignoreHasEntry(content: string): boolean {
  return content.split("\n").some((rawLine) => {
    const line = rawLine.trim();
    // Skip comments and empty lines
    if (!line || line.startsWith("#")) return false;
    return (
      line === "/.agentrack/" ||
      line === ".agentrack/" ||
      line === "/.agentrack" ||
      line === ".agentrack"
    );
  });
}

/**
 * Ensure .gitignore has an entry for .agentrack.
 * Appends the entry if missing. Does NOT stage or commit.
 * Returns true if an entry was added.
 */
function ensureGitignoreEntry(cwd: string): boolean {
  const gitignorePath = join(cwd, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (gitignoreHasEntry(content)) {
      return false;
    }
    // Append entry (ensure newline before if file doesn't end with one)
    const suffix = content.endsWith("\n") ? "" : "\n";
    writeFileSync(gitignorePath, `${content}${suffix}/.agentrack/\n`, "utf-8");
  } else {
    writeFileSync(gitignorePath, "/.agentrack/\n", "utf-8");
  }
  return true;
}

// ─── Precondition checks ─────────────────────────────────────────────

/**
 * Validate preconditions before worktree initialization.
 * Throws AgentrackError if any precondition fails.
 */
function checkPreconditions(cwd: string): void {
  // Must be inside a git repo
  if (!isGitRepo(cwd)) {
    throw new AgentrackError(
      ErrorCodes.NOT_A_GIT_REPO.result,
      "Not inside a git repository",
      ErrorCodes.NOT_A_GIT_REPO.exitCode,
    );
  }

  // .agentrack must not exist as a non-worktree (legacy)
  const agentrackPath = join(cwd, WORKTREE_DIR);
  if (existsSync(agentrackPath)) {
    const stat = statSync(agentrackPath);
    if (!stat.isDirectory()) {
      throw new AgentrackError(
        ErrorCodes.MIGRATION_REQUIRED.result,
        ".agentrack exists but is not a directory. Remove it and re-run init.",
        ErrorCodes.MIGRATION_REQUIRED.exitCode,
      );
    }
    // Directory exists — if not a worktree, it's a legacy directory
    if (!isWorktreeInitialized(cwd)) {
      throw new AgentrackError(
        ErrorCodes.MIGRATION_REQUIRED.result,
        ".agentrack/ exists but is not a git worktree. Remove it manually and re-run init.",
        ErrorCodes.MIGRATION_REQUIRED.exitCode,
      );
    }
    // If it IS a valid worktree, caller should handle ALREADY_INITIALIZED
  }

  // Must not be on the _agentrack branch
  const currentBranch = getCurrentBranch(cwd);
  if (currentBranch === WORKTREE_BRANCH) {
    throw new AgentrackError(
      ErrorCodes.INVALID_STATE.result,
      "Cannot init: currently on the _agentrack branch. Switch to a code branch first.",
      ErrorCodes.INVALID_STATE.exitCode,
    );
  }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Detect which init scenario applies: 'fresh' (no remote branch) or 'join' (remote branch exists).
 */
export function detectInitScenario(cwd: string): "fresh" | "join" {
  try {
    const result = gitExec(cwd, ["ls-remote", "--heads", "origin", WORKTREE_BRANCH]);
    return result.trim().length > 0 ? "join" : "fresh";
  } catch {
    // No remote or no connectivity → fresh
    return "fresh";
  }
}

/**
 * Check if .agentrack/ is a valid git worktree for the _agentrack branch.
 */
export function isWorktreeInitialized(cwd: string): boolean {
  try {
    const worktreeList = gitExec(cwd, ["worktree", "list", "--porcelain"]);
    const normalizedCwd = resolve(cwd);
    const expectedPath = normalize(join(normalizedCwd, WORKTREE_DIR));

    return worktreeList.split("\n").some((line) => {
      if (!line.startsWith("worktree ")) return false;
      const wtPath = line.slice("worktree ".length);
      return normalize(wtPath) === expectedPath;
    });
  } catch {
    return false;
  }
}

/**
 * Scenario A: create orphan branch with initial data, push, mount worktree.
 * Uses git plumbing commands to avoid modifying the working tree.
 */
export function initFreshWorktree(cwd: string): WorktreeInitResult {
  // 1. Create blob objects for initial files
  const configBlob = gitHashObject(cwd, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
  const indexBlob = gitHashObject(cwd, `${JSON.stringify(DEFAULT_INDEX, null, 2)}\n`);
  const depsBlob = gitHashObject(cwd, `${JSON.stringify(DEFAULT_DEPENDENCIES, null, 2)}\n`);
  const usersBlob = gitHashObject(cwd, `${JSON.stringify(DEFAULT_USERS, null, 2)}\n`);

  // 2. Create a tree object referencing these blobs
  const treeInput = [
    `100644 blob ${configBlob}\tconfig.json`,
    `100644 blob ${indexBlob}\tindex.json`,
    `100644 blob ${depsBlob}\tdependencies.json`,
    `100644 blob ${usersBlob}\tusers.json`,
  ].join("\n");
  const tree = gitMkTree(cwd, treeInput);

  // 3. Create a commit from the tree
  const commit = gitCommitTree(cwd, tree, "init _agentrack branch");

  // 4. Create the _agentrack branch ref
  try {
    gitExec(cwd, ["branch", WORKTREE_BRANCH, commit]);
  } catch (err) {
    // Branch might already exist from a failed previous attempt
    const stderr = getGitError(err);
    if (stderr.includes("already exists")) {
      // Force-update the branch to our new commit
      gitExec(cwd, ["branch", "-f", WORKTREE_BRANCH, commit]);
    } else {
      throw new AgentrackError(
        ErrorCodes.INVALID_STATE.result,
        `Failed to create branch: ${stderr}`,
        ErrorCodes.INVALID_STATE.exitCode,
      );
    }
  }

  // 5. Push to remote (if available)
  if (hasRemote(cwd)) {
    try {
      gitExec(cwd, ["push", "-u", "origin", WORKTREE_BRANCH]);
    } catch (pushErr) {
      const stderr = getGitError(pushErr);
      // If push fails because branch already exists remotely, fall back to join
      if (
        stderr.includes("already exists") ||
        stderr.includes("failed to push") ||
        stderr.includes("non-fast-forward")
      ) {
        return initJoinWorktree(cwd);
      }
      // Network or other errors — proceed with local branch only (warn implicitly)
    }
  }

  // 6. Ensure .gitignore entry
  ensureGitignoreEntry(cwd);

  // 7. Mount worktree
  try {
    gitExec(cwd, ["worktree", "add", WORKTREE_DIR, WORKTREE_BRANCH]);
  } catch (err) {
    const stderr = getGitError(err);
    throw new AgentrackError(
      ErrorCodes.INVALID_STATE.result,
      `Failed to mount worktree: ${stderr}`,
      ErrorCodes.INVALID_STATE.exitCode,
    );
  }

  return { scenario: "fresh", path: resolve(cwd, WORKTREE_DIR) };
}

/**
 * Scenario B: fetch remote branch, create tracking branch, mount worktree.
 */
export function initJoinWorktree(cwd: string): WorktreeInitResult {
  // 1. Fetch the remote branch
  try {
    gitExec(cwd, ["fetch", "origin", WORKTREE_BRANCH]);
  } catch (err) {
    const stderr = getGitError(err);
    throw new AgentrackError(
      ErrorCodes.INVALID_STATE.result,
      `Failed to fetch remote branch: ${stderr}`,
      ErrorCodes.INVALID_STATE.exitCode,
    );
  }

  // 2. Create local tracking branch
  try {
    gitExec(cwd, ["branch", WORKTREE_BRANCH, `origin/${WORKTREE_BRANCH}`]);
  } catch {
    // Branch might already exist — force-update to remote ref
    try {
      gitExec(cwd, ["branch", "-f", WORKTREE_BRANCH, `origin/${WORKTREE_BRANCH}`]);
    } catch (err) {
      const stderr = getGitError(err);
      throw new AgentrackError(
        ErrorCodes.INVALID_STATE.result,
        `Failed to create tracking branch: ${stderr}`,
        ErrorCodes.INVALID_STATE.exitCode,
      );
    }
  }

  // 3. Ensure .gitignore entry
  ensureGitignoreEntry(cwd);

  // 4. Mount worktree
  try {
    gitExec(cwd, ["worktree", "add", WORKTREE_DIR, WORKTREE_BRANCH]);
  } catch (err) {
    const stderr = getGitError(err);
    throw new AgentrackError(
      ErrorCodes.INVALID_STATE.result,
      `Failed to mount worktree: ${stderr}`,
      ErrorCodes.INVALID_STATE.exitCode,
    );
  }

  return { scenario: "join", path: resolve(cwd, WORKTREE_DIR) };
}

/**
 * Initialize the agentrack worktree. Performs precondition checks, detects the
 * scenario, and delegates to the appropriate setup function.
 *
 * Returns the init result, or throws AgentrackError on failure.
 */
export function initWorktree(cwd: string): WorktreeInitResult {
  // Check if already initialized
  if (isWorktreeInitialized(cwd)) {
    return { scenario: "already_initialized", path: resolve(cwd, WORKTREE_DIR) };
  }

  // Validate preconditions (throws on failure)
  checkPreconditions(cwd);

  // Detect scenario and delegate
  const scenario = detectInitScenario(cwd);
  if (scenario === "fresh") {
    return initFreshWorktree(cwd);
  }
  return initJoinWorktree(cwd);
}

/**
 * Stage and commit .gitignore changes on the current code branch.
 * Used after initWorktree() to persist the .agentrack/ gitignore entry.
 * No-op if there are no changes to commit.
 */
export function commitGitignoreChange(cwd: string): void {
  try {
    gitExec(cwd, ["add", ".gitignore"]);
    gitExec(cwd, ["commit", "-m", "chore: add .agentrack/ to .gitignore"]);
  } catch {
    // No changes to commit or .gitignore unchanged
  }
}

/**
 * Stage all changes in the worktree and commit them with the given message.
 * Used after tracker.init() to persist initial data to the _agentrack branch.
 */
export function commitWorktreeData(cwd: string, message: string): void {
  const worktreeDir = join(cwd, WORKTREE_DIR);
  gitExec(worktreeDir, ["add", "-A"]);
  try {
    gitExec(worktreeDir, ["commit", "-m", message]);
  } catch {
    // No changes to commit — that's fine (e.g., data already committed)
  }
}

/**
 * Stage all changes, auto-commit, and push to remote.
 */
export function pushWorktree(cwd: string, message?: string): WorktreeSyncResult {
  const worktreeDir = join(cwd, WORKTREE_DIR);

  // Verify worktree is initialized
  if (!isWorktreeInitialized(cwd)) {
    throw new AgentrackError(
      ErrorCodes.NOT_INITIALIZED.result,
      "Agentrack not initialized. Run `agt init` first.",
      ErrorCodes.NOT_INITIALIZED.exitCode,
    );
  }

  // Stage all changes
  gitExec(worktreeDir, ["add", "-A"]);

  // Check for staged changes
  let hasStagedChanges = false;
  try {
    gitExec(worktreeDir, ["diff", "--cached", "--quiet"]);
    // Exit code 0 = no diff = no staged changes
  } catch {
    // Exit code 1 = there are staged changes
    hasStagedChanges = true;
  }

  if (hasStagedChanges) {
    // Commit staged changes
    const commitMessage =
      message || `sync: ${new Date().toISOString()}`;
    try {
      gitExec(worktreeDir, ["commit", "-m", commitMessage]);
    } catch (err) {
      const stderr = getGitError(err);
      throw new AgentrackError(
        ErrorCodes.PUSH_FAILED.result,
        `git commit failed: ${stderr}`,
        ErrorCodes.PUSH_FAILED.exitCode,
      );
    }
  }

  // Check if there's anything to push
  let hasUnpushedCommits = false;
  try {
    const count = gitExec(worktreeDir, ["rev-list", "--count", "@{upstream}..HEAD"]).trim();
    hasUnpushedCommits = parseInt(count, 10) > 0;
  } catch {
    // No upstream set — means we need to push
    hasUnpushedCommits = true;
  }

  if (!hasStagedChanges && !hasUnpushedCommits) {
    return { synced: false, message: "No changes to sync" };
  }

  // Push to remote
  if (hasRemote(cwd)) {
    try {
      gitExec(worktreeDir, ["push"]);
    } catch (err) {
      const stderr = getGitError(err);
      throw new AgentrackError(
        ErrorCodes.PUSH_FAILED.result,
        `git push failed: ${stderr}`,
        ErrorCodes.PUSH_FAILED.exitCode,
      );
    }
  }

  return {
    synced: true,
    commitCount: hasStagedChanges ? 1 : 0,
  };
}

/**
 * Pull latest from remote into the worktree.
 */
export function pullWorktree(cwd: string): WorktreePullResult {
  const worktreeDir = join(cwd, WORKTREE_DIR);

  // Verify worktree is initialized
  if (!isWorktreeInitialized(cwd)) {
    throw new AgentrackError(
      ErrorCodes.NOT_INITIALIZED.result,
      "Agentrack not initialized. Run `agt init` first.",
      ErrorCodes.NOT_INITIALIZED.exitCode,
    );
  }

  try {
    const output = gitExec(worktreeDir, ["pull"]);
    // "Already up to date." means no updates
    const updated = !output.includes("Already up to date");
    return { updated };
  } catch (err) {
    const stderr = getGitError(err);
    throw new AgentrackError(
      ErrorCodes.PULL_FAILED.result,
      `git pull failed: ${stderr}`,
      ErrorCodes.PULL_FAILED.exitCode,
    );
  }
}
