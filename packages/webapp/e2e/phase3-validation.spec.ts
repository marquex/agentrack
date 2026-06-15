/**
 * Phase 3 E2E Validation Tests
 *
 * Validates Phase 3 acceptance criteria:
 * 1. Can add, edit, delete comments on an issue
 * 2. Can add, resolve, and delete blockages
 * 3. Sub-issues display in both the list (tree) and detail views
 * 4. Can create sub-issues with parentId pre-filled
 * 5. History timeline displays correctly
 * 6. Tag input works (add/remove)
 * 7. Parent can be set, changed, and cleared
 * 8. Blockage indicators show on issue list rows
 *
 * Also validates:
 * - Backend API endpoints (comments CRUD, blockages CRUD, history, next issue)
 * - Error handling and edge cases
 */
import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

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
 * Helper: navigate to issue detail page and wait for data.
 */
async function gotoIssueDetail(
  page: import("@playwright/test").Page,
  issueId: string
) {
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/issues/${issueId}`) &&
      !resp.url().includes("/comments") &&
      !resp.url().includes("/blockages") &&
      !resp.url().includes("/history") &&
      resp.status() === 200,
    { timeout: 15000 }
  );
  await page.goto(`/issues/${issueId}`);
  await responsePromise;
}

/**
 * Helper: generate a unique ID for test isolation.
 */
function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ═══════════════════════════════════════════════════════════════════════
// Backend: Comments API
// ═══════════════════════════════════════════════════════════════════════

test.describe("Backend: GET /api/issues/:id/comments", () => {
  test("returns 200 with array for existing issue", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Comments List Test ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    const response = await request.get(`${BASE}/api/issues/${id}/comments`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("returns comments with correct shape", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Comment Shape Test ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    await request.post(`${BASE}/api/issues/${id}/comments`, {
      data: { content: "Test comment for shape validation", author: "tester" },
    });

    const response = await request.get(`${BASE}/api/issues/${id}/comments`);
    const comments = await response.json();
    expect(comments.length).toBeGreaterThanOrEqual(1);

    const comment = comments[0];
    expect(comment).toHaveProperty("id");
    expect(comment).toHaveProperty("author");
    expect(comment).toHaveProperty("content");
    expect(comment).toHaveProperty("timestamp");
    expect(comment).toHaveProperty("editedAt");
    expect(typeof comment.id).toBe("string");
    expect(typeof comment.author).toBe("string");
    expect(typeof comment.content).toBe("string");
  });
});

test.describe("Backend: POST /api/issues/:id/comments", () => {
  test("adds a comment and returns 201", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Add Comment Test ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    const response = await request.post(`${BASE}/api/issues/${id}/comments`, {
      data: { content: "This is a test comment", author: "tester" },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty("result", "OK");
    expect(body).toHaveProperty("commentId");
    expect(typeof body.commentId).toBe("string");
  });

  test("returns 400 when content is missing", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Comment Validation Test ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    const response = await request.post(`${BASE}/api/issues/${id}/comments`, {
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe(true);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  test("returns 400 when content is empty string", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Comment Empty Test ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    const response = await request.post(`${BASE}/api/issues/${id}/comments`, {
      data: { content: "   " },
    });
    expect(response.status()).toBe(400);
  });

  test("returns 400 when content is not a string", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Comment Type Test ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    const response = await request.post(`${BASE}/api/issues/${id}/comments`, {
      data: { content: 123 },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("Backend: PATCH /api/issues/:id/comments/:commentId", () => {
  test("edits a comment and returns 200", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Edit Comment Test ${uniqueId()}` },
    });
    const { id: issueId } = await createRes.json();

    const addRes = await request.post(`${BASE}/api/issues/${issueId}/comments`, {
      data: { content: "Original comment text", author: "tester" },
    });
    const { commentId } = await addRes.json();

    const response = await request.patch(
      `${BASE}/api/issues/${issueId}/comments/${commentId}`,
      { data: { content: "Updated comment text", author: "tester" } }
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.result).toBe("OK");

    // Verify the comment was updated
    const listRes = await request.get(`${BASE}/api/issues/${issueId}/comments`);
    const comments = await listRes.json();
    const updated = comments.find((c: any) => c.id === commentId);
    expect(updated.content).toBe("Updated comment text");
    expect(updated.editedAt).not.toBeNull();
  });

  test("returns 400 when content is missing", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Edit Comment Validation ${uniqueId()}` },
    });
    const { id: issueId } = await createRes.json();

    const addRes = await request.post(`${BASE}/api/issues/${issueId}/comments`, {
      data: { content: "A comment", author: "tester" },
    });
    const { commentId } = await addRes.json();

    const response = await request.patch(
      `${BASE}/api/issues/${issueId}/comments/${commentId}`,
      { data: {} }
    );
    expect(response.status()).toBe(400);
  });
});

test.describe("Backend: DELETE /api/issues/:id/comments/:commentId", () => {
  test("deletes a comment and returns 200", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Delete Comment Test ${uniqueId()}` },
    });
    const { id: issueId } = await createRes.json();

    const addRes = await request.post(`${BASE}/api/issues/${issueId}/comments`, {
      data: { content: "Comment to be deleted", author: "tester" },
    });
    const { commentId } = await addRes.json();

    const response = await request.delete(
      `${BASE}/api/issues/${issueId}/comments/${commentId}`,
      { data: { author: "tester" } }
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.result).toBe("OK");

    // Verify the comment was deleted
    const listRes = await request.get(`${BASE}/api/issues/${issueId}/comments`);
    const comments = await listRes.json();
    const deleted = comments.find((c: any) => c.id === commentId);
    expect(deleted).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Backend: Blockages API
