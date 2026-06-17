/**
 * E2E test infrastructure for per-test ephemeral worktree isolation.
 *
 * Two test types:
 * - Type A (git operations): init, push, pull — each test runs inside its own
 *   ephemeral directory via `withEphemeralWorktree`.
 * - Type B (tracker operations): create, update, list, etc. — one ephemeral
 *   directory per test file, shared across tests with data reset in beforeEach.
 *
 * Each ephemeral directory lives under `os.tmpdir()` (prefix `agt-e2e-`) and is
 * a fresh git repository. No test ever writes to repo paths (`validation/` or
 * similar). Tests are parallel-safe by default: branch names embed the pid and a
 * random suffix so concurrent files never collide.
 *
 * Phase 2 of the E2E refactor spec (.agentic/specs/e2e-refactor.md).
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "bun";
import { expect } from "bun:test";

// ─── Constants ───────────────────────────────────────────────────────

/** Path to the CLI binary (TypeScript source) */
const BIN_PATH = join(import.meta.dir, "..", "..", "src", "bin.ts");

/** Base branch name for Type B (tracker operation) tests */
export const E2E_DATA_BRANCH = "e2edata";

/** Base branch name for Type A (git operation) tests */
export const E2E_GIT_BRANCH = "e2egit";

/** Default per-spawn timeout (30s) — guards against hung children stalling CI. */
const DEFAULT_SPAWN_TIMEOUT_MS = 30_000;

// ─── Ephemeral dir helpers ───────────────────────────────────────────

/**
 * Create a unique ephemeral directory under `os.tmpdir()`.
 * Caller is responsible for removing it when done (`rmEphemeralDir`).
 */
export function createEphemeralDir(prefix = "agt-e2e-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Best-effort recursive removal of an ephemeral directory. */
export function rmEphemeralDir(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Swallow — best-effort cleanup.
  }
}

/**
 * Initialize a fresh git repo at `dir`. Optionally creates a local bare "origin"
 * remote (at `<dir>/remote.git`) for push/pull tests so they don't depend on any
 * real upstream.
 */
export function initGitRepo(
  dir: string,
  opts?: { withRemote?: boolean },
): void {
  execSync("git init", { cwd: dir, stdio: "pipe" });
  // Stable identity so commits don't fail
  execSync('git config user.name "agt-e2e"', {
    cwd: dir,
    stdio: "pipe",
  });
  execSync('git config user.email "agt-e2e@localhost"', {
    cwd: dir,
    stdio: "pipe",
  });
  // Use a stable default branch name
  try {
    execSync("git symbolic-ref HEAD refs/heads/main", {
      cwd: dir,
      stdio: "pipe",
    });
  } catch {
    // Older git — ignore; default branch name doesn't matter for the tests.
  }
  // An empty repo still has no commits; create one so `git push`/branch ops
  // behave predictably and to give `git ls-remote origin` something to compare.
  writeFileSync(join(dir, ".gitkeep"), "", "utf-8");
  execSync("git add .gitkeep", { cwd: dir, stdio: "pipe" });
  execSync("git commit -m bootstrap", { cwd: dir, stdio: "pipe" });

  if (opts?.withRemote) {
    const remotePath = join(dir, "remote.git");
    execSync(`git init --bare "${remotePath}"`, {
      cwd: dir,
      stdio: "pipe",
    });
    execSync(`git remote add origin "${remotePath}"`, {
      cwd: dir,
      stdio: "pipe",
    });
    // Push the bootstrap commit so `origin/main` exists; needed for clean
    // `git push` of the orphan data branch later.
    execSync("git push origin main", { cwd: dir, stdio: "pipe" });
  }
}

/** Derive git branch name from a test branch: "e2edata" -> "_e2edata" */
function getGitBranch(branch: string): string {
  return `_${branch}`;
}

/**
 * Produce a unique branch name from a base, embedding pid + random suffix so
 * parallel test files never collide on the same git branch.
 */
