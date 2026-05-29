import { defineConfig } from "@playwright/test";

/**
 * Playwright configuration for agentrack webapp E2E tests.
 *
 * Tests validate Phase 1 requirements:
 * - Server starts and serves health endpoint
 * - Frontend renders with correct header
 * - Vite proxy forwards /api requests to backend
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
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
    },
    {
      command: "cd frontend && bun run dev",
      port: 5173,
      reuseExistingServer: true,
      timeout: 10_000,
    },
  ],
});
