/**
 * URL-Driven Dashboard Filtering Validation Tests
 *
 * Validates that the dashboard's filter state is driven by URL search params
 * (issue mqguhe7eyw). The browser URL must be the single source of truth:
 *
 * - `status`: DashboardStatus. Absent → default Open view.
 * - `assignee`: name string. Absent → all assignees.
 * - `search`: free text. Absent → no search.
 *
 * Acceptance criteria covered:
 * 1. Default view (no URL params) shows Open issues only (todo, in-progress,
 *    done) — NOT idea or closed — and the URL stays clean (no `status=`).
 * 2. Deep-linking to `/?status=idea` shows only idea issues; `/?status=closed`
 *    shows only closed issues; the dropdown reflects the deep-linked value.
 * 3. Changing the status Select writes the value to the URL.
 * 4. Changing the assignee Select writes the value to the URL.
 * 5. Typing in search writes `?search=` to the URL (after debounce).
 * 6. Clearing filters returns the URL to the default (param-free) Open state.
 * 7. A bookmarked combined-params URL applies all filters on load.
 */
import { test, expect } from "@playwright/test";
import { cleanupE2ESeeds, E2E_BACKEND_URL as BASE } from "./setup.js";

// Self-healing: remove every e2e-seed issue created by this spec so leftover
// data never accumulates in the shared isolated worktree.
test.afterAll(async () => {
  await cleanupE2ESeeds();
});

function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface CreatedIssue {
  id: string;
  title: string;
  status: string;
}

/**
 * Seed one issue per dashboard-relevant status, all root-level, with
 * distinguishable titles. Returns the created issues.
 */
async function seedIssues(request: import("@playwright/test").APIRequestContext): Promise<{
  idea: CreatedIssue;
  todo: CreatedIssue;
  inprogress: CreatedIssue;
  done: CreatedIssue;
  closed: CreatedIssue;
}> {
  const stamp = uniqueId();
  const make = async (status: string, title: string): Promise<CreatedIssue> => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: `${title}-${stamp}`, status, assignee: "webapp-validator" },
    });
    const body = await res.json();
    return { id: body.id, title: `${title}-${stamp}`, status };
  };

  const idea = await make("idea", "UrlFilterIdea");
  const todo = await make("todo", "UrlFilterTodo");
  const inprogress = await make("in-progress", "UrlFilterInProgress");
  const done = await make("done", "UrlFilterDone");
  const closed = await make("closed", "UrlFilterClosed");
  return { idea, todo, inprogress, done, closed };
}

/**
 * Navigate to the dashboard and wait for the initial root list to resolve.
 */
async function gotoDashboardAndWait(
  page: import("@playwright/test").Page,
  url = "/"
) {
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/issues") &&
      resp.url().includes("parentId=null") &&
      resp.status() === 200,
    { timeout: 15000 }
  );
  await page.goto(url);
  await responsePromise;
}

// ═══════════════════════════════════════════════════════════════════════
// Default view
// ═══════════════════════════════════════════════════════════════════════

