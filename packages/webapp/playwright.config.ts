import { defineConfig } from "@playwright/test";
import { getE2EDataDir } from "./e2e/setup.js";
import { fileURLToPath } from "node:url";

/**
 * Playwright configuration for agentrack webapp E2E tests.
 *
 * Tests run against dedicated ports (3001 backend, 5174 frontend) with
 * reuseExistingServer: false so that no stale dev server can accidentally
 * be reused without the AGENTRACK_CWD isolation env var.
 */
const e2eDataDir = getE2EDataDir();
const globalSetupPath = fileURLToPath(new URL("./e2e/global-setup.ts", import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  globalSetup: globalSetupPath,
  use: {
    baseURL: "http://localhost:5174",
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
      port: 3001,
      reuseExistingServer: false,
      timeout: 10_000,
      env: {
        AGENTRACK_CWD: e2eDataDir,
        PORT: "3001",
      },
    },
    {
      command: "cd frontend && bun run dev",
      port: 5174,
      reuseExistingServer: false,
      timeout: 10_000,
      env: {
        API_PORT: "3001",
        VITE_PORT: "5174",
      },
    },
  ],
});
