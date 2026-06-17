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

/**
 * The tag stamped on every E2E-created issue so the suite can self-heal:
 * leftover seeds from an interrupted run are discovered and deleted rather
 * than accumulating in the shared worktree. See packages/webapp/e2e/README.md.
 */
export const E2E_SEED_TAG = "e2e-seed";

/**
 * Backend base URL. Playwright always boots the backend on port 5001
 * (see playwright.config.ts) — distinct from the dev port 3001.
 */
export const E2E_BACKEND_URL =
  process.env.E2E_BACKEND_URL ?? "http://localhost:5001";

/**
 * Remove every issue tagged with the e2e-seed tag from the isolated worktree.
 *
 * Self-healing: invoked from per-spec `afterAll` hooks so that a failed or
 * interrupted spec does not leave stale seeds behind for the next spec.
 * Tolerates already-deleted ids (HTTP 404 / non-OK) since the global-setup
 * reset may have wiped them at run start.
 */
export async function cleanupE2ESeeds(): Promise<void> {
  let listRes: Response;
  try {
    listRes = await fetch(
      `${E2E_BACKEND_URL}/api/issues?tags=${encodeURIComponent(E2E_SEED_TAG)}`,
    );
  } catch {
    // Backend may already be torn down (e.g. global teardown); nothing to do.
    return;
  }
  if (!listRes.ok) return;

  const seeds = (await listRes.json()) as Array<{ id: string }>;
  // Delete sequentially. The agentrack backend performs unlocked
  // read-modify-write on the file store, so issuing the DELETEs concurrently
  // (e.g. via Promise.all) can race and silently drop some deletes. The
  // global-setup reset remains the authoritative wipe; this loop is
  // best-effort defense-in-depth and still tolerates already-deleted ids.
  for (const seed of seeds) {
    try {
      await fetch(`${E2E_BACKEND_URL}/api/issues/${seed.id}`, {
        method: "DELETE",
      });
    } catch {
      // Swallow: the global-setup reset is the authoritative wipe; this
      // helper is best-effort defense-in-depth.
    }
  }
}
