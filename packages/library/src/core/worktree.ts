import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, normalize, resolve } from "node:path";
import type { WorktreeInitResult, WorktreePullResult, WorktreeSyncResult } from "../types";
import { AgentrackError, ErrorCodes } from "./errors";
import { resolveWorktreeOptions, type WorktreeOptions } from "./branch-config";
import { resolveTrackerDir } from "./resolution";

/** Default branch name used for the agentrack data worktree. */
export const DEFAULT_BRANCH = "_agentrack";

/** Default directory name for the agentrack data worktree. */
export const DEFAULT_DIR = ".agentrack";

/** @deprecated Use DEFAULT_BRANCH instead. */
export const WORKTREE_BRANCH = DEFAULT_BRANCH;

/** @deprecated Use DEFAULT_DIR instead. */
export const WORKTREE_DIR = DEFAULT_DIR;

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
 * Check if the gitignore content already has an entry for the given directory.
 * Matches common patterns: /dir/, dir/, /dir, dir
 */
function gitignoreHasEntry(content: string, dir: string): boolean {
  return content.split("\n").some((rawLine) => {
    const line = rawLine.trim();
    // Skip comments and empty lines
    if (!line || line.startsWith("#")) return false;
    return (
      line === `/${dir}/` ||
      line === `${dir}/` ||
      line === `/${dir}` ||
      line === dir
    );
  });
}

/**
 * Ensure .gitignore has an entry for the given directory.
 * Appends the entry if missing. Does NOT stage or commit.
 * Returns true if an entry was added.
 */
function ensureGitignoreEntry(cwd: string, dir: string): boolean {
  const gitignorePath = join(cwd, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (gitignoreHasEntry(content, dir)) {
      return false;
    }
    // Append entry (ensure newline before if file doesn't end with one)
    const suffix = content.endsWith("\n") ? "" : "\n";
    writeFileSync(gitignorePath, `${content}${suffix}/${dir}/\n`, "utf-8");
  } else {
    writeFileSync(gitignorePath, `/${dir}/\n`, "utf-8");
  }
  return true;
}

// ─── Precondition checks ─────────────────────────────────────────────

/**
 * Validate preconditions before worktree initialization.
 * Throws AgentrackError if any precondition fails.
 */
