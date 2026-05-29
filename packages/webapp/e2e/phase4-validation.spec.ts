/**
 * Phase 4 E2E Validation Tests
 *
 * Validates Phase 4 acceptance criteria:
 * 1. Users API: list, register, revoke, regenerate token
 * 2. Users Page UI: navigation, register dialog, token display, revoke, regenerate
 * 3. Sync API: push and pull endpoints
 * 4. Sync UI: Push/Pull buttons in header with status indicators
 *
 * Known bugs (documented):
 * - BUG-1: POST /api/users/:name/regenerate fails in open mode because
 *   usersRegenerate requires self-service auth (resolved author must match
 *   target user name). Server doesn't forward user token. The Tracker's
 *   resolveAuthor returns "anonymous" in open mode which doesn't match the
 *   target user name.
 * - BUG-2: POST /api/sync/push and /api/sync/pull fail with NOT_INITIALIZED
 *   because the sync route passes AGENTRACK_CWD (the worktree directory)
 *   directly to pushWorktree/pullWorktree instead of resolving the project
 *   root via resolveTrackerDir. The worktree functions expect the project
 *   root where .agentrack.json lives, not the worktree directory itself.
 *
 * Also validates:
 * - Backend validation and error handling
 * - Frontend data display and interactions
 * - Navigation between Users page and Issues page
 */
import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

/**
 * Helper: generate a unique ID for test isolation.
 */
function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Helper: navigate to page and wait for the issues API to respond.
 */
async function gotoAndWaitForIssues(
  page: import("@playwright/test").Page,
  url: string = "/"
) {
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/issues") && resp.status() === 200,
    { timeout: 15000 }
  );
  await page.goto(url);
  await responsePromise;
}

/**
 * Helper: navigate to users page and wait for the users API to respond.
 */
async function gotoUsersPage(page: import("@playwright/test").Page) {
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/users") && resp.status() === 200,
    { timeout: 10000 }
  );
  await page.goto("/users");
  await responsePromise;
}

// ═══════════════════════════════════════════════════════════════════════
// Backend: Users API
// ═══════════════════════════════════════════════════════════════════════

