/**
 * Playwright global setup.
 *
 * Runs once before all tests to ensure the isolated e2edata worktree
 * exists and is reset to a clean state.
 */
import { ensureE2EWorktree, resetWorktreeData } from "./setup.js";

export default function globalSetup() {
  ensureE2EWorktree();
  resetWorktreeData();
}
