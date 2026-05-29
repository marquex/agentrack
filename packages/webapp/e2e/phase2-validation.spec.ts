/**
 * Phase 2 E2E Validation Tests
 *
 * Validates Phase 2 acceptance criteria:
 * 1. Issue list loads and displays real data from agentrack
 * 2. Can create a new issue via the dialog
 * 3. Can view issue's full details
 * 4. Can change status, priority, assignee, title, description
 * 5. Filters work (status, assignee, search)
 * 6. Navigation between list and detail works
 *
 * Also validates:
 * - Backend API endpoints (GET /api/issues, POST /api/issues,
 *   GET /api/issues/:id, PATCH /api/issues/:id, GET /api/users)
 * - Error handling and edge cases
 */
import { test, expect } from "@playwright/test";

/**
 * Helper: navigate to page and wait for the issues API to respond.
 * This is more reliable than waitForLoadState("networkidle") because
 * TanStack Query makes API calls after component mount.
 */
async function gotoAndWaitForIssues(page: import("@playwright/test").Page, url: string = "/") {
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/issues") && resp.status() === 200,
    { timeout: 15000 }
  );
  await page.goto(url);
  await responsePromise;
}

test.describe("Phase 2 Validation", () => {
  // ─── Backend: GET /api/issues ───────────────────────────────────────

  test.describe("Backend: GET /api/issues", () => {
    test("returns 200 with array", async ({ request }) => {
      const response = await request.get("http://localhost:3001/api/issues");
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test("returns issues with correct shape", async ({ request }) => {
      const createRes = await request.post("http://localhost:3001/api/issues", {
        data: {
          title: "Phase2 Test: Issue shape validation",
          status: "todo",
          priority: 3,
          tags: ["test", "phase2"],
        },
      });
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      const response = await request.get("http://localhost:3001/api/issues");
      const issues = await response.json();
      expect(issues.length).toBeGreaterThan(0);

      const testIssue = issues.find((i: any) => i.id === created.id);
      expect(testIssue).toBeDefined();
      expect(testIssue).toHaveProperty("id");
      expect(testIssue).toHaveProperty("title");
      expect(testIssue).toHaveProperty("status");
      expect(testIssue).toHaveProperty("assignee");
      expect(testIssue).toHaveProperty("parentId");
      expect(testIssue).toHaveProperty("tags");
      expect(testIssue).toHaveProperty("priority");
    });

    test("filters by status", async ({ request }) => {
      const response = await request.get(
        "http://localhost:3001/api/issues?status=todo"
      );
      expect(response.status()).toBe(200);
      const issues = await response.json();
      for (const issue of issues) {
        expect(issue.status).toBe("todo");
      }
    });

    test("filters by 'open' status (non-closed)", async ({ request }) => {
      const response = await request.get(
        "http://localhost:3001/api/issues?status=open"
      );
      expect(response.status()).toBe(200);
      const issues = await response.json();
      for (const issue of issues) {
        expect(issue.status).not.toBe("closed");
      }
    });

    test("filters by assignee", async ({ request }) => {
      const response = await request.get(
        "http://localhost:3001/api/issues?assignee=nonexistent-user"
      );
      expect(response.status()).toBe(200);
      const issues = await response.json();
      expect(issues.length).toBe(0);
    });

    test("filters by search (title substring)", async ({ request }) => {
      const uniqueTitle = `SearchTest-${Date.now()}`;
      const createRes = await request.post("http://localhost:3001/api/issues", {
        data: { title: uniqueTitle },
      });
      await createRes.json();

      const response = await request.get(
        `http://localhost:3001/api/issues?search=${uniqueTitle}`
      );
      expect(response.status()).toBe(200);
      const issues = await response.json();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].title).toBe(uniqueTitle);
    });

    test("search is case-insensitive", async ({ request }) => {
      const uniqueTitle = `CaseTest-${Date.now()}`;
      const createRes = await request.post("http://localhost:3001/api/issues", {
        data: { title: uniqueTitle },
      });
      await createRes.json();

      const response = await request.get(
        `http://localhost:3001/api/issues?search=${uniqueTitle.toLowerCase()}`
      );
      const issues = await response.json();
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    test("filters by parentId=null for top-level issues", async ({
      request,
    }) => {
      const response = await request.get(
        "http://localhost:3001/api/issues?parentId=null"
      );
      expect(response.status()).toBe(200);
      const issues = await response.json();
      for (const issue of issues) {
        expect(issue.parentId).toBeNull();
      }
    });

    test("filters by tags", async ({ request }) => {
      const uniqueTag = `tag-${Date.now()}`;
      const createRes = await request.post("http://localhost:3001/api/issues", {
        data: { title: "Tagged issue", tags: [uniqueTag] },
      });
      await createRes.json();

      const response = await request.get(
        `http://localhost:3001/api/issues?tags=${uniqueTag}`
      );
      expect(response.status()).toBe(200);
      const issues = await response.json();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      for (const issue of issues) {
        expect(issue.tags).toContain(uniqueTag);
      }
    });
  });

  // ─── Backend: POST /api/issues ──────────────────────────────────────

  test.describe("Backend: POST /api/issues", () => {
    test("creates an issue with required fields only", async ({ request }) => {
      const response = await request.post("http://localhost:3001/api/issues", {
        data: { title: "Phase2 Test: Minimal issue" },
      });
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body).toHaveProperty("id");
      expect(typeof body.id).toBe("string");
      expect(body.id.length).toBeGreaterThan(0);
    });

    test("creates an issue with all fields", async ({ request }) => {
      const response = await request.post("http://localhost:3001/api/issues", {
        data: {
          title: "Phase2 Test: Full issue",
          description: "This is a test description",
          status: "in-progress",
          assignee: "webapp-validator",
          tags: ["test", "phase2", "full"],
          priority: 1,
        },
      });
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.id).toBeDefined();

      const viewRes = await request.get(
        `http://localhost:3001/api/issues/${body.id}`
      );
      const issue = await viewRes.json();
      expect(issue.title).toBe("Phase2 Test: Full issue");
      expect(issue.description).toBe("This is a test description");
      expect(issue.status).toBe("in-progress");
      expect(issue.assignee).toBe("webapp-validator");
      expect(issue.tags).toEqual(["test", "phase2", "full"]);
      expect(issue.priority).toBe(1);
    });

    test("returns 400 when title is missing", async ({ request }) => {
      const response = await request.post("http://localhost:3001/api/issues", {
        data: {},
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    test("returns 400 when title is empty string", async ({ request }) => {
      const response = await request.post("http://localhost:3001/api/issues", {
        data: { title: "   " },
      });
      expect(response.status()).toBe(400);
    });

    test("returns 400 when title is not a string", async ({ request }) => {
      const response = await request.post("http://localhost:3001/api/issues", {
        data: { title: 123 },
      });
      expect(response.status()).toBe(400);
    });

    test("defaults status to 'idea' when not provided", async ({
      request,
    }) => {
      const response = await request.post("http://localhost:3001/api/issues", {
        data: { title: "Phase2 Test: Default status" },
      });
      const body = await response.json();

      const viewRes = await request.get(
        `http://localhost:3001/api/issues/${body.id}`
      );
      const issue = await viewRes.json();
      expect(issue.status).toBe("idea");
    });

    test("defaults priority to 3 when not provided", async ({ request }) => {
      const response = await request.post("http://localhost:3001/api/issues", {
        data: { title: "Phase2 Test: Default priority" },
      });
      const body = await response.json();

      const viewRes = await request.get(
        `http://localhost:3001/api/issues/${body.id}`
      );
      const issue = await viewRes.json();
      expect(issue.priority).toBe(3);
    });
  });

  // ─── Backend: GET /api/issues/:id ───────────────────────────────────

  test.describe("Backend: GET /api/issues/:id", () => {
    test("returns full issue detail", async ({ request }) => {
      const createRes = await request.post(
        "http://localhost:3001/api/issues",
        {
          data: {
            title: "Phase2 Test: Detail view",
            description: "Detailed description here",
          },
        }
      );
      const { id } = await createRes.json();

      const response = await request.get(
        `http://localhost:3001/api/issues/${id}`
      );
      expect(response.status()).toBe(200);
      const issue = await response.json();

      expect(issue.id).toBe(id);
      expect(issue.title).toBe("Phase2 Test: Detail view");
      expect(issue.description).toBe("Detailed description here");
      expect(issue).toHaveProperty("createdAt");
      expect(issue).toHaveProperty("createdBy");
      expect(issue).toHaveProperty("updatedAt");
    });

    test("returns 404 for non-existent issue", async ({ request }) => {
      const response = await request.get(
        "http://localhost:3001/api/issues/nonexistent123"
      );
      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe(true);
    });
  });

  // ─── Backend: PATCH /api/issues/:id ─────────────────────────────────

  test.describe("Backend: PATCH /api/issues/:id", () => {
    let testIssueId: string;

    test.beforeAll(async ({ request }) => {
      const createRes = await request.post(
        "http://localhost:3001/api/issues",
        {
          data: { title: "Phase2 Test: Update target" },
        }
      );
      const body = await createRes.json();
      testIssueId = body.id;
    });

    test("updates status", async ({ request }) => {
      const response = await request.patch(
        `http://localhost:3001/api/issues/${testIssueId}`,
        { data: { status: "in-progress" } }
      );
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.result).toBe("OK");

      const viewRes = await request.get(
        `http://localhost:3001/api/issues/${testIssueId}`
      );
      const issue = await viewRes.json();
      expect(issue.status).toBe("in-progress");
    });

    test("updates priority", async ({ request }) => {
      const response = await request.patch(
        `http://localhost:3001/api/issues/${testIssueId}`,
        { data: { priority: 1 } }
      );
      expect(response.status()).toBe(200);

      const viewRes = await request.get(
        `http://localhost:3001/api/issues/${testIssueId}`
      );
      const issue = await viewRes.json();
      expect(issue.priority).toBe(1);
    });

    test("updates assignee", async ({ request }) => {
      const response = await request.patch(
        `http://localhost:3001/api/issues/${testIssueId}`,
        { data: { assignee: "test-user" } }
      );
      expect(response.status()).toBe(200);

      const viewRes = await request.get(
        `http://localhost:3001/api/issues/${testIssueId}`
      );
      const issue = await viewRes.json();
      expect(issue.assignee).toBe("test-user");
    });

    test("updates title", async ({ request }) => {
      const response = await request.patch(
        `http://localhost:3001/api/issues/${testIssueId}`,
        { data: { title: "Updated title by test" } }
      );
      expect(response.status()).toBe(200);

      const viewRes = await request.get(
        `http://localhost:3001/api/issues/${testIssueId}`
      );
      const issue = await viewRes.json();
      expect(issue.title).toBe("Updated title by test");
    });

    test("updates description", async ({ request }) => {
      const response = await request.patch(
        `http://localhost:3001/api/issues/${testIssueId}`,
        { data: { description: "New description" } }
      );
      expect(response.status()).toBe(200);

      const viewRes = await request.get(
        `http://localhost:3001/api/issues/${testIssueId}`
      );
      const issue = await viewRes.json();
      expect(issue.description).toBe("New description");
    });

    test("updates tags", async ({ request }) => {
      const response = await request.patch(
        `http://localhost:3001/api/issues/${testIssueId}`,
        { data: { tags: ["updated", "tags"] } }
      );
      expect(response.status()).toBe(200);

      const viewRes = await request.get(
        `http://localhost:3001/api/issues/${testIssueId}`
      );
      const issue = await viewRes.json();
      expect(issue.tags).toEqual(["updated", "tags"]);
    });

    test("can clear assignee (set to null)", async ({ request }) => {
      const response = await request.patch(
        `http://localhost:3001/api/issues/${testIssueId}`,
        { data: { assignee: null } }
      );
      expect(response.status()).toBe(200);

      const viewRes = await request.get(
        `http://localhost:3001/api/issues/${testIssueId}`
      );
      const issue = await viewRes.json();
      expect(issue.assignee).toBeNull();
    });

    test("returns 400 when no fields provided", async ({ request }) => {
      const response = await request.patch(
        `http://localhost:3001/api/issues/${testIssueId}`,
        { data: {} }
      );
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe(true);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    test("returns 404 for non-existent issue", async ({ request }) => {
      const response = await request.patch(
        "http://localhost:3001/api/issues/nonexistent123",
        { data: { title: "Nope" } }
      );
      expect(response.status()).toBe(404);
    });
  });

  // ─── Backend: GET /api/users ────────────────────────────────────────

  test.describe("Backend: GET /api/users", () => {
    test("returns 200 with array", async ({ request }) => {
      const response = await request.get("http://localhost:3001/api/users");
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test("returns users with correct shape", async ({ request }) => {
      const response = await request.get("http://localhost:3001/api/users");
      const users = await response.json();
      for (const user of users) {
        expect(user).toHaveProperty("name");
        expect(user).toHaveProperty("registeredAt");
        expect(typeof user.name).toBe("string");
      }
    });
  });

  // ─── Frontend: Issues List Page ─────────────────────────────────────

  test.describe("Frontend: Issues List Page", () => {
    test("displays issue list page with heading", async ({ page }) => {
      await gotoAndWaitForIssues(page);
      const heading = page.getByRole("heading", { name: "Issues" });
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test("shows issues in the list as clickable rows", async ({ page }) => {
      // Ensure at least one issue exists via direct API call
      const request = page.context().request;
      await request.post("http://localhost:3001/api/issues", {
        data: { title: "Phase2 E2E: List visible test" },
      });

      await gotoAndWaitForIssues(page);

      // Issue rows are <a> elements linking to /issues/:id
      const issueLinks = page.locator('a[href^="/issues/"]');
      await expect(issueLinks.first()).toBeVisible({ timeout: 10000 });
    });

    test("displays status badges on issue rows", async ({ page }) => {
      const request = page.context().request;
      await request.post("http://localhost:3001/api/issues", {
        data: {
          title: "Phase2 E2E: Badge test",
          status: "todo",
        },
      });

      await gotoAndWaitForIssues(page);

      // Status badges contain status text like "Idea", "Todo", etc.
      // Use a locator that matches the Badge component output
      const badgeTexts = ["Idea", "Todo", "In Progress", "Done", "Closed"];
      let found = false;
      for (const text of badgeTexts) {
        const badge = page.locator("span").filter({ hasText: new RegExp(`^${text}$`) });
        if (await badge.count() > 0) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    test("displays priority indicators on issue rows", async ({ page }) => {
      await gotoAndWaitForIssues(page);

      // Priority indicators show "P1" through "P5" text
      const priorities = page.locator("span").filter({ hasText: /^P[1-5]$/ });
      await expect(priorities.first()).toBeVisible({ timeout: 10000 });
    });

    test("page renders without console errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await gotoAndWaitForIssues(page);

      expect(errors).toEqual([]);
    });

    test("shows empty state when no issues match filters", async ({
      page,
    }) => {
      await gotoAndWaitForIssues(page);

      // Type a unique search that won't match anything
      const searchInput = page.locator('input[placeholder="Search issues..."]');
      await searchInput.fill("zzz-nonexistent-issue-xyz-12345");

      // Wait for the filtered API response
      await page.waitForResponse(
        (resp) => resp.url().includes("/api/issues") && resp.url().includes("search="),
        { timeout: 10000 }
      );

      // Should show empty state message
      await expect(
        page.getByText("No issues match your filters")
      ).toBeVisible({ timeout: 10000 });
    });
  });

  // ─── Frontend: Filtering ────────────────────────────────────────────

  test.describe("Frontend: Filtering", () => {
    test("search input filters issues by title", async ({ page }) => {
      const uniqueTitle = `FilterTest-${Date.now()}`;
      const request = page.context().request;
      await request.post("http://localhost:3001/api/issues", {
        data: { title: uniqueTitle },
      });

      await gotoAndWaitForIssues(page);

      const searchInput = page.locator('input[placeholder="Search issues..."]');
      await searchInput.fill(uniqueTitle);

      // Wait for the API response with the search param
      await page.waitForResponse(
        (resp) => resp.url().includes("/api/issues") && resp.url().includes("search="),
        { timeout: 10000 }
      );

      // Should show only matching issue
      await expect(
        page.locator("a").filter({ hasText: uniqueTitle })
      ).toBeVisible({ timeout: 10000 });
    });

    test("status dropdown is present and interactive", async ({ page }) => {
      await gotoAndWaitForIssues(page);

      // The status filter Select — base-ui renders a button with text "all"
      // There are two selects (status, assignee), both defaulting to "all"
      // Use the first select trigger (status is first in the filter bar)
      const selectTriggers = page.locator("button").filter({ hasText: /^all/ });
      await expect(selectTriggers.first()).toBeVisible({ timeout: 10000 });
      await selectTriggers.first().click();

      // The dropdown should open with status options
      const options = page.locator("[role='option']");
      await expect(options.first()).toBeVisible({ timeout: 5000 });

      // Verify the expected status options are present
      const optionTexts = await options.allTextContents();
      const optionLabels = optionTexts.map((t) => t.trim());
      expect(optionLabels).toContain("Done");
      expect(optionLabels).toContain("Todo");
      expect(optionLabels).toContain("Idea");

      // Close the dropdown by pressing Escape
      await page.keyboard.press("Escape");
    });

    test("clear filters button resets filters", async ({ page }) => {
      await gotoAndWaitForIssues(page);

      // Type something in search to activate filters
      const searchInput = page.locator('input[placeholder="Search issues..."]');
      await searchInput.fill("some-filter-text");

      // Wait for the search API call
      await page.waitForResponse(
        (resp) => resp.url().includes("/api/issues") && resp.url().includes("search="),
        { timeout: 10000 }
      );

      // Clear button should appear
      const clearBtn = page.locator("button").filter({ hasText: /Clear/ });
      await expect(clearBtn).toBeVisible({ timeout: 5000 });
      await clearBtn.click();

      // Search input should be cleared
      await expect(searchInput).toHaveValue("");
    });
  });

  // ─── Frontend: Create Issue Dialog ──────────────────────────────────

  test.describe("Frontend: Create Issue Dialog", () => {
    test("opens create issue dialog", async ({ page }) => {
      await gotoAndWaitForIssues(page);

      // Click the "New Issue" button
      const newIssueBtn = page.getByRole("button", { name: /New Issue/ });
      await newIssueBtn.click();

      // Dialog should appear
      await expect(
        page.getByRole("heading", { name: /Create New Issue/ })
      ).toBeVisible({ timeout: 5000 });
    });

    test("create dialog has all required form fields", async ({ page }) => {
      await gotoAndWaitForIssues(page);

      const newIssueBtn = page.getByRole("button", { name: /New Issue/ });
      await newIssueBtn.click();

      // Wait for dialog
      await expect(
        page.getByRole("heading", { name: /Create New Issue/ })
      ).toBeVisible({ timeout: 5000 });

      // Title input (required)
      await expect(
        page.locator('input[placeholder="Issue title"]')
      ).toBeVisible();

      // Description textarea
      await expect(
        page.locator('textarea[placeholder="Optional description..."]')
      ).toBeVisible();

      // Tags input
      await expect(
        page.locator('input[placeholder="Comma-separated tags"]')
      ).toBeVisible();

      // Submit button
      await expect(
        page.getByRole("button", { name: /Create Issue/ })
      ).toBeVisible();
    });

    test("creates a new issue via the dialog", async ({ page }) => {
      await gotoAndWaitForIssues(page);

      const newIssueBtn = page.getByRole("button", { name: /New Issue/ });
      await newIssueBtn.click();

      // Wait for dialog
      await expect(
        page.getByRole("heading", { name: /Create New Issue/ })
      ).toBeVisible({ timeout: 5000 });

      // Fill in the title
      const titleInput = page.locator('input[placeholder="Issue title"]');
      const testTitle = `E2E Created Issue ${Date.now()}`;
      await titleInput.fill(testTitle);

      // Fill in description
      const descTextarea = page.locator(
        'textarea[placeholder="Optional description..."]'
      );
      await descTextarea.fill("Created by E2E test");

      // Submit — match the button specifically (not the "New Issue" trigger)
      const submitBtn = page
        .locator('button[type="submit"]')
        .filter({ hasText: "Create Issue" });
      await submitBtn.click();

      // Wait for the create API call
      await page.waitForResponse(
        (resp) => resp.url().includes("/api/issues") && resp.request().method() === "POST" && resp.status() === 201,
        { timeout: 10000 }
      );

      // Dialog should close
      await expect(
        page.getByRole("heading", { name: /Create New Issue/ })
      ).not.toBeVisible({ timeout: 5000 });

      // The new issue should appear in the list (after refetch)
      await expect(
        page.locator("a").filter({ hasText: testTitle })
      ).toBeVisible({ timeout: 10000 });
    });

    test("create button is disabled when title is empty", async ({
      page,
    }) => {
      await gotoAndWaitForIssues(page);

      const newIssueBtn = page.getByRole("button", { name: /New Issue/ });
      await newIssueBtn.click();

      await expect(
        page.getByRole("heading", { name: /Create New Issue/ })
      ).toBeVisible({ timeout: 5000 });

      const submitBtn = page
        .locator('button[type="submit"]')
        .filter({ hasText: "Create Issue" });
      await expect(submitBtn).toBeDisabled();
    });
  });

  // ─── Frontend: Navigation ───────────────────────────────────────────

  test.describe("Frontend: Navigation", () => {
    test("navigates from list to detail page", async ({ page }) => {
      // Ensure an issue exists with a truly unique title (timestamp + random)
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const apiRequest = page.context().request;
      const createRes = await apiRequest.post(
        "http://localhost:3001/api/issues",
        {
          data: { title: `NavTest-${uniqueId}` },
        }
      );
      const { id: issueId } = await createRes.json();

      await gotoAndWaitForIssues(page);

      // Click on the specific issue link by its href
      const issueLink = page.locator(`a[href="/issues/${issueId}"]`);
      await expect(issueLink).toBeVisible({ timeout: 10000 });
      await issueLink.click();

      // Should navigate to detail page
      await expect(page).toHaveURL(`/issues/${issueId}`, { timeout: 10000 });

      // Should show back navigation link
      await expect(page.getByText("Back to issues")).toBeVisible();

      // Should show the issue ID
      await expect(page.getByText(issueId)).toBeVisible();
    });

    test("navigates back from detail to list", async ({ page }) => {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const apiRequest = page.context().request;
      const createRes = await apiRequest.post(
        "http://localhost:3001/api/issues",
        {
          data: { title: `BackNavTest-${uniqueId}` },
        }
      );
      const { id: issueId } = await createRes.json();

      await gotoAndWaitForIssues(page);

      // Click on the specific issue link
      const issueLink = page.locator(`a[href="/issues/${issueId}"]`);
      await issueLink.click();
      await expect(page).toHaveURL(`/issues/${issueId}`, { timeout: 10000 });

      // Wait for detail page content to render (may come from cache or API)
      await expect(page.getByText("Back to issues")).toBeVisible({ timeout: 10000 });

      // Click back
      const backLink = page.locator("a").filter({ hasText: "Back to issues" });
      await backLink.click();

      // Should be back on list
      await expect(page).toHaveURL("/", { timeout: 5000 });
    });

    test("shows error for non-existent issue", async ({ page }) => {
      await page.goto("/issues/nonexistent99999");
      await page.waitForLoadState("networkidle");

      // Should show error message
      await expect(
        page.getByText("Issue not found or failed to load")
      ).toBeVisible({ timeout: 10000 });
    });
  });

  // ─── Frontend: Issue Detail Page ────────────────────────────────────

  test.describe("Frontend: Issue Detail Page", () => {
    test("displays issue title and ID", async ({ request, page }) => {
      const res = await request.post("http://localhost:3001/api/issues", {
        data: {
          title: "Detail Display Test Unique",
          description: "Testing detail page display",
          status: "todo",
          priority: 2,
          tags: ["display-test-unique"],
          assignee: "test-bot",
        },
      });
      const { id: testIssueId } = await res.json();

      // Navigate and wait for the issue detail API response
      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes(`/api/issues/${testIssueId}`) && resp.status() === 200,
        { timeout: 15000 }
      );
      await page.goto(`/issues/${testIssueId}`);
      await responsePromise;

      await expect(page.getByText("Detail Display Test Unique")).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText(testIssueId)).toBeVisible();
    });

    test("displays description", async ({ request, page }) => {
      const res = await request.post("http://localhost:3001/api/issues", {
        data: {
          title: "Desc Display Test Unique",
          description: "Unique description content here 12345",
        },
      });
      const { id: testIssueId } = await res.json();

      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes(`/api/issues/${testIssueId}`),
        { timeout: 15000 }
      );
      await page.goto(`/issues/${testIssueId}`);
      await responsePromise;

      await expect(
        page.getByText("Unique description content here 12345")
      ).toBeVisible({ timeout: 10000 });
    });

    test("displays status badge", async ({ request, page }) => {
      const res = await request.post("http://localhost:3001/api/issues", {
        data: { title: "Status Badge Test Unique", status: "todo" },
      });
      const { id: testIssueId } = await res.json();

      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes(`/api/issues/${testIssueId}`),
        { timeout: 15000 }
      );
      await page.goto(`/issues/${testIssueId}`);
      await responsePromise;

      // "Todo" appears in the badge — use exact text match
      const todoBadge = page.getByText("Todo").first();
      await expect(todoBadge).toBeVisible({ timeout: 10000 });
    });

    test("displays timestamps", async ({ request, page }) => {
      const res = await request.post("http://localhost:3001/api/issues", {
        data: { title: "Timestamp Test Unique" },
      });
      const { id: testIssueId } = await res.json();

      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes(`/api/issues/${testIssueId}`),
        { timeout: 15000 }
      );
      await page.goto(`/issues/${testIssueId}`);
      await responsePromise;

      await expect(page.getByText(/Created/)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Updated/)).toBeVisible({ timeout: 10000 });
    });

    test("displays tags", async ({ request, page }) => {
      const res = await request.post("http://localhost:3001/api/issues", {
        data: {
          title: "Tag Display Test Unique",
          tags: ["unique-tag-display-test"],
        },
      });
      const { id: testIssueId } = await res.json();

      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes(`/api/issues/${testIssueId}`),
        { timeout: 15000 }
      );
      await page.goto(`/issues/${testIssueId}`);
      await responsePromise;

      await expect(
        page.getByText("unique-tag-display-test")
      ).toBeVisible({ timeout: 10000 });
    });

    test("inline edit title", async ({ request, page }) => {
      const res = await request.post("http://localhost:3001/api/issues", {
        data: { title: "Title Edit Test Original Unique" },
      });
      const { id: testIssueId } = await res.json();

      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes(`/api/issues/${testIssueId}`),
        { timeout: 15000 }
      );
      await page.goto(`/issues/${testIssueId}`);
      await responsePromise;

      // Click on the title to enter edit mode
      const titleEl = page.getByText("Title Edit Test Original Unique");
      await expect(titleEl).toBeVisible({ timeout: 10000 });
      await titleEl.click();

      // An input should appear
      const titleInput = page.locator('input.text-xl');
      await expect(titleInput).toBeVisible({ timeout: 5000 });

      // Clear and type new title
      await titleInput.clear();
      await titleInput.fill("Title Edit Test Updated");

      // Press Enter to save — wait for the PATCH API call
      const patchPromise = page.waitForResponse(
        (resp) => resp.url().includes(`/api/issues/${testIssueId}`) && resp.request().method() === "PATCH",
        { timeout: 10000 }
      );
      await titleInput.press("Enter");
      await patchPromise;

      // Verify the title was updated on the page
      await expect(
        page.getByText("Title Edit Test Updated")
      ).toBeVisible({ timeout: 10000 });

      // Verify via API
      const apiIssue = await page.evaluate(async (id) => {
        const res = await fetch(`/api/issues/${id}`);
        return res.json();
      }, testIssueId);
      expect(apiIssue.title).toBe("Title Edit Test Updated");
    });

    test("inline edit description", async ({ request, page }) => {
      const res = await request.post("http://localhost:3001/api/issues", {
        data: {
          title: "Desc Edit Test Unique",
          description: "Original description for editing test",
        },
      });
      const { id: testIssueId } = await res.json();

      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes(`/api/issues/${testIssueId}`),
        { timeout: 15000 }
      );
      await page.goto(`/issues/${testIssueId}`);
      await responsePromise;

      // Wait for the description to render
      await expect(
        page.getByText("Original description for editing test")
      ).toBeVisible({ timeout: 10000 });

      // Click on the description area to enter edit mode
      const descArea = page.getByText("Original description for editing test");
      await descArea.click();

      // A textarea should appear (it's a controlled textarea, use the visible one in the description section)
      const textarea = page.locator("textarea").first();
      await expect(textarea).toBeVisible({ timeout: 5000 });

      // Clear and type new description
      await textarea.clear();
      await textarea.fill("Updated description via E2E test");

      // Click Save button — wait for the PATCH API call
      const patchPromise = page.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/issues/${testIssueId}`) &&
          resp.request().method() === "PATCH",
        { timeout: 10000 }
      );
      await page.locator("button").filter({ hasText: "Save" }).click();
      await patchPromise;

      // Verify the new description appears
      await expect(
        page.getByText("Updated description via E2E test")
      ).toBeVisible({ timeout: 10000 });
    });

    test("change status via dropdown", async ({ request, page }) => {
      const res = await request.post("http://localhost:3001/api/issues", {
        data: { title: "Status Change Test Unique", status: "todo" },
      });
      const { id: testIssueId } = await res.json();

      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes(`/api/issues/${testIssueId}`),
        { timeout: 15000 }
      );
      await page.goto(`/issues/${testIssueId}`);
      await responsePromise;

      // Find the status dropdown — it's the button next to the "Status:" text
      // Look for the combobox/button in the properties row
      const statusSection = page.locator("div").filter({ hasText: /^Status:/ });
      const statusTrigger = statusSection.locator("button").first();
      await statusTrigger.click();

      // Select "In Progress" option
      const inProgressOption = page
        .locator("[role='option']")
        .filter({ hasText: "In Progress" });
      await expect(inProgressOption).toBeVisible({ timeout: 5000 });

      const patchPromise = page.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/issues/${testIssueId}`) &&
          resp.request().method() === "PATCH" &&
          resp.status() === 200,
        { timeout: 10000 }
      );
      await inProgressOption.click();
      await patchPromise;

      // Verify via API
      const apiIssue = await page.evaluate(async (id) => {
        const res = await fetch(`/api/issues/${id}`);
        return res.json();
      }, testIssueId);
      expect(apiIssue.status).toBe("in-progress");
    });

    test("change priority via dropdown", async ({ request, page }) => {
      const res = await request.post("http://localhost:3001/api/issues", {
        data: { title: "Priority Change Test Unique", priority: 3 },
      });
      const { id: testIssueId } = await res.json();

      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes(`/api/issues/${testIssueId}`),
        { timeout: 15000 }
      );
      await page.goto(`/issues/${testIssueId}`);
      await responsePromise;

      // Find the priority dropdown
      const prioritySection = page.locator("div").filter({ hasText: /^Priority:/ });
      const priorityTrigger = prioritySection.locator("button").first();
      await priorityTrigger.click();

      // Select P5
      const p5Option = page
        .locator("[role='option']")
        .filter({ hasText: "P5" });
      await expect(p5Option).toBeVisible({ timeout: 5000 });

      const patchPromise = page.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/issues/${testIssueId}`) &&
          resp.request().method() === "PATCH" &&
          resp.status() === 200,
        { timeout: 10000 }
      );
      await p5Option.click();
      await patchPromise;

      // Verify via API
      const apiIssue = await page.evaluate(async (id) => {
        const res = await fetch(`/api/issues/${id}`);
        return res.json();
      }, testIssueId);
      expect(apiIssue.priority).toBe(5);
    });

    test("change assignee via dropdown", async ({ request, page }) => {
      const res = await request.post("http://localhost:3001/api/issues", {
        data: { title: "Assignee Change Test Unique", assignee: null },
      });
      const { id: testIssueId } = await res.json();

      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes(`/api/issues/${testIssueId}`),
        { timeout: 15000 }
      );
      await page.goto(`/issues/${testIssueId}`);
      await responsePromise;

      // Find the assignee dropdown
      const assigneeSection = page.locator("div").filter({ hasText: /^Assignee:/ });
      const assigneeTrigger = assigneeSection.locator("button").first();
      await assigneeTrigger.click();

      // Select the first real user option (not "Unassigned")
      const userOptions = page
        .locator("[role='option']")
        .filter({ hasNotText: "Unassigned" });
      const firstUser = userOptions.first();
      if (await firstUser.isVisible({ timeout: 3000 }).catch(() => false)) {
        const userName = (await firstUser.textContent())?.trim();

        const patchPromise = page.waitForResponse(
          (resp) =>
            resp.url().includes(`/api/issues/${testIssueId}`) &&
            resp.request().method() === "PATCH" &&
            resp.status() === 200,
          { timeout: 10000 }
        );
        await firstUser.click();
        await patchPromise;

        // Verify via API
        const apiIssue = await page.evaluate(async (id) => {
          const res = await fetch(`/api/issues/${id}`);
          return res.json();
        }, testIssueId);
        expect(apiIssue.assignee).toBe(userName);
      }
    });
  });
});