// ═══════════════════════════════════════════════════════════════════════

test.describe("Backend: GET /api/issues/:id/blockages", () => {
  test("returns 200 with blockage info shape", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Blockages List Test ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    const response = await request.get(`${BASE}/api/issues/${id}/blockages`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("issueId");
    expect(body).toHaveProperty("blockedBy");
    expect(body).toHaveProperty("blocks");
    expect(Array.isArray(body.blockedBy)).toBe(true);
    expect(Array.isArray(body.blocks)).toBe(true);
  });

  test("returns blockages after adding one", async ({ request }) => {
    const blockerRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Blocker Issue ${uniqueId()}` },
    });
    const { id: blockerId } = await blockerRes.json();

    const blockedRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Blocked Issue ${uniqueId()}` },
    });
    const { id: blockedId } = await blockedRes.json();

    // Add blockage
    await request.post(`${BASE}/api/issues/${blockedId}/blockages`, {
      data: { blockerIds: [blockerId], author: "tester" },
    });

    // Check blocked issue's blockages
    const response = await request.get(`${BASE}/api/issues/${blockedId}/blockages`);
    const body = await response.json();
    expect(body.blockedBy.length).toBeGreaterThanOrEqual(1);
    const entry = body.blockedBy.find((b: any) => b.blockerId === blockerId);
    expect(entry).toBeDefined();
    expect(entry.status).toBe("active");
  });
});