function checkPreconditions(cwd: string, opts: WorktreeOptions): void {
  // Must be inside a git repo
  if (!isGitRepo(cwd)) {
    throw new AgentrackError(
      ErrorCodes.NOT_A_GIT_REPO.result,
      "Not inside a git repository",
      ErrorCodes.NOT_A_GIT_REPO.exitCode,
    );
  }

  // Worktree dir must not exist as a non-worktree (legacy)
  const agentrackPath = join(cwd, opts.dir);
  if (existsSync(agentrackPath)) {
    const stat = statSync(agentrackPath);
    if (!stat.isDirectory()) {
      throw new AgentrackError(
        ErrorCodes.MIGRATION_REQUIRED.result,
        `${opts.dir} exists but is not a directory. Remove it and re-run init.`,
        ErrorCodes.MIGRATION_REQUIRED.exitCode,
      );
    }
    // Directory exists — if not a worktree, it's a legacy directory
    if (!isWorktreeInitialized(cwd, opts)) {
      throw new AgentrackError(
        ErrorCodes.MIGRATION_REQUIRED.result,
        `${opts.dir}/ exists but is not a git worktree. Remove it manually and re-run init.`,
        ErrorCodes.MIGRATION_REQUIRED.exitCode,
      );
    }
    // If it IS a valid worktree, caller should handle ALREADY_INITIALIZED
  }

  // Must not be on the target branch
  const currentBranch = getCurrentBranch(cwd);
  if (currentBranch === opts.branch) {
    throw new AgentrackError(
      ErrorCodes.INVALID_STATE.result,
      `Cannot init: currently on the ${opts.branch} branch. Switch to a code branch first.`,
      ErrorCodes.INVALID_STATE.exitCode,
    );
  }

  // Check if branch already exists locally with non-agentrack data
  try {
    const existingCommit = gitExec(cwd, ["rev-parse", "--verify", opts.branch]).trim();
    // Branch exists — validate it contains agentrack data
    const files = gitExec(cwd, ["ls-tree", "--name-only", existingCommit]).trim();
    const fileList = files
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    const expectedFiles = ["config.json", "index.json", "dependencies.json", "users.json"];
    const hasAgentrackData = expectedFiles.every((f) => fileList.includes(f));

    if (!hasAgentrackData) {
      throw new AgentrackError(
        ErrorCodes.BRANCH_CONFLICT.result,
        `Branch '${opts.branch}' already exists but does not contain agentrack data`,
        ErrorCodes.BRANCH_CONFLICT.exitCode,
      );
    }
    // Branch exists with agentrack data — allow re-init (re-creation of worktree)
  } catch (err) {
    // If it's our BRANCH_CONFLICT error, re-throw it
    if (err instanceof AgentrackError) throw err;
    // rev-parse failed — branch doesn't exist locally, proceed with creation
  }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Detect which init scenario applies: 'fresh' (no remote branch) or 'join' (remote branch exists).
 */
export function detectInitScenario(cwd: string, opts?: WorktreeOptions): "fresh" | "join" {
  const { branch } = opts ?? { branch: DEFAULT_BRANCH, dir: DEFAULT_DIR };
  try {
    const result = gitExec(cwd, ["ls-remote", "--heads", "origin", branch]);
    return result.trim().length > 0 ? "join" : "fresh";
  } catch {
    // No remote or no connectivity → fresh
    return "fresh";
  }
}

/**
 * Check if the worktree directory is a valid git worktree for the target branch.
 * When opts is not provided, uses default branch/dir.
 */
export function isWorktreeInitialized(cwd: string, opts?: WorktreeOptions): boolean {
  const { dir } = opts ?? { branch: DEFAULT_BRANCH, dir: DEFAULT_DIR };
  try {
    const worktreeList = gitExec(cwd, ["worktree", "list", "--porcelain"]);
    const normalizedCwd = resolve(cwd);
    const expectedPath = normalize(join(normalizedCwd, dir));

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
export function initFreshWorktree(cwd: string, opts?: WorktreeOptions): WorktreeInitResult {
  const worktreeOpts = opts ?? { branch: DEFAULT_BRANCH, dir: DEFAULT_DIR };
  // 1. Create blob objects for initial files
  const configBlob = gitHashObject(cwd, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
  const indexBlob = gitHashObject(cwd, `${JSON.stringify(DEFAULT_INDEX, null, 2)}\n`);
  const depsBlob = gitHashObject(cwd, `${JSON.stringify(DEFAULT_DEPENDENCIES, null, 2)}\n`);
  const usersBlob = gitHashObject(cwd, `${JSON.stringify(DEFAULT_USERS, null, 2)}\n`);
  const mentionsBlob = gitHashObject(cwd, `${JSON.stringify({}, null, 2)}\n`);

  // 2. Create a tree object referencing these blobs
  const treeInput = [
    `100644 blob ${configBlob}\tconfig.json`,
    `100644 blob ${indexBlob}\tindex.json`,
    `100644 blob ${depsBlob}\tdependencies.json`,
    `100644 blob ${usersBlob}\tusers.json`,
    `100644 blob ${mentionsBlob}\tmentions.json`,
  ].join("\n");
  const tree = gitMkTree(cwd, treeInput);

  // 3. Create a commit from the tree
  const commit = gitCommitTree(cwd, tree, `init ${worktreeOpts.branch} branch`);

  // 4. Create the branch ref
  try {
    gitExec(cwd, ["branch", worktreeOpts.branch, commit]);
  } catch (err) {
    // Branch might already exist from a failed previous attempt
    const stderr = getGitError(err);
    if (stderr.includes("already exists")) {
      // Force-update the branch to our new commit
      gitExec(cwd, ["branch", "-f", worktreeOpts.branch, commit]);
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
      gitExec(cwd, ["push", "-u", "origin", worktreeOpts.branch]);
    } catch (pushErr) {
      const stderr = getGitError(pushErr);
      // If push fails because branch already exists remotely, fall back to join
      if (
        stderr.includes("already exists") ||
        stderr.includes("failed to push") ||
        stderr.includes("non-fast-forward")
      ) {
        return initJoinWorktree(cwd, worktreeOpts);
      }
      // Network or other errors — proceed with local branch only (warn implicitly)
    }
  }

  // 6. Ensure .gitignore entry
  ensureGitignoreEntry(cwd, worktreeOpts.dir);

  // 7. Mount worktree
  try {
    gitExec(cwd, ["worktree", "add", worktreeOpts.dir, worktreeOpts.branch]);
  } catch (err) {
    const stderr = getGitError(err);
    throw new AgentrackError(
      ErrorCodes.INVALID_STATE.result,
      `Failed to mount worktree: ${stderr}`,
      ErrorCodes.INVALID_STATE.exitCode,
    );
  }

  return { scenario: "fresh", path: resolve(cwd, worktreeOpts.dir) };
}

/**
 * Scenario B: fetch remote branch, create tracking branch, mount worktree.
 */
export function initJoinWorktree(cwd: string, opts?: WorktreeOptions): WorktreeInitResult {
  const worktreeOpts = opts ?? { branch: DEFAULT_BRANCH, dir: DEFAULT_DIR };
  // 1. Fetch the remote branch
  try {
    gitExec(cwd, ["fetch", "origin", worktreeOpts.branch]);
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
    gitExec(cwd, ["branch", worktreeOpts.branch, `origin/${worktreeOpts.branch}`]);
  } catch {
    // Branch might already exist — force-update to remote ref
    try {
      gitExec(cwd, ["branch", "-f", worktreeOpts.branch, `origin/${worktreeOpts.branch}`]);
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
  ensureGitignoreEntry(cwd, worktreeOpts.dir);

  // 4. Mount worktree
  try {
    gitExec(cwd, ["worktree", "add", worktreeOpts.dir, worktreeOpts.branch]);
  } catch (err) {
    const stderr = getGitError(err);
    throw new AgentrackError(
      ErrorCodes.INVALID_STATE.result,
      `Failed to mount worktree: ${stderr}`,
      ErrorCodes.INVALID_STATE.exitCode,
    );
  }

  return { scenario: "join", path: resolve(cwd, worktreeOpts.dir) };
}

/**
 * Initialize the agentrack worktree. Performs precondition checks, detects the
 * scenario, and delegates to the appropriate setup function.
 *
 * Returns the init result, or throws AgentrackError on failure.
 *
 * When opts is not provided, uses default branch/dir.
 */
export function initWorktree(cwd: string, opts?: WorktreeOptions): WorktreeInitResult {
  const worktreeOpts = opts ?? { branch: DEFAULT_BRANCH, dir: DEFAULT_DIR };

  // Check if already initialized
  if (isWorktreeInitialized(cwd, worktreeOpts)) {
    return { scenario: "already_initialized", path: resolve(cwd, worktreeOpts.dir) };
  }

  // Validate preconditions (throws on failure)
  checkPreconditions(cwd, worktreeOpts);

  // Detect scenario and delegate
  const scenario = detectInitScenario(cwd, worktreeOpts);
  if (scenario === "fresh") {
    return initFreshWorktree(cwd, worktreeOpts);
  }
  return initJoinWorktree(cwd, worktreeOpts);
}

/**
 * Stage and commit .gitignore changes (and pointer file if present) on the current code branch.
 * Used after initWorktree() to persist the worktree dir gitignore entry and pointer file.
 * No-op if there are no changes to commit.
 */
export function commitGitignoreChange(cwd: string, dir?: string): void {
  const entry = dir ?? DEFAULT_DIR;
  try {
    gitExec(cwd, ["add", ".gitignore"]);
    // Also stage pointer file if it exists
    if (existsSync(join(cwd, ".agentrack.json"))) {
      gitExec(cwd, ["add", ".agentrack.json"]);
    }
    gitExec(cwd, ["commit", "-m", `chore: add ${entry}/ to .gitignore`]);
  } catch {
    // No changes to commit or .gitignore unchanged
  }
}

/**
 * Stage all changes in the worktree and commit them with the given message.
 * Used after tracker.init() to persist initial data to the worktree branch.
 */
export function commitWorktreeData(cwd: string, message: string, opts?: WorktreeOptions): void {
  const dir = opts?.dir ?? DEFAULT_DIR;
  const worktreeDir = join(cwd, dir);
  gitExec(worktreeDir, ["add", "-A"]);
  try {
    gitExec(worktreeDir, ["commit", "-m", message]);
  } catch {
    // No changes to commit — that's fine (e.g., data already committed)
  }
}

/**
 * Resolve the project root and worktree options for push/pull operations.
 *
 * `cwd` may be either the PROJECT ROOT (where `.agentrack.json` lives) or the
 * DATA DIR (the worktree itself, e.g. `.agentrack/` or `.e2edata/`). This
 * function walks up from `cwd` to locate the agentrack data directory, then
 * derives the project root as its parent. When no data directory is found, it
 * falls back to `cwd` itself (preserving the legacy "cwd is the project root"
 * behavior so existing callers keep working).
 *
 * When `opts` is not provided, the branch/dir are resolved from the pointer
 * file at the project root (via `resolveWorktreeOptions`), so callers do not
 * need to know whether a custom branch (e.g. `_e2edata`) is configured.
 *
 * @internal
 */
function resolveWorktreeContext(
  cwd: string,
  opts?: WorktreeOptions,
): { projectRoot: string; opts: WorktreeOptions } {
  const trackerDir = resolveTrackerDir(cwd);
  const projectRoot = trackerDir ? dirname(trackerDir) : resolve(cwd);
  const worktreeOpts = opts ?? resolveWorktreeOptions(projectRoot);
  return { projectRoot, opts: worktreeOpts };
}

/**
 * Stage all changes, auto-commit, and push to remote.
 *
 * `cwd` may be either the project root or the worktree/data directory; the
 * project root and active branch are resolved automatically. When `opts` is
 * provided it takes precedence over the pointer file.
 */
export function pushWorktree(cwd: string, message?: string, opts?: WorktreeOptions): WorktreeSyncResult {
  const { projectRoot, opts: worktreeOpts } = resolveWorktreeContext(cwd, opts);
  const worktreeDir = join(projectRoot, worktreeOpts.dir);

  // Verify worktree is initialized
  if (!isWorktreeInitialized(projectRoot, worktreeOpts)) {
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
  if (hasRemote(projectRoot)) {
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
 *
 * `cwd` may be either the project root or the worktree/data directory; the
 * project root and active branch are resolved automatically. When `opts` is
 * provided it takes precedence over the pointer file.
 */
export function pullWorktree(cwd: string, opts?: WorktreeOptions): WorktreePullResult {
  const { projectRoot, opts: worktreeOpts } = resolveWorktreeContext(cwd, opts);
  const worktreeDir = join(projectRoot, worktreeOpts.dir);

  // Verify worktree is initialized
  if (!isWorktreeInitialized(projectRoot, worktreeOpts)) {
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
