/**
 * Playwright global setup.
 *
 * Runs once before all tests to:
 * 1. Ensure the isolated e2edata worktree exists.
 * 2. Reset it to a clean state.
 * 3. Assert the backend resolved AGENTRACK_CWD to the e2e data dir — the
 *    strongest isolation guard. If a stale dev server (or any server pointed
 *    at real .agentrack/) is hit on the backend port, this throws before any
 *    seed is created, failing the run loudly instead of corrupting real data.
 *
 * Isolation is verified via GET /api/status, the authoritative environment
 * endpoint. /api/health stays a pure liveness probe and is no longer coupled
 * to the isolation contract.
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

  // Authoritative isolation guard: query /api/status and confirm the backend
  // is pointed at the isolated e2e data dir. Implemented as an allowlist of
  // one (abort UNLESS agentrackPath === expected) which is strictly stronger
  // than the spec's "abort if it equals real .agentrack/" form.
  const expected = getE2EDataDir();
  const statusUrl = `http://localhost:${BACKEND_PORT}/api/status`;
  let res: Response;
  try {
    res = await fetch(statusUrl);
  } catch (err) {
    // waitForBackend already proved the server is reachable on this port; a
    // fetch failure here means something intercepted the request or the server
    // vanished between checks. Treat as "isolation unverified" and abort.
    throw new Error(
      `E2E isolation guard: failed to fetch ${statusUrl} after backend was healthy: ${String(err)}. ` +
        "Treating as isolation-unverified — aborting before any seed is created.",
    );
  }
  if (!res.ok) {
    // waitForBackend succeeded (server is up on /api/health) but /api/status
    // did not return 2xx. This means the server is the WRONG server (e.g. a
    // stale dev build without the /status route). Unsafe to seed.
    throw new Error(
      `E2E isolation guard: /api/status returned HTTP ${res.status} on port ${BACKEND_PORT} ` +
        "(expected 200). A stale server without the /status route is serving the backend port — " +
        "aborting before any seed is created.",
    );
  }
  const body = (await res.json()) as { agentrackPath?: string };
  if (body.agentrackPath !== expected) {
    throw new Error(
      `E2E isolation guard FAILED: backend agentrackPath is "${body.agentrackPath}" but expected "${expected}". ` +
        `A non-isolated server is serving port ${BACKEND_PORT} — aborting before any seed is created. ` +
        "Ensure no dev server is running on the e2e port and that AGENTRACK_CWD is set correctly.",
    );
  }
}
