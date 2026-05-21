import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { runAgt } from "./runner";

/**
 * Create a fresh git repo directory for E2E testing.
 *
 * Each test suite should call this in beforeEach() to get an isolated
 * environment. The directory is created under validation/ which is
 * gitignored, so test artifacts never pollute the project.
 *
 * @param prefix  Descriptive prefix for the test directory name
 * @returns Absolute path to the created directory
 */
export function createTestRepo(prefix = "e2e"): string {
  const testDir = join(
    import.meta.dir, // validation/e2e/helpers/
    "..",            // validation/e2e/
    "..",            // validation/
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );

  mkdirSync(testDir, { recursive: true });

  // Initialize git repo with a default user identity
  execSync("git init", { cwd: testDir, stdio: "pipe" });
  execSync('git config user.email "test@agentrack.dev"', { cwd: testDir, stdio: "pipe" });
  execSync('git config user.name "Test User"', { cwd: testDir, stdio: "pipe" });

  // Create an initial commit so HEAD exists (needed for branch operations)
  writeFileSync(join(testDir, "README.md"), "# Test repo\n");
  execSync("git add README.md", { cwd: testDir, stdio: "pipe" });
  execSync('git commit -m "initial commit"', { cwd: testDir, stdio: "pipe" });

  return testDir;
}

/**
 * Initialize agentrack in the test repo via the real CLI.
 *
 * This calls `agt init` which, inside a git repo, will:
 * 1. Create the _agentrack orphan branch
 * 2. Mount .agentrack/ as a git worktree
 * 3. Create default config, index, dependencies, users files
 * 4. Auto-commit the gitignore change
 */
export async function initAgt(testDir: string): Promise<void> {
  const result = await runAgt(["init"], testDir);
  if (result.exitCode !== 0) {
    throw new Error(`agt init failed: ${result.stderr}`);
  }
}

/**
 * Remove a test directory and its git worktree.
 *
 * Must handle the .agentrack worktree properly:
 * 1. Remove the worktree via git (so git knows it's gone)
 * 2. Prune stale worktree references
 * 3. Remove the entire test directory
 *
 * Call this in afterEach() to clean up after tests.
 * On failure, the directory is left in place for debugging.
 */
export function cleanupTestRepo(testDir: string): void {
  try {
    // Remove the .agentrack worktree first
    execSync("git worktree remove -f .agentrack 2>/dev/null || true", {
      cwd: testDir,
      stdio: "pipe",
    });
    execSync("git worktree prune", { cwd: testDir, stdio: "pipe" });
  } catch {
    // Worktree may not exist if init was never called — that's fine
  }

  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch {
    // On Windows or if files are locked, this might fail
    // Leave the directory for manual cleanup
  }
}

/**
 * Set the auth mode on an initialized agentrack instance by
 * directly writing the config.json file.
 *
 * @param testDir  The test repo directory
 * @param mode     Auth mode: "open", "read-only", or "strict"
 * @param defaultUser  Default user name for open mode
 */
export function setAuthMode(
  testDir: string,
  mode: "open" | "read-only" | "strict",
  defaultUser = "anonymous",
): void {
  const configPath = join(testDir, ".agentrack", "config.json");
  writeFileSync(configPath, JSON.stringify({ auth: { mode, defaultUser } }, null, 2));
}

/**
 * Create an empty directory in tmpdir (outside the project tree).
 *
 * Used for "not initialized" tests where we need a directory that
 * resolveTrackerDir() cannot walk up from to find any .agentrack/.
 *
 * IMPORTANT: This directory has NO git init, NO agentrack init.
 * It is intentionally bare so that CLI commands fail with NOT_INITIALIZED.
 *
 * Call cleanupIsolatedDir() when done.
 */
export function createIsolatedDir(prefix = "e2e-isolated"): string {
  const dir = join(
    tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Remove an isolated directory created by createIsolatedDir().
 */
export function cleanupIsolatedDir(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup failures
  }
}