export function uniqueBranch(base: string): string {
  return `${base}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get the tracker data directory for a branch inside an ephemeral dir.
 * e.g., for branch "e2edata" -> <dir>/.e2edata/
 */
export function getTrackerDir(dir: string, branch: string): string {
  return join(dir, `.${branch}`);
}

// ─── CLI helper ──────────────────────────────────────────────────────

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run the agt CLI in the given `cwd` and capture output.
 *
 * `cwd` is required — every call site must explicitly pass the ephemeral dir
 * it intends to target. This makes accidental fallback to the test runner's
 * `process.cwd()` (which would point at the repo root) impossible.
 *
 * The child is killed after `timeoutMs` (default 30s) so a hung `agt` process
 * can never stall CI.
 */
export async function runAgt(
  args: string[],
  cwd: string,
  env?: Record<string, string>,
  timeoutMs: number = DEFAULT_SPAWN_TIMEOUT_MS,
): Promise<CLIResult> {
  const proc = spawn({
    cmd: ["bun", "run", BIN_PATH, ...args],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      proc.kill();
    } catch {
      // Process may already be dead — ignore.
    }
  }, timeoutMs);

  try {
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    if (timedOut) {
      throw new Error(
        `agt ${args.join(" ")} timed out after ${timeoutMs}ms (cwd=${cwd})`,
      );
    }
    return { stdout, stderr, exitCode };
  } finally {
    clearTimeout(timer);
  }
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

// ─── Pointer helper ──────────────────────────────────────────────────

/**
 * Ensure the pointer file exists at `<dir>/.agentrack.json` for a given branch.
 * Used as a safety net after data resets.
 */
export function ensurePointer(dir: string, branch: string): void {
  const pointerPath = join(dir, ".agentrack.json");
  const trackerDir = getTrackerDir(dir, branch);
  if (existsSync(trackerDir)) {
    writeFileSync(
      pointerPath,
      JSON.stringify({ branch: getGitBranch(branch) }, null, 2) + "\n",
    );
  }
}

// ─── Type A helpers (git operation tests) ────────────────────────────

export interface EphemeralWorktreeOptions {
  /** Set up a local bare `origin` so push/pull tests work without a real remote. */
  withRemote?: boolean;
  /** Per-spawn timeout override passed to `runAgt`. */
  timeoutMs?: number;
}

/**
 * Run a Type A test inside its own ephemeral git repo.
 *
 * Creates a fresh dir under tmpdir, inits git (optionally with a local bare
 * `origin`), runs `agt init --branch <branch>`, invokes `fn`, and ALWAYS removes
 * the dir in `finally` (best-effort, ENOENT-tolerant).
 *
 * The callback receives the dir (use as `cwd` for `runAgt`) and the tracker dir.
 */
export async function withEphemeralWorktree(
  branch: string,
  fn: (dir: string, trackerDir: string) => Promise<void>,
  opts?: EphemeralWorktreeOptions,
): Promise<void> {
  const dir = createEphemeralDir();
  initGitRepo(dir, opts);
  try {
    const initResult = await runAgt(
      ["init", "--branch", branch],
      dir,
      undefined,
      opts?.timeoutMs,
    );
    const parsed = parseJson(initResult.stdout);
    if (
      initResult.exitCode !== 0 ||
      (parsed.result !== "OK" && parsed.result !== "ALREADY_INITIALIZED")
    ) {
      throw new Error(
        `withEphemeralWorktree: agt init failed: ${initResult.stderr || initResult.stdout}`,
      );
    }
    await fn(dir, getTrackerDir(dir, branch));
  } finally {
    rmEphemeralDir(dir);
  }
}

// ─── Type B helpers (tracker operation tests) ────────────────────────

/**
 * Initialize the worktree for a Type B test file inside the given ephemeral dir.
 * Idempotent — safe to call in `beforeAll`.
 */
export async function ensureE2EWorktree(
  dir: string,
  branch: string,
): Promise<void> {
  const trackerDir = getTrackerDir(dir, branch);
  if (existsSync(trackerDir)) {
    ensurePointer(dir, branch);
    return;
  }

  const result = await runAgt(["init", "--branch", branch], dir);
  const parsed = parseJson(result.stdout);
  if (parsed.result !== "OK" && parsed.result !== "ALREADY_INITIALIZED") {
    throw new Error(
      `ensureE2EWorktree: agt init failed: ${result.stderr || result.stdout}`,
    );
  }
}

/**
 * Reset data files to defaults and delete all issue event files inside the
 * ephemeral dir's tracker. Also resets mentions.json to empty so tests start
 * from a clean index.
 *
 * Called in `beforeEach` for Type B tests. Fast (~1ms) — no git operations.
 */
export function resetWorktreeData(dir: string, branch: string): void {
  const trackerDir = getTrackerDir(dir, branch);
  const gitBranch = getGitBranch(branch);

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
    join(trackerDir, "mentions.json"),
    "{}\n",
    "utf-8",
  );
  writeFileSync(
    join(trackerDir, "config.json"),
    JSON.stringify(
      {
        auth: { mode: "open", defaultUser: "anonymous" },
        branch: gitBranch,
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
  ensurePointer(dir, branch);
}

/**
 * Write config.json with specified auth mode.
 * Used by auth tests to switch modes between tests.
 */
export function setAuthMode(
  dir: string,
  branch: string,
  mode: string,
  defaultUser?: string,
): void {
  const trackerDir = getTrackerDir(dir, branch);
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