test.describe("URL filters: default view", () => {
  test("no URL params → Open view excludes idea and closed, URL stays clean", async ({
    request,
    page,
  }) => {
    const seed = await seedIssues(request);

    await gotoDashboardAndWait(page);

    // URL must have no status param (default Open state).
    await expect(page).toHaveURL(/^[^?]*\/?(\?[^]*)?$/);
    expect(page.url()).not.toContain("status=");

    // Open statuses are visible.
    await expect(page.getByText(seed.todo.title)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(seed.inprogress.title)).toBeVisible();
    await expect(page.getByText(seed.done.title)).toBeVisible();

    // Idea and closed are excluded by the Open filter.
    await expect(page.getByText(seed.idea.title)).toHaveCount(0);
    await expect(page.getByText(seed.closed.title)).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Deep-linking (bookmarked URLs)
// ═══════════════════════════════════════════════════════════════════════

test.describe("URL filters: deep-link applies params", () => {
  test("bookmark ?status=idea shows only idea issues", async ({
    request,
    page,
  }) => {
    const seed = await seedIssues(request);

    await gotoDashboardAndWait(page, "/?status=idea");

    // Idea visible; open statuses and closed excluded.
    await expect(page.getByText(seed.idea.title)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(seed.todo.title)).toHaveCount(0);
    await expect(page.getByText(seed.inprogress.title)).toHaveCount(0);
    await expect(page.getByText(seed.done.title)).toHaveCount(0);
    await expect(page.getByText(seed.closed.title)).toHaveCount(0);
  });

  test("bookmark ?status=closed shows only closed issues", async ({
    request,
    page,
  }) => {
    const seed = await seedIssues(request);

    await gotoDashboardAndWait(page, "/?status=closed");

    await expect(page.getByText(seed.closed.title)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(seed.idea.title)).toHaveCount(0);
    await expect(page.getByText(seed.todo.title)).toHaveCount(0);
    await expect(page.getByText(seed.done.title)).toHaveCount(0);
  });

  test("bookmark ?status=todo shows only todo issues", async ({
    request,
    page,
  }) => {
    const seed = await seedIssues(request);

    await gotoDashboardAndWait(page, "/?status=todo");

    await expect(page.getByText(seed.todo.title)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(seed.inprogress.title)).toHaveCount(0);
    await expect(page.getByText(seed.done.title)).toHaveCount(0);
    await expect(page.getByText(seed.idea.title)).toHaveCount(0);
    await expect(page.getByText(seed.closed.title)).toHaveCount(0);
  });

  test("deep-linked status is reflected in the Status dropdown", async ({
    request,
    page,
  }) => {
    await seedIssues(request);

    await gotoDashboardAndWait(page, "/?status=closed");

    // The trigger surfaces the human-readable label for the selected value,
    // not the raw value (issue mqgxk7rj2a). For status=closed the trigger
    // must render "Closed" (capitalized), never the raw "closed".
    const trigger = page.locator("#status-filter");
    await expect(trigger).toContainText("Closed", { timeout: 10000 });
    await expect(trigger).not.toContainText("closed");
  });

  test("deep-linked in-progress status shows 'In Progress' label, not raw value", async ({
    request,
    page,
  }) => {
    await seedIssues(request);

    await gotoDashboardAndWait(page, "/?status=in-progress");

    // The raw value is 'in-progress' (kebab-case); the trigger must render
    // the human-readable 'In Progress' label (issue mqgxk7rj2a).
    const trigger = page.locator("#status-filter");
    await expect(trigger).toContainText("In Progress", { timeout: 10000 });
    await expect(trigger).not.toContainText("in-progress");
  });

  test("deep-linked todo status shows 'Todo' label, not raw value", async ({
    request,
    page,
  }) => {
    await seedIssues(request);

    await gotoDashboardAndWait(page, "/?status=todo");

    // The raw value 'todo' must surface as the 'Todo' label (capitalized T).
    const trigger = page.locator("#status-filter");
    await expect(trigger).toContainText("Todo", { timeout: 10000 });
    await expect(trigger).not.toContainText("todo");
  });

  test("bookmark with combined params applies all filters", async ({
    request,
    page,
  }) => {
    const seed = await seedIssues(request);
    const stamp = seed.todo.title;

    // status=todo + search=UrlFilterTodo → only the matching todo issue.
    await gotoDashboardAndWait(
      page,
      `/?status=todo&search=${encodeURIComponent("UrlFilterTodo")}`
    );

    await expect(page.getByText(seed.todo.title)).toBeVisible({ timeout: 10000 });
    // Other todos (in-progress titled issues) excluded by status; the only
    // other todo is the search-seeded one, which the title search narrows to 1.
    await expect(page.getByText(seed.inprogress.title)).toHaveCount(0);
    await expect(page.getByText(seed.idea.title)).toHaveCount(0);

    // stamp uniqueness sanity
    expect(stamp).toContain("UrlFilterTodo");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Control changes update the URL
// ═══════════════════════════════════════════════════════════════════════

test.describe("URL filters: controls write to URL", () => {
  test("selecting Idea from the dropdown writes ?status=idea", async ({
    request,
    page,
  }) => {
    await seedIssues(request);

    await gotoDashboardAndWait(page);

    const trigger = page.locator("#status-filter");
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await trigger.click();
    await page.getByRole("option", { name: "Idea" }).click();

    await expect(page).toHaveURL(/\?status=idea/, { timeout: 10000 });
  });

  test("selecting Closed from the dropdown writes ?status=closed", async ({
    request,
    page,
  }) => {
    await seedIssues(request);

    await gotoDashboardAndWait(page);

    const trigger = page.locator("#status-filter");
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await trigger.click();
    await page.getByRole("option", { name: "Closed" }).click();

    await expect(page).toHaveURL(/\?status=closed/, { timeout: 10000 });
  });

  test("selecting Open removes the status param (default state)", async ({
    request,
    page,
  }) => {
    await seedIssues(request);

    // Start from a deep-linked non-default status.
    await gotoDashboardAndWait(page, "/?status=idea");

    const trigger = page.locator("#status-filter");
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await trigger.click();
    await page.getByRole("option", { name: "Open" }).click();

    // The URL must return to the clean default (no status param).
    await expect(page).toHaveURL(/^[^?]*\/?$/, { timeout: 10000 });
    expect(page.url()).not.toContain("status=");
  });

  test("selecting an assignee writes ?assignee=", async ({ request, page }) => {
    // Register the user so it appears in the assignee dropdown options.
    await request.post(`${BASE}/api/users`, {
      data: { name: "webapp-validator" },
    });
    await seedIssues(request);

    await gotoDashboardAndWait(page);

    const trigger = page.locator("#assignee-filter");
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await trigger.click();
    await page.getByRole("option", { name: "webapp-validator" }).click();

    await expect(page).toHaveURL(/assignee=webapp-validator/, { timeout: 10000 });
  });

  test("typing in search writes ?search= after debounce", async ({
    request,
    page,
  }) => {
    await seedIssues(request);
    const needle = "UrlFilterTodo";

    await gotoDashboardAndWait(page);

    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.fill(needle);

    // The debounced search pushes the param into the URL.
    await expect(page).toHaveURL(new RegExp(`search=${needle}`), {
      timeout: 10000,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Clear filters
// ═══════════════════════════════════════════════════════════════════════

test.describe("URL filters: clear returns to default Open state", () => {
  test("Clear button strips all params and restores Open view", async ({
    request,
    page,
  }) => {
    const seed = await seedIssues(request);

    // Start from a fully-filtered bookmarked URL.
    await gotoDashboardAndWait(
      page,
      `/?status=idea&assignee=webapp-validator&search=${encodeURIComponent(
        "UrlFilterIdea"
      )}`
    );

    // The Clear button only appears when non-default filters are active.
    const clearButton = page.getByRole("button", { name: /clear/i });
    await expect(clearButton).toBeVisible({ timeout: 10000 });
    await clearButton.click();

    // URL returns to the clean default Open state.
    await expect(page).toHaveURL(/^[^?]*\/?$/, { timeout: 10000 });

    // And the visible list reflects the Open default (todo/in-progress/done
    // visible; idea excluded again).
    await expect(page.getByText(seed.todo.title)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(seed.idea.title)).toHaveCount(0);
  });
});
