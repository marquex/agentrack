import { Hono } from "hono";
import { tracker } from "../utils/tracker.js";

const issues = new Hono();

// GET /api/issues — list issues with filters
issues.get("/", async (c) => {
  const status = c.req.query("status");
  const assignee = c.req.query("assignee");
  const tags = c.req.query("tags");
  const parentId = c.req.query("parentId");
  const search = c.req.query("search");

  const params: Record<string, unknown> = {};
  if (status) params.status = status;
  if (assignee) params.assignee = assignee;
  if (tags) params.tags = tags.split(",");
  if (parentId !== undefined) {
    params.parentId = parentId === "null" ? null : parentId;
  }

  const result = await tracker.list(params as Parameters<typeof tracker.list>[0]);

  if ("result" in result && result.result !== undefined && typeof (result as { result: unknown }).result === "string" && "message" in result) {
    // It's an error
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  // Server-side search filter on title substring
  let entries = result as import("agentrack").IndexEntry[];
  if (search) {
    const lowerSearch = search.toLowerCase();
    entries = entries.filter((e) => e.title.toLowerCase().includes(lowerSearch));
  }

  return c.json(entries);
});

// POST /api/issues — create a new issue
issues.post("/", async (c) => {
  const body = await c.req.json();

  if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
    return c.json({ error: true, code: "VALIDATION_ERROR", message: "Title is required" }, 400);
  }

  const result = await tracker.create({
    title: body.title.trim(),
    description: body.description ?? "",
    assignee: body.assignee ?? null,
    tags: body.tags ?? [],
    status: body.status,
    priority: body.priority,
    parentId: body.parentId ?? null,
    author: body.author,
  });

  if ("result" in result && "message" in result && result.result !== "OK" && result.result !== undefined) {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json(result, 201);
});

// GET /api/issues/:id — view full issue details
issues.get("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await tracker.view(id);

  if ("result" in result && "message" in result) {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json(result);
});

// GET /api/issues/next/:assignee — recommended next issue
issues.get("/next/:assignee", async (c) => {
  const assignee = c.req.param("assignee");
  const result = await tracker.next(assignee);

  if ("result" in result && "message" in result && result.result !== "OK" && !("title" in result)) {
    // No issues available or error
    return c.json(result);
  }

  return c.json(result);
});

// GET /api/issues/:id/history — return event log
issues.get("/:id/history", async (c) => {
  const id = c.req.param("id");
  const result = await tracker.history(id);

  if ("result" in result && "message" in result && !Array.isArray(result)) {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json(result);
});

// PATCH /api/issues/:id — update an issue
issues.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateFields: Record<string, unknown> = {};
  if (body.title !== undefined) updateFields.title = body.title;
  if (body.description !== undefined) updateFields.description = body.description;
  if (body.status !== undefined) updateFields.status = body.status;
  if (body.assignee !== undefined) updateFields.assignee = body.assignee;
  if (body.tags !== undefined) updateFields.tags = body.tags;
  if (body.priority !== undefined) updateFields.priority = body.priority;
  if (body.parentId !== undefined) updateFields.parentId = body.parentId;
  if (body.author !== undefined) updateFields.author = body.author;

  if (Object.keys(updateFields).length === 0) {
    return c.json(
      { error: true, code: "VALIDATION_ERROR", message: "At least one field must be provided" },
      400
    );
  }

  const result = await tracker.update(id, updateFields as Parameters<typeof tracker.update>[1]);

  if ("result" in result && "message" in result && result.result !== "OK") {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json({ result: "OK" });
});

// DELETE /api/issues/:id — hard-delete an issue and its descendants.
// Used by the E2E self-healing seed cleanup; the library's issueDelete is the
// same primitive that powers `agt delete`.
issues.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await tracker.issueDelete(id);

  if ("result" in result && "message" in result && result.result !== "OK") {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json(result);
});

export default issues;
