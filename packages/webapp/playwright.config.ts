import { defineConfig } from "@playwright/test";
import { getE2EDataDir } from "./e2e/setup.js";
import { fileURLToPath } from "node:url";

/**
 * Playwright configuration for agentrack webapp E2E tests.
 *
 * Tests run against the isolated validation/.e2edata/ worktree
 * so that test data doesn't pollute the main .agentrack/ directory.
 */
const e2eDataDir = getE2EDataDir();
const globalSetupPath = fileURLToPath(new URL("./e2e/global-setup.ts", import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  globalSetup: globalSetupPath,
  use: {
    baseURL: "http://localhost:5173",
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
      port: 3000,
      reuseExistingServer: true,
      timeout: 10_000,
      env: {
        AGENTRACK_CWD: e2eDataDir,
      },
    },
    {
      command: "cd frontend && bun run dev",
      port: 5173,
      reuseExistingServer: true,
      timeout: 10_000,
    },
  ],
});