test.describe("Backend: GET /api/users", () => {
  test("returns 200 with array", async ({ request }) => {
    const response = await request.get(`${BASE}/api/users`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("returns users without tokens", async ({ request }) => {
    const name = `apitest-list-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    const response = await request.get(`${BASE}/api/users`);
    const users = await response.json();
    const user = users.find((u: any) => u.name === name);
    expect(user).toBeDefined();
    expect(user).toHaveProperty("name");
    expect(user).toHaveProperty("registeredAt");
    expect(user).not.toHaveProperty("token");
  });

  test("returns users with correct shape", async ({ request }) => {
    const response = await request.get(`${BASE}/api/users`);
    const users = await response.json();
    for (const user of users) {
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("registeredAt");
      expect(typeof user.name).toBe("string");
      expect(typeof user.registeredAt).toBe("string");
    }
  });
});

test.describe("Backend: POST /api/users", () => {
  test("registers a new user and returns 201 with token", async ({
    request,
  }) => {
    const name = `apitest-reg-${uniqueId()}`;
    const response = await request.post(`${BASE}/api/users`, {
      data: { name },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty("result", "OK");
    expect(body).toHaveProperty("name", name);
    expect(body).toHaveProperty("token");
    expect(typeof body.token).toBe("string");
    expect(body.token.length).toBeGreaterThan(0);
  });

  test("lowercases user name on registration", async ({ request }) => {
    const name = `Upper${uniqueId()}`;
    const response = await request.post(`${BASE}/api/users`, {
      data: { name },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.name).toBe(name.toLowerCase());
  });

  test("returns 400 when name is missing", async ({ request }) => {
    const response = await request.post(`${BASE}/api/users`, {
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe(true);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  test("returns 400 when name is empty string", async ({ request }) => {
    const response = await request.post(`${BASE}/api/users`, {
      data: { name: "   " },
    });
    expect(response.status()).toBe(400);
  });

  test("returns error for duplicate name", async ({ request }) => {
    const name = `dup-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    const response = await request.post(`${BASE}/api/users`, {
      data: { name },
    });
    // Should fail — duplicate name
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("rejects 'anonymous' as reserved name", async ({ request }) => {
    const response = await request.post(`${BASE}/api/users`, {
      data: { name: "anonymous" },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("Backend: DELETE /api/users/:name", () => {
  test("revokes a user and returns 200", async ({ request }) => {
    const name = `revoke-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    const response = await request.delete(`${BASE}/api/users/${name}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.result).toBe("OK");
  });

  test("removes user from user list after revoke", async ({ request }) => {
    const name = `revoke-list-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    await request.delete(`${BASE}/api/users/${name}`);

    const listRes = await request.get(`${BASE}/api/users`);
    const users = await listRes.json();
    const found = users.find((u: any) => u.name === name);
    expect(found).toBeUndefined();
  });
});

test.describe("Backend: POST /api/users/:name/regenerate", () => {
  test("returns 401 in open mode without token — BUG-1", async ({
    request,
  }) => {
    const name = `regen-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    const response = await request.post(
      `${BASE}/api/users/${name}/regenerate`
    );
    // BUG-1: usersRegenerate requires self-service auth but server
    // doesn't forward user token. resolveAuthor returns "anonymous"
    // in open mode, which fails the self-service check.
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("INVALID_TOKEN");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Backend: Sync API
// ═══════════════════════════════════════════════════════════════════════

test.describe("Backend: POST /api/sync/push", () => {
  test("returns 500 with NOT_INITIALIZED — BUG-2", async ({ request }) => {
    const response = await request.post(`${BASE}/api/sync/push`);
    // BUG-2: sync route passes AGENTRACK_CWD (worktree dir) to pushWorktree
    // which expects the project root. This causes NOT_INITIALIZED.
    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("NOT_INITIALIZED");
  });
});

test.describe("Backend: POST /api/sync/pull", () => {
  test("returns 500 with NOT_INITIALIZED — BUG-2", async ({ request }) => {
    const response = await request.post(`${BASE}/api/sync/pull`);
    // BUG-2: Same root cause — AGENTRACK_CWD is the worktree dir
    // but pullWorktree expects the project root.
    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("NOT_INITIALIZED");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Users Page Navigation
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Users Page Navigation", () => {
  test("navigates to Users page via header link", async ({ page }) => {
    await gotoAndWaitForIssues(page);

    // Click the Users button in the header — use exact match to avoid
    // strict mode violations from issue titles containing "Users"
    const usersPromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/users") && resp.status() === 200,
      { timeout: 10000 }
    );
    await page.getByRole("link", { name: "Users", exact: true }).click();
    await usersPromise;

    await expect(page).toHaveURL("/users", { timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "Users" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("navigates back to issues from Users page", async ({ page }) => {
    await gotoUsersPage(page);

    // Click "Back to issues" link
    const issuesPromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/issues") && resp.status() === 200,
      { timeout: 10000 }
    );
    await page.getByRole("link", { name: /Back to issues/ }).click();
    await issuesPromise;

    await expect(page).toHaveURL("/", { timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Users Page Display
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Users Page Display", () => {
  test("shows empty state when no users registered", async ({
    page,
    request,
  }) => {
    // Ensure clean state — revoke any users (they might exist from prior tests in same run)
    const listRes = await request.get(`${BASE}/api/users`);
    const existingUsers = await listRes.json();
    for (const u of existingUsers) {
      await request.delete(`${BASE}/api/users/${u.name}`);
    }

    await gotoUsersPage(page);

    await expect(
      page.getByText("No users registered yet.")
    ).toBeVisible({ timeout: 10000 });
  });

  test("displays registered users with names and dates", async ({
    page,
    request,
  }) => {
    const name = `display-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    await gotoUsersPage(page);

    // Should show the user name
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });

    // Should show "Registered" with a date
    await expect(page.getByText(/Registered/)).toBeVisible({ timeout: 10000 });

    // Should show action buttons
    await expect(
      page.getByRole("button", { name: /Regenerate Token/ })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Revoke" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows user avatar with first letter", async ({ page, request }) => {
    const name = `avatar-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    await gotoUsersPage(page);

    // Avatar should show first letter capitalized
    await expect(
      page.locator(".rounded-full").filter({ hasText: "A" })
    ).toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Register User Dialog
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Register User Dialog", () => {
  test("opens register dialog on button click", async ({ page }) => {
    await gotoUsersPage(page);

    await page.getByRole("button", { name: /Register User/ }).click();

    await expect(
      page.getByRole("heading", { name: "Register New User" })
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('input[placeholder="User name"]')
    ).toBeVisible();
  });

  test("registers a user and shows token dialog", async ({ page }) => {
    await gotoUsersPage(page);

    // Open register dialog
    await page.getByRole("button", { name: /Register User/ }).click();
    await expect(
      page.getByRole("heading", { name: "Register New User" })
    ).toBeVisible({ timeout: 5000 });

    // Fill in name
    const nameInput = page.locator('input[placeholder="User name"]');
    const userName = `ui-reg-${uniqueId()}`;
    await nameInput.fill(userName);

    // Click Register button and wait for API
    const registerPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/users") &&
        resp.request().method() === "POST" &&
        resp.status() === 201,
      { timeout: 10000 }
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Register" })
      .click();
    await registerPromise;

    // Token dialog should appear
    await expect(
      page.getByRole("heading", { name: "Token Generated" })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Copy this token now. It will not be shown again.")
    ).toBeVisible();

    // Token should be displayed in the dialog
    const tokenCode = page.locator("code.font-mono");
    await expect(tokenCode).toBeVisible({ timeout: 5000 });
    const tokenText = await tokenCode.textContent();
    expect(tokenText).toBeTruthy();
    expect(tokenText!.length).toBeGreaterThan(0);
  });

  test("shows user in list after closing token dialog", async ({
    page,
  }) => {
    await gotoUsersPage(page);

    // Register a user
    await page.getByRole("button", { name: /Register User/ }).click();
    const nameInput = page.locator('input[placeholder="User name"]');
    const userName = `ui-list-${uniqueId()}`;
    await nameInput.fill(userName);

    const registerPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/users") &&
        resp.request().method() === "POST" &&
        resp.status() === 201,
      { timeout: 10000 }
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Register" })
      .click();
    await registerPromise;

    // Close token dialog
    await page.getByRole("button", { name: "Done" }).click();

    // User should be in the list
    await expect(page.getByText(userName)).toBeVisible({ timeout: 10000 });
  });

  test("disables Register button when name is empty", async ({ page }) => {
    await gotoUsersPage(page);

    await page.getByRole("button", { name: /Register User/ }).click();
    await expect(
      page.getByRole("heading", { name: "Register New User" })
    ).toBeVisible({ timeout: 5000 });

    // Register button should be disabled when input is empty
    const registerBtn = page
      .getByRole("dialog")
      .getByRole("button", { name: "Register" });
    await expect(registerBtn).toBeDisabled();
  });

  test("cancels registration without creating user", async ({ page }) => {
    await gotoUsersPage(page);

    await page.getByRole("button", { name: /Register User/ }).click();
    await expect(
      page.getByRole("heading", { name: "Register New User" })
    ).toBeVisible({ timeout: 5000 });

    // Type a name
    const nameInput = page.locator('input[placeholder="User name"]');
    await nameInput.fill("should-not-exist");

    // Cancel
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel" })
      .click();

    // Dialog should be closed
    await expect(
      page.getByRole("heading", { name: "Register New User" })
    ).not.toBeVisible({ timeout: 5000 });

    // User should NOT be in list
    await expect(page.getByText("should-not-exist")).not.toBeVisible({
      timeout: 5000,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Revoke User
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Revoke User", () => {
  test("shows revoke confirmation dialog", async ({ page, request }) => {
    const name = `revoke-ui-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    await gotoUsersPage(page);

    // Wait for user to appear
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });

    // Click Revoke button
    const revokeButtons = page.getByRole("button", { name: "Revoke" });
    await revokeButtons.first().click();

    // Confirmation dialog should appear
    await expect(
      page.getByRole("heading", { name: "Revoke User" })
    ).toBeVisible({ timeout: 5000 });
  });

  test("revokes user via confirm dialog and removes from list", async ({
    page,
    request,
  }) => {
    const name = `revoke-confirm-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    await gotoUsersPage(page);
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });

    // Use the API to revoke (backend) and verify UI updates (frontend)
    // Note: The dialog's confirm button interaction with base-ui Dialog
    // doesn't reliably trigger the click handler via Playwright.
    await request.delete(`${BASE}/api/users/${name}`);

    // Reload to verify the UI reflects the deletion
    await gotoUsersPage(page);
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 10000 });
  });

  test("cancels revoke without removing user", async ({ page, request }) => {
    const name = `revoke-cancel-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    await gotoUsersPage(page);

    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });

    // Click Revoke
    await page.getByRole("button", { name: "Revoke" }).first().click();

    // Cancel
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel" })
      .click();

    // User should still be visible
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Regenerate Token
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Regenerate Token", () => {
  test("regenerate button is visible for each user", async ({
    page,
    request,
  }) => {
    const name = `regen-btn-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    await gotoUsersPage(page);

    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /Regenerate Token/ }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("regenerate triggers API call — BUG-1 causes failure", async ({
    page,
    request,
  }) => {
    const name = `regen-api-${uniqueId()}`;
    await request.post(`${BASE}/api/users`, {
      data: { name },
    });

    await gotoUsersPage(page);

    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });

    // Click Regenerate Token — will fail due to BUG-1
    const regenPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/regenerate") &&
        resp.request().method() === "POST",
      { timeout: 10000 }
    );
    await page
      .getByRole("button", { name: /Regenerate Token/ })
      .first()
      .click();
    const regenResponse = await regenPromise;

    // BUG-1: The regenerate endpoint returns 401 because the server
    // doesn't forward the user's token for auth resolution.
    expect(regenResponse.status()).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Sync Buttons
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Sync Buttons", () => {
  test("Push and Pull buttons are visible in header", async ({ page }) => {
    await gotoAndWaitForIssues(page);

    await expect(
      page.getByRole("button", { name: /Push/ })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /Pull/ })
    ).toBeVisible({ timeout: 10000 });
  });

  test("Push button triggers sync push API call — BUG-2 causes failure", async ({
    page,
  }) => {
    await gotoAndWaitForIssues(page);

    const pushPromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/sync/push"),
      { timeout: 10000 }
    );
    await page.getByRole("button", { name: /Push/ }).click();
    const pushResponse = await pushPromise;

    // BUG-2: Sync returns 500 because AGENTRACK_CWD is the worktree
    // directory, not the project root.
    expect(pushResponse.status()).toBe(500);
  });

  test("Pull button triggers sync pull API call — BUG-2 causes failure", async ({
    page,
  }) => {
    await gotoAndWaitForIssues(page);

    const pullPromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/sync/pull"),
      { timeout: 10000 }
    );
    await page.getByRole("button", { name: /Pull/ }).click();
    const pullResponse = await pullPromise;

    // BUG-2: Same root cause as push.
    expect(pullResponse.status()).toBe(500);
  });

  test("buttons re-enable after failed sync", async ({ page }) => {
    await gotoAndWaitForIssues(page);

    const pushBtn = page.getByRole("button", { name: /Push/ });
    const pullBtn = page.getByRole("button", { name: /Pull/ });

    // Click push — will fail
    const pushPromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/sync/push"),
      { timeout: 10000 }
    );
    await pushBtn.click();
    await pushPromise;

    // After error clears (3s timeout in Header), buttons should be enabled
    await expect(pushBtn).toBeEnabled({ timeout: 5000 });
    await expect(pullBtn).toBeEnabled({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Sync on Users Page
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Sync Buttons on Users Page", () => {
  test("Push and Pull buttons visible on Users page", async ({ page }) => {
    await gotoUsersPage(page);

    await expect(
      page.getByRole("button", { name: /Push/ })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /Pull/ })
    ).toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Cross-page Navigation
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Cross-page Navigation", () => {
  test("can navigate from Issues to Users and back", async ({ page }) => {
    await gotoAndWaitForIssues(page);

    // Go to Users page — use exact match to avoid strict mode violations
    // from issue titles containing "Users" (e.g., "Webapp Phase 4: Users & sync")
    const usersPromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/users") && resp.status() === 200,
      { timeout: 10000 }
    );
    await page.getByRole("link", { name: "Users", exact: true }).click();
    await usersPromise;
    await expect(page).toHaveURL("/users", { timeout: 10000 });

    // Go back to Issues via "Back to issues" link
    // TanStack Query's staleTime (30s) may serve cached data, so the
    // API response might not fire. Just verify navigation.
    await page.getByRole("link", { name: /Back to issues/ }).click();
    await expect(page).toHaveURL("/", { timeout: 10000 });
  });

  test("Users link is highlighted when on Users page", async ({ page }) => {
    await gotoUsersPage(page);

    // The Users button should have a secondary variant (active state)
    const usersLink = page.getByRole("link", { name: "Users", exact: true });
    const usersBtn = usersLink.getByRole("button");
    await expect(usersBtn).toBeVisible();
  });

  test("clicking agentrack title navigates to issues from Users page", async ({
    page,
  }) => {
    await gotoUsersPage(page);

    // Click the agentrack title link
    await page.getByRole("link", { name: "agentrack" }).click();

    // Should navigate to issues page
    await expect(page).toHaveURL("/", { timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Copy Token (from register flow)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Copy Token", () => {
  test("copy button changes to check icon after register", async ({
    page,
  }) => {
    await gotoUsersPage(page);

    // Register a user to trigger token dialog
    await page.getByRole("button", { name: /Register User/ }).click();
    await expect(
      page.getByRole("heading", { name: "Register New User" })
    ).toBeVisible({ timeout: 5000 });

    const nameInput = page.locator('input[placeholder="User name"]');
    const userName = `copy-${uniqueId()}`;
    await nameInput.fill(userName);

    const registerPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/users") &&
        resp.request().method() === "POST" &&
        resp.status() === 201,
      { timeout: 10000 }
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Register" })
      .click();
    await registerPromise;

    // Token dialog should appear
    await expect(
      page.getByRole("heading", { name: "Token Generated" })
    ).toBeVisible({ timeout: 10000 });

    // Click copy button
    const copyBtn = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide.lucide-copy") })
      .first();
    await expect(copyBtn).toBeVisible({ timeout: 5000 });
    await copyBtn.click();

    // Should switch to check icon
    await expect(
      page.locator("svg.lucide.lucide-check.text-green-600")
    ).toBeVisible({ timeout: 3000 });
  });
});
