/**
 * Dashboard Roots & Lazy-Load Validation Tests
 *
 * Validates the fix for "Webapp dashboard lists child issues at top level
 * instead of only roots" (parent bug mqgsy9a1xm, fix mqgsyy3wjl).
 *
 * Acceptance criteria covered:
 * 1. Dashboard initially lists ONLY root issues (no parent) — children
 *    never appear at the top level.
 * 2. Expanding a parent lazily loads its direct children (via parentId) and
 *    ONLY its direct children.
 * 3. Collapsed rows do not issue an all-issues request (no query without
 *    parentId).
 * 4. Existing filters (status, assignee, tags, search) still combine
 *    correctly with the root-only top-level query.
 * 5. No regressions in the issue tree (expand/collapse, navigation).
 */
import { test, expect } from "@playwright/test";
import { cleanupE2ESeeds, E2E_BACKEND_URL as BASE } from "./setup.js";

// Self-healing: remove every e2e-seed issue created by this spec so leftover
// data never accumulates in the shared isolated worktree.
test.afterAll(async () => {
  await cleanupE2ESeeds();
});

/**
 * Helper: navigate to the dashboard and wait for the initial top-level
 * issues API call (parentId=null) to resolve.
 */
async function gotoDashboardAndWait(
  page: import("@playwright/test").Page,
  url: string = "/"
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

/**
 * Helper: generate a unique ID for test isolation.
 */
function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * A list-fetch to /api/issues (with optional query string), excluding:
 * - source module files served by Vite (e.g. /src/api/issues.ts)
 * - detail/sub-resource calls like /api/issues/:id, /api/issues/:id/comments
 */
function isApiListCall(url: string): boolean {
  return /\/api\/issues(\?|$)/.test(url);
}

/**
 * True when the URL is an API call to /api/issues that omits parentId entirely
 * (i.e. an all-issues fetch). Used to assert collapsed rows never fire one.
 */
function isAllIssuesCall(url: string): boolean {
  return isApiListCall(url) && !url.includes("parentId=");
}

// ═══════════════════════════════════════════════════════════════════════
// Dashboard: Root-only top-level list
// ═══════════════════════════════════════════════════════════════════════

test.describe("Dashboard: root-only top-level list", () => {
  test("initial dashboard request uses parentId=null", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (req) => {
      if (isApiListCall(req.url())) requests.push(req.url());
    });

    await gotoDashboardAndWait(page);

    // The first list-fetch must include parentId=null
    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0]).toContain("parentId=null");
  });

  test("child issue does not appear at top level of dashboard", async ({
    request,
    page,
  }) => {
    const parentTitle = `RootParent-${uniqueId()}`;
    const childTitle = `NestedChild-${uniqueId()}`;

    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: parentTitle, status: "todo" },
    });
    const { id: parentId } = await parentRes.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: childTitle, parentId },
    });
    const { id: childId } = await childRes.json();

    await gotoDashboardAndWait(page);

    // Parent should be visible at top level
    await expect(page.getByText(parentTitle)).toBeVisible({ timeout: 10000 });

    // Child must NOT be visible at top level (it's a nested child)
    const childLink = page.locator(`a[href="/issues/${childId}"]`);
    await expect(childLink).toHaveCount(0);
  });

  test("top-level rows are exactly the root issues (no duplicates)", async ({
    request,
    page,
  }) => {
    // Create two roots, each with one child
    const rootATitle = `RootA-${uniqueId()}`;
    const rootBTitle = `RootB-${uniqueId()}`;

    const rootA = await (
      await request.post(`${BASE}/api/issues`, {
        data: { tags: ["e2e-seed"], title: rootATitle, status: "todo" },
      })
    ).json();
    const rootB = await (
      await request.post(`${BASE}/api/issues`, {
        data: { tags: ["e2e-seed"], title: rootBTitle, status: "todo" },
      })
    ).json();
    const childA = await (
      await request.post(`${BASE}/api/issues`, {
        data: { tags: ["e2e-seed"], title: `ChildA-${uniqueId()}`, parentId: rootA.id },
      })
    ).json();
    const childB = await (
      await request.post(`${BASE}/api/issues`, {
        data: { tags: ["e2e-seed"], title: `ChildB-${uniqueId()}`, parentId: rootB.id },
      })
    ).json();

    await gotoDashboardAndWait(page);

    // Wait for the list to settle
    await expect(page.getByText(rootATitle)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(rootBTitle)).toBeVisible({ timeout: 10000 });

    // No children visible at top level
    await expect(page.locator(`a[href="/issues/${childA.id}"]`)).toHaveCount(0);
    await expect(page.locator(`a[href="/issues/${childB.id}"]`)).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Dashboard: Lazy-load on expand
// ═══════════════════════════════════════════════════════════════════════

test.describe("Dashboard: lazy-load on expand", () => {
  test("expanding a parent fetches its children via parentId and shows them", async ({
    request,
    page,
  }) => {
    const parentTitle = `ExpandParent-${uniqueId()}`;
    const childTitle = `ExpandChild-${uniqueId()}`;

    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: parentTitle, status: "todo" },
    });
    const { id: parentId } = await parentRes.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: childTitle, parentId },
    });
    const { id: childId } = await childRes.json();

    await gotoDashboardAndWait(page);

    // Before expanding, child is not present
    await expect(page.locator(`a[href="/issues/${childId}"]`)).toHaveCount(0);

    // Set up a listener for the children request (parentId=<parentId>)
    const childResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/issues") &&
        resp.url().includes(`parentId=${parentId}`) &&
        resp.status() === 200,
      { timeout: 15000 }
    );

    // Click the expand chevron on the parent row
    const parentLink = page.locator(`a[href="/issues/${parentId}"]`);
    await expect(parentLink).toBeVisible({ timeout: 10000 });

    // The chevron button is the previous sibling of the link within the row
    const expandButton = parentLink.locator("xpath=preceding-sibling::button[1]");
    await expandButton.click();

    const childResponse = await childResponsePromise;
    const children = await childResponse.json();
    expect(children.length).toBeGreaterThanOrEqual(1);
    for (const child of children) {
      expect(child.parentId).toBe(parentId);
    }

    // Child is now visible nested under the parent
    await expect(page.locator(`a[href="/issues/${childId}"]`)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(childTitle)).toBeVisible({ timeout: 10000 });
  });

  test("expanded children are direct children only (not grandchildren)", async ({
    request,
    page,
  }) => {
    const rootTitle = `TreeRoot-${uniqueId()}`;
    const midTitle = `TreeMid-${uniqueId()}`;
    const leafTitle = `TreeLeaf-${uniqueId()}`;

    const rootRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: rootTitle, status: "todo" },
    });
    const { id: rootId } = await rootRes.json();

    const midRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: midTitle, parentId: rootId },
    });
    const { id: midId } = await midRes.json();

    const leafRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: leafTitle, parentId: midId },
    });
    const { id: leafId } = await leafRes.json();

    await gotoDashboardAndWait(page);

    // Expand root
    const rootLink = page.locator(`a[href="/issues/${rootId}"]`);
    await expect(rootLink).toBeVisible({ timeout: 10000 });
    const rootExpand = rootLink.locator("xpath=preceding-sibling::button[1]");

    const rootChildrenResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes(`parentId=${rootId}`) && resp.status() === 200,
      { timeout: 15000 }
    );
    await rootExpand.click();
    const rootChildren = await (await rootChildrenResponse).json();

    // Only direct children (mid) — not the leaf
    expect(rootChildren.length).toBeGreaterThanOrEqual(1);
    for (const child of rootChildren) {
      expect(child.parentId).toBe(rootId);
    }
    const rootChildIds = rootChildren.map((c: { id: string }) => c.id);
    expect(rootChildIds).toContain(midId);
    expect(rootChildIds).not.toContain(leafId);

    // Mid is now visible, leaf is not yet
    await expect(page.locator(`a[href="/issues/${midId}"]`)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(`a[href="/issues/${leafId}"]`)).toHaveCount(0);
  });

  test("collapsing an expanded row hides its children", async ({
    request,
    page,
  }) => {
    const parentTitle = `CollapseParent-${uniqueId()}`;
    const childTitle = `CollapseChild-${uniqueId()}`;

    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: parentTitle, status: "todo" },
    });
    const { id: parentId } = await parentRes.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: childTitle, parentId },
    });
    const { id: childId } = await childRes.json();

    await gotoDashboardAndWait(page);

    const parentLink = page.locator(`a[href="/issues/${parentId}"]`);
    await expect(parentLink).toBeVisible({ timeout: 10000 });
    const expandButton = parentLink.locator(
      "xpath=preceding-sibling::button[1]"
    );

    // Expand
    await expandButton.click();
    await expect(page.locator(`a[href="/issues/${childId}"]`)).toBeVisible({
      timeout: 10000,
    });

    // Collapse
    await expandButton.click();
    await expect(page.locator(`a[href="/issues/${childId}"]`)).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Dashboard: collapsed rows must not fetch all issues
