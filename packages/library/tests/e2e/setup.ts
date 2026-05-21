/**
 * E2E test infrastructure for the shared worktree approach.
 *
 * Two test types:
 * - Type A (git operations): init, push, pull — each test creates/destroys its own worktree
 * - Type B (tracker operations): create, update, list, etc. — shared long-lived worktree with data reset
 *
 * IMPORTANT: E2E tests must run serially (not in parallel across files) because
 * they share the validation/.agentrack.json pointer file. Use `bun test tests/e2e/`
 * and ensure --jobs is 1 if running alongside other tests.
 *
 * Phase 2 of the E2E refactor spec (.agentic/specs/e2e-refactor.md).
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { spawn } from "bun";
import { expect } from "bun:test";

// ─── Constants ───────────────────────────────────────────────────────

/** Path to the CLI binary (TypeScript source) */
const BIN_PATH = join(import.meta.dir, "..", "..", "src", "bin.ts");

/** Branch name for Type B (tracker operation) tests */
export const E2E_DATA_BRANCH = "e2edata";

/** Branch name for Type A (git operation) tests */
export const E2E_GIT_BRANCH = "e2egit";

// ─── Path helpers ────────────────────────────────────────────────────

let _projectRoot: string | null = null;

/** Get the git project root directory. */
function getProjectRoot(): string {
  if (_projectRoot) return _projectRoot;
  _projectRoot = execSync("git rev-parse --show-toplevel", {
    encoding: "utf-8",
    cwd: import.meta.dir,
  }).trim();
  return _projectRoot;
}

let _validationDir: string | null = null;

/**
 * Get the absolute path to the validation/ directory at the project root.
 * Creates it if it doesn't exist.
 */
export function getValidationDir(): string {
  if (_validationDir && existsSync(_validationDir)) return _validationDir;
  _validationDir = join(getProjectRoot(), "validation");
  if (!existsSync(_validationDir)) {
    mkdirSync(_validationDir, { recursive: true });
  }
  return _validationDir;
}

/**
 * Get the tracker data directory for a branch.
 * e.g., for branch "e2edata" -> validation/.e2edata/
 */
export function getTrackerDir(branch: string): string {
  return join(getValidationDir(), `.${branch}`);
}

/** Derive git branch name from test branch: "e2edata" -> "_e2edata" */
function getGitBranch(branch: string): string {
  return `_${branch}`;
}

// ─── CLI helper ──────────────────────────────────────────────────────

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run the agt CLI and capture output.
 * Defaults cwd to the validation directory.
 */
