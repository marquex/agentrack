/**
 * Phase 1 E2E Validation Tests
 *
 * Validates the core Phase 1 acceptance criteria:
 * 1. bun run dev:server starts without error
 * 2. GET /api/health returns 200 with correct JSON
 * 3. Frontend renders a page with the agentrack header
 * 4. Vite proxy successfully hits /api/health
 */
import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5001";

test.describe("Phase 1 Validation", () => {
  test.describe("Backend: Health Endpoint", () => {
    test("GET /api/health returns 200 status", async ({ request }) => {
      const response = await request.get(`${BASE}/api/health`);
      expect(response.status()).toBe(200);
    });

    test("GET /api/health returns correct JSON shape", async ({ request }) => {
      const response = await request.get(`${BASE}/api/health`);
      const body = await response.json();

      expect(body).toHaveProperty("status");
      expect(body.status).toBe("ok");
      expect(body).toHaveProperty("tracker");
      expect(["initialized", "not_initialized"]).toContain(body.tracker);
    });

    test("GET /api/health returns Content-Type application/json", async ({
      request,
    }) => {
      const response = await request.get(`${BASE}/api/health`);
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");
    });
  });

  test.describe("Frontend: Page Rendering", () => {
    test("renders the agentrack header", async ({ page }) => {
      await page.goto("/");
      // "agentrack" is rendered as a brand Link (not a heading) — a valid brand-link pattern.
      // Scope to the header landmark so issue-list links whose titles contain "agentrack"
      // don't trigger a strict-mode violation.
      const header = page
        .locator("header")
        .getByRole("link", { name: /agentrack/i });
      await expect(header).toBeVisible();
    });

    test("page has correct title", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle("agentrack");
    });

    test("page body renders without errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      expect(errors).toEqual([]);
    });
  });

  test.describe("Vite Proxy: API Forwarding", () => {
    test("frontend proxy forwards /api/health to backend", async ({
      page,
    }) => {
      // Navigate to the frontend app through Vite dev server
      await page.goto("/");

      // Make an API call through the Vite proxy
      const response = await page.evaluate(async () => {
        const res = await fetch("/api/health");
        return {
          status: res.status,
          json: await res.json(),
        };
      });

      expect(response.status).toBe(200);
      expect(response.json.status).toBe("ok");
      expect(response.json).toHaveProperty("tracker");
    });
  });
});