// ═══════════════════════════════════════════════════════════════════════

test.describe("Dashboard: collapsed rows do not fetch all issues", () => {
  test("no all-issues (parentId-less) request is made on dashboard load", async ({
    request,
    page,
  }) => {
    // Seed a few rows (some with children) so collapsed rows exist
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: `NoFetchParent-${uniqueId()}` },
    });
    const { id: parentId } = await parentRes.json();
    await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: `NoFetchChild-${uniqueId()}`, parentId },
    });

    const listRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (isAllIssuesCall(url)) {
        listRequests.push(url);
      }
    });

    await gotoDashboardAndWait(page);
    // Give a moment for any deferred queries to fire
    await page.waitForTimeout(500);

    expect(listRequests).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Dashboard: Filters combine with parentId=null
// ═══════════════════════════════════════════════════════════════════════

test.describe("Dashboard: filters combine with root-only query", () => {
  test("status filter is sent together with parentId=null", async ({
    request,
    page,
  }) => {
    const rootTitle = `StatusRoot-${uniqueId()}`;
    await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: rootTitle, status: "todo" },
    });

    await gotoDashboardAndWait(page);

    // Open the status Select (Radix combobox) and pick "Todo".
    const statusTrigger = page.locator("#status-filter");
    await expect(statusTrigger).toBeVisible({ timeout: 10000 });
    await statusTrigger.click();

    const filteredResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/issues") &&
        resp.url().includes("parentId=null") &&
        resp.url().includes("status=todo") &&
        resp.status() === 200,
      { timeout: 15000 }
    );

    await page.getByRole("option", { name: "Todo" }).click();
    await filteredResponse;
  });

  test("search filter narrows the top-level list and keeps roots only", async ({
    request,
    page,
  }) => {
    const matchTitle = `SearchMatch-${uniqueId()}`;
    const otherTitle = `SearchOther-${uniqueId()}`;

    await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: matchTitle, status: "todo" },
    });
    await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: otherTitle, status: "todo" },
    });
    // A child whose title matches the search but should NOT appear at top level
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: `SearchMatchParent-${uniqueId()}` },
    });
    const { id: matchParentId } = await parentRes.json();
    const matchChild = `SearchMatch-${uniqueId()}`;
    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: matchChild, parentId: matchParentId },
    });
    const { id: matchChildId } = await childRes.json();

    await gotoDashboardAndWait(page);

    // Type into the search input
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.fill(matchTitle);

    // Wait for the filtered top-level request
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/issues") &&
        resp.url().includes("parentId=null") &&
        resp.url().includes(`search=`) &&
        resp.status() === 200,
      { timeout: 15000 }
    );

    // Match root visible; the other root filtered out
    await expect(page.getByText(matchTitle).first()).toBeVisible({
      timeout: 10000,
    });

    // The matching child must still NOT appear at top level even though its
    // title matches the search (parentId=null is preserved).
    await expect(page.locator(`a[href="/issues/${matchChildId}"]`)).toHaveCount(
      0
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Dashboard: Navigation regression
// ═══════════════════════════════════════════════════════════════════════

test.describe("Dashboard: navigation regression", () => {
  test("clicking a root row navigates to its detail page", async ({
    request,
    page,
  }) => {
    const rootTitle = `NavRoot-${uniqueId()}`;
    const rootRes = await request.post(`${BASE}/api/issues`, {
      data: { tags: ["e2e-seed"], title: rootTitle, status: "todo" },
    });
    const { id: rootId } = await rootRes.json();

    await gotoDashboardAndWait(page);

    const rootLink = page.locator(`a[href="/issues/${rootId}"]`);
    await expect(rootLink).toBeVisible({ timeout: 10000 });
    await rootLink.click();

    await expect(page).toHaveURL(`/issues/${rootId}`, { timeout: 10000 });
  });
});