export async function runAgt(
  args: string[],
  cwd?: string,
  env?: Record<string, string>,
): Promise<CLIResult> {
  const dir = cwd ?? getValidationDir();
  const proc = spawn({
    cmd: ["bun", "run", BIN_PATH, ...args],
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
}

// ─── Assertion helpers ───────────────────────────────────────────────

/** Parse JSON from CLI output. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseJson(text: string): any {
  return JSON.parse(text.trim());
}

/** Assert CLI result is a success (exit code 0, no stderr, valid JSON on stdout). */
export function assertSuccess(result: CLIResult): void {
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  // Verify stdout is valid JSON — different commands return different shapes
  const parsed = parseJson(result.stdout);
  expect(parsed).toBeDefined();
}

/** Assert CLI result is an error with the expected code. */
export function assertError(
  result: CLIResult,
  expectedCode: string,
  expectedExitCode?: number,
): void {
  if (expectedExitCode !== undefined) {
    expect(result.exitCode).toBe(expectedExitCode);
  } else {
    expect(result.exitCode).not.toBe(0);
  }
  const parsed = parseJson(result.stderr);
  expect(parsed.result).toBe(expectedCode);
}

/** Extract the issue ID from a successful create result. */
export function extractId(result: CLIResult): string {
  const parsed = parseJson(result.stdout);
  expect(parsed.id).toBeDefined();
  return parsed.id;
}

// ─── Pre-init helper ────────────────────────────────────────────────

/**
 * Prepare the validation dir to prevent auto-commits during agt init.
 * Pre-creates .gitignore with worktree entry and pointer file so that
 * commitGitignoreChange finds nothing to commit.
 */
function prepareForCleanInit(branch: string): void {
  const validationDir = getValidationDir();
  const worktreeDir = `.${branch}`;

  // Pre-create .gitignore with entry for the worktree dir
  const gitignorePath = join(validationDir, ".gitignore");
  const entry = `/${worktreeDir}/`;
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (!content.split("\n").some((line) => line.trim() === entry)) {
      const suffix = content.endsWith("\n") ? "" : "\n";
      writeFileSync(gitignorePath, content + suffix + entry + "\n");
    }
  } else {
    writeFileSync(gitignorePath, entry + "\n");
  }

  // Pre-create pointer file (same content that writeBranchPointer writes)
  writeFileSync(
    join(validationDir, ".agentrack.json"),
    JSON.stringify({ branch: getGitBranch(branch) }, null, 2) + "\n",
  );
}

/**
 * Ensure the pointer file exists for a given branch.
 * Used by Type B tests to restore the pointer after Type A tests may have deleted it.
 */
export function ensurePointer(branch: string): void {
  const validationDir = getValidationDir();
  const pointerPath = join(validationDir, ".agentrack.json");
  const trackerDir = getTrackerDir(branch);

  // Only write pointer if the worktree actually exists
  if (existsSync(trackerDir)) {
    writeFileSync(
      pointerPath,
      JSON.stringify({ branch: getGitBranch(branch) }, null, 2) + "\n",
    );
  }
}

// ─── Git cleanup helper ─────────────────────────────────────────────

/**
 * Remove a worktree, local branch, and remote branch.
 * All operations are tolerant of missing resources.
 */
function cleanupWorktree(branch: string): void {
  const validationDir = getValidationDir();
  const projectRoot = getProjectRoot();
  const gitBranch = getGitBranch(branch);
  const worktreePath = join(validationDir, `.${branch}`);

  // Remove worktree
  try {
    execSync(`git worktree remove -f "${worktreePath}"`, {
      cwd: projectRoot,
      stdio: "pipe",
    });
  } catch {
    // Worktree may not exist — ignore
  }

  // Prune stale worktree entries
  try {
    execSync("git worktree prune", { cwd: projectRoot, stdio: "pipe" });
  } catch {
    // Ignore
  }

  // Delete local branch
  try {
    execSync(`git branch -D ${gitBranch}`, {
      cwd: projectRoot,
      stdio: "pipe",
    });
  } catch {
    // Branch may not exist — ignore
  }

  // Delete remote branch
  try {
    execSync(`git push origin --delete ${gitBranch}`, {
      cwd: projectRoot,
      stdio: "pipe",
    });
  } catch {
    // Remote branch may not exist — ignore
  }

  // Force-remove worktree directory if still present
  try {
    rmSync(worktreePath, { recursive: true, force: true });
  } catch {
    // Directory may not exist — ignore
  }
}

// ─── Type A helpers (git operation tests) ────────────────────────────

/**
 * Initialize a fresh E2E worktree for Type A tests.
 * Ensures clean state: removes old worktree/branch, then runs agt init.
 */
export async function initE2EWorktree(branch: string): Promise<CLIResult> {
  const validationDir = getValidationDir();

  // Full cleanup of previous state
  cleanupWorktree(branch);

  // Remove pointer file
  try {
    rmSync(join(validationDir, ".agentrack.json"), { force: true });
  } catch {
    // Pointer file may not exist — ignore
  }

  // Pre-create files to prevent auto-commits on the main branch
  prepareForCleanInit(branch);

  // Run agt init --branch
  return runAgt(["init", "--branch", branch], validationDir);
}

/**
 * Tear down an E2E worktree after a Type A test.
 * Removes worktree, branches, and pointer file. Restores Type B pointer
 * if the Type B worktree exists.
 */
export async function teardownE2EWorktree(branch: string): Promise<void> {
  const validationDir = getValidationDir();

  // Full cleanup
  cleanupWorktree(branch);

  // Remove pointer file
  try {
    rmSync(join(validationDir, ".agentrack.json"), { force: true });
  } catch {
    // Pointer file may not exist — ignore
  }

  // Restore pointer for Type B worktree if it exists
  ensurePointer(E2E_DATA_BRANCH);
}

// ─── Type B helpers (tracker operation tests) ────────────────────────

/**
 * Ensure the E2E worktree is initialized (idempotent).
 * Called in beforeAll for Type B tests.
 */
export async function ensureE2EWorktree(branch: string): Promise<void> {
  const trackerDir = getTrackerDir(branch);
  if (existsSync(trackerDir)) {
    // Worktree exists — ensure pointer file is present
    ensurePointer(branch);
    return;
  }

  // Full cleanup of any leftover state
  cleanupWorktree(branch);

  const validationDir = getValidationDir();
  try {
    rmSync(join(validationDir, ".agentrack.json"), { force: true });
  } catch {
    // Pointer file may not exist — ignore
  }

  // Pre-create files to prevent auto-commits
  prepareForCleanInit(branch);

  // Initialize
  const result = await runAgt(["init", "--branch", branch], validationDir);
  const parsed = parseJson(result.stdout);
  if (parsed.result !== "OK" && parsed.result !== "ALREADY_INITIALIZED") {
    throw new Error(
      `Failed to init E2E worktree: ${result.stderr || result.stdout}`,
    );
  }
}

/**
 * Reset data files to defaults and delete all issue event files.
 * Called in beforeEach for Type B tests. Fast (~1ms) — no git operations.
 */
export function resetWorktreeData(branch: string): void {
  const trackerDir = getTrackerDir(branch);

  // Write default data files
  writeFileSync(
    join(trackerDir, "index.json"),
    JSON.stringify({ open: [], closed: [], childrenOf: {} }, null, 2) + "\n",
  );
  writeFileSync(
    join(trackerDir, "dependencies.json"),
    JSON.stringify({ blockedBy: {}, blocks: {} }, null, 2) + "\n",
  );
  writeFileSync(
    join(trackerDir, "users.json"),
    JSON.stringify({ users: [] }, null, 2) + "\n",
  );
  writeFileSync(
    join(trackerDir, "config.json"),
    JSON.stringify(
      {
        auth: { mode: "open", defaultUser: "anonymous" },
        branch: getGitBranch(branch),
      },
      null,
      2,
    ) + "\n",
  );

  // Delete all issue event files
  const issuesDir = join(trackerDir, "issues");
  if (existsSync(issuesDir)) {
    const files = readdirSync(issuesDir);
    for (const file of files) {
      unlinkSync(join(issuesDir, file));
    }
  }

  // Ensure pointer file is present (safety net for parallel execution)
  ensurePointer(branch);
}

/**
 * Write config.json with specified auth mode.
 * Used by auth tests to switch modes between tests.
 */
export function setAuthMode(
  branch: string,
  mode: string,
  defaultUser?: string,
): void {
  const trackerDir = getTrackerDir(branch);
  writeFileSync(
    join(trackerDir, "config.json"),
    JSON.stringify(
      {
        auth: { mode, defaultUser: defaultUser ?? "anonymous" },
        branch: getGitBranch(branch),
      },
      null,
      2,
    ) + "\n",
  );
}
