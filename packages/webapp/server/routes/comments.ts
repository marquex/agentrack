import { Hono } from "hono";
import { tracker } from "../utils/tracker.js";

const comments = new Hono();

// GET /api/issues/:id/comments — list comments
comments.get("/:id/comments", async (c) => {
  const id = c.req.param("id");
  const result = await tracker.commentsList(id);

  if ("result" in result && "message" in result && result.result !== "OK" && !Array.isArray(result)) {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json(result);
});

// POST /api/issues/:id/comments — add comment
comments.post("/:id/comments", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  if (!body.content || typeof body.content !== "string" || body.content.trim() === "") {
    return c.json(
      { error: true, code: "VALIDATION_ERROR", message: "Content is required" },
      400
    );
  }

  const result = await tracker.commentsAdd(id, {
    content: body.content.trim(),
    author: body.author,
  });

  if ("result" in result && "message" in result && result.result !== "OK") {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json(result, 201);
});

// PATCH /api/issues/:id/comments/:commentId — edit comment
comments.patch("/:id/comments/:commentId", async (c) => {
  const id = c.req.param("id");
  const commentId = c.req.param("commentId");
  const body = await c.req.json();

  if (!body.content || typeof body.content !== "string" || body.content.trim() === "") {
    return c.json(
      { error: true, code: "VALIDATION_ERROR", message: "Content is required" },
      400
    );
  }

  const result = await tracker.commentsUpdate(id, commentId, {
    content: body.content.trim(),
    author: body.author,
  });

  if ("result" in result && "message" in result && result.result !== "OK") {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json({ result: "OK" });
});

// DELETE /api/issues/:id/comments/:commentId — delete comment
comments.delete("/:id/comments/:commentId", async (c) => {
  const id = c.req.param("id");
  const commentId = c.req.param("commentId");
  const body = await c.req.json().catch(() => ({}));

  const result = await tracker.commentsDelete(id, commentId, {
    author: body.author,
  });

  if ("result" in result && "message" in result && result.result !== "OK") {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json({ result: "OK" });
});

export default comments;
