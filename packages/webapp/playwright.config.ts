import { defineConfig } from "@playwright/test";
import { getE2EDataDir } from "./e2e/setup.js";
import { fileURLToPath } from "node:url";

/**
 * Playwright configuration for agentrack webapp E2E tests.
 *
 * Tests run against dedicated ports (5001 backend, 5000 frontend). Playwright
 * always spawns its own backend with the AGENTRACK_CWD isolation env var
 * pointing at validation/.e2edata/ — the real .agentrack/ is never touched.
 * Never add reuseExistingServer: true; reuse would risk hitting real data.
 */
const e2eDataDir = getE2EDataDir();
const globalSetupPath = fileURLToPath(new URL("./e2e/global-setup.ts", import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  globalSetup: globalSetupPath,
  // Serialize all tests through a single worker.
  //
  // The agentrack backend persists to a shared file store (validation/.e2edata/)
  // and performs unlocked read-modify-write cycles on index.json / issue files.
  // When the phase files ran in parallel (default = half the CPU cores), two
  // specs issuing POST /api/issues at the same moment would race on those
  // writes, intermittently dropping a create and surfacing as a flaky failure
  // in the backend tests that create-then-read-back ("defaults status to
  // 'idea'", "search is case-insensitive"). Running through one worker removes
  // all concurrency against the shared store and makes the suite deterministic.
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:5000",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: [
    {
      command: "bun run dev:server",
      port: 5001,
      timeout: 10_000,
      env: {
        AGENTRACK_CWD: e2eDataDir,
        PORT: "5001",
        // Single source of truth for the backend port the isolation guard
        // queries; the global-setup reads E2E_BACKEND_PORT (default "5001")
        // so the guard and the webServer port can't drift.
        E2E_BACKEND_PORT: "5001",
      },
    },
    {
      command: "cd frontend && bun run dev",
      port: 5000,
      timeout: 10_000,
      env: {
        API_PORT: "5001",
        VITE_PORT: "5000",
      },
    },
  ],
});
