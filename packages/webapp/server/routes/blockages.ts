import { Hono } from "hono";
import { tracker } from "../utils/tracker.js";

const blockages = new Hono();

// GET /api/issues/:id/blockages — list blockages
blockages.get("/:id/blockages", async (c) => {
  const id = c.req.param("id");
  const result = await tracker.blockagesList(id);

  if ("result" in result && "message" in result && result.result !== "OK" && !("blockedBy" in result)) {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json(result);
});

// POST /api/issues/:id/blockages — add blockages
blockages.post("/:id/blockages", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  if (!body.blockerIds || !Array.isArray(body.blockerIds) || body.blockerIds.length === 0) {
    return c.json(
      { error: true, code: "VALIDATION_ERROR", message: "blockerIds must be a non-empty array" },
      400
    );
  }

  const result = await tracker.blockagesAdd(id, {
    blockerIds: body.blockerIds,
    author: body.author,
  });

  if ("result" in result && "message" in result && result.result !== "OK") {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json({ result: "OK" });
});

// PATCH /api/issues/:id/blockages/resolve — resolve blockages
blockages.patch("/:id/blockages/resolve", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  if (!body.blockerIds || !Array.isArray(body.blockerIds) || body.blockerIds.length === 0) {
    return c.json(
      { error: true, code: "VALIDATION_ERROR", message: "blockerIds must be a non-empty array" },
      400
    );
  }

  const result = await tracker.blockagesResolve(id, {
    blockerIds: body.blockerIds,
    author: body.author,
  });

  if ("result" in result && "message" in result && result.result !== "OK") {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json({ result: "OK" });
});

// DELETE /api/issues/:id/blockages — delete blockages
blockages.delete("/:id/blockages", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  if (!body.blockerIds || !Array.isArray(body.blockerIds) || body.blockerIds.length === 0) {
    return c.json(
      { error: true, code: "VALIDATION_ERROR", message: "blockerIds must be a non-empty array" },
      400
    );
  }

  const result = await tracker.blockagesDelete(id, {
    blockerIds: body.blockerIds,
    author: body.author,
  });

  if ("result" in result && "message" in result && result.result !== "OK") {
    throw Object.assign(new Error((result as { message: string }).message), result);
  }

  return c.json({ result: "OK" });
});

export default blockages;