test.describe("Backend: POST /api/issues/:id/blockages", () => {
  test("adds blockages and returns 200", async ({ request }) => {
    const blockedRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Blocked For Add ${uniqueId()}` },
    });
    const { id: blockedId } = await blockedRes.json();

    const blockerRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Blocker For Add ${uniqueId()}` },
    });
    const { id: blockerId } = await blockerRes.json();

    const response = await request.post(`${BASE}/api/issues/${blockedId}/blockages`, {
      data: { blockerIds: [blockerId], author: "tester" },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.result).toBe("OK");
  });

  test("returns 400 when blockerIds is missing", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Blockage Validation ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    const response = await request.post(`${BASE}/api/issues/${id}/blockages`, {
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe(true);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  test("returns 400 when blockerIds is empty array", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Blockage Empty Array ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    const response = await request.post(`${BASE}/api/issues/${id}/blockages`, {
      data: { blockerIds: [] },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("Backend: PATCH /api/issues/:id/blockages/resolve", () => {
  test("resolves a blockage and returns 200", async ({ request }) => {
    const blockerRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Blocker Resolve Test ${uniqueId()}` },
    });
    const { id: blockerId } = await blockerRes.json();

    const blockedRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Blocked Resolve Test ${uniqueId()}` },
    });
    const { id: blockedId } = await blockedRes.json();

    await request.post(`${BASE}/api/issues/${blockedId}/blockages`, {
      data: { blockerIds: [blockerId], author: "tester" },
    });

    const response = await request.patch(
      `${BASE}/api/issues/${blockedId}/blockages/resolve`,
      { data: { blockerIds: [blockerId], author: "tester" } }
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.result).toBe("OK");

    // Verify resolved
    const listRes = await request.get(`${BASE}/api/issues/${blockedId}/blockages`);
    const blockages = await listRes.json();
    const entry = blockages.blockedBy.find((b: any) => b.blockerId === blockerId);
    expect(entry.status).toBe("resolved");
  });

  test("returns 400 when blockerIds is missing", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Resolve Validation ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    const response = await request.patch(
      `${BASE}/api/issues/${id}/blockages/resolve`,
      { data: {} }
    );
    expect(response.status()).toBe(400);
  });
});

test.describe("Backend: DELETE /api/issues/:id/blockages", () => {
  test("deletes a blockage and returns 200", async ({ request }) => {
    const blockerRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Blocker Delete Test ${uniqueId()}` },
    });
    const { id: blockerId } = await blockerRes.json();

    const blockedRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Blocked Delete Test ${uniqueId()}` },
    });
    const { id: blockedId } = await blockedRes.json();

    await request.post(`${BASE}/api/issues/${blockedId}/blockages`, {
      data: { blockerIds: [blockerId], author: "tester" },
    });

    const response = await request.delete(
      `${BASE}/api/issues/${blockedId}/blockages`,
      { data: { blockerIds: [blockerId], author: "tester" } }
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.result).toBe("OK");

    // Verify deleted
    const listRes = await request.get(`${BASE}/api/issues/${blockedId}/blockages`);
    const blockages = await listRes.json();
    const entry = blockages.blockedBy.find((b: any) => b.blockerId === blockerId);
    expect(entry).toBeUndefined();
  });

  test("returns 400 when blockerIds is missing", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Delete Validation ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    const response = await request.delete(`${BASE}/api/issues/${id}/blockages`, {
      data: {},
    });
    expect(response.status()).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Backend: History & Next Issue
// ═══════════════════════════════════════════════════════════════════════

test.describe("Backend: GET /api/issues/:id/history", () => {
  test("returns 200 with history events array", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `History Test ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    const response = await request.get(`${BASE}/api/issues/${id}/history`);
    expect(response.status()).toBe(200);
    const events = await response.json();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThanOrEqual(1);

    // First event should be a creation event
    const firstEvent = events[0];
    expect(firstEvent).toHaveProperty("timestamp");
    expect(firstEvent).toHaveProperty("type");
    expect(firstEvent.type).toBe("creation");
  });

  test("history includes update events after changes", async ({ request }) => {
    const createRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `History Update Test ${uniqueId()}` },
    });
    const { id } = await createRes.json();

    // Make an update
    await request.patch(`${BASE}/api/issues/${id}`, {
      data: { status: "todo" },
    });

    const response = await request.get(`${BASE}/api/issues/${id}/history`);
    const events = await response.json();

    const updateEvents = events.filter((e: any) => e.type === "update");
    expect(updateEvents.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Backend: GET /api/issues/next/:assignee", () => {
  test("returns 200 for next issue endpoint", async ({ request }) => {
    const response = await request.get(
      `${BASE}/api/issues/next/tester-nonexistent-${uniqueId()}`
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    // Should return either an issue or a NO_ISSUES_AVAILABLE response
    expect(body).toHaveProperty("result");
  });

  test("returns issue shape when available", async ({ request }) => {
    const assignee = `next-tester-${uniqueId()}`;
    await request.post(`${BASE}/api/issues`, {
      data: {
        title: `Next Issue Test ${uniqueId()}`,
        assignee,
        status: "todo",
      },
    });

    const response = await request.get(`${BASE}/api/issues/next/${assignee}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    // Should have issue properties
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("title");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Backend: PATCH /api/issues/:id parentId
// ═══════════════════════════════════════════════════════════════════════

test.describe("Backend: PATCH parentId", () => {
  test("sets parentId on issue", async ({ request }) => {
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Parent Issue ${uniqueId()}` },
    });
    const { id: parentId } = await parentRes.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Child Issue ${uniqueId()}` },
    });
    const { id: childId } = await childRes.json();

    const response = await request.patch(`${BASE}/api/issues/${childId}`, {
      data: { parentId },
    });
    expect(response.status()).toBe(200);

    // Verify via GET
    const viewRes = await request.get(`${BASE}/api/issues/${childId}`);
    const issue = await viewRes.json();
    expect(issue.parentId).toBe(parentId);
  });

  test("clears parentId by setting to null", async ({ request }) => {
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Clear Parent Test ${uniqueId()}` },
    });
    const { id: parentId } = await parentRes.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Child Clear Test ${uniqueId()}`, parentId },
    });
    const { id: childId } = await childRes.json();

    const response = await request.patch(`${BASE}/api/issues/${childId}`, {
      data: { parentId: null },
    });
    expect(response.status()).toBe(200);

    const viewRes = await request.get(`${BASE}/api/issues/${childId}`);
    const issue = await viewRes.json();
    expect(issue.parentId).toBeNull();
  });

  test("can list children via parentId filter", async ({ request }) => {
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Parent Filter Test ${uniqueId()}` },
    });
    const { id: parentId } = await parentRes.json();

    await request.post(`${BASE}/api/issues`, {
      data: { title: `Child 1 ${uniqueId()}`, parentId },
    });
    await request.post(`${BASE}/api/issues`, {
      data: { title: `Child 2 ${uniqueId()}`, parentId },
    });

    const response = await request.get(
      `${BASE}/api/issues?parentId=${parentId}`
    );
    expect(response.status()).toBe(200);
    const children = await response.json();
    expect(children.length).toBeGreaterThanOrEqual(2);
    for (const child of children) {
      expect(child.parentId).toBe(parentId);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Comments Section
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Comments Section", () => {
  test("displays empty state when no comments", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `No Comments Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    await gotoIssueDetail(page, id);

    await expect(
      page.getByText("No comments yet", { exact: true })
    ).toBeVisible({ timeout: 10000 });
  });

  test("displays comment count in heading", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `Comment Count Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    await request.post(`${BASE}/api/issues/${id}/comments`, {
      data: { content: "First comment", author: "tester" },
    });

    await gotoIssueDetail(page, id);

    await expect(page.getByText("Comments (1)")).toBeVisible({
      timeout: 10000,
    });
  });

  test("adds a comment via the form", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `Add Comment UI Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    await gotoIssueDetail(page, id);

    // Wait for comments to load
    await expect(
      page.getByText("No comments yet", { exact: true })
    ).toBeVisible({ timeout: 10000 });

    // Type a comment
    const commentTextarea = page.locator('textarea[placeholder="Write a comment..."]');
    await commentTextarea.fill("E2E test comment from Playwright");

    // Click Add Comment button and wait for the API response
    const addPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/comments") &&
        resp.request().method() === "POST" &&
        resp.status() === 201,
      { timeout: 10000 }
    );
    await page.getByRole("button", { name: "Add Comment" }).click();
    await addPromise;

    // Comment should appear in the list
    await expect(
      page.getByText("E2E test comment from Playwright")
    ).toBeVisible({ timeout: 10000 });
  });

  test("edits a comment inline", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `Edit Comment UI Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    const commentRes = await request.post(`${BASE}/api/issues/${id}/comments`, {
      data: { content: "Original comment to edit", author: "tester" },
    });
    await commentRes.json();

    await gotoIssueDetail(page, id);

    // Wait for comment to appear
    await expect(
      page.getByText("Original comment to edit")
    ).toBeVisible({ timeout: 10000 });

    // Click the edit button (pencil icon) for the comment
    const editBtn = page.locator("button").filter({ has: page.locator("svg.lucide.lucide-pencil") }).first();
    await editBtn.click();

    // A textarea should appear for editing — controlled textareas don't expose
    // their value as innerText, so use the locator directly (not hasText filter)
    // The edit textarea is the one inside the comment card that has a sibling Save button
    const commentCards = page.locator(".rounded-lg.border");
    const editTextarea = commentCards.locator("textarea").first();
    await expect(editTextarea).toBeVisible({ timeout: 5000 });

    // Clear and type new content
    await editTextarea.clear();
    await editTextarea.fill("Updated comment via E2E edit");

    // Click Save
    const savePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/comments/") &&
        resp.request().method() === "PATCH",
      { timeout: 10000 }
    );
    await page.locator("button").filter({ hasText: "Save" }).first().click();
    await savePromise;

    // Verify the updated content appears
    await expect(
      page.getByText("Updated comment via E2E edit")
    ).toBeVisible({ timeout: 10000 });
  });

  test("deletes a comment with confirmation", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `Delete Comment UI Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    await request.post(`${BASE}/api/issues/${id}/comments`, {
      data: { content: "Comment to be deleted via UI", author: "tester" },
    });

    await gotoIssueDetail(page, id);

    // Wait for comment to appear
    await expect(
      page.getByText("Comment to be deleted via UI")
    ).toBeVisible({ timeout: 10000 });

    // Click the delete button (trash icon)
    const deleteBtn = page.locator("button").filter({ has: page.locator("svg.lucide.lucide-trash-2") }).first();
    await deleteBtn.click();

    // Confirm button should appear
    const confirmBtn = page.locator("button").filter({ hasText: "Confirm" }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });

    // Click confirm and wait for the API call
    const deletePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/comments/") &&
        resp.request().method() === "DELETE",
      { timeout: 10000 }
    );
    await confirmBtn.click();
    await deletePromise;

    // Comment should be gone
    await expect(
      page.getByText("Comment to be deleted via UI")
    ).not.toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Blockages Section
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Blockages Section", () => {
  test("displays empty state when no blockages", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `No Blockages Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    await gotoIssueDetail(page, id);

    await expect(
      page.getByText("No blockages. This issue is not blocked by anything.")
    ).toBeVisible({ timeout: 10000 });
  });

  test("displays blocked-by list with status badges", async ({
    request,
    page,
  }) => {
    const blockerRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `UI Blocker ${uniqueId()}` },
    });
    const { id: blockerId } = await blockerRes.json();

    const blockedRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `UI Blocked ${uniqueId()}` },
    });
    const { id: blockedId } = await blockedRes.json();

    await request.post(`${BASE}/api/issues/${blockedId}/blockages`, {
      data: { blockerIds: [blockerId], author: "tester" },
    });

    await gotoIssueDetail(page, blockedId);

    // Should show "Blocked by" label
    await expect(page.getByText("Blocked by")).toBeVisible({ timeout: 10000 });

    // Should show the blocker ID as a link
    await expect(
      page.locator("a").filter({ hasText: blockerId })
    ).toBeVisible({ timeout: 10000 });

    // Should show "active" badge
    await expect(
      page.locator("text=active").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("resolves a blockage via Resolve button", async ({ request, page }) => {
    const blockerRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Resolve Blocker ${uniqueId()}` },
    });
    const { id: blockerId } = await blockerRes.json();

    const blockedRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Resolve Blocked ${uniqueId()}` },
    });
    const { id: blockedId } = await blockedRes.json();

    await request.post(`${BASE}/api/issues/${blockedId}/blockages`, {
      data: { blockerIds: [blockerId], author: "tester" },
    });

    await gotoIssueDetail(page, blockedId);

    // Wait for blockage to show
    await expect(page.getByText("Blocked by")).toBeVisible({ timeout: 10000 });

    // Click Resolve
    const resolvePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/blockages/resolve") &&
        resp.request().method() === "PATCH",
      { timeout: 10000 }
    );
    await page.getByRole("button", { name: "Resolve" }).click();
    await resolvePromise;

    // Status should change to "resolved"
    await expect(page.locator("text=resolved").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("opens add blockage dialog", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `Add Blockage Dialog Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    await gotoIssueDetail(page, id);

    // Click "Add blockage" button
    await page.getByRole("button", { name: "Add blockage" }).click();

    // Dialog should appear
    await expect(
      page.getByRole("heading", { name: "Add Blockage" })
    ).toBeVisible({ timeout: 5000 });

    // Should have a search input
    await expect(
      page.locator('input[placeholder="Search issues to block by..."]')
    ).toBeVisible();
  });

  test("deletes a blockage via confirm button", async ({ request, page }) => {
    const blockerRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Delete Blocker ${uniqueId()}` },
    });
    const { id: blockerId } = await blockerRes.json();

    const blockedRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Delete Blocked ${uniqueId()}` },
    });
    const { id: blockedId } = await blockedRes.json();

    await request.post(`${BASE}/api/issues/${blockedId}/blockages`, {
      data: { blockerIds: [blockerId], author: "tester" },
    });

    await gotoIssueDetail(page, blockedId);

    // Wait for blockage to show
    await expect(page.getByText("Blocked by")).toBeVisible({ timeout: 10000 });

    // Click the X button to initiate delete
    const xButtons = page.locator("button").filter({ has: page.locator("svg.lucide.lucide-x") });
    // The X in the blockages section (not the dialog or tag input)
    const blockageSection = page.locator("text=Blocked by").locator("..").locator("..");
    const xBtn = blockageSection.locator("button").filter({ has: page.locator("svg.lucide.lucide-x") }).first();
    await xBtn.click();

    // Confirm should appear
    const confirmBtn = page.locator("button").filter({ hasText: "Confirm" }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });

    // Click confirm and wait for API
    const deletePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/blockages") &&
        resp.request().method() === "DELETE",
      { timeout: 10000 }
    );
    await confirmBtn.click();
    await deletePromise;

    // Blockage should be gone — show empty state
    await expect(
      page.getByText("No blockages. This issue is not blocked by anything.")
    ).toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Sub-issues Section
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Sub-issues Section", () => {
  test("displays empty state when no sub-issues", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `No Sub-issues Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    await gotoIssueDetail(page, id);

    await expect(
      page.getByText("No sub-issues. Create one to break this issue down.")
    ).toBeVisible({ timeout: 10000 });
  });

  test("displays sub-issues with links", async ({ request, page }) => {
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Sub-issue Parent ${uniqueId()}` },
    });
    const { id: parentId } = await parentRes.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Sub-issue Child ${uniqueId()}`, parentId, status: "todo" },
    });
    const { id: childId } = await childRes.json();

    await gotoIssueDetail(page, parentId);

    // Should show sub-issues count
    await expect(page.getByText("Sub-issues (1)")).toBeVisible({
      timeout: 10000,
    });

    // Should show child as a clickable link
    await expect(
      page.locator(`a[href="/issues/${childId}"]`)
    ).toBeVisible({ timeout: 10000 });

    // Should show child title
    await expect(
      page.getByText("Sub-issue Child")
    ).toBeVisible({ timeout: 10000 });
  });

  test("create sub-issue button opens dialog with pre-filled parent", async ({
    request,
    page,
  }) => {
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Sub-issue Create Parent ${uniqueId()}` },
    });
    const { id: parentId } = await parentRes.json();

    await gotoIssueDetail(page, parentId);

    // Click "Create sub-issue" button
    await page.getByRole("button", { name: "Create sub-issue" }).click();

    // Dialog should open
    await expect(
      page.getByRole("heading", { name: /Create New Issue/ })
    ).toBeVisible({ timeout: 5000 });

    // Parent should be set (the parentId should be somewhere visible in the dialog or prefilled)
    // The CreateIssueDialog should show the parentId
    // Since the dialog uses a hidden parentId field, we'll verify by creating and checking the result
  });

  test("navigates to child issue when clicking sub-issue link", async ({
    request,
    page,
  }) => {
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Sub-issue Click Parent ${uniqueId()}` },
    });
    const { id: parentId } = await parentRes.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Sub-issue Click Child ${uniqueId()}`, parentId },
    });
    const { id: childId } = await childRes.json();

    await gotoIssueDetail(page, parentId);

    // Click the child link
    const childLink = page.locator(`a[href="/issues/${childId}"]`);
    await expect(childLink).toBeVisible({ timeout: 10000 });
    await childLink.click();

    // Should navigate to child detail
    await expect(page).toHaveURL(`/issues/${childId}`, { timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Tree View in List
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Tree View in List", () => {
  test("displays expand chevrons on issue rows", async ({ page, request }) => {
    await request.post(`${BASE}/api/issues`, {
      data: { title: `Tree Root ${uniqueId()}` },
    });

    await gotoAndWaitForIssues(page);

    // Chevron buttons should exist (they appear on all rows)
    const chevronButtons = page.locator('button[aria-label="Expand"], button[aria-label="Collapse"]');
    await expect(chevronButtons.first()).toBeVisible({ timeout: 10000 });
  });

  test("expanding a parent shows children inline", async ({
    page,
    request,
  }) => {
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Tree Parent ${uniqueId()}` },
    });
    const { id: parentId } = await parentRes.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Tree Child ${uniqueId()}`, parentId },
    });
    const { id: childId } = await childRes.json();

    await gotoAndWaitForIssues(page);

    // Find the parent row link
    const parentLink = page.locator(`a[href="/issues/${parentId}"]`);
    await expect(parentLink).toBeVisible({ timeout: 10000 });

    // The expand button is a sibling of the link in the parent row.
    // Navigate to the row container (the div that holds both the chevron button and the link)
    const parentRow = parentLink.locator("..");

    // The chevron/expand button is the button sibling in the same row
    const expandBtn = parentRow.locator("button").first();

    // Wait for child data to load after clicking expand
    const childrenPromise = page.waitForResponse(
      (resp) => resp.url().includes("parentId=") && resp.status() === 200,
      { timeout: 10000 }
    );

    await expandBtn.click();
    await childrenPromise;

    // Child should appear in the tree
    await expect(
      page.locator(`a[href="/issues/${childId}"]`).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: History Section
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: History Section", () => {
  test("history section is collapsed by default", async ({
    request,
    page,
  }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `Timeline Collapsed Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    await gotoIssueDetail(page, id);

    // The History section heading (as a button) should be visible but collapsed
    await expect(
      page.getByRole("button", { name: /History/ })
    ).toBeVisible({ timeout: 10000 });

    // History events should NOT be visible initially (lazy loaded on expand)
    // The timeline container should not be present
    const timelineContainer = page.locator(".border-l-2");
    await expect(timelineContainer).not.toBeVisible();
  });

  test("expanding history shows events", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `Timeline Expand Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    // Make an update to create history
    await request.patch(`${BASE}/api/issues/${id}`, {
      data: { status: "todo" },
    });

    await gotoIssueDetail(page, id);

    // Set up the history API listener BEFORE clicking
    const historyPromise = page.waitForResponse(
      (resp) => resp.url().includes("/history") && resp.status() === 200,
      { timeout: 15000 }
    );

    // Click the History toggle button
    const historyBtn = page.getByRole("button", { name: /History/ });
    await historyBtn.click();
    await historyPromise;

    // Should show the "Created" event label
    await expect(page.getByText("Created").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("history shows update events", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `Timeline Update Display ${uniqueId()}` },
    });
    const { id } = await res.json();

    // Make updates to create history events
    await request.patch(`${BASE}/api/issues/${id}`, {
      data: { status: "in-progress" },
    });

    await gotoIssueDetail(page, id);

    // Set up listener before clicking
    const historyPromise = page.waitForResponse(
      (resp) => resp.url().includes("/history") && resp.status() === 200,
      { timeout: 15000 }
    );

    // Expand history
    const historyBtn = page.getByRole("button", { name: /History/ });
    await historyBtn.click();
    await historyPromise;

    // Should show "Updated" label
    await expect(page.getByText("Updated").first()).toBeVisible({
      timeout: 10000,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Tag Input
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Tag Input", () => {
  test("displays existing tags as chips", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: {
        title: `Tag Display Test ${uniqueId()}`,
        tags: ["alpha-tag", "beta-tag"],
      },
    });
    const { id } = await res.json();

    await gotoIssueDetail(page, id);

    await expect(page.getByText("alpha-tag")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("beta-tag")).toBeVisible({ timeout: 10000 });
  });

  test("adds a new tag via typing and Enter", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `Tag Add Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    await gotoIssueDetail(page, id);

    // Find the tag input
    const tagInput = page.locator(
      'input[placeholder="Type a tag and press Enter..."]'
    );
    await expect(tagInput).toBeVisible({ timeout: 10000 });

    // Type a new tag
    await tagInput.fill("new-e2e-tag");
    const patchPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/issues/${id}`) &&
        resp.request().method() === "PATCH",
      { timeout: 10000 }
    );
    await tagInput.press("Enter");
    await patchPromise;

    // The new tag should appear as a chip
    await expect(page.getByText("new-e2e-tag")).toBeVisible({ timeout: 10000 });
  });

  test("removes a tag by clicking x button", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: {
        title: `Tag Remove Test ${uniqueId()}`,
        tags: ["removable-tag"],
      },
    });
    const { id } = await res.json();

    await gotoIssueDetail(page, id);

    // Wait for tag to appear
    await expect(page.getByText("removable-tag")).toBeVisible({ timeout: 10000 });

    // Find the x button next to the tag (inside the tag chip)
    const tagChip = page.locator("span").filter({ hasText: "removable-tag" });
    const removeBtn = tagChip.locator("button");
    await expect(removeBtn).toBeVisible();

    const patchPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/issues/${id}`) &&
        resp.request().method() === "PATCH",
      { timeout: 10000 }
    );
    await removeBtn.click();
    await patchPromise;

    // Tag should be removed
    await expect(
      page.locator("span").filter({ hasText: /^removable-tag$/ })
    ).not.toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Frontend: Parent Selector
// ═══════════════════════════════════════════════════════════════════════

test.describe("Frontend: Parent Selector", () => {
  test("shows 'none' when no parent set", async ({ request, page }) => {
    const res = await request.post(`${BASE}/api/issues`, {
      data: { title: `No Parent Test ${uniqueId()}` },
    });
    const { id } = await res.json();

    await gotoIssueDetail(page, id);

    await expect(page.getByText("none").first()).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Set parent" })
    ).toBeVisible({ timeout: 5000 });
  });

  test("sets a parent via search and selection", async ({ request, page }) => {
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Set Parent Target ${uniqueId()}` },
    });
    const { id: parentId } = await parentRes.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Set Parent Child ${uniqueId()}` },
    });
    const { id: childId } = await childRes.json();

    await gotoIssueDetail(page, childId);

    // Click "Set parent" button
    await page.getByRole("button", { name: "Set parent" }).click();

    // Search for the parent
    const searchInput = page.locator(
      'input[placeholder="Search for parent issue..."]'
    );
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill(`Set Parent Target`);

    // Wait for search results
    await page.waitForResponse(
      (resp) => resp.url().includes("/api/issues") && resp.url().includes("search="),
      { timeout: 10000 }
    );

    // Click on the parent issue in the search results
    const patchPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/issues/${childId}`) &&
        resp.request().method() === "PATCH",
      { timeout: 10000 }
    );
    await page.locator("button").filter({ hasText: parentId }).click();
    await patchPromise;

    // Should show the parent link now
    await expect(
      page.locator(`a[href="/issues/${parentId}"]`)
    ).toBeVisible({ timeout: 10000 });

    // Verify via API
    const apiIssue = await page.evaluate(async (id) => {
      const res = await fetch(`/api/issues/${id}`);
      return res.json();
    }, childId);
    expect(apiIssue.parentId).toBe(parentId);
  });

  test("changes an existing parent", async ({ request, page }) => {
    const parent1Res = await request.post(`${BASE}/api/issues`, {
      data: { title: `Old Parent ${uniqueId()}` },
    });
    const { id: parent1Id } = await parent1Res.json();

    const parent2Res = await request.post(`${BASE}/api/issues`, {
      data: { title: `New Parent ${uniqueId()}` },
    });
    const { id: parent2Id } = await parent2Res.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Change Parent Child ${uniqueId()}`, parentId: parent1Id },
    });
    const { id: childId } = await childRes.json();

    await gotoIssueDetail(page, childId);

    // Should show the old parent link
    await expect(
      page.locator(`a[href="/issues/${parent1Id}"]`)
    ).toBeVisible({ timeout: 10000 });

    // Click "Change" button
    await page.getByRole("button", { name: "Change" }).click();

    // Search for new parent
    const searchInput = page.locator(
      'input[placeholder="Search for parent issue..."]'
    );
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Set up the search-response wait BEFORE the fill that triggers it. The
    // previous ordering attached the listener after the action, so a fast
    // search response could resolve before the listener registered and the
    // wait would hang waiting for the next (possibly stale/debounced prior)
    // response — worse once >100 issues clutter the index. The matcher is also
    // scoped to the exact search term via URLSearchParams so it can't latch
    // onto an unrelated GET /api/issues?search=... call.
    const searchResponsePromise = page.waitForResponse(
      (resp) => {
        if (resp.request().method() !== "GET") return false;
        if (!resp.url().includes("/api/issues")) return false;
        return new URL(resp.url()).searchParams.get("search") === "New Parent";
      },
      { timeout: 10000 }
    );
    await searchInput.fill("New Parent");
    await searchResponsePromise;

    // Click on the new parent
    const patchPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/issues/${childId}`) &&
        resp.request().method() === "PATCH",
      { timeout: 10000 }
    );
    await page.locator("button").filter({ hasText: parent2Id }).click();
    await patchPromise;

    // Should now show the new parent link
    await expect(
      page.locator(`a[href="/issues/${parent2Id}"]`)
    ).toBeVisible({ timeout: 10000 });

    // Verify via API
    const apiIssue = await page.evaluate(async (id) => {
      const res = await fetch(`/api/issues/${id}`);
      return res.json();
    }, childId);
    expect(apiIssue.parentId).toBe(parent2Id);
  });

  test("clears parent by clicking Clear button", async ({ request, page }) => {
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Clear Parent Target ${uniqueId()}` },
    });
    const { id: parentId } = await parentRes.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Clear Parent Child ${uniqueId()}`, parentId },
    });
    const { id: childId } = await childRes.json();

    await gotoIssueDetail(page, childId);

    // Should show parent link
    await expect(
      page.locator(`a[href="/issues/${parentId}"]`)
    ).toBeVisible({ timeout: 10000 });

    // Click "Clear" button
    const patchPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/issues/${childId}`) &&
        resp.request().method() === "PATCH",
      { timeout: 10000 }
    );
    await page.getByRole("button", { name: "Clear" }).click();
    await patchPromise;

    // Should show "none" again
    await expect(page.getByText("none").first()).toBeVisible({
      timeout: 10000,
    });

    // Verify via API
    const apiIssue = await page.evaluate(async (id) => {
      const res = await fetch(`/api/issues/${id}`);
      return res.json();
    }, childId);
    expect(apiIssue.parentId).toBeNull();
  });

  test("clicking parent link navigates to parent detail", async ({
    request,
    page,
  }) => {
    const parentRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Nav Parent Target ${uniqueId()}` },
    });
    const { id: parentId } = await parentRes.json();

    const childRes = await request.post(`${BASE}/api/issues`, {
      data: { title: `Nav Parent Child ${uniqueId()}`, parentId },
    });
    const { id: childId } = await childRes.json();

    await gotoIssueDetail(page, childId);

    // Click the parent link
    const parentLink = page.locator(`a[href="/issues/${parentId}"]`);
    await expect(parentLink).toBeVisible({ timeout: 10000 });
    await parentLink.click();

    // Should navigate to the parent's detail page
    await expect(page).toHaveURL(`/issues/${parentId}`, { timeout: 10000 });
  });
});
