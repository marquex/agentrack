/**
 * Playwright global setup.
 *
 * Runs once before all tests to:
 * 1. Ensure the isolated e2edata worktree exists.
 * 2. Reset it to a clean state.
 * 3. Assert the backend resolved AGENTRACK_CWD to the e2e data dir — the
 *    strongest isolation guard. If a stale dev server (or any server pointed
 *    at real .agentrack/) is hit on port 5001, this throws before any seed is
 *    created, failing the run loudly instead of corrupting real data.
 */
import { ensureE2EWorktree, resetWorktreeData, getE2EDataDir } from "./setup.js";

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "5001";

async function waitForBackend(maxAttempts = 50): Promise<void> {
  const url = `http://localhost:${BACKEND_PORT}/api/health`;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `E2E global-setup: backend at http://localhost:${BACKEND_PORT}/api/health did not become healthy within ${maxAttempts} attempts.`,
  );
}

export default async function globalSetup(): Promise<void> {
  ensureE2EWorktree();
  resetWorktreeData();

  await waitForBackend();

  // Health-check the backend and assert data isolation.
  const expected = getE2EDataDir();
  const res = await fetch(`http://localhost:${BACKEND_PORT}/api/health`);
  if (!res.ok) {
    throw new Error(
      `E2E isolation guard: /api/health returned HTTP ${res.status}.`,
    );
  }
  const body = (await res.json()) as { cwd?: string };
  if (body.cwd !== expected) {
    throw new Error(
      `E2E isolation guard FAILED: backend cwd is "${body.cwd}" but expected "${expected}". ` +
        "A non-isolated server is serving port ${BACKEND_PORT} — aborting before any seed is created. " +
        "Ensure no dev server is running on the e2e port and that AGENTRACK_CWD is set correctly.",
    );
  }
}
